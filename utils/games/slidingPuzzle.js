// 数字华容道核心:棋盘生成 + 合法移动 + 打乱(保证可解) + 通关判定
//
// 棋盘表示: 一维数组 board[0..N²-1],0 代表空格
// 目标状态: [1, 2, ..., N²-1, 0]
//
// 打乱策略: 从已排好的目标状态出发,做若干次随机合法移动 ——
// 这样不需要逆序数算法,可解性天然保证(任何合法移动都是可逆的)

export const DIFFICULTIES = [
  { key: 3, label: '3 × 3', desc: '入门',  shuffleMoves: 80  },
  { key: 4, label: '4 × 4', desc: '经典',  shuffleMoves: 200 },
  { key: 5, label: '5 × 5', desc: '挑战',  shuffleMoves: 400 }
]

export function createSolvedBoard(size) {
  const arr = new Array(size * size)
  for (let i = 0; i < size * size - 1; i++) arr[i] = i + 1
  arr[size * size - 1] = 0
  return arr
}

// 空格相邻的格子下标(最多 4 个方向)
export function neighborsOf(emptyIdx, size) {
  const r = Math.floor(emptyIdx / size)
  const c = emptyIdx % size
  const res = []
  if (r > 0)        res.push(emptyIdx - size)
  if (r < size - 1) res.push(emptyIdx + size)
  if (c > 0)        res.push(emptyIdx - 1)
  if (c < size - 1) res.push(emptyIdx + 1)
  return res
}

// idx 是否与空格相邻
export function canMove(board, idx, size) {
  const emptyIdx = board.indexOf(0)
  return neighborsOf(emptyIdx, size).includes(idx)
}

// 返回新数组(不修改入参)
export function move(board, idx, size) {
  if (!canMove(board, idx, size)) return board
  const emptyIdx = board.indexOf(0)
  const next = board.slice()
  next[emptyIdx] = board[idx]
  next[idx] = 0
  return next
}

// 从目标状态出发,随机走 moves 步打乱
// 加防回头剪枝: 不立即撤销刚才的移动,否则容易原地打转
export function shuffle(size, moves) {
  let board = createSolvedBoard(size)
  let prevMoved = -1  // 上一步被移动的格子的下标
  for (let step = 0; step < moves; step++) {
    const emptyIdx = board.indexOf(0)
    let candidates = neighborsOf(emptyIdx, size)
    // 防回头: 上一步移到空格位置的那个数字现在就在 prevMoved 的反向上,
    // 拒绝把它再移回去
    if (prevMoved !== -1 && candidates.length > 1) {
      const filtered = candidates.filter(i => i !== prevMoved)
      if (filtered.length) candidates = filtered
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    prevMoved = emptyIdx  // 当前空格位置 -> 下一轮的"移回去会触发回头"位置
    board = move(board, pick, size)
  }
  return board
}

export function isSolved(board) {
  const n = board.length
  for (let i = 0; i < n - 1; i++) {
    if (board[i] !== i + 1) return false
  }
  return board[n - 1] === 0
}
