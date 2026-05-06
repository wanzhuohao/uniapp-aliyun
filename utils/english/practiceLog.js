const STORAGE_KEY = 'english_practice_logs'
const MAX_LOGS = 1000

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function loadAll() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (Array.isArray(raw)) return raw
    return []
  } catch (e) {
    return []
  }
}

function saveAll(list) {
  if (list.length > MAX_LOGS) list = list.slice(-MAX_LOGS)
  uni.setStorageSync(STORAGE_KEY, list)
}

export function recordPractice({ type, totalCount, correctCount }) {
  const all = loadAll()
  all.push({
    type,
    date: today(),
    totalCount,
    correctCount,
    createdAt: Date.now(),
  })
  saveAll(all)
}
