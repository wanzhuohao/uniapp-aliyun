import chineseQuestions from '../../static/data/questions.json'
import englishWords from '../../static/data/english/words.json'
import englishLetters from '../../static/data/english/letters.json'
import { generateQuestions } from '../math/questionEngine.js'
import { xorshift32, shuffleWithRng } from './paperEngine.js'
import { ACTIVE_LEARNING_GRADE, LEARNING_GRADE_OPTIONS, assertAvailableLearningGrade } from './gradeContext.js'

export const ACTIVE_PAPER_GRADE = ACTIVE_LEARNING_GRADE
export const PAPER_GRADE_OPTIONS = LEARNING_GRADE_OPTIONS

const TRIANGLE_KEYS = Object.freeze(['A', 'B', 'C', 'AB', 'BC', 'AC'])
const SQUARE_KEYS = Object.freeze(['A', 'B', 'C', 'D', 'AB', 'BC', 'CD', 'DA'])
const NORMAL_MATH_TYPES = new Set(['add', 'sub', 'compare', 'fill', 'chain'])
const MATH_SPECIAL_TYPES = new Set(['fillOp', 'fillOp2', 'hundredChart', 'triangle', 'square', 'triangle-free'])
const ASCII_TRIM = /^[\x09\x0A\x0C\x0D\x20]+|[\x09\x0A\x0C\x0D\x20]+$/g

export function validatePaperGrade(grade) {
  try { return { ok: true, grade: assertAvailableLearningGrade(grade) } }
  catch { return { ok: false, code: 'PAPER_GRADE_UNAVAILABLE' } }
}

function hasExactKeys(value, keys) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function safeInteger(value, { positive = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  return Number.isSafeInteger(value) && value >= (positive ? 1 : 0) && value <= max
}

function parsePositiveAnswerArray(value, length) {
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
    result.push(text)
  }
  return result
}

function parseRawJson(raw, keys) {
  if (typeof raw?.expr !== 'string' || typeof raw.answer !== 'string') return null
  try {
    const value = JSON.parse(raw.expr)
    return hasExactKeys(value, keys) ? value : null
  } catch { return null }
}

