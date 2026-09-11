// 练习日志：每次练习记一条（type/totalCount/correctCount），按 storageKey 划分学科。
import { safeSetStorage } from './safeStorage.js'
import { isLearningStorageGateError, learningStorageApi } from './learningSession.js'
import { assertAvailableLearningGrade, assertCurrentLearningGrade } from './gradeContext.js'
import { mergeLearningGradeRecords, projectLearningValue, selectLearningGrade } from './gradeMigration.js'

const MAX_LOGS = 1000

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function createPracticeLog({ storageKey }) {
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
    const target = mergeLearningGradeRecords(storageKey, full, grade, current, { limit: MAX_LOGS })
    assertCurrentLearningGrade(grade)
    return safeSetStorage(storageKey, target)
  }

  function recordPractice({ grade, type, totalCount, correctCount }) {
    assertAvailableLearningGrade(grade)
    const full = loadProjected()
    const current = selectLearningGrade(storageKey, full, grade)
    current.push({
      grade,
      type,
      date: todayStr(),
      totalCount,
      correctCount,
      createdAt: Date.now(),
    })
    return saveAll(grade, current, full)
  }

  function getRecentLogs(grade, days = 7) {
    const all = loadAll(grade)
    const now = new Date()
    const startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - (days - 1) * 24 * 60 * 60 * 1000

    const dailyMap = {}
    for (const log of all) {
      const d = new Date(log.date + 'T00:00:00')
      if (d.getTime() < startTs) continue
      if (!dailyMap[log.date]) dailyMap[log.date] = { total: 0, correct: 0 }
      dailyMap[log.date].total += log.totalCount
      dailyMap[log.date].correct += log.correctCount
    }

    const result = []
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const day = dailyMap[dateStr]
      result.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        accuracy: day && day.total > 0 ? Math.round(day.correct / day.total * 100) : null,
      })
    }
    return result
  }

  return { loadAll, recordPractice, getRecentLogs }
}
