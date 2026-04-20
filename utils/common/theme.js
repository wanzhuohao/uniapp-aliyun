// 暗色模式开关：localStorage + document.body class
const KEY = 'dark_mode'

export function isDark() {
  return uni.getStorageSync(KEY) === '1'
}

export function setDark(v) {
  uni.setStorageSync(KEY, v ? '1' : '0')
  applyTheme()
}

export function toggleDark() {
  setDark(!isDark())
  if (typeof window !== 'undefined') {
    setTimeout(() => window.location.reload(), 100)
  }
}

export function applyTheme() {
  if (typeof document === 'undefined') return
  const body = document.body
  if (!body) return
  if (isDark()) body.classList.add('dark-mode')
  else body.classList.remove('dark-mode')
}