function parseRawJsonWithOptionalKeys(raw, requiredKeys, optionalKeys = []) {
  if (typeof raw?.expr !== 'string' || typeof raw.answer !== 'string') return null
  try {
    const value = JSON.parse(raw.expr)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const allowed = new Set([...requiredKeys, ...optionalKeys])
    if (!requiredKeys.every(key => Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some(key => !allowed.has(key))) return null
    return value
  } catch { return null }
}

function calculateOperation(a, operation, b) {
  const result = operation === '+' ? a + b : a - b
  return Number.isSafeInteger(result) ? result : null
}

function mathCandidate(raw, mathType, renderData, answer, due, grade) {
  return {
    id: `${raw.type}_${raw.expr}`, subject: 'math', grade, kind: 'math-special', mathType,
    prompt: mathType === 'hundredChart' ? '按百数表规律填空' : mathType === 'triangle-free' ? '用完数字池，使每条边的和等于目标数' : '请完成填空',
    renderData, answer, sourceRef: { expr: raw.expr, answer: raw.answer, type: raw.type }, due: !!due,
  }
}

function normalizeFillOp(raw, due, grade) {
  const matched = typeof raw?.expr === 'string' && raw.expr.match(/^[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*=[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*$/)
  if (!matched || !/^[+-]$/.test(raw?.answer || '')) return null
  const values = matched.slice(1).map(Number)
  if (!values.every(value => safeInteger(value))) return null
  const [a, b, c] = values
  if (calculateOperation(a, raw.answer, b) !== c) return null
  return mathCandidate(raw, 'fillOp', { a, b, c }, raw.answer, due, grade)
}

function normalizeFillOp2(raw, due, grade) {
  const matched = typeof raw?.expr === 'string' && raw.expr.match(/^[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*=[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*○[\x09\x0A\x0C\x0D\x20]*([0-9]+)[\x09\x0A\x0C\x0D\x20]*$/)
  const operators = typeof raw?.answer === 'string' && raw.answer.match(/^([+-]),([+-])$/)
  if (!matched || !operators) return null
  const values = matched.slice(1).map(Number)
  if (!values.every(value => safeInteger(value))) return null
  const [a, b, c, d] = values
  if (calculateOperation(a, operators[1], b) !== calculateOperation(c, operators[2], d)) return null
  return mathCandidate(raw, 'fillOp2', { a, b, c, d }, JSON.stringify([operators[1], operators[2]]), due, grade)
}

function parseGridKey(key, rows, cols) {
  if (typeof key !== 'string' || !/^(0|[1-9][0-9]*),(0|[1-9][0-9]*)$/.test(key)) return null
  const [row, col] = key.split(',').map(Number)
  return row < rows && col < cols ? [row, col] : null
}

function normalizeHundredChart(raw, due, grade) {
  const data = parseRawJsonWithOptionalKeys(raw, ['rows', 'cols', 'cellMap', 'centerKey', 'hiddenKeys'], ['center'])
  if (!data || !safeInteger(data.rows, { positive: true, max: 10 }) || !safeInteger(data.cols, { positive: true, max: 10 }) ||
      !data.cellMap || typeof data.cellMap !== 'object' || Array.isArray(data.cellMap) || !Array.isArray(data.hiddenKeys) || data.hiddenKeys.length === 0) return null
  const allKeys = Object.keys(data.cellMap)
  if (new Set(data.hiddenKeys).size !== data.hiddenKeys.length || data.hiddenKeys.some(key => !allKeys.includes(key)) ||
      !allKeys.includes(data.centerKey) || data.hiddenKeys.includes(data.centerKey)) return null
  const centerPosition = parseGridKey(data.centerKey, data.rows, data.cols)
  const center = data.cellMap[data.centerKey]
  if (!centerPosition || !safeInteger(center, { positive: true, max: 100 }) ||
      (Object.prototype.hasOwnProperty.call(data, 'center') && data.center !== center)) return null
  for (const key of allKeys) if (!parseGridKey(key, data.rows, data.cols)) return null
  for (const [key, value] of Object.entries(data.cellMap)) {
    if (!safeInteger(value, { positive: true, max: 100 })) return null
    const [row, col] = parseGridKey(key, data.rows, data.cols)
    const expected = center + (row - centerPosition[0]) * 10 + col - centerPosition[1]
    if (value !== expected) return null
  }
  const answer = parsePositiveAnswerArray(raw.answer, data.hiddenKeys.length)
  if (!answer) return null
  for (let index = 0; index < data.hiddenKeys.length; index++) {
    const [row, col] = parseGridKey(data.hiddenKeys[index], data.rows, data.cols)
    const expected = center + (row - centerPosition[0]) * 10 + col - centerPosition[1]
    if (answer[index] !== String(expected) || expected < 1 || expected > 100) return null
  }
  return mathCandidate(raw, 'hundredChart', {
    rows: data.rows, cols: data.cols, centerKey: data.centerKey, hiddenKeys: [...data.hiddenKeys],
    cellMap: Object.fromEntries(allKeys.filter(key => !data.hiddenKeys.includes(key)).map(key => [key, String(data.cellMap[key])])),
  }, JSON.stringify(answer), due, grade)
}

function validPartition(shown, hidden, keys) {
  if (!Array.isArray(shown) || !Array.isArray(hidden) || hidden.length === 0 || shown.length + hidden.length !== keys.length) return false
  if (new Set(shown).size !== shown.length || new Set(hidden).size !== hidden.length) return false
  return [...shown, ...hidden].every(key => typeof key === 'string' && keys.includes(key)) &&
    keys.every(key => shown.includes(key) !== hidden.includes(key))
}

function normalizeShape(raw, due, keys, edges, grade) {
  const data = parseRawJson(raw, ['target', 'vals', 'shown', 'hidden'])
  if (!data || !safeInteger(data.target, { positive: true }) || !hasExactKeys(data.vals, keys) || !validPartition(data.shown, data.hidden, keys) ||
      !keys.every(key => safeInteger(data.vals[key], { positive: true })) || !edges.every(edge => edge.reduce((sum, key) => sum + data.vals[key], 0) === data.target)) return null
  const answer = parsePositiveAnswerArray(raw.answer, data.hidden.length)
  if (!answer || answer.some((value, index) => value !== String(data.vals[data.hidden[index]]))) return null
  return mathCandidate(raw, raw.type, {
    target: data.target, shown: [...data.shown], hidden: [...data.hidden], cellMap: Object.fromEntries(data.shown.map(key => [key, String(data.vals[key])])),
  }, JSON.stringify(answer), due, grade)
}

function normalizeTriangleFree(raw, due, grade) {
  const data = parseRawJsonWithOptionalKeys(raw, ['target', 'numbers', 'shown', 'hidden'], ['vals'])
  if (!data || raw.answer !== '' || !safeInteger(data.target, { positive: true }) || !Array.isArray(data.numbers) || data.numbers.length !== TRIANGLE_KEYS.length ||
      !Array.isArray(data.shown) || data.shown.length !== 0 || !Array.isArray(data.hidden) || data.hidden.length !== TRIANGLE_KEYS.length || data.hidden.some((key, index) => key !== TRIANGLE_KEYS[index]) ||
      !data.numbers.every(value => safeInteger(value, { positive: true })) || new Set(data.numbers).size !== TRIANGLE_KEYS.length) return null
  return mathCandidate(raw, 'triangle-free', { target: data.target, numbers: [...data.numbers], shown: [], hidden: [...TRIANGLE_KEYS] }, '', due, grade)
}

export function normalizeMathSpecialQuestion(raw, { due = false, grade = ACTIVE_LEARNING_GRADE } = {}) {
  assertAvailableLearningGrade(grade)
  if (!raw || !MATH_SPECIAL_TYPES.has(raw.type)) return null
  try {
    if (raw.type === 'fillOp') return normalizeFillOp(raw, due, grade)
    if (raw.type === 'fillOp2') return normalizeFillOp2(raw, due, grade)
    if (raw.type === 'hundredChart') return normalizeHundredChart(raw, due, grade)
    if (raw.type === 'triangle') return normalizeShape(raw, due, TRIANGLE_KEYS, [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['A', 'AC', 'C']], grade)
    if (raw.type === 'square') return normalizeShape(raw, due, SQUARE_KEYS, [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['C', 'CD', 'D'], ['D', 'DA', 'A']], grade)
    return normalizeTriangleFree(raw, due, grade)
  } catch { return null }
}

function choice(id, subject, grade, prompt, answer, values, sourceRef) {
  return { id, subject, grade, kind: 'choice', prompt, options: values.map(value => ({ label: String(value), value: String(value) })), answer: String(answer), sourceRef, due: false }
}

export function buildChineseCandidates({ grade, seed = 'chinese' } = {}) {
  assertAvailableLearningGrade(grade)
  const rng = xorshift32(`${seed}|source`)
  const strokeCounts = [...new Set(chineseQuestions.filter(q => q.type === 'stroke').map(q => q.strokeCount))]
  return chineseQuestions.flatMap(item => {
    const id = `${item.type}_${item.char}_${item.unit}`
    if (item.type === 'pinyin' && typeof item.pinyin === 'string') return [choice(id, 'chinese', grade, `“${item.char}”的拼音是？`, item.pinyin, shuffleWithRng([item.pinyin, ...(item.distractors || [])].slice(0, 4), rng), { question_id: id, type: 'pinyin', char: item.char, unit: item.unit, qType: 'paper' })]
    if (item.type === 'stroke' && Number.isInteger(item.strokeCount)) return [choice(id, 'chinese', grade, `“${item.char}”有几画？`, item.strokeCount, shuffleWithRng([item.strokeCount, ...shuffleWithRng(strokeCounts.filter(n => n !== item.strokeCount), rng).slice(0, 3)], rng), { question_id: id, type: 'hanzi', char: item.char, unit: item.unit, qType: 'paper' })]
    return []
  })
}

export function buildEnglishCandidates({ grade, seed = 'english' } = {}) {
  assertAvailableLearningGrade(grade)
  const rng = xorshift32(`${seed}|source`)
  const words = Object.entries(englishWords).flatMap(([theme, items]) => items.map(item => ({ ...item, theme })))
  const candidates = words.map(item => {
    const id = `word_${item.theme}_${item.word}`
    const distractors = shuffleWithRng(words.filter(other => other.word !== item.word), rng).slice(0, 3).map(other => other.word)
    return choice(id, 'english', grade, `${item.emoji || '🔤'} 对应哪个单词？`, item.word, shuffleWithRng([item.word, ...distractors], rng), { question_id: id, type: 'word', word: item.word, theme: item.theme, emoji: item.emoji, zh: item.zh, qType: 'paper' })
  })
  for (const item of englishLetters) {
    const id = `letter_${item.upper}`
    const distractors = shuffleWithRng(englishLetters.filter(other => other.upper !== item.upper), rng).slice(0, 3).map(other => other.lower)
    candidates.push(choice(id, 'english', grade, `字母 ${item.upper} 的小写是？`, item.lower, shuffleWithRng([item.lower, ...distractors], rng), { question_id: id, type: 'letter', upper: item.upper, lower: item.lower, phonics: item.phonics, example: item.example, exampleZh: item.exampleZh, emoji: item.emoji, qType: 'paper' }))
  }
  return candidates
}

function normalizeOrdinaryMath(raw, due = false, grade) {
  if (!raw || !NORMAL_MATH_TYPES.has(raw.type) || typeof raw.expr !== 'string' || !raw.expr || raw.answer === undefined) return null
  return { id: `${raw.type}_${raw.expr}`, subject: 'math', grade, kind: raw.type === 'compare' ? 'choice' : 'input', prompt: raw.expr, ...(raw.type === 'compare' ? { options: ['＜', '＝', '＞'].map(value => ({ label: value, value })) } : {}), answer: String(raw.answer), sourceRef: { expr: raw.expr, answer: String(raw.answer), type: raw.type }, due: !!due }
}

function normalizeMathQuestion(raw, options) {
  return normalizeMathSpecialQuestion(raw, options) || normalizeOrdinaryMath(raw, options?.due, options?.grade)
}

export function buildMathCandidates({ grade, difficulty = 'medium', seed = 'math', count = 120, onMissing } = {}) {
  assertAvailableLearningGrade(grade)
  const level = difficulty === 'easy' ? 1 : difficulty === 'hard' ? 3 : 2
  const rng = xorshift32(`${seed}|source`)
  const raw = ['fillOpSingle', 'fillOpDouble', 'hundredChart', 'triangle', 'square', 'triangleFree'].flatMap(questionType => generateQuestions({ grade, level, count: 1, questionType, rng }))
  raw.push(...generateQuestions({ grade, level, count: Math.max(0, count - raw.length), questionType: ['add', 'sub', 'compare', 'fill'], rng }))
  return raw.flatMap(item => {
    const candidate = normalizeMathQuestion(item, { due: false, grade })
    if (candidate) return [candidate]
    onMissing?.('PAPER_SOURCE_MISSING', 'paper')
    return []
  })
}

export function markDueCandidates(candidates, dueItems, onMissing) {
  const map = new Map(candidates.map(item => [item.id, item]))
  const seen = new Set()
  for (const due of Array.isArray(dueItems) ? dueItems : []) {
    const id = typeof due?.question_id === 'string' ? due.question_id : ''
    const candidate = map.get(id)
    if (candidate) { if (!seen.has(id)) candidate.due = true; seen.add(id) }
    else onMissing?.('PAPER_SOURCE_MISSING', 'paper')
  }
  return candidates
}

function projectLegacyDueGrade(item, grade) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  if (!Object.prototype.hasOwnProperty.call(item, 'grade')) return { ...item, grade }
  return item.grade === grade ? item : null
}

export function buildAllPaperSources({ grade, difficulty, seed, due = {}, onMissing } = {}) {
  const gradeResult = validatePaperGrade(grade)
  if (!gradeResult.ok) return gradeResult
  const dueMath = []
  for (const rawItem of Array.isArray(due.math) ? due.math : []) {
    const item = projectLegacyDueGrade(rawItem, grade)
    if (!item) continue
    const candidate = normalizeMathQuestion(item, { due: true, grade })
    if (candidate) dueMath.push(candidate)
    else onMissing?.('PAPER_SOURCE_MISSING', 'paper')
  }
  const freshMath = buildMathCandidates({ grade, difficulty, seed, onMissing })
  const math = new Map()
  for (const item of [...dueMath, ...freshMath]) if (!math.has(item.id)) math.set(item.id, item)
  return { ok: true, candidates: {
    math: [...math.values()],
    chinese: markDueCandidates(buildChineseCandidates({ grade, seed }), (due.chinese || []).map(item => projectLegacyDueGrade(item, grade)).filter(Boolean), onMissing),
    english: markDueCandidates(buildEnglishCandidates({ grade, seed }), (due.english || []).map(item => projectLegacyDueGrade(item, grade)).filter(Boolean), onMissing),
  } }
}

export function resolveDashboardDue({ grade, due = {}, onMissing } = {}) {
  assertAvailableLearningGrade(grade)
  const languageIds = { chinese: new Set(buildChineseCandidates({ grade, seed: 'dashboard-due' }).map(item => item.id)), english: new Set(buildEnglishCandidates({ grade, seed: 'dashboard-due' }).map(item => item.id)) }
  const resolved = { chinese: [], math: [], english: [] }
  for (const subject of ['chinese', 'english']) {
    const seen = new Set()
    for (const rawItem of Array.isArray(due[subject]) ? due[subject] : []) {
      const item = projectLegacyDueGrade(rawItem, grade)
      if (!item) continue
      if (typeof item?.question_id === 'string' && languageIds[subject].has(item.question_id)) { if (!seen.has(item.question_id)) resolved[subject].push({ ...item, resolvable: true }); seen.add(item.question_id) }
      else onMissing?.('PAPER_SOURCE_MISSING', 'paper')
    }
  }
  const mathSeen = new Set()
  for (const rawItem of Array.isArray(due.math) ? due.math : []) {
    const item = projectLegacyDueGrade(rawItem, grade)
    if (!item) continue
    const candidate = normalizeMathQuestion(item, { due: true, grade })
    if (candidate) { if (!mathSeen.has(candidate.id)) resolved.math.push({ ...item, resolvable: true }); mathSeen.add(candidate.id) }
    else onMissing?.('PAPER_SOURCE_MISSING', 'paper')
  }
  return resolved
}
