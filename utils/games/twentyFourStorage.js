// 24 点本地存储
// - 累计通关数(按难度细分 + 总数)
// - 当前连胜 + 最高连胜
// - 累计得分
// - 用过的提示数

const KEY_STATS = 'twenty_four_stats'

const DEFAULT_STATS = {
  totalScore: 0,
  totalWins: 0,
  byDifficulty: { easy: 0, medium: 0, hard: 0 },
  hintsUsed: 0,
  currentStreak: 0,
  bestStreak: 0
}

export function getStats() {
  try {
    const s = uni.getStorageSync(KEY_STATS)
    if (!s || typeof s !== 'object') return { ...DEFAULT_STATS }
    return {
      ...DEFAULT_STATS,
      ...s,
      byDifficulty: { ...DEFAULT_STATS.byDifficulty, ...(s.byDifficulty || {}) }
    }
  } catch { return { ...DEFAULT_STATS } }
}

function save(stats) {
  try { uni.setStorageSync(KEY_STATS, stats) } catch {}
}

// 通关 +分,连胜累计
export function recordWin(difficulty, score) {
  const stats = getStats()
  stats.totalScore += score
  stats.totalWins += 1
  stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1
  stats.currentStreak += 1
  if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak
  save(stats)
  return stats
}

// 跳题/认输 -> 连胜断
export function breakStreak() {
  const stats = getStats()
  stats.currentStreak = 0
  save(stats)
  return stats
}

// 用一次提示 +1
export function recordHint() {
  const stats = getStats()
  stats.hintsUsed += 1
  save(stats)
  return stats
}

export function resetStats() {
  try { uni.removeStorageSync(KEY_STATS) } catch {}
}
