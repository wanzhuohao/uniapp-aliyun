// 练习日志：每次练习记一条（type/totalCount/correctCount），按 storageKey 划分学科。
const MAX_LOGS = 1000

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function createPracticeLog({ storageKey }) {
  function loadAll() {
    try {
      const raw = uni.getStorageSync(storageKey)
      if (Array.isArray(raw)) return raw
      return []
    } catch (e) {
      return []
    }
  }

  function saveAll(list) {
    if (list.length > MAX_LOGS) list = list.slice(-MAX_LOGS)
    uni.setStorageSync(storageKey, list)
  }

  function recordPractice({ type, totalCount, correctCount }) {
    const all = loadAll()
    all.push({
      type,
      date: todayStr(),
      totalCount,
      correctCount,
      createdAt: Date.now(),
    })
    saveAll(all)
  }

  function getRecentLogs(days = 7) {
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
        accuracy: day && day.total > 0 ? Math.round(day.correct / day.total * 100) : null,
      })
    }
    return result
  }

  return { recordPractice, getRecentLogs }
}
