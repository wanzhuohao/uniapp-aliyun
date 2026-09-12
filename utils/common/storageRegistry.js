const entry = (key, nativeType, owner, backup = true, diagnostic = true) =>
  Object.freeze({ key, nativeType, owner, backup, diagnostic })

export const STORAGE_REGISTRY = Object.freeze({
  learningGrade: entry('learning_grade_v1', 'object', 'grade'),
  mathHistory: entry('math_history', 'json-string', 'math'),
  mathWrongBook: entry('math_wrong_book', 'json-string', 'math'),
  mathOnlinePrefs: entry('math_online_prefs', 'object', 'math'),
  chinesePracticeLogs: entry('chinese_practice_logs', 'array', 'chinese'),
  chineseMistakes: entry('chinese_mistakes', 'array', 'chinese'),
  chineseState: entry('chinese_state', 'object', 'chinese'),
  englishPracticeLogs: entry('english_practice_logs', 'array', 'english'),
  englishMistakes: entry('english_mistakes', 'array', 'english'),
  englishState: entry('english_state', 'object', 'english'),
  twentyFourStats: entry('twenty_four_stats', 'object', 'games'),
  sudokuStats: entry('sudoku_stats', 'object', 'games'),
  slidingPuzzleStats: entry('sliding_puzzle_stats', 'object', 'games'),
  idiomChainBest: entry('idiom_chain_best', 'finite-number', 'games'),
  idiomChainLast: entry('idiom_chain_last', 'object', 'games'),
  planeLeaderboardScores: entry('plane_leaderboard_scores', 'array', 'games'),
  learningGoal: entry('learning_goal_v1', 'object', 'dashboard'),
  learningChallenge: entry('learning_challenge_v1', 'object', 'dashboard'),
  diagnosticErrors: entry('learning_diagnostic_errors_v1', 'array', 'diagnostic'),
})

export const CONTROL_STORAGE_REGISTRY = Object.freeze({
  transaction: entry('learning_backup_transaction_v1', 'object', 'recovery', false, false),
  fence: entry('learning_backup_fence_v1', 'object', 'recovery', false, false),
})

export const STORAGE_KEYS = Object.freeze(
  Object.fromEntries(Object.entries(STORAGE_REGISTRY).map(([name, value]) => [name, value.key]))
)

export const CONTROL_STORAGE_KEYS = Object.freeze(
  Object.fromEntries(Object.entries(CONTROL_STORAGE_REGISTRY).map(([name, value]) => [name, value.key]))
)

export const BUSINESS_STORAGE_KEYS = Object.freeze(Object.values(STORAGE_KEYS))
export const BACKUP_STORAGE_KEYS = Object.freeze(
  Object.values(STORAGE_REGISTRY).filter(item => item.backup).map(item => item.key)
)
export const LEGACY_BACKUP_STORAGE_KEYS = Object.freeze(
  BACKUP_STORAGE_KEYS.filter(key => key !== STORAGE_KEYS.learningGrade)
)
export const DIAGNOSTIC_STORAGE_KEYS = Object.freeze(
  Object.values(STORAGE_REGISTRY).filter(item => item.diagnostic).map(item => item.key).sort()
)

const byKey = new Map([
  ...Object.values(STORAGE_REGISTRY),
  ...Object.values(CONTROL_STORAGE_REGISTRY),
].map(item => [item.key, item]))

const DIAGNOSTIC_CODES = new Set([
  'STORAGE_READ_FAILED', 'STORAGE_WRITE_FAILED', 'BACKUP_INVALID', 'BACKUP_RESTORE_FAILED',
  'PAPER_SOURCE_MISSING', 'FILE_GENERATION_FAILED', 'DOWNLOAD_UNAVAILABLE', 'IMAGE_CAPTURE_FAILED',
  'ZIP_GENERATION_FAILED', 'QUALITY_BLOCKED', 'UNKNOWN_CONTROLLED_ERROR',
])
const DIAGNOSTIC_MODULES = new Set(['app', 'storage', 'backup', 'paper', 'export', 'template', 'quality', 'diagnostic'])

