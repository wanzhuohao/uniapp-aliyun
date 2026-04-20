// 语文全局状态：currentUnit，纯 localStorage
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
