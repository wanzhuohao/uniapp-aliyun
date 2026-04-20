// 练习日志：记录每次练习（type/totalCount/correctCount），取近 N 天按日聚合
const STORAGE_KEY = 'chinese_practice_logs'
const MAX_LOGS = 1000 // 超过时裁掉最早的

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

export function getRecentLogs(days = 7) {
  const all = loadAll()
  const now = new Date()
  const startTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - (days - 1) * 24 * 60 * 60 * 1000

  const dailyMap = {}
  for (const log of all) {
    const d = new Date(log.date + 'T00:00:00')
    if (d.getTime() < startTs) continue
    if (!dailyMap[log.date]) dailyMap[log.date] = { total: 0, correct: 0 }
    dailyMap[log.date].total += log.totalCount
    dailyMap[log.date].correct += log.correctCount
  }

  const result = []
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const day = dailyMap[dateStr]
    result.push({
      date: dateStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      accuracy: day ? Math.round(day.correct / day.total * 100) : null,
    })
  }
  return result
}
