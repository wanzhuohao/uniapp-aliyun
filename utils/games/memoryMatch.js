// 记忆翻牌核心逻辑
// 纯逻辑、无 DOM：难度 → 牌堆生成、洗牌、翻牌比对、通关判定

// 难度：各难度配对数（总卡 = 对数*2）
export const DIFFICULTIES = [
  { key: 'easy',   label: '简单', pairs: 6, cols: 4 },
  { key: 'normal', label: '普通', pairs: 8, cols: 4 },
  { key: 'hard',   label: '困难', pairs: 10, cols: 5 },
]

// 卡面图案池（emoji，需 >= 最大配对数 10）
const EMOJI_POOL = ['🐱', '🐶', '🦁', '🐸', '🐙', '🦋', '🍎', '🍉', '🌈', '⭐', '🌙', '🚀', '⚽', '🎈', '🍭']

export function getDifficulty(key) {
  return DIFFICULTIES.find(d => d.key === key) || DIFFICULTIES[0]
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 生成配对牌堆：[{ id, value }]，随机洗牌
export function buildDeck(difficultyKey) {
  const pairs = getDifficulty(difficultyKey).pairs
  const pool = shuffle(EMOJI_POOL).slice(0, pairs)
  const cards = []
  for (const value of pool) {
    cards.push({ value }, { value })
  }
  return shuffle(cards).map((c, i) => ({ ...c, id: i }))
}

// 全部配对完成
export function isComplete(matchedCount, difficultyKey) {
  return matchedCount >= getDifficulty(difficultyKey).pairs
}