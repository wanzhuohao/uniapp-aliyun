import { learningStorageApi } from './learningSession.js'
import { STORAGE_KEYS } from './storageRegistry.js'

export const ACTIVE_LEARNING_GRADE = 'grade1-term2'

export const LEARNING_GRADE_OPTIONS = Object.freeze([
  Object.freeze({ value: ACTIVE_LEARNING_GRADE, label: '一年级下册', disabled: false, note: '' }),
  ...['二', '三', '四', '五', '六'].map((name, index) => Object.freeze({
    value: `grade${index + 2}`,
    label: `${name}年级`,
    disabled: true,
    note: '题库待补',
  })),
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
  if (grade !== ACTIVE_LEARNING_GRADE) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '该年级题库待补，请返回学习首页选择可用年级')
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
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '当前年级信息损坏，请返回学习首页修复')
  }
  assertAvailableLearningGrade(value.grade)
  return value.grade
}

function writeActiveGrade(adapter) {
  const value = Object.freeze({ schemaVersion: 1, grade: ACTIVE_LEARNING_GRADE })
  getWriter(adapter)(STORAGE_KEYS.learningGrade, value)
  const actual = getReader(adapter)(STORAGE_KEYS.learningGrade)
  if (!isStoredGrade(actual) || actual.grade !== ACTIVE_LEARNING_GRADE) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '年级保存失败，请检查浏览器存储空间后重试')
  }
  return ACTIVE_LEARNING_GRADE
}

export function initializeLearningGrade(adapter = learningStorageApi) {
  const value = getReader(adapter)(STORAGE_KEYS.learningGrade)
  if (value === '' || value === undefined) return writeActiveGrade(adapter)
  if (!isStoredGrade(value) || !isKnownLearningGrade(value.grade)) {
    throw new LearningGradeError('LEARNING_GRADE_UNAVAILABLE', '当前年级信息损坏，请返回学习首页修复')
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
