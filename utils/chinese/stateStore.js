// 语文全局状态：currentUnit + 各页面 prefs，复用 common/prefsStore
import { createPrefsStore } from '../common/prefsStore.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'
import { getSemesterUnitKeys } from './unitConfig.js'

const DEFAULT_UNIT = '2-4'
const store = createPrefsStore({ storageKey: STORAGE_KEYS.chineseState })

export function getCurrentUnit(grade) {
  const saved = store.load(grade).currentUnit
  if (saved && getSemesterUnitKeys(grade).includes(saved)) return saved
  // 默认取该学期第一单元，避免跨学期取到不存在的单元
  return getSemesterUnitKeys(grade)[0] || DEFAULT_UNIT
}

export function setCurrentUnit(grade, unit) {
  const s = store.load(grade)
  s.currentUnit = unit
  return store.save(grade, s)
}

export const getChinesePrefs = store.getPrefs
export const setChinesePrefs = store.setPrefs
