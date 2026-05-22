// 迷你数独本地存储
// 按难度累计通关数 + 按难度最短用时 PB + 累计得分 + 提示总次数

const KEY = 'sudoku_stats'

const DEFAULT_STATS = {
  totalScore: 0,
  totalWins: 0,
  hintsUsed: 0,
  byDifficulty: { starter: 0, easy: 0, medium: 0, hard: 0 },
  pb: { starter: null, easy: null, medium: null, hard: null } // 每档存最短用时(秒)
}

export function getStats() {
  try {
    const s = uni.getStorageSync(KEY)
    if (!s || typeof s !== 'object') return JSON.parse(JSON.stringify(DEFAULT_STATS))
    return {
      ...DEFAULT_STATS,
      ...s,
      byDifficulty: { ...DEFAULT_STATS.byDifficulty, ...(s.byDifficulty || {}) },
      pb: { ...DEFAULT_STATS.pb, ...(s.pb || {}) }
    }
  } catch { return JSON.parse(JSON.stringify(DEFAULT_STATS)) }
}

function save(stats) {
  try { uni.setStorageSync(KEY, stats) } catch {}
}

// 通关: +分,累计 +1,PB 更新
// 返回 { newBest, stats }
export function recordWin(difficulty, score, time) {
  const stats = getStats()
  stats.totalScore += score
  stats.totalWins += 1
  stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1
  let newBest = false
  const old = stats.pb[difficulty]
  if (old == null || time < old) {
    stats.pb[difficulty] = time
    newBest = true
  }
  save(stats)
  return { stats, newBest }
}

export function recordHint() {
  const stats = getStats()
  stats.hintsUsed += 1
  save(stats)
  return stats
}
