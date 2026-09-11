// Leitner 5 级间隔复习核心：调用方传 storageKey，返回一组方法。
// 各学科 schema 字段由调用方在 recordWrong 时透传（type/char/word/...），算法不感知。
import { safeSetStorage } from './safeStorage.js'
import { isLearningStorageGateError, learningStorageApi } from './learningSession.js'
import { assertAvailableLearningGrade, assertCurrentLearningGrade } from './gradeContext.js'
import { mergeLearningGradeRecords, projectLearningValue, selectLearningGrade } from './gradeMigration.js'

const BOX_INTERVALS_DAYS = [1, 1, 3, 7, 15]
const DAY_MS = 24 * 60 * 60 * 1000

function clampBox(b) {
  const n = Number(b ?? 1)
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 5) return 5
  return Math.floor(n)
}

function nextReviewFromBox(box) {
  const idx = clampBox(box) - 1
  return Date.now() + BOX_INTERVALS_DAYS[idx] * DAY_MS
}

export function createLeitner({ storageKey }) {
  function loadProjected() {
    try {
      const raw = learningStorageApi.getStorageSync(storageKey)
      const projected = projectLearningValue(storageKey, Array.isArray(raw) ? raw : [])
      if (Array.isArray(projected)) return projected
      return []
    } catch (e) {
      if (isLearningStorageGateError(e)) throw e
      return []
    }
  }

  function loadAll(grade) {
    assertAvailableLearningGrade(grade)
    return selectLearningGrade(storageKey, loadProjected(), grade)
  }

  function saveAll(grade, current, full) {
    const target = mergeLearningGradeRecords(storageKey, full, grade, current)
    assertCurrentLearningGrade(grade)
    return safeSetStorage(storageKey, target)
  }

  // 记录新错题或加重已有错题。schema 字段（type/char/word/...）由调用方任意透传。
  function recordWrong(payload) {
    const { grade, question_id, qType, ...rest } = payload
    assertAvailableLearningGrade(grade)
    const full = loadProjected()
    const all = selectLearningGrade(storageKey, full, grade)
    const idx = all.findIndex(r => r.grade === grade && r.question_id === question_id)
    if (idx >= 0) {
      const old = all[idx]
      all[idx] = {
        ...old,
        wrongCount: (old.wrongCount || 0) + 1,
        correctCount: 0,
        box: 1,
        nextReviewAt: nextReviewFromBox(1),
        mastered: false,
        lastWrongAt: Date.now(),
        ...(qType ? { qType } : {}),
      }
    } else {
      all.push({
        grade,
        _id: question_id,
        question_id,
        ...rest,
        wrongCount: 1,
        correctCount: 0,
        box: 1,
        nextReviewAt: nextReviewFromBox(1),
        mastered: false,
        lastWrongAt: Date.now(),
        createdAt: Date.now(),
        ...(qType ? { qType } : {}),
      })
    }
    return saveAll(grade, all, full)
  }

  function recordCorrect(grade, recordId, currentBox, currentCorrectCount) {
    assertAvailableLearningGrade(grade)
    const full = loadProjected()
    const all = selectLearningGrade(storageKey, full, grade)
    const idx = all.findIndex(r => r.grade === grade && r._id === recordId)
    if (idx < 0) {
      return { mastered: false, box: clampBox(currentBox), nextReviewAt: null, correctCount: currentCorrectCount, saved: false }
    }
    const box = clampBox(currentBox)
    const newBox = Math.min(box + 1, 5)
    const nextReviewAt = nextReviewFromBox(newBox)
    const newCorrectCount = (currentCorrectCount || 0) + 1
    const mastered = newBox >= 5
    all[idx] = { ...all[idx], box: newBox, nextReviewAt, correctCount: newCorrectCount, mastered }
    const saved = saveAll(grade, all, full)
    return { mastered, box: newBox, nextReviewAt, correctCount: newCorrectCount, saved }
  }

  function recordWrongAgain(grade, recordId, currentBox, currentWrongCount) {
    assertAvailableLearningGrade(grade)
    const full = loadProjected()
    const all = selectLearningGrade(storageKey, full, grade)
    const idx = all.findIndex(r => r.grade === grade && r._id === recordId)
    if (idx < 0) return false
    all[idx] = {
      ...all[idx],
      box: 1,
      nextReviewAt: nextReviewFromBox(1),
      wrongCount: (currentWrongCount || 0) + 1,
      correctCount: 0,
      mastered: false,
      lastWrongAt: Date.now(),
    }
    return saveAll(grade, all, full)
  }

  function getAllWrongList(grade, type) {
    const all = loadAll(grade)
    const filtered = type ? all.filter(r => r.type === type) : all
    return filtered.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
  }

  function getDueList(grade, type) {
    const all = getAllWrongList(grade, type)
    const now = Date.now()
    return all.filter(r => !r.mastered && clampBox(r.box) < 5 && r.nextReviewAt <= now)
  }

  return { loadAll, recordWrong, recordCorrect, recordWrongAgain, getAllWrongList, getDueList }
}
