import { safeSetStorage } from '../common/safeStorage.js'
import { isLearningStorageGateError, learningStorageApi } from '../common/learningSession.js'
import { BACKUP_STORAGE_KEYS, STORAGE_KEYS, assertRegisteredSnapshot } from '../common/storageRegistry.js'
import { ACTIVE_LEARNING_GRADE, assertAvailableLearningGrade, assertCurrentLearningGrade } from '../common/gradeContext.js'
import { mergeLearningGradeRecords, projectLearningValue, selectLearningGrade } from '../common/gradeMigration.js'
import { sha256Hex } from '../common/paperEngine.js'

const MAX_RECORDS = 50
const STORAGE_KEY = STORAGE_KEYS.mathHistory
const WRONG_KEY = STORAGE_KEYS.mathWrongBook
const encoder = new TextEncoder()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(deepFreeze)
  return value
}

function hasExactKeys(value, keys) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

async function digest(value) {
  if (!globalThis.crypto?.subtle) throw new Error('FOCUS_ID_UNAVAILABLE')
  const hash = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(canonicalize(value)))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

function readSnapshotArray(snapshot, key) {
  const item = snapshot[key]
  if (!item?.present) return []
  const parsed = JSON.parse(projectLearningValue(key, item.value))
  if (!Array.isArray(parsed)) throw new Error('PAPER_SUBMISSION_INCONSISTENT')
  return clone(parsed)
}

function canonicalIso(value) {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

// ====== 历史记录 ======
export function getHistory(grade) {
  assertAvailableLearningGrade(grade)
  try {
    return selectLearningGrade(STORAGE_KEY, learningStorageApi.getStorageSync(STORAGE_KEY) || '[]', grade)
  } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return []
  }
}

export function saveRecord(record) {
  const grade = record?.grade
  assertAvailableLearningGrade(grade)
  let full = []
  try { full = JSON.parse(projectLearningValue(STORAGE_KEY, learningStorageApi.getStorageSync(STORAGE_KEY) || '[]')) } catch {}
  const list = selectLearningGrade(STORAGE_KEY, JSON.stringify(full), grade)
  const nextRecord = { ...record, id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), createdAt: new Date().toISOString() }
  list.unshift(nextRecord)
  assertCurrentLearningGrade(grade)
  return safeSetStorage(STORAGE_KEY, JSON.stringify(mergeLearningGradeRecords(STORAGE_KEY, full, grade, list, { limit: MAX_RECORDS, newestFirst: true })))
}

// ====== 错题本 (Leitner 盒子系统) ======
// 间隔天数: box1=1天, box2=1天, box3=3天, box4=7天, box5=15天
const BOX_INTERVALS = [1, 1, 3, 7, 15]
const DAY_MS = 86400000

function getWrongBook(grade) {
  assertAvailableLearningGrade(grade)
  try {
    return selectLearningGrade(WRONG_KEY, learningStorageApi.getStorageSync(WRONG_KEY) || '[]', grade)
  } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return []
  }
}

function getFullWrongBook() {
  try { return JSON.parse(projectLearningValue(WRONG_KEY, learningStorageApi.getStorageSync(WRONG_KEY) || '[]')) } catch { return [] }
}

function saveWrongBook(grade, list, full) {
  assertCurrentLearningGrade(grade)
  return safeSetStorage(WRONG_KEY, JSON.stringify(mergeLearningGradeRecords(WRONG_KEY, full, grade, list, { limit: 300, newestFirst: true })))
}

function clampBox(b) {
  const n = Number(b ?? 1)
  return Math.max(1, Math.min(5, Math.floor(n) || 1))
}

function nextReviewAt(box) {
  return Date.now() + BOX_INTERVALS[clampBox(box) - 1] * DAY_MS
}

function updateWrongBook(list, { grade, expr, answer, type }, now, idFactory) {
  const existing = list.find(record => record.grade === grade && record.expr === expr && record.type === type)
  if (existing) {
    existing.wrongCount = (existing.wrongCount || 0) + 1
    existing.correctCount = 0
    existing.box = 1
    existing.nextReviewAt = now + BOX_INTERVALS[0] * DAY_MS
    existing.mastered = false
    existing.lastWrongAt = now
  } else {
    list.push({
      grade, id: idFactory(), expr, answer, type, wrongCount: 1, correctCount: 0, box: 1,
      nextReviewAt: now + BOX_INTERVALS[0] * DAY_MS, mastered: false, lastWrongAt: now, createdAt: now,
    })
  }
  if (list.length > 300) {
    const masteredIdx = list.findIndex(record => record.mastered)
    if (masteredIdx >= 0) list.splice(masteredIdx, 1)
    else list.pop()
  }
}

