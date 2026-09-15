// 记忆翻牌本地存储（最佳战绩）
// key: memory_match_stats

import { STORAGE_KEYS } from '../common/storageRegistry.js'
import { isLearningStorageGateError, learningStorageApi } from '../common/learningSession.js'

const KEY = STORAGE_KEYS.memoryMatchStats

// stats: { totalWins, best: { easy: {moves,time} | null, ... } }
const DEFAULT_STATS = {
  totalWins: 0,
  best: { easy: null, normal: null, hard: null },
}

export function getStats() {
  try {
    const s = learningStorageApi.getStorageSync(KEY)
    if (!s || typeof s !== 'object') return JSON.parse(JSON.stringify(DEFAULT_STATS))
    return {
      ...DEFAULT_STATS,
      ...s,
      best: { ...DEFAULT_STATS.best, ...(s.best || {}) },
    }
  } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return JSON.parse(JSON.stringify(DEFAULT_STATS))
  }
}

function save(stats) {
  try { learningStorageApi.setStorageSync(KEY, stats); return true } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return false
  }
}

// 通关：更新该难度 PB（步数/时间各自独立比较），累计总分
export function recordWin(difficulty, moves, time) {
  const stats = getStats()
  stats.totalWins += 1
  const old = stats.best[difficulty]
  let newBest = false
  if (!old) {
    stats.best[difficulty] = { moves, time }
    newBest = true
  } else if (moves < old.moves || (moves === old.moves && time < old.time)) {
    stats.best[difficulty] = { moves, time }
    newBest = true
  }
  save(stats)
  return { stats, newBest }
}