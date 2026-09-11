import { calculateSubjectWeakness, localDateString } from './learningStats.js'
import { BACKUP_STORAGE_KEYS, STORAGE_KEYS, assertRegisteredSnapshot } from './storageRegistry.js'
import { ACTIVE_LEARNING_GRADE } from './gradeContext.js'
import { mergeLearningGradeRecords, projectLearningValue, selectLearningGrade } from './gradeMigration.js'

const SUBJECTS = ['math', 'chinese', 'english']
const ACTIVE_PAPER_GRADE = ACTIVE_LEARNING_GRADE
const ASCII_TRIM = /^[\x09\x0A\x0C\x0D\x20]+|[\x09\x0A\x0C\x0D\x20]+$/g
const NORMAL_MATH_TYPES = new Set(['add', 'sub', 'compare', 'fill', 'chain'])
const SPECIAL_MATH_TYPES = new Set(['fillOp', 'fillOp2', 'hundredChart', 'triangle', 'square', 'triangle-free'])
const TRIANGLE_KEYS = ['A', 'B', 'C', 'AB', 'BC', 'AC']
const SQUARE_KEYS = ['A', 'B', 'C', 'D', 'AB', 'BC', 'CD', 'DA']
const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]
const SHA256_INITIAL = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

function seedToUint32(seed) {
  let value = 2166136261
  for (const char of String(seed)) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0 || 0x9e3779b9
}