export async function createFocusSubmissionIntent({ grade, focusInstanceId, answers, submittedAt = new Date().toISOString() }) {
  if (grade !== ACTIVE_LEARNING_GRADE || typeof focusInstanceId !== 'string' || !focusInstanceId || !Array.isArray(answers) || !canonicalIso(submittedAt)) throw new Error('FOCUS_SUBMISSION_INVALID')
  const normalizedAnswers = answers.map(item => ({
    expr: String(item?.expr ?? ''), answer: String(item?.answer ?? ''), type: String(item?.type ?? ''),
    userAnswer: String(item?.userAnswer ?? ''), correct: item?.correct === true,
  }))
  if (normalizedAnswers.some(item => !item.expr || !item.type)) throw new Error('FOCUS_SUBMISSION_INVALID')
  const base = { sessionGrade: grade, grade, submissionId: `focus:${focusInstanceId}`, submittedAt, answers: normalizedAnswers }
  return Object.freeze({ ...base, submissionDigest: await digest(canonicalize(base)) })
}

function focusReceiptMatches(receipt, intent) {
  const correct = intent.answers.filter(item => item.correct).length
  return receipt?.type === 'focus' && receipt.grade === intent.grade && receipt.submissionId === intent.submissionId &&
    receipt.submissionDigest === intent.submissionDigest && receipt.submittedAt === intent.submittedAt &&
    receipt.total === intent.answers.length && receipt.correct === correct
}

