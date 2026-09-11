// 各学科的页面偏好（selectedLessons / filterType / ...）持久化，按 storageKey 划分。
// 学科特异字段（如 chinese 的 currentUnit）由各学科 wrapper 自行扩展，本文件只管 prefs.{pageKey}。
import { safeSetStorage } from './safeStorage.js'
import { isLearningStorageGateError, learningStorageApi } from './learningSession.js'
import { assertAvailableLearningGrade, assertCurrentLearningGrade } from './gradeContext.js'
import { projectLearningValue, selectLearningGrade, updateLearningGradeBucket } from './gradeMigration.js'

export function createPrefsStore({ storageKey }) {
  function loadRaw() {
    try {
      return learningStorageApi.getStorageSync(storageKey)
    } catch (e) {
      if (isLearningStorageGateError(e)) throw e
    }
    return undefined
  }

  function load(grade) {
    assertAvailableLearningGrade(grade)
    return selectLearningGrade(storageKey, loadRaw(), grade) || {}
  }

  function save(grade, state) {
    assertAvailableLearningGrade(grade)
    const target = updateLearningGradeBucket(storageKey, loadRaw(), grade, () => state)
    assertCurrentLearningGrade(grade)
    return safeSetStorage(storageKey, target)
  }

  function getPrefs(grade, pageKey) {
    const s = load(grade)
    const prefs = s.prefs && s.prefs[pageKey]
    return prefs && typeof prefs === 'object' ? prefs : null
  }

  function setPrefs(grade, pageKey, patch) {
    const s = load(grade)
    if (!s.prefs) s.prefs = {}
    s.prefs[pageKey] = { ...(s.prefs[pageKey] || {}), ...patch }
    return save(grade, s)
  }

  return { load, save, getPrefs, setPrefs }
}
