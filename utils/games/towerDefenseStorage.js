// 塔防肉鸽本地存储（最高波次 / 总胜场）
// key: tower_defense_stats

import { STORAGE_KEYS } from '../common/storageRegistry.js'
import { isLearningStorageGateError, learningStorageApi } from '../common/learningSession.js'

const KEY = STORAGE_KEYS.towerDefenseStats

const DEFAULT_STATS = {
  wins: 0,
  bestWave: 0,
}

export function getStats() {
  try {
    const s = learningStorageApi.getStorageSync(KEY)
    if (!s || typeof s !== 'object') return { ...DEFAULT_STATS }
    return { ...DEFAULT_STATS, ...s }
  } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return { ...DEFAULT_STATS }
  }
}

function save(stats) {
  try { learningStorageApi.setStorageSync(KEY, stats); return true } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return false
  }
}

// 结算：胜利 +1，更新最高波次
export function recordResult({ win, wave }) {
  const stats = getStats()
  if (win) stats.wins += 1
  if (wave > stats.bestWave) stats.bestWave = wave
  save(stats)
  return stats
}