export function buildFocusSubmissionTarget(original, intent) {
  assertRegisteredSnapshot(original, BACKUP_STORAGE_KEYS)
  if (!intent || intent.grade !== ACTIVE_LEARNING_GRADE || intent.sessionGrade !== intent.grade || typeof intent.submissionId !== 'string' || typeof intent.submissionDigest !== 'string' || !canonicalIso(intent.submittedAt) || !Array.isArray(intent.answers)) {
    return { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  }
  const historyFull = readSnapshotArray(original, STORAGE_KEY)
  const wrongBookFull = readSnapshotArray(original, WRONG_KEY)
  const history = selectLearningGrade(STORAGE_KEY, JSON.stringify(historyFull), intent.grade)
  const wrongBook = selectLearningGrade(WRONG_KEY, JSON.stringify(wrongBookFull), intent.grade)
  const receipts = history.filter(item => item.grade === intent.grade && item.submissionId === intent.submissionId)
  if (receipts.length) return receipts.length === 1 && focusReceiptMatches(receipts[0], intent)
    ? { status: 'ALREADY_COMMITTED' }
    : { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  const correct = intent.answers.filter(item => item.correct).length
  history.unshift({
    grade: intent.grade, id: `focus_${intent.submissionId.slice(-12)}`, type: 'focus', level: 2, questionType: 'focus',
    total: intent.answers.length, correct, elapsed: 0, createdAt: intent.submittedAt,
    submissionId: intent.submissionId, submissionDigest: intent.submissionDigest, submittedAt: intent.submittedAt,
    questions: intent.answers.map(item => ({ ...item, isCorrect: item.correct })),
  })
  if (history.length > MAX_RECORDS) history.length = MAX_RECORDS
  const now = Date.parse(intent.submittedAt)
  intent.answers.forEach((item, answerIndex) => {
    if (!item.correct) updateWrongBook(wrongBook, { ...item, grade: intent.grade }, now, () => `focus_${intent.submissionId.slice(-10)}_${answerIndex}`)
  })
  const target = clone(original)
  target[STORAGE_KEY] = { present: true, value: JSON.stringify(mergeLearningGradeRecords(STORAGE_KEY, historyFull, intent.grade, history, { limit: MAX_RECORDS, newestFirst: true })) }
  target[WRONG_KEY] = { present: true, value: JSON.stringify(mergeLearningGradeRecords(WRONG_KEY, wrongBookFull, intent.grade, wrongBook, { limit: 300, newestFirst: true })) }
  assertRegisteredSnapshot(target, BACKUP_STORAGE_KEYS)
  return { status: 'TARGET_READY', target }
}

function normalizeOnlineQuestionType(value) {
  if (typeof value === 'string' && value) return value
  if (Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string' && item)) return [...value]
  return null
}

function normalizeOnlineRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || !Number.isInteger(record.level) || record.level < 1 || record.level > 3 ||
      !Number.isInteger(record.total) || record.total < 1 || !Number.isInteger(record.correct) || record.correct < 0 || record.correct > record.total ||
      !Number.isInteger(record.elapsed) || record.elapsed < 0 || !Array.isArray(record.questions) || record.questions.length !== record.total) return null
  const questionType = normalizeOnlineQuestionType(record.questionType)
  if (!questionType) return null
  const questions = record.questions.map(item => ({
    expr: typeof item?.expr === 'string' ? item.expr : '',
    answer: typeof item?.answer === 'string' ? item.answer : String(item?.answer ?? ''),
    type: typeof item?.type === 'string' ? item.type : '',
    userAnswer: item?.userAnswer == null ? '' : String(item.userAnswer),
    isCorrect: item?.isCorrect === true,
  }))
  if (questions.some(item => !item.expr || !item.type) || questions.filter(item => item.isCorrect).length !== record.correct) return null
  return { level: record.level, questionType, total: record.total, correct: record.correct, elapsed: record.elapsed, questions }
}

export async function createOnlineSubmissionIntent({ grade, onlineInstanceId, record, submittedAt = new Date().toISOString() }) {
  const normalizedRecord = normalizeOnlineRecord(record)
  if (grade !== ACTIVE_LEARNING_GRADE || !/^[a-f0-9]{32}$/.test(onlineInstanceId || '') || !canonicalIso(submittedAt) || !normalizedRecord) {
    throw new Error('ONLINE_SUBMISSION_INVALID')
  }
  const base = {
    sessionGrade: grade,
    grade,
    submissionId: `online:${onlineInstanceId}`,
    submittedAt,
    record: normalizedRecord,
  }
  return deepFreeze({ ...base, submissionDigest: sha256Hex(canonicalize(base)) })
}

function validOnlineIntent(intent) {
  if (!hasExactKeys(intent, ['sessionGrade', 'grade', 'submissionId', 'submittedAt', 'record', 'submissionDigest']) ||
      intent.grade !== ACTIVE_LEARNING_GRADE || intent.sessionGrade !== intent.grade ||
      !/^online:[a-f0-9]{32}$/.test(intent.submissionId || '') || !/^[a-f0-9]{64}$/.test(intent.submissionDigest || '') ||
      !canonicalIso(intent.submittedAt)) return false
  const normalizedRecord = normalizeOnlineRecord(intent.record)
  if (!normalizedRecord || canonicalize(normalizedRecord) !== canonicalize(intent.record)) return false
  const base = {
    sessionGrade: intent.sessionGrade, grade: intent.grade, submissionId: intent.submissionId,
    submittedAt: intent.submittedAt, record: intent.record,
  }
  return sha256Hex(canonicalize(base)) === intent.submissionDigest
}

function onlineReceiptMatches(receipt, intent) {
  const expected = normalizeOnlineRecord(intent.record)
  return receipt?.grade === intent.grade && receipt.type === 'online' && receipt.submissionId === intent.submissionId &&
    receipt.submissionDigest === intent.submissionDigest && receipt.submittedAt === intent.submittedAt &&
    receipt.createdAt === intent.submittedAt && receipt.level === expected.level && receipt.total === expected.total &&
    receipt.correct === expected.correct && receipt.elapsed === expected.elapsed &&
    canonicalize(receipt.questionType) === canonicalize(expected.questionType) && canonicalize(receipt.questions) === canonicalize(expected.questions)
}

export function buildOnlineSubmissionTarget(original, intent) {
  assertRegisteredSnapshot(original, BACKUP_STORAGE_KEYS)
  if (!validOnlineIntent(intent)) return { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  const record = normalizeOnlineRecord(intent.record)
  const historyFull = readSnapshotArray(original, STORAGE_KEY)
  const wrongBookFull = readSnapshotArray(original, WRONG_KEY)
  const history = selectLearningGrade(STORAGE_KEY, JSON.stringify(historyFull), intent.grade)
  const wrongBook = selectLearningGrade(WRONG_KEY, JSON.stringify(wrongBookFull), intent.grade)
  const receipts = history.filter(item => item.submissionId === intent.submissionId)
  if (receipts.length) {
    return receipts.length === 1 && onlineReceiptMatches(receipts[0], intent)
      ? { status: 'ALREADY_COMMITTED' }
      : { status: 'PAPER_SUBMISSION_INCONSISTENT' }
  }
  history.unshift({
    grade: intent.grade,
    id: `online_${intent.submissionId.slice(-12)}`,
    type: 'online',
    ...clone(record),
    createdAt: intent.submittedAt,
    submissionId: intent.submissionId,
    submissionDigest: intent.submissionDigest,
    submittedAt: intent.submittedAt,
  })
  const now = Date.parse(intent.submittedAt)
  record.questions.forEach((item, index) => {
    if (!item.isCorrect) updateWrongBook(wrongBook, { ...item, grade: intent.grade }, now, () => `online_${intent.submissionId.slice(-10)}_${index}`)
  })
  const target = clone(original)
  target[STORAGE_KEY] = {
    present: true,
    value: JSON.stringify(mergeLearningGradeRecords(STORAGE_KEY, historyFull, intent.grade, history, { limit: MAX_RECORDS, newestFirst: true })),
  }
  target[WRONG_KEY] = {
    present: true,
    value: JSON.stringify(mergeLearningGradeRecords(WRONG_KEY, wrongBookFull, intent.grade, wrongBook, { limit: 300, newestFirst: true })),
  }
  assertRegisteredSnapshot(target, BACKUP_STORAGE_KEYS)
  return { status: 'TARGET_READY', target }
}

// 记录错题（答题后调用）
// key = 算式表达式（如 "3 + 5"），用于去重
export function recordWrong({ grade, expr, answer, type }) {
  assertAvailableLearningGrade(grade)
  const full = getFullWrongBook()
  const list = selectLearningGrade(WRONG_KEY, JSON.stringify(full), grade)
  const now = Date.now()
  updateWrongBook(list, { grade, expr, answer, type }, now, () => now + '_' + Math.random().toString(36).slice(2, 6))
  return saveWrongBook(grade, list, full)
}

// 重练答对: box+1, 推迟复习
export function recordCorrect(grade, id) {
  assertAvailableLearningGrade(grade)
  const full = getFullWrongBook()
  const list = selectLearningGrade(WRONG_KEY, JSON.stringify(full), grade)
  const item = list.find(r => r.grade === grade && r.id === id)
  if (!item) return { mastered: false }
  item.box = Math.min(clampBox(item.box) + 1, 5)
  item.correctCount = (item.correctCount || 0) + 1
  item.nextReviewAt = nextReviewAt(item.box)
  item.mastered = item.box >= 5
  const saved = saveWrongBook(grade, list, full)
  return { mastered: item.mastered, saved }
}

// 重练答错: box回1, wrongCount+1
export function recordWrongAgain(grade, id) {
  assertAvailableLearningGrade(grade)
  const full = getFullWrongBook()
  const list = selectLearningGrade(WRONG_KEY, JSON.stringify(full), grade)
  const item = list.find(r => r.grade === grade && r.id === id)
  if (!item) return
  item.box = 1
  item.wrongCount = (item.wrongCount || 0) + 1
  item.correctCount = 0
  item.nextReviewAt = nextReviewAt(1)
  item.mastered = false
  item.lastWrongAt = Date.now()
  return saveWrongBook(grade, list, full)
}

// 获取全部错题
export function getAllWrong(grade) {
  return getWrongBook(grade).sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
}

// 获取今日待复习
export function getDueList(grade) {
  const now = Date.now()
  return getWrongBook(grade)
    .filter(r => !r.mastered && (r.nextReviewAt || 0) <= now)
    .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
}

// 统计
export function getWrongStats(grade) {
  const all = getWrongBook(grade)
  const now = Date.now()
  const unmastered = all.filter(r => !r.mastered)
  const due = all.filter(r => !r.mastered && (r.nextReviewAt || 0) <= now)
  return {
    total: all.length,
    unmasteredCount: unmastered.length,
    masteredCount: all.length - unmastered.length,
    dueCount: due.length,
    top5: unmastered.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0)).slice(0, 5),
  }
}
