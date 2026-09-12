import { learningStorageApi } from './learningSession.js'
import { STORAGE_KEYS } from './storageRegistry.js'

// 默认（推荐）学期：一年级下册。历史存量数据沿用该值，切换学期后新数据写入所选学期。
export const ACTIVE_LEARNING_GRADE = 'grade1-term2'

// 当前已开放的可用学期集。
export const AVAILABLE_LEARNING_GRADES = Object.freeze(['grade1-term2', 'grade2-term1'])

// 全部可展示的学期选项（含待更新置灰项）。
export const LEARNING_GRADE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'grade1-term2', label: '一年级下', disabled: false, note: '' }),
  Object.freeze({ value: 'grade2-term1', label: '二年级上', disabled: false, note: '' }),
  Object.freeze({ value: 'grade2-term2', label: '二年级下', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade3-term1', label: '三年级上', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade3-term2', label: '三年级下', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade4-term1', label: '四年级上', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade4-term2', label: '四年级下', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade5-term1', label: '五年级上', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade5-term2', label: '五年级下', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade6-term1', label: '六年级上', disabled: true, note: '待更新' }),
  Object.freeze({ value: 'grade6-term2', label: '六年级下', disabled: true, note: '待更新' }),
])

const KNOWN_GRADES = new Set(LEARNING_GRADE_OPTIONS.map(item => item.value))

export class LearningGradeError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'LearningGradeError'
    this.code = code
  }
}

export function isLearningGradeError(error) {
  return error instanceof LearningGradeError || ['LEARNING_GRADE_UNAVAILABLE', 'LEARNING_GRADE_CHANGED'].includes(error?.code)
}

export function isKnownLearningGrade(grade) {
  return typeof grade === 'string' && KNOWN_GRADES.has(grade)
}

export function assertAvailableLearningGrade(grade) {
  if (!AVAILABLE_LEARNING_GRADES.includes(grade)) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '该学期题库待更新，请返回设置页选择可用学期')
  }
  return grade
}

export function getLearningGradeLabel(grade) {
  return LEARNING_GRADE_OPTIONS.find(item => item.value === grade)?.label || '年级不可用'
}

function getReader(adapter) {
  if (typeof adapter?.getStorageSync === 'function') return key => adapter.getStorageSync(key)
  if (typeof adapter?.get === 'function') return key => adapter.get(key)
  throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '年级读取失败，请刷新页面后重试')
}

function getWriter(adapter) {
  if (typeof adapter?.setStorageSync === 'function') return (key, value) => adapter.setStorageSync(key, value)
  if (typeof adapter?.set === 'function') return (key, value) => adapter.set(key, value)
  throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '年级保存失败，请刷新页面后重试')
}

function isStoredGrade(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === 2 && value.schemaVersion === 1 && typeof value.grade === 'string'
}

export function readLearningGrade(adapter = learningStorageApi) {
  const value = getReader(adapter)(STORAGE_KEYS.learningGrade)
  if (!isStoredGrade(value) || !isKnownLearningGrade(value.grade)) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '当前学期信息损坏，请前往设置页重新选择学期')
  }
  assertAvailableLearningGrade(value.grade)
  return value.grade
}

function writeGrade(grade, adapter) {
  const value = Object.freeze({ schemaVersion: 1, grade })
  getWriter(adapter)(STORAGE_KEYS.learningGrade, value)
  const actual = getReader(adapter)(STORAGE_KEYS.learningGrade)
  if (!isStoredGrade(actual) || actual.grade !== grade) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '学期保存失败，请检查浏览器存储空间后重试')
  }
  return grade
}

// 保存当前学期：仅允许写入已开放的可用学期。
export function saveLearningGrade(grade, adapter = learningStorageApi) {
  assertAvailableLearningGrade(grade)
  return writeGrade(grade, adapter)
}

function writeActiveGrade(adapter) {
  return writeGrade(ACTIVE_LEARNING_GRADE, adapter)
}

export function initializeLearningGrade(adapter = learningStorageApi) {
  const value = getReader(adapter)(STORAGE_KEYS.learningGrade)
  if (value === '' || value === undefined) return writeActiveGrade(adapter)
  if (!isStoredGrade(value) || !isKnownLearningGrade(value.grade)) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '当前学期信息损坏，请前往设置页重新选择')
  }
  return assertAvailableLearningGrade(value.grade)
}

export function repairLearningGrade(adapter = learningStorageApi) {
  return writeActiveGrade(adapter)
}

export function openCourseGradeSession(adapter = learningStorageApi) {
  return readLearningGrade(adapter)
}

export function assertCurrentLearningGrade(sessionGrade, adapter = learningStorageApi) {
  try {
    assertAvailableLearningGrade(sessionGrade)
    const current = readLearningGrade(adapter)
    if (current !== sessionGrade) throw new Error('changed')
    return sessionGrade
  } catch {
    throw new LearningGradeError('LEARNING_GRADE_CHANGED', '学习期间年级已变化，请退出后重新进入')
  }
}
