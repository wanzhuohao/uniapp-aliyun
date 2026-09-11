// 成语接龙：本地存储
// - 最高分
// - 最近一局回放（成语列表 + 每手得分 + 总分）

import { STORAGE_KEYS } from '../common/storageRegistry.js'
import { isLearningStorageGateError, learningStorageApi } from '../common/learningSession.js'

const KEY_BEST = STORAGE_KEYS.idiomChainBest
const KEY_LAST = STORAGE_KEYS.idiomChainLast

export function getBest() {
  try { return Number(learningStorageApi.getStorageSync(KEY_BEST)) || 0 } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return 0
  }
}

export function setBest(score) {
  try { learningStorageApi.setStorageSync(KEY_BEST, Math.max(getBest(), score)); return true } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return false
  }
}

// game: { score, steps: [{by:'ai'|'player', w, score, reason}], endedAt, endReason }
export function saveLast(game) {
  try { learningStorageApi.setStorageSync(KEY_LAST, game); return true } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return false
  }
}

export function getLast() {
  try { return learningStorageApi.getStorageSync(KEY_LAST) || null } catch (error) {
    if (isLearningStorageGateError(error)) throw error
    return null
  }
}
