// 语文全局状态：currentUnit + 各页面 prefs，复用 common/prefsStore
import { createPrefsStore } from '../common/prefsStore.js'

const DEFAULT_UNIT = '2-4'
const store = createPrefsStore({ storageKey: 'chinese_state' })

export function getCurrentUnit() {
  return store.load().currentUnit || DEFAULT_UNIT
}

export function setCurrentUnit(unit) {
  const s = store.load()
  s.currentUnit = unit
  store.save(s)
}

export const getChinesePrefs = store.getPrefs
export const setChinesePrefs = store.setPrefs
