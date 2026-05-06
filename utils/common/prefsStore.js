// 各学科的页面偏好（selectedLessons / filterType / ...）持久化，按 storageKey 划分。
// 学科特异字段（如 chinese 的 currentUnit）由各学科 wrapper 自行扩展，本文件只管 prefs.{pageKey}。
export function createPrefsStore({ storageKey }) {
  function load() {
    try {
      const s = uni.getStorageSync(storageKey)
      if (s && typeof s === 'object') return s
    } catch (e) {}
    return {}
  }

  function save(state) {
    uni.setStorageSync(storageKey, state)
  }

  function getPrefs(pageKey) {
    const s = load()
    const prefs = s.prefs && s.prefs[pageKey]
    return prefs && typeof prefs === 'object' ? prefs : null
  }

  function setPrefs(pageKey, patch) {
    const s = load()
    if (!s.prefs) s.prefs = {}
    s.prefs[pageKey] = { ...(s.prefs[pageKey] || {}), ...patch }
    save(s)
  }

  return { load, save, getPrefs, setPrefs }
}
