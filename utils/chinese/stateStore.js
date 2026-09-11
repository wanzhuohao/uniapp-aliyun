// 语文全局状态：currentUnit + 各页面 prefs，复用 common/prefsStore
import { createPrefsStore } from '../common/prefsStore.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'

const DEFAULT_UNIT = '2-4'
const store = createPrefsStore({ storageKey: STORAGE_KEYS.chineseState })

export function getCurrentUnit(grade) {
  return store.load(grade).currentUnit || DEFAULT_UNIT
}

export function setCurrentUnit(grade, unit) {
  const s = store.load(grade)
  s.currentUnit = unit
  return store.save(grade, s)
}

export const getChinesePrefs = store.getPrefs
export const setChinesePrefs = store.setPrefs