export function xorshift32(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : seedToUint32(seed)
  if (!state) state = 0x9e3779b9
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

export function shuffleWithRng(values, rng) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(rng() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function allocateQuotas(subjects, count) {
  const quotas = Object.fromEntries(SUBJECTS.map(subject => [subject, 1]))
  const remaining = count - SUBJECTS.length
  let sum = SUBJECTS.reduce((total, subject) => total + subjects[subject].weakness, 0)
  const weights = {}
  if (sum === 0) {
    for (const subject of SUBJECTS) weights[subject] = 1
    sum = SUBJECTS.length
  } else {
    for (const subject of SUBJECTS) weights[subject] = subjects[subject].weakness
  }
  const remainders = []
  let used = 0
  for (const subject of SUBJECTS) {
    const exact = remaining * weights[subject] / sum
    const floor = Math.floor(exact)
    quotas[subject] += floor
    used += floor
    remainders.push({ subject, remainder: exact - floor })
  }
  remainders.sort((a, b) => b.remainder - a.remainder || SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject))
  for (let index = 0; index < remaining - used; index++) quotas[remainders[index].subject]++
  return quotas
}

function transferShortages(quotas, pools, count) {
  const assigned = Object.fromEntries(SUBJECTS.map(subject => [subject, Math.min(quotas[subject], pools[subject].length)]))
  let missing = count - SUBJECTS.reduce((sum, subject) => sum + assigned[subject], 0)
  while (missing > 0) {
    const target = SUBJECTS.find(subject => assigned[subject] < pools[subject].length)
    if (!target) return null
    assigned[target]++
    missing--
  }
  return assigned
}

function ensureMathSpecialWithinQuota(pool, quota) {
  if (quota <= 0 || pool.slice(0, quota).some(item => item.kind === 'math-special')) return pool
  const specialIndex = pool.findIndex(item => item.kind === 'math-special')
  if (specialIndex < 0) return pool
  const reordered = [...pool]
  const [special] = reordered.splice(specialIndex, 1)
  reordered.splice(quota - 1, 0, special)
  return reordered
}

export function buildPaper({ grade, stats, candidates, count, difficulty = 'medium', seed }) {
  if (grade !== ACTIVE_PAPER_GRADE) return { ok: false, code: 'PAPER_GRADE_UNAVAILABLE' }
  for (const subject of SUBJECTS) {
    for (const item of Array.isArray(candidates?.[subject]) ? candidates[subject] : []) {
      if (item?.grade !== grade) return { ok: false, code: 'PAPER_GRADE_UNAVAILABLE' }
    }
  }
  if (![9, 12, 15].includes(count)) return { ok: false, code: 'PAPER_COUNT_INVALID' }
  const normalized = {}
  for (const subject of SUBJECTS) {
    const source = stats?.[subject] || {}
    const unique = new Map()
    for (const item of Array.isArray(candidates?.[subject]) ? candidates[subject] : []) {
      if (!item || item.subject !== subject || typeof item.id !== 'string' || unique.has(item.id)) continue
      unique.set(item.id, item)
    }
    normalized[subject] = {
      weakness: calculateSubjectWeakness(source),
      candidates: [...unique.values()],
    }
  }
  const quotas = allocateQuotas(normalized, count)
  const pools = {}
  for (const subject of SUBJECTS) {
    const rng = xorshift32(`${seed}|${difficulty}|${subject}`)
    const due = shuffleWithRng(normalized[subject].candidates.filter(item => item.due), rng)
    const fresh = shuffleWithRng(normalized[subject].candidates.filter(item => !item.due), rng)
    pools[subject] = [...due, ...fresh]
  }
  const actualQuotas = transferShortages(quotas, pools, count)
  if (!actualQuotas) return { ok: false, code: 'PAPER_INVENTORY_SHORTAGE' }
  pools.math = ensureMathSpecialWithinQuota(pools.math, actualQuotas.math)
  const questions = SUBJECTS.flatMap(subject => pools[subject].slice(0, actualQuotas[subject]))
  return {
    ok: true,
    questions: shuffleWithRng(questions, xorshift32(`${seed}|paper-order`)),
    quotas: actualQuotas,
    requestedQuotas: quotas,
    weakness: Object.fromEntries(SUBJECTS.map(subject => [subject, normalized[subject].weakness])),
  }
}

export function createPaperInstanceId(cryptoRef = globalThis.crypto) {
  if (!cryptoRef?.getRandomValues) throw new Error('PAPER_ID_UNAVAILABLE')
  const bytes = new Uint8Array(16)
  cryptoRef.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function rotateRight(value, amount) {
  return (value >>> amount) | (value << (32 - amount))
}

export function sha256Hex(value) {
  const input = new TextEncoder().encode(String(value))
  const byteLength = Math.ceil((input.length + 9) / 64) * 64
  const bytes = new Uint8Array(byteLength)
  bytes.set(input)
  bytes[input.length] = 0x80
  const view = new DataView(bytes.buffer)
  const bitLength = input.length * 8
  view.setUint32(byteLength - 8, Math.floor(bitLength / 0x100000000), false)
  view.setUint32(byteLength - 4, bitLength >>> 0, false)
  const hash = [...SHA256_INITIAL]
  const words = new Uint32Array(64)
  for (let offset = 0; offset < byteLength; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4, false)
    for (let index = 16; index < 64; index++) {
      const before15 = words[index - 15]
      const before2 = words[index - 2]
      const sigma0 = rotateRight(before15, 7) ^ rotateRight(before15, 18) ^ (before15 >>> 3)
      const sigma1 = rotateRight(before2, 17) ^ rotateRight(before2, 19) ^ (before2 >>> 10)
      words[index] = (words[index - 16] + sigma0 + words[index - 7] + sigma1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = hash
    for (let index = 0; index < 64; index++) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)
      const choose = (e & f) ^ (~e & g)
      const temp1 = (h + sum1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)
      const majority = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (sum0 + majority) >>> 0
      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }
    hash[0] = (hash[0] + a) >>> 0
    hash[1] = (hash[1] + b) >>> 0
    hash[2] = (hash[2] + c) >>> 0
    hash[3] = (hash[3] + d) >>> 0
    hash[4] = (hash[4] + e) >>> 0
    hash[5] = (hash[5] + f) >>> 0
    hash[6] = (hash[6] + g) >>> 0
    hash[7] = (hash[7] + h) >>> 0
  }
  return hash.map(word => word.toString(16).padStart(8, '0')).join('')
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function hasExactKeys(value, keys) {
  return isObject(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function hasOnlyKeys(value, required, optional = []) {
  if (!isObject(value) || required.some(key => !Object.prototype.hasOwnProperty.call(value, key))) return false
  const allowed = new Set([...required, ...optional])
  return Object.keys(value).every(key => allowed.has(key))
}

function canonicalIso(value) {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

function hasOnlyStringOptions(options, answer) {
  return Array.isArray(options) && options.length > 0 && options.every(option =>
    hasExactKeys(option, ['label', 'value']) && isNonEmptyString(option.label) && isNonEmptyString(option.value)) &&
    options.some(option => option.value === answer)
}

function validLanguageSource(question) {
  const source = question.sourceRef
  if (!isObject(source) || source.question_id !== question.id || !isNonEmptyString(source.type)) return false
  if (question.subject === 'chinese') {
    return hasExactKeys(source, ['question_id', 'type', 'char', 'unit', 'qType']) &&
      ['pinyin', 'hanzi'].includes(source.type) && isNonEmptyString(source.char) && isNonEmptyString(source.unit) && source.qType === 'paper'
  }
  if (source.type === 'word') {
    return hasOnlyKeys(source, ['question_id', 'type', 'word', 'theme', 'qType'], ['emoji', 'zh']) &&
      isNonEmptyString(source.word) && isNonEmptyString(source.theme) && source.qType === 'paper' &&
      source.word === question.answer &&
      ['emoji', 'zh'].every(key => !Object.prototype.hasOwnProperty.call(source, key) || typeof source[key] === 'string')
  }
  if (source.type === 'letter') {
    return hasOnlyKeys(source, ['question_id', 'type', 'upper', 'lower', 'qType'], ['phonics', 'example', 'exampleZh', 'emoji']) &&
      /^[A-Z]$/.test(source.upper || '') && /^[a-z]$/.test(source.lower || '') && source.qType === 'paper' &&
      source.lower === question.answer &&
      ['phonics', 'example', 'exampleZh', 'emoji'].every(key => !Object.prototype.hasOwnProperty.call(source, key) || typeof source[key] === 'string')
  }
  return false
}

function validMathSource(question) {
  const source = question.sourceRef
  if (!hasExactKeys(source, ['expr', 'answer', 'type']) || !isNonEmptyString(source.expr) || typeof source.answer !== 'string' || !isNonEmptyString(source.type) ||
      (question.kind !== 'math-special' && question.prompt !== source.expr)) return false
  if (question.kind === 'math-special') return validMathSpecialProjection(question)
  if (!NORMAL_MATH_TYPES.has(source.type)) return false
  return source.answer === question.answer && question.prompt === source.expr &&
    (source.type === 'compare' ? question.kind === 'choice' : question.kind === 'input')
}

function safeInteger(value, { positive = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  return Number.isSafeInteger(value) && value >= (positive ? 1 : 0) && value <= max
}

function parseGridKey(key, rows, cols) {
  if (typeof key !== 'string' || !/^(0|[1-9][0-9]*),(0|[1-9][0-9]*)$/.test(key)) return null
  const [row, col] = key.split(',').map(Number)
  return row < rows && col < cols ? [row, col] : null
}

function calculateOperation(a, operation, b) {
  const result = operation === '+' ? a + b : a - b
  return Number.isSafeInteger(result) ? result : null
}

function validPartition(shown, hidden, keys) {
  if (!Array.isArray(shown) || !Array.isArray(hidden) || hidden.length === 0 || shown.length + hidden.length !== keys.length) return false
  if (new Set(shown).size !== shown.length || new Set(hidden).size !== hidden.length) return false
  return [...shown, ...hidden].every(key => typeof key === 'string' && keys.includes(key)) &&
    keys.every(key => shown.includes(key) !== hidden.includes(key))
}

function sameCanonical(left, right) {
  return canonicalize(left) === canonicalize(right)
}

function validMathSpecialProjection(question) {
  const source = question.sourceRef
  const data = question.renderData
  if (!isObject(data) || !SPECIAL_MATH_TYPES.has(source.type) || question.mathType !== source.type) return false
  if (source.type === 'fillOp') {
    const matched = source.expr.match(/^[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*=[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*$/)
    if (!matched || !/^[+-]$/.test(source.answer)) return false
    const [a, b, c] = matched.slice(1).map(Number)
    return [a, b, c].every(value => safeInteger(value)) && calculateOperation(a, source.answer, b) === c &&
      sameCanonical(data, { a, b, c }) && question.answer === source.answer && question.prompt === '请完成填空'
  }
  if (source.type === 'fillOp2') {
    const matched = source.expr.match(/^[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*=[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*$/)
    const operators = source.answer.match(/^([+-]),([+-])$/)
    if (!matched || !operators) return false
    const [a, b, c, d] = matched.slice(1).map(Number)
    const answer = JSON.stringify([operators[1], operators[2]])
    return [a, b, c, d].every(value => safeInteger(value)) &&
      calculateOperation(a, operators[1], b) === calculateOperation(c, operators[2], d) &&
      sameCanonical(data, { a, b, c, d }) && question.answer === answer && question.prompt === '请完成填空'
  }
  if (source.type === 'hundredChart') {
    let raw
    try { raw = JSON.parse(source.expr) } catch { return false }
    if (!hasOnlyKeys(raw, ['rows', 'cols', 'cellMap', 'centerKey', 'hiddenKeys'], ['center']) ||
        !safeInteger(raw.rows, { positive: true, max: 10 }) || !safeInteger(raw.cols, { positive: true, max: 10 }) ||
        !isObject(raw.cellMap) || !Array.isArray(raw.hiddenKeys) || raw.hiddenKeys.length === 0) return false
    const allKeys = Object.keys(raw.cellMap)
    if (new Set(raw.hiddenKeys).size !== raw.hiddenKeys.length || raw.hiddenKeys.some(key => !allKeys.includes(key)) ||
        !allKeys.includes(raw.centerKey) || raw.hiddenKeys.includes(raw.centerKey)) return false
    const centerPosition = parseGridKey(raw.centerKey, raw.rows, raw.cols)
    const center = raw.cellMap[raw.centerKey]
    if (!centerPosition || !safeInteger(center, { positive: true, max: 100 }) ||
        (Object.prototype.hasOwnProperty.call(raw, 'center') && raw.center !== center)) return false
    for (const [key, value] of Object.entries(raw.cellMap)) {
      const position = parseGridKey(key, raw.rows, raw.cols)
      if (!position || !safeInteger(value, { positive: true, max: 100 })) return false
      const expected = center + (position[0] - centerPosition[0]) * 10 + position[1] - centerPosition[1]
      if (value !== expected) return false
    }
    const answers = parseCanonicalPositiveArray(source.answer, raw.hiddenKeys.length)
    if (!answers) return false
    for (let index = 0; index < raw.hiddenKeys.length; index++) {
      const [row, col] = parseGridKey(raw.hiddenKeys[index], raw.rows, raw.cols)
      const expected = center + (row - centerPosition[0]) * 10 + col - centerPosition[1]
      if (answers[index] !== expected || expected < 1 || expected > 100) return false
    }
    const expectedRender = {
      rows: raw.rows, cols: raw.cols, centerKey: raw.centerKey, hiddenKeys: [...raw.hiddenKeys],
      cellMap: Object.fromEntries(allKeys.filter(key => !raw.hiddenKeys.includes(key)).map(key => [key, String(raw.cellMap[key])])),
    }
    return sameCanonical(data, expectedRender) && question.answer === JSON.stringify(answers.map(String)) && question.prompt === '按百数表规律填空'
  }
  if (source.type === 'triangle-free') {
    let raw
    try { raw = JSON.parse(source.expr) } catch { return false }
    if (!hasOnlyKeys(raw, ['target', 'numbers', 'shown', 'hidden'], ['vals']) || source.answer !== '' ||
        !safeInteger(raw.target, { positive: true }) || !Array.isArray(raw.numbers) || raw.numbers.length !== TRIANGLE_KEYS.length ||
        !raw.numbers.every(value => safeInteger(value, { positive: true })) || new Set(raw.numbers).size !== TRIANGLE_KEYS.length ||
        !Array.isArray(raw.shown) || raw.shown.length !== 0 || !Array.isArray(raw.hidden) ||
        raw.hidden.length !== TRIANGLE_KEYS.length || raw.hidden.some((key, index) => key !== TRIANGLE_KEYS[index])) return false
    const expectedRender = { target: raw.target, numbers: [...raw.numbers], shown: [], hidden: [...TRIANGLE_KEYS] }
    return sameCanonical(data, expectedRender) && question.answer === '' && question.prompt === '用完数字池，使每条边的和等于目标数'
  }
  const keys = source.type === 'triangle' ? TRIANGLE_KEYS : SQUARE_KEYS
  const edges = source.type === 'triangle'
    ? [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['A', 'AC', 'C']]
    : [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['C', 'CD', 'D'], ['D', 'DA', 'A']]
  let raw
  try { raw = JSON.parse(source.expr) } catch { return false }
  if (!hasExactKeys(raw, ['target', 'vals', 'shown', 'hidden']) || !safeInteger(raw.target, { positive: true }) ||
      !hasExactKeys(raw.vals, keys) || !keys.every(key => safeInteger(raw.vals[key], { positive: true })) ||
      !validPartition(raw.shown, raw.hidden, keys) || !edges.every(edge => edge.reduce((sum, key) => sum + raw.vals[key], 0) === raw.target)) return false
  const answers = parseCanonicalPositiveArray(source.answer, raw.hidden.length)
  if (!answers || answers.some((value, index) => value !== raw.vals[raw.hidden[index]])) return false
  const expectedRender = {
    target: raw.target, shown: [...raw.shown], hidden: [...raw.hidden],
    cellMap: Object.fromEntries(raw.shown.map(key => [key, String(raw.vals[key])])),
  }
  return sameCanonical(data, expectedRender) && question.answer === JSON.stringify(answers.map(String)) && question.prompt === '请完成填空'
}

function validPaperQuestion(question, grade) {
  if (!isObject(question) || question.grade !== grade || !SUBJECTS.includes(question.subject) || !isNonEmptyString(question.id) ||
      !['choice', 'input', 'math-special'].includes(question.kind) || !isNonEmptyString(question.prompt) ||
      typeof question.answer !== 'string' || typeof question.due !== 'boolean') return false
  const baseKeys = ['id', 'subject', 'grade', 'kind', 'prompt', 'answer', 'sourceRef', 'due']
  const expectedKeys = question.kind === 'choice' ? [...baseKeys, 'options'] : question.kind === 'math-special' ? [...baseKeys, 'mathType', 'renderData'] : baseKeys
  if (!hasExactKeys(question, expectedKeys)) return false
  if (question.kind === 'choice' && !hasOnlyStringOptions(question.options, question.answer)) return false
  if (question.kind !== 'choice' && Object.prototype.hasOwnProperty.call(question, 'options')) return false
  if (question.subject === 'math') return validMathSource(question)
  return question.kind === 'choice' && validLanguageSource(question)
}

function validQuestionSet(questions, grade) {
  if (!Array.isArray(questions) || questions.length === 0 || questions.some(question => !validPaperQuestion(question, grade))) return false
  const identities = questions.map(question => `${question.subject}\u0000${question.id}`)
  return new Set(identities).size === identities.length
}

async function digest(value) {
  return sha256Hex(value)
}

function parseCanonicalPositiveArray(value, length) {
  let parsed
  try { parsed = JSON.parse(value) } catch { return null }
  if (!Array.isArray(parsed) || parsed.length !== length) return null
  const result = []
  for (const item of parsed) {
    if (typeof item !== 'string') return null
    const text = item.replace(ASCII_TRIM, '')
    if (!/^[1-9][0-9]*$/.test(text)) return null
    const number = Number(text)
    if (!Number.isSafeInteger(number) || String(number) !== text) return null
    result.push(number)
  }
  return result
}

function parseOperators(value, length) {
  let parsed
  try { parsed = JSON.parse(value) } catch { return null }
  if (!Array.isArray(parsed) || parsed.length !== length) return null
  const result = parsed.map(item => typeof item === 'string' ? item.replace(ASCII_TRIM, '') : '')
  return result.every(item => item === '+' || item === '-') ? result : null
}

export function gradePaperAnswer(question, userAnswer) {
  try {
    if (!question || typeof question !== 'object') return false
    if (question.kind !== 'math-special') return String(userAnswer ?? '') === String(question.answer)
    if (question.mathType === 'fillOp') {
      const value = typeof userAnswer === 'string' ? userAnswer.replace(ASCII_TRIM, '') : ''
      return (value === '+' || value === '-') && value === question.answer
    }
    if (question.mathType === 'fillOp2') {
      const actual = parseOperators(userAnswer, 2)
      const expected = parseOperators(question.answer, 2)
      return !!actual && !!expected && actual.every((value, index) => value === expected[index])
    }
    if (['hundredChart', 'triangle', 'square'].includes(question.mathType)) {
      const expectedLength = question.mathType === 'hundredChart' ? question.renderData?.hiddenKeys?.length : question.renderData?.hidden?.length
      if (!Number.isInteger(expectedLength)) return false
      const actual = parseCanonicalPositiveArray(userAnswer, expectedLength)
      const expected = parseCanonicalPositiveArray(question.answer, expectedLength)
      return !!actual && !!expected && actual.every((value, index) => value === expected[index])
    }
    if (question.mathType === 'triangle-free') {
      const actual = parseCanonicalPositiveArray(userAnswer, 6)
      const pool = question.renderData?.numbers
      const target = question.renderData?.target
      if (!actual || !Array.isArray(pool) || pool.length !== 6 || !pool.every(Number.isSafeInteger) || !Number.isSafeInteger(target)) return false
      const sortedActual = [...actual].sort((a, b) => a - b)
      const sortedPool = [...pool].sort((a, b) => a - b)
      if (sortedActual.some((value, index) => value !== sortedPool[index])) return false
      const [A, B, C, AB, BC, AC] = actual
      return A + AB + B === target && B + BC + C === target && A + AC + C === target
    }
    return false
  } catch {
    return false
  }
}

export async function createPaperSubmissionIntent({ grade, paperInstanceId, seed, questions, answers, submittedAt = new Date().toISOString() }) {
  if (grade !== ACTIVE_PAPER_GRADE || !/^[a-f0-9]{32}$/.test(paperInstanceId || '') || !isNonEmptyString(seed) ||
      !canonicalIso(submittedAt) || !validQuestionSet(questions, grade) || !Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error('PAPER_SUBMISSION_INVALID')
  }
  const identity = `paper-v2|${grade}|${paperInstanceId}|${seed}|${questions.map(item => `${item.subject}:${item.id}`).join('|')}`
  const submissionId = await digest(identity)
  const normalizedAnswers = questions.map((question, index) => ({
    question: JSON.parse(JSON.stringify(question)),
    userAnswer: answers[index] == null ? '' : String(answers[index]),
    correct: gradePaperAnswer(question, answers[index]),
  }))
  const base = { sessionGrade: grade, grade, paperInstanceId, seed, submissionId, submittedAt, answers: normalizedAnswers }
  return deepFreeze({ ...base, submissionDigest: await digest(canonicalize(base)) })
}

function clone(value) { return JSON.parse(JSON.stringify(value)) }
function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(deepFreeze)
  return value
}
function readArray(snapshot, key) {
  const item = snapshot[key]
  if (!item.present) return []
  if (!Array.isArray(item.value)) throw new Error('PAPER_SUBMISSION_INCONSISTENT')
  const value = projectLearningValue(key, item.value)
  if (!Array.isArray(value)) throw new Error('PAPER_SUBMISSION_INCONSISTENT')
  return value
}
function readJsonArray(snapshot, key) {
  const item = snapshot[key]
  if (!item.present) return []
  if (typeof item.value !== 'string') throw new Error('PAPER_SUBMISSION_INCONSISTENT')
  const value = JSON.parse(item.value)
  if (!Array.isArray(value)) throw new Error('PAPER_SUBMISSION_INCONSISTENT')
  const projected = projectLearningValue(key, item.value)
  try { return JSON.parse(projected) } catch { throw new Error('PAPER_SUBMISSION_INCONSISTENT') }
}
function receiptMatches(subject, receipt, expected) {
  if (!receipt) return false
  const keys = subject === 'math'
    ? ['type', 'grade', 'total', 'correct', 'id', 'createdAt', 'submissionId', 'submissionDigest', 'submittedAt', 'totalCount', 'correctCount']
    : ['type', 'date', 'createdAt', 'grade', 'submissionId', 'submissionDigest', 'submittedAt', 'totalCount', 'correctCount']
  return keys.every(key => receipt[key] === expected[key])
}

function updateLeitnerWrong(list, answer, now) {
  const source = answer.question.sourceRef || {}
  const grade = answer.question.grade
  const index = list.findIndex(item => item.grade === grade && item.question_id === source.question_id)
  if (index >= 0) {
    list[index] = { ...list[index], wrongCount: (list[index].wrongCount || 0) + 1, correctCount: 0, box: 1, nextReviewAt: now + 86400000, mastered: false, lastWrongAt: now }
  } else {
    list.push({ ...source, grade, _id: source.question_id, question_id: source.question_id, wrongCount: 1, correctCount: 0, box: 1, nextReviewAt: now + 86400000, mastered: false, lastWrongAt: now, createdAt: now })
  }
}

function updateMathWrong(list, answer, now) {
  const source = answer.question.sourceRef || {}
  const grade = answer.question.grade
  const index = list.findIndex(item => item.grade === grade && item.expr === source.expr && item.type === source.type)
  if (index >= 0) list[index] = { ...list[index], wrongCount: (list[index].wrongCount || 0) + 1, correctCount: 0, box: 1, nextReviewAt: now + 86400000, mastered: false, lastWrongAt: now }
  else list.push({ grade, id: `paper_${answer.question.id}`, expr: source.expr, answer: source.answer, type: source.type, wrongCount: 1, correctCount: 0, box: 1, nextReviewAt: now + 86400000, mastered: false, lastWrongAt: now, createdAt: now })
}

function validPaperIntent(intent) {
  if (!hasExactKeys(intent, ['sessionGrade', 'grade', 'paperInstanceId', 'seed', 'submissionId', 'submittedAt', 'answers', 'submissionDigest']) ||
      intent.sessionGrade !== intent.grade || intent.grade !== ACTIVE_PAPER_GRADE ||
      !/^[a-f0-9]{32}$/.test(intent.paperInstanceId || '') || !isNonEmptyString(intent.seed) ||
      !/^[a-f0-9]{64}$/.test(intent.submissionId || '') || !/^[a-f0-9]{64}$/.test(intent.submissionDigest || '') ||
      !canonicalIso(intent.submittedAt) || !Array.isArray(intent.answers)) return false
  const questions = intent.answers.map(answer => answer?.question)
  if (!validQuestionSet(questions, intent.grade)) return false
  if (!intent.answers.every(answer => hasExactKeys(answer, ['question', 'userAnswer', 'correct']) &&
      typeof answer.userAnswer === 'string' && typeof answer.correct === 'boolean' &&
      answer.correct === gradePaperAnswer(answer.question, answer.userAnswer))) return false
  const identity = `paper-v2|${intent.grade}|${intent.paperInstanceId}|${intent.seed}|${questions.map(item => `${item.subject}:${item.id}`).join('|')}`
  if (sha256Hex(identity) !== intent.submissionId) return false
  const base = {
    sessionGrade: intent.sessionGrade, grade: intent.grade, paperInstanceId: intent.paperInstanceId, seed: intent.seed,
    submissionId: intent.submissionId, submittedAt: intent.submittedAt, answers: intent.answers,
  }
  return sha256Hex(canonicalize(base)) === intent.submissionDigest
}

export function buildPaperSubmissionTarget(original, intent) {
  if (!validPaperIntent(intent)) return { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  assertRegisteredSnapshot(original, BACKUP_STORAGE_KEYS)
  const subjectResults = Object.fromEntries(SUBJECTS.map(subject => {
    const answers = intent.answers.filter(item => item.question?.subject === subject)
    return [subject, { totalCount: answers.length, correctCount: answers.filter(item => item.correct).length }]
  }))
  const chineseLogsFull = readArray(original, STORAGE_KEYS.chinesePracticeLogs)
  const englishLogsFull = readArray(original, STORAGE_KEYS.englishPracticeLogs)
  const mathHistoryFull = readJsonArray(original, STORAGE_KEYS.mathHistory)
  const chineseLogs = selectLearningGrade(STORAGE_KEYS.chinesePracticeLogs, chineseLogsFull, intent.grade)
  const englishLogs = selectLearningGrade(STORAGE_KEYS.englishPracticeLogs, englishLogsFull, intent.grade)
  const mathHistory = selectLearningGrade(STORAGE_KEYS.mathHistory, JSON.stringify(mathHistoryFull), intent.grade)
  const date = localDateString(intent.submittedAt)
  const common = { grade: intent.grade, submissionId: intent.submissionId, submissionDigest: intent.submissionDigest, submittedAt: intent.submittedAt }
  const expected = {
    chinese: { type: 'paper', date, createdAt: Date.parse(intent.submittedAt), ...subjectResults.chinese, ...common },
    english: { type: 'paper', date, createdAt: Date.parse(intent.submittedAt), ...subjectResults.english, ...common },
    math: {
      type: 'paper', grade: intent.grade, total: subjectResults.math.totalCount, correct: subjectResults.math.correctCount,
      id: `paper_${intent.submissionId.slice(0, 12)}`, createdAt: intent.submittedAt,
      submissionId: intent.submissionId, submissionDigest: intent.submissionDigest, submittedAt: intent.submittedAt,
      ...subjectResults.math,
    },
  }
  const receipts = {
    chinese: chineseLogs.filter(item => item.grade === intent.grade && item.submissionId === intent.submissionId),
    english: englishLogs.filter(item => item.grade === intent.grade && item.submissionId === intent.submissionId),
    math: mathHistory.filter(item => item.grade === intent.grade && item.submissionId === intent.submissionId),
  }
  const present = SUBJECTS.filter(subject => receipts[subject].length > 0).length
  if (present === 3 && SUBJECTS.every(subject => receipts[subject].length === 1 && receiptMatches(subject, receipts[subject][0], expected[subject]))) {
    return { status: 'ALREADY_COMMITTED', target: original }
  }
  if (present !== 0) return { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  const target = clone(original)
  chineseLogs.push(expected.chinese)
  englishLogs.push(expected.english)
  mathHistory.unshift(expected.math)
  const chineseWrongFull = readArray(original, STORAGE_KEYS.chineseMistakes)
  const englishWrongFull = readArray(original, STORAGE_KEYS.englishMistakes)
  const mathWrongFull = readJsonArray(original, STORAGE_KEYS.mathWrongBook)
  const chineseWrong = selectLearningGrade(STORAGE_KEYS.chineseMistakes, chineseWrongFull, intent.grade)
  const englishWrong = selectLearningGrade(STORAGE_KEYS.englishMistakes, englishWrongFull, intent.grade)
  const mathWrong = selectLearningGrade(STORAGE_KEYS.mathWrongBook, JSON.stringify(mathWrongFull), intent.grade)
  const now = Date.parse(intent.submittedAt)
  for (const answer of intent.answers.filter(item => !item.correct)) {
    if (answer.question.subject === 'chinese') updateLeitnerWrong(chineseWrong, answer, now)
    else if (answer.question.subject === 'english') updateLeitnerWrong(englishWrong, answer, now)
    else if (answer.question.subject === 'math') updateMathWrong(mathWrong, answer, now)
  }
  target[STORAGE_KEYS.chinesePracticeLogs] = { present: true, value: mergeLearningGradeRecords(STORAGE_KEYS.chinesePracticeLogs, chineseLogsFull, intent.grade, chineseLogs, { limit: 1000 }) }
  target[STORAGE_KEYS.englishPracticeLogs] = { present: true, value: mergeLearningGradeRecords(STORAGE_KEYS.englishPracticeLogs, englishLogsFull, intent.grade, englishLogs, { limit: 1000 }) }
  target[STORAGE_KEYS.mathHistory] = { present: true, value: JSON.stringify(mergeLearningGradeRecords(STORAGE_KEYS.mathHistory, mathHistoryFull, intent.grade, mathHistory, { limit: 50, newestFirst: true })) }
  target[STORAGE_KEYS.chineseMistakes] = { present: true, value: mergeLearningGradeRecords(STORAGE_KEYS.chineseMistakes, chineseWrongFull, intent.grade, chineseWrong) }
  target[STORAGE_KEYS.englishMistakes] = { present: true, value: mergeLearningGradeRecords(STORAGE_KEYS.englishMistakes, englishWrongFull, intent.grade, englishWrong) }
  target[STORAGE_KEYS.mathWrongBook] = { present: true, value: JSON.stringify(mergeLearningGradeRecords(STORAGE_KEYS.mathWrongBook, mathWrongFull, intent.grade, mathWrong, { limit: 300, newestFirst: true })) }
  assertRegisteredSnapshot(target, BACKUP_STORAGE_KEYS)
  return { status: 'TARGET_READY', target }
}