function hasExactKeys(value, keys) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function isIsoString(value) {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

const KNOWN_GRADE_VALUES = Object.freeze([
  'grade1-term2', 'grade2-term1', 'grade2-term2',
  'grade3-term1', 'grade3-term2', 'grade4-term1', 'grade4-term2',
  'grade5-term1', 'grade5-term2', 'grade6-term1', 'grade6-term2',
])

function isKnownGrade(value) {
  return KNOWN_GRADE_VALUES.includes(value)
}

function isJsonObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isGradeBuckets(value, validateBucket) {
  return isJsonObject(value) && Object.entries(value).every(([grade, bucket]) => isKnownGrade(grade) && validateBucket(bucket))
}

function validateBadgeMap(value) {
  return isJsonObject(value) && Object.entries(value).every(([weekId, badge]) => /^\d{4}-\d{2}-\d{2}$/.test(weekId) &&
    hasExactKeys(badge, ['earnedAt']) && isIsoString(badge.earnedAt))
}

function validateSpecialObject(key, value, schemaVersion = 'runtime') {
  if (key === STORAGE_KEYS.learningGrade) {
    return hasExactKeys(value, ['schemaVersion', 'grade']) && value.schemaVersion === 1 && isKnownGrade(value.grade)
  }
  if (key === STORAGE_KEYS.learningGoal) {
    const validV1 = hasExactKeys(value, ['schemaVersion', 'dailyTarget', 'updatedAt']) && value.schemaVersion === 1 &&
      Number.isInteger(value.dailyTarget) && value.dailyTarget >= 10 && value.dailyTarget <= 200 && isIsoString(value.updatedAt)
    const validV2 = hasExactKeys(value, ['schemaVersion', 'byGrade']) && value.schemaVersion === 2 &&
      isGradeBuckets(value.byGrade, bucket => hasExactKeys(bucket, ['dailyTarget', 'updatedAt']) &&
        Number.isInteger(bucket.dailyTarget) && bucket.dailyTarget >= 10 && bucket.dailyTarget <= 200 && isIsoString(bucket.updatedAt))
    return schemaVersion === 1 ? validV1 : schemaVersion === 2 ? validV2 : validV1 || validV2
  }
  if (key === STORAGE_KEYS.learningChallenge) {
    const validV1 = hasExactKeys(value, ['schemaVersion', 'badges']) && value.schemaVersion === 1 && validateBadgeMap(value.badges)
    const validV2 = hasExactKeys(value, ['schemaVersion', 'byGrade']) && value.schemaVersion === 2 &&
      isGradeBuckets(value.byGrade, bucket => hasExactKeys(bucket, ['badges']) && validateBadgeMap(bucket.badges))
    return schemaVersion === 1 ? validV1 : schemaVersion === 2 ? validV2 : validV1 || validV2
  }
  if ([STORAGE_KEYS.mathOnlinePrefs, STORAGE_KEYS.chineseState, STORAGE_KEYS.englishState].includes(key)) {
    const validV1 = isJsonObject(value) && !Object.prototype.hasOwnProperty.call(value, 'schemaVersion') &&
      !Object.prototype.hasOwnProperty.call(value, 'byGrade')
    const validV2 = hasExactKeys(value, ['schemaVersion', 'byGrade']) && value.schemaVersion === 2 && isGradeBuckets(value.byGrade, isJsonObject)
    return schemaVersion === 1 ? validV1 : schemaVersion === 2 ? validV2 : validV1 || validV2
  }
  return true
}

function validateSpecialArray(key, value) {
  if (key !== STORAGE_KEYS.diagnosticErrors) return true
  return value.length <= 20 && value.every(item => hasExactKeys(item, ['at', 'code', 'module']) &&
    isIsoString(item.at) && DIAGNOSTIC_CODES.has(item.code) && DIAGNOSTIC_MODULES.has(item.module))
}

export function getStorageEntry(key) {
  return byKey.get(key) || null
}

export function isBusinessStorageKey(key) {
  return Object.values(STORAGE_REGISTRY).some(item => item.key === key)
}

export function validateStorageValue(key, value, { schemaVersion = 'runtime' } = {}) {
  const descriptor = getStorageEntry(key)
  if (!descriptor) return false
  switch (descriptor.nativeType) {
    case 'json-string':
      if (typeof value !== 'string') return false
      try {
        return Array.isArray(JSON.parse(value))
      } catch {
        return false
      }
    case 'array':
      return Array.isArray(value) && validateSpecialArray(key, value)
    case 'object':
      return isJsonObject(value) && validateSpecialObject(key, value, schemaVersion)
    case 'finite-number':
      return typeof value === 'number' && Number.isFinite(value)
    default:
      return false
  }
}

export function assertRegisteredSnapshot(snapshot, keys = BACKUP_STORAGE_KEYS, options = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('BACKUP_INVALID')
  }
  const expected = new Set(keys)
  if (Object.keys(snapshot).some(key => !expected.has(key))) throw new Error('BACKUP_INVALID')
  for (const key of keys) {
    const item = snapshot[key]
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.present !== 'boolean') {
      throw new Error('BACKUP_INVALID')
    }
    const itemKeys = Object.keys(item)
    const expectedKeys = item.present ? ['present', 'value'] : ['present']
    if (itemKeys.length !== expectedKeys.length || expectedKeys.some(name => !Object.prototype.hasOwnProperty.call(item, name))) throw new Error('BACKUP_INVALID')
    if (item.present && !validateStorageValue(key, item.value, options)) throw new Error('BACKUP_INVALID')
    if (!item.present && Object.prototype.hasOwnProperty.call(item, 'value')) throw new Error('BACKUP_INVALID')
  }
  return true
}
