// 英语全局状态：各页面 prefs，纯 localStorage
const STORAGE_KEY = 'english_state'

function load() {
  try {
    const s = uni.getStorageSync(STORAGE_KEY)
    if (s && typeof s === 'object') return s
  } catch (e) {}
  return {}
}

function save(state) {
  uni.setStorageSync(STORAGE_KEY, state)
}

export function getEnglishPrefs(pageKey) {
  const s = load()
  const prefs = s.prefs && s.prefs[pageKey]
  return prefs && typeof prefs === 'object' ? prefs : null
}

export function setEnglishPrefs(pageKey, patch) {
  const s = load()
  if (!s.prefs) s.prefs = {}
  s.prefs[pageKey] = { ...(s.prefs[pageKey] || {}), ...patch }
  save(s)
}
