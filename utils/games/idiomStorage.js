// 成语接龙：本地存储
// - 最高分
// - 最近一局回放（成语列表 + 每手得分 + 总分）

const KEY_BEST = 'idiom_chain_best'
const KEY_LAST = 'idiom_chain_last'

export function getBest() {
  try { return Number(uni.getStorageSync(KEY_BEST)) || 0 } catch { return 0 }
}

export function setBest(score) {
  try { uni.setStorageSync(KEY_BEST, Math.max(getBest(), score)) } catch {}
}

// game: { score, steps: [{by:'ai'|'player', w, score, reason}], endedAt, endReason }
export function saveLast(game) {
  try { uni.setStorageSync(KEY_LAST, game) } catch {}
}

export function getLast() {
  try { return uni.getStorageSync(KEY_LAST) || null } catch { return null }
}
