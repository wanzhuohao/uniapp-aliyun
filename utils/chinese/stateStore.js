// 语文全局状态：currentUnit + 各页面 prefs，纯 localStorage
const STORAGE_KEY = 'chinese_state'
const DEFAULT_UNIT = '2-4'

function load() {
  try {
    const s = uni.getStorageSync(STORAGE_KEY)
    if (s && typeof s === 'object') return s
  } catch (e) {}
  return { currentUnit: DEFAULT_UNIT }
}

function save(state) {
  uni.setStorageSync(STORAGE_KEY, state)
}

export function getCurrentUnit() {
  return load().currentUnit || DEFAULT_UNIT
}

export function setCurrentUnit(unit) {
  const s = load()
  s.currentUnit = unit
  save(s)
}

// 各页面（learn/pinyin/hanzi）的偏好：selectedLessons[]、filterType
export function getChinesePrefs(pageKey) {
  const s = load()
  const prefs = s.prefs && s.prefs[pageKey]
  return prefs && typeof prefs === 'object' ? prefs : null
}

export function setChinesePrefs(pageKey, patch) {
  const s = load()
  if (!s.prefs) s.prefs = {}
  s.prefs[pageKey] = { ...(s.prefs[pageKey] || {}), ...patch }
  save(s)
}
