import { ACTIVE_LEARNING_GRADE, assertAvailableLearningGrade, isKnownLearningGrade } from './gradeContext.js'
import { BACKUP_STORAGE_KEYS, LEGACY_BACKUP_STORAGE_KEYS, STORAGE_KEYS } from './storageRegistry.js'
import { UNIT_CONFIG } from '../chinese/unitConfig.js'

const ARRAY_KEYS = new Set([
  STORAGE_KEYS.mathHistory,
  STORAGE_KEYS.mathWrongBook,
  STORAGE_KEYS.chinesePracticeLogs,
  STORAGE_KEYS.chineseMistakes,
  STORAGE_KEYS.englishPracticeLogs,
  STORAGE_KEYS.englishMistakes,
])
const WRONG_KEYS = new Set([STORAGE_KEYS.mathWrongBook, STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes])
const SCOPED_KEYS = new Set([
  STORAGE_KEYS.mathOnlinePrefs,
  STORAGE_KEYS.chineseState,
  STORAGE_KEYS.englishState,
  STORAGE_KEYS.learningGoal,
  STORAGE_KEYS.learningChallenge,
])

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function isIso(value) {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

function isJsonSerializable(value) {
  try { return JSON.stringify(value) !== undefined } catch { return false }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function validCounts(total, correct) {
  return Number.isInteger(total) && total >= 0 && Number.isInteger(correct) && correct >= 0 && correct <= total
}

function canonicalQuestionId(record) {
  const values = []
  for (const key of ['_id', 'question_id']) {
    if (!hasOwn(record, key) || record[key] === null || record[key] === '') continue
    if (!isNonEmptyString(record[key])) return null
    values.push(record[key])
  }
  if (values.length === 0 || (values.length === 2 && values[0] !== values[1])) return null
  return values[0]
}

function validReviewFields(record) {
  return Number.isInteger(record.wrongCount) && record.wrongCount > 0 &&
    Number.isInteger(record.correctCount) && record.correctCount >= 0 &&
    Number.isInteger(record.box) && record.box >= 1 && record.box <= 5 &&
    isFiniteNumber(record.nextReviewAt) && isFiniteNumber(record.lastWrongAt) &&
    isFiniteNumber(record.createdAt) && typeof record.mastered === 'boolean' && isJsonSerializable(record)
}

function validLegacyRecord(key, record, { allowInvalidQuestionId = false } = {}) {
  if (!isObject(record) || hasOwn(record, 'grade')) return false
  if (key === STORAGE_KEYS.mathHistory) {
    return isNonEmptyString(record.type) && !Number.isNaN(new Date(record.createdAt).getTime()) &&
      ((!hasOwn(record, 'total') && !hasOwn(record, 'correct')) || validCounts(record.total, record.correct))
  }
  if ([STORAGE_KEYS.chinesePracticeLogs, STORAGE_KEYS.englishPracticeLogs].includes(key)) {
    return isNonEmptyString(record.type) && /^\d{4}-\d{2}-\d{2}$/.test(record.date || '') &&
      validCounts(record.totalCount, record.correctCount) && isFiniteNumber(record.createdAt)
  }
  if (key === STORAGE_KEYS.mathWrongBook) {
    return isNonEmptyString(record.id) && isNonEmptyString(record.expr) && isNonEmptyString(record.type) &&
      typeof record.answer === 'string' && validReviewFields(record)
  }
  const id = canonicalQuestionId(record)
  if ((!id && !allowInvalidQuestionId) || !validReviewFields(record)) return false
  if (key === STORAGE_KEYS.chineseMistakes) {
    return ['pinyin', 'hanzi'].includes(record.type) && isNonEmptyString(record.char) && isNonEmptyString(record.unit) &&
      (!hasOwn(record, 'qType') || typeof record.qType === 'string')
  }
  if (key === STORAGE_KEYS.englishMistakes) {
    if (record.type === 'word') return isNonEmptyString(record.word) && isNonEmptyString(record.theme) &&
      ['emoji', 'zh', 'qType'].every(name => !hasOwn(record, name) || typeof record[name] === 'string')
    if (record.type === 'letter') {
      return /^[A-Z]$/.test(record.upper || '') && /^[a-z]$/.test(record.lower || '') &&
        ['phonics', 'example', 'exampleZh', 'emoji', 'zh', 'qType'].every(name => !hasOwn(record, name) || typeof record[name] === 'string')
    }
  }
  return false
}

function validProjectedRecord(key, record) {
  if (!isObject(record) || !isKnownLearningGrade(record.grade)) return false
  const withoutGrade = { ...record }
  delete withoutGrade.grade
  return validLegacyRecord(key, withoutGrade)
}

function projectRecord(key, record) {
  if (!isObject(record)) return clone(record)
  if (hasOwn(record, 'grade')) return clone(record)
  if (!validLegacyRecord(key, record)) return clone(record)
  const projected = { ...clone(record), grade: ACTIVE_LEARNING_GRADE }
  if ([STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes].includes(key)) {
    const id = canonicalQuestionId(projected)
    projected._id = id
    projected.question_id = id
  }
  return projected
}

function identityFor(key, record) {
  if (!validProjectedRecord(key, record)) return null
  if (key === STORAGE_KEYS.mathWrongBook) return `${record.grade}\u0000${record.expr}\u0000${record.type}`
  if ([STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes].includes(key)) {
    return `${record.grade}\u0000${key === STORAGE_KEYS.chineseMistakes ? 'chinese' : 'english'}\u0000${canonicalQuestionId(record)}`
  }
  return null
}

function newerValue(record, key) {
  return isFiniteNumber(record[key]) ? record[key] : Number.NEGATIVE_INFINITY
}

function chooseWinner(group) {
  return [...group].sort((left, right) => {
    if (left.explicitGrade !== right.explicitGrade) return left.explicitGrade ? -1 : 1
    const wrongDelta = newerValue(right.record, 'lastWrongAt') - newerValue(left.record, 'lastWrongAt')
    if (wrongDelta) return wrongDelta
    const createdDelta = newerValue(right.record, 'createdAt') - newerValue(left.record, 'createdAt')
    if (createdDelta) return createdDelta
    return left.index - right.index
  })[0]
}

function minPresent(records, key) {
  const values = records.map(record => record[key]).filter(isFiniteNumber)
  return values.length ? Math.min(...values) : undefined
}

function maxPresent(records, key) {
  const values = records.map(record => record[key]).filter(isFiniteNumber)
  return values.length ? Math.max(...values) : undefined
}

export function mergeProjectedMistakes(records, key) {
  if (!WRONG_KEYS.has(key)) return clone(records)
  const projected = records.map((record, index) => ({
    record: projectRecord(key, record),
    index,
    explicitGrade: isObject(record) && hasOwn(record, 'grade') && isKnownLearningGrade(record.grade),
  }))
  const groups = new Map()
  for (const item of projected) {
    const identity = identityFor(key, item.record)
    if (!identity) continue
    if (!groups.has(identity)) groups.set(identity, [])
    groups.get(identity).push(item)
  }
  const replacements = new Map()
  const consumed = new Set()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const winner = chooseWinner(group)
    const all = group.map(item => item.record)
    const merged = { ...clone(winner.record) }
    merged.wrongCount = Math.max(...all.map(item => item.wrongCount))
    merged.correctCount = Math.max(...all.map(item => item.correctCount))
    merged.box = Math.min(...all.map(item => item.box))
    merged.nextReviewAt = minPresent(all, 'nextReviewAt')
    merged.mastered = all.every(item => item.mastered === true)
    const lastWrongAt = maxPresent(all, 'lastWrongAt')
    const createdAt = minPresent(all, 'createdAt')
    if (lastWrongAt === undefined) delete merged.lastWrongAt
    else merged.lastWrongAt = lastWrongAt
    if (createdAt === undefined) delete merged.createdAt
    else merged.createdAt = createdAt
    if ([STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes].includes(key)) {
      const id = canonicalQuestionId(merged)
      merged._id = id
      merged.question_id = id
    }
    const outputIndex = Math.min(...group.map(item => item.index))
    replacements.set(outputIndex, merged)
    group.forEach(item => consumed.add(item.index))
  }
  const result = []
  for (const item of projected) {
    if (replacements.has(item.index)) result.push(replacements.get(item.index))
    else if (!consumed.has(item.index)) result.push(item.record)
  }
  return result
}

function projectArray(key, value) {
  const source = Array.isArray(value) ? value : []
  if (WRONG_KEYS.has(key)) return mergeProjectedMistakes(source, key)
  return source.map(record => projectRecord(key, record))
}

function validLegacyScopedValue(key, value) {
  if (!isObject(value) || !isJsonSerializable(value)) return false
  if ([STORAGE_KEYS.mathOnlinePrefs, STORAGE_KEYS.chineseState, STORAGE_KEYS.englishState].includes(key)) {
    if (hasOwn(value, 'schemaVersion') || hasOwn(value, 'byGrade')) return false
    if (key === STORAGE_KEYS.chineseState && hasOwn(value, 'currentUnit') && !hasOwn(UNIT_CONFIG, value.currentUnit)) return false
    if (hasOwn(value, 'prefs') && (!isObject(value.prefs) || Object.entries(value.prefs).some(([page, prefs]) => !isNonEmptyString(page) || !isObject(prefs)))) return false
    return true
  }
  if (key === STORAGE_KEYS.learningGoal) {
    return Object.keys(value).length === 3 && value.schemaVersion === 1 && Number.isInteger(value.dailyTarget) &&
      value.dailyTarget >= 10 && value.dailyTarget <= 200 && isIso(value.updatedAt)
  }
  if (key === STORAGE_KEYS.learningChallenge) {
    return Object.keys(value).length === 2 && value.schemaVersion === 1 && isObject(value.badges) &&
      Object.entries(value.badges).every(([weekId, badge]) => /^\d{4}-\d{2}-\d{2}$/.test(weekId) &&
        isObject(badge) && Object.keys(badge).length === 1 && isIso(badge.earnedAt))
  }
  return false
}

function validV2Record(key, record) {
  if (!isObject(record) || !hasOwn(record, 'grade') || !isJsonSerializable(record)) return false
  const withoutGrade = { ...record }
  delete withoutGrade.grade
  return validLegacyRecord(key, withoutGrade, {
    allowInvalidQuestionId: [STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes].includes(key),
  })
}

function validV2ScopedValue(key, value) {
  if (!isObject(value) || value.schemaVersion !== 2 || !isObject(value.byGrade) || Object.keys(value).length !== 2) return false
  return Object.entries(value.byGrade).every(([grade, bucket]) => {
    if (!isKnownLearningGrade(grade) || !isObject(bucket) || !isJsonSerializable(bucket)) return false
    if ([STORAGE_KEYS.mathOnlinePrefs, STORAGE_KEYS.chineseState, STORAGE_KEYS.englishState].includes(key)) {
      return validLegacyScopedValue(key, bucket)
    }
    if (key === STORAGE_KEYS.learningGoal) {
      return Object.keys(bucket).length === 2 && Number.isInteger(bucket.dailyTarget) &&
        bucket.dailyTarget >= 10 && bucket.dailyTarget <= 200 && isIso(bucket.updatedAt)
    }
    if (key === STORAGE_KEYS.learningChallenge) {
      return Object.keys(bucket).length === 1 && isObject(bucket.badges) &&
        Object.entries(bucket.badges).every(([weekId, badge]) => /^\d{4}-\d{2}-\d{2}$/.test(weekId) &&
          isObject(badge) && Object.keys(badge).length === 1 && isIso(badge.earnedAt))
    }
    return false
  })
}

function legacyBucket(key, value) {
  if (key === STORAGE_KEYS.learningGoal) return { dailyTarget: value.dailyTarget, updatedAt: value.updatedAt }
  if (key === STORAGE_KEYS.learningChallenge) return { badges: clone(value.badges) }
  return clone(value)
}

function projectScopedValue(key, value) {
  if (isObject(value) && value.schemaVersion === 2 && isObject(value.byGrade)) return clone(value)
  if (validLegacyScopedValue(key, value)) {
    return { schemaVersion: 2, byGrade: { [ACTIVE_LEARNING_GRADE]: legacyBucket(key, value) } }
  }
  return clone(value)
}

export function projectLearningValue(key, value) {
  if (value === undefined) return undefined
  if (ARRAY_KEYS.has(key)) {
    if ([STORAGE_KEYS.mathHistory, STORAGE_KEYS.mathWrongBook].includes(key)) {
      if (typeof value !== 'string') return clone(value)
      try { return JSON.stringify(projectArray(key, JSON.parse(value))) } catch { return value }
    }
    return Array.isArray(value) ? projectArray(key, value) : clone(value)
  }
  if (SCOPED_KEYS.has(key)) return projectScopedValue(key, value)
  return clone(value)
}

export function selectLearningGrade(key, value, grade) {
  assertAvailableLearningGrade(grade)
  const projected = projectLearningValue(key, value)
  if (ARRAY_KEYS.has(key)) {
    let list = projected
    if ([STORAGE_KEYS.mathHistory, STORAGE_KEYS.mathWrongBook].includes(key)) {
      try { list = JSON.parse(projected || '[]') } catch { list = [] }
    }
    return Array.isArray(list) ? clone(list.filter(item => item?.grade === grade && validProjectedRecord(key, item))) : []
  }
  if (SCOPED_KEYS.has(key)) {
    return isObject(projected) && projected.schemaVersion === 2 && isObject(projected.byGrade)
      ? clone(projected.byGrade[grade] ?? null)
      : null
  }
  return clone(projected)
}

export function mergeLearningGradeRecords(key, full, grade, current, { limit = Number.POSITIVE_INFINITY, newestFirst = false } = {}) {
  assertAvailableLearningGrade(grade)
  const validLimit = limit === Number.POSITIVE_INFINITY || (Number.isInteger(limit) && limit >= 0)
  if (!ARRAY_KEYS.has(key) || !Array.isArray(full) || !Array.isArray(current) || !validLimit) {
    throw new Error('LEARNING_GRADE_VALUE_INVALID')
  }
  const source = clone(full)
  const replacements = clone(current)
  const capped = Number.isFinite(limit)
    ? (newestFirst ? replacements.slice(0, limit) : replacements.slice(-limit))
    : replacements
  const result = []
  let replacementIndex = 0
  for (const item of source) {
    if (item?.grade === grade && validProjectedRecord(key, item)) {
      if (replacementIndex < capped.length) result.push(capped[replacementIndex++])
    } else {
      result.push(item)
    }
  }
  while (replacementIndex < capped.length) result.push(capped[replacementIndex++])
  return result
}

export function updateLearningGradeBucket(key, value, grade, updater) {
  assertAvailableLearningGrade(grade)
  if (!SCOPED_KEYS.has(key) || typeof updater !== 'function') throw new Error('LEARNING_GRADE_VALUE_INVALID')
  const projected = projectLearningValue(key, value)
  const root = isObject(projected) && projected.schemaVersion === 2 && isObject(projected.byGrade)
    ? clone(projected)
    : { schemaVersion: 2, byGrade: {} }
  root.byGrade[grade] = clone(updater(clone(root.byGrade[grade] ?? {})))
  return root
}

export function assertValidLearningSnapshotV2(snapshot) {
  if (!isObject(snapshot)) throw new Error('BACKUP_INVALID')
  for (const key of ARRAY_KEYS) {
    const item = snapshot[key]
    if (!item?.present) continue
    let list = item.value
    if ([STORAGE_KEYS.mathHistory, STORAGE_KEYS.mathWrongBook].includes(key)) {
      if (typeof list !== 'string') throw new Error('BACKUP_INVALID')
      try { list = JSON.parse(list) } catch { throw new Error('BACKUP_INVALID') }
    }
    if (!Array.isArray(list) || list.some(record => !validV2Record(key, record))) throw new Error('BACKUP_INVALID')
  }
  for (const key of SCOPED_KEYS) {
    const item = snapshot[key]
    if (item?.present && !validV2ScopedValue(key, item.value)) throw new Error('BACKUP_INVALID')
  }
  return true
}

function strictLegacyValue(key, value) {
  if ([STORAGE_KEYS.mathHistory, STORAGE_KEYS.mathWrongBook].includes(key)) {
    if (typeof value !== 'string') throw new Error('BACKUP_INVALID')
    let list
    try { list = JSON.parse(value) } catch { throw new Error('BACKUP_INVALID') }
    if (!Array.isArray(list) || list.some(item => !validLegacyRecord(key, item))) throw new Error('BACKUP_INVALID')
    return JSON.stringify(projectArray(key, list))
  }
  if ([STORAGE_KEYS.chinesePracticeLogs, STORAGE_KEYS.englishPracticeLogs, STORAGE_KEYS.chineseMistakes, STORAGE_KEYS.englishMistakes].includes(key)) {
    if (!Array.isArray(value) || value.some(item => !validLegacyRecord(key, item))) throw new Error('BACKUP_INVALID')
    return projectArray(key, value)
  }
  if (SCOPED_KEYS.has(key)) {
    if (!validLegacyScopedValue(key, value)) throw new Error('BACKUP_INVALID')
    return projectScopedValue(key, value)
  }
  return clone(value)
}

export function convertLegacyLearningSnapshotV1(snapshot) {
  if (!isObject(snapshot) || Object.keys(snapshot).length !== LEGACY_BACKUP_STORAGE_KEYS.length ||
      LEGACY_BACKUP_STORAGE_KEYS.some(key => !hasOwn(snapshot, key))) throw new Error('BACKUP_INVALID')
  const target = {}
  for (const key of BACKUP_STORAGE_KEYS) {
    if (key === STORAGE_KEYS.learningGrade) {
      target[key] = { present: true, value: { schemaVersion: 1, grade: ACTIVE_LEARNING_GRADE } }
      continue
    }
    const item = snapshot[key]
    if (!isObject(item) || typeof item.present !== 'boolean') throw new Error('BACKUP_INVALID')
    target[key] = item.present
      ? { present: true, value: strictLegacyValue(key, item.value) }
      : { present: false }
  }
  return target
}
