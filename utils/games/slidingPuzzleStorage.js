// 数字华容道本地存储
// 每个难度独立的 PB(最少步数 + 最短用时)+ 总通关次数

const KEY = 'sliding_puzzle_stats'

// stats: {
//   totalWins: number,
//   pb: { 3: {steps, time}, 4: {...}, 5: {...} }
// }
const DEFAULT_STATS = {
  totalWins: 0,
  pb: { 3: null, 4: null, 5: null }
}

export function getStats() {
  try {
    const s = uni.getStorageSync(KEY)
    if (!s || typeof s !== 'object') return JSON.parse(JSON.stringify(DEFAULT_STATS))
    return {
      ...DEFAULT_STATS,
      ...s,
      pb: { ...DEFAULT_STATS.pb, ...(s.pb || {}) }
    }
  } catch { return JSON.parse(JSON.stringify(DEFAULT_STATS)) }
}

function save(stats) {
  try { uni.setStorageSync(KEY, stats) } catch {}
}

// 通关:更新 PB(步数/时间各自独立比较),累计 +1
// 返回 { newBestSteps, newBestTime, stats }
export function recordWin(size, steps, time) {
  const stats = getStats()
  stats.totalWins += 1
  const old = stats.pb[size]
  let newBestSteps = false
  let newBestTime = false
  if (!old) {
    stats.pb[size] = { steps, time }
    newBestSteps = true
    newBestTime = true
  } else {
    if (steps < old.steps) { old.steps = steps; newBestSteps = true }
    if (time  < old.time)  { old.time  = time;  newBestTime  = true }
  }
  save(stats)
  return { stats, newBestSteps, newBestTime }
}
