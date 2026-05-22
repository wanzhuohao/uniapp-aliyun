// 迷你数独核心:满解生成 + 唯一解挖洞 + 求解器 + 实时校验
//
// 棋盘表示: 二维数组 board[row][col],0 代表空白
// 宫格: 4x4 用 2x2 宫,6x6 用 2x3 宫(2 行 3 列),9x9 用 3x3 宫
//
// 难度配置:
//   入门 4x4 6-8 空白
//   简单 6x6 12-16 空白
//   中等 6x6 20-24 空白
//   困难 9x9 35-45 空白

export const DIFFICULTIES = [
  { key: 'starter', label: '入门', size: 4, boxR: 2, boxC: 2, holes: [6, 8],   score: 10 },
  { key: 'easy',    label: '简单', size: 6, boxR: 2, boxC: 3, holes: [12, 16], score: 30 },
  { key: 'medium',  label: '中等', size: 6, boxR: 2, boxC: 3, holes: [20, 24], score: 60 },
  { key: 'hard',    label: '困难', size: 9, boxR: 3, boxC: 3, holes: [35, 45], score: 120 }
]

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function range1ToN(n) {
  const arr = new Array(n)
  for (let i = 0; i < n; i++) arr[i] = i + 1
  return arr
}

// 校验在 (row, col) 放 num 是否合法(行/列/宫无冲突)
function canPlace(board, row, col, num, size, boxR, boxC) {
  for (let i = 0; i < size; i++) {
    if (board[row][i] === num) return false
    if (board[i][col] === num) return false
  }
  const br = Math.floor(row / boxR) * boxR
  const bc = Math.floor(col / boxC) * boxC
  for (let r = br; r < br + boxR; r++) {
    for (let c = bc; c < bc + boxC; c++) {
      if (board[r][c] === num) return false
    }
  }
  return true
}

// 找下一个空格(简单的从上到下/从左到右)
// 性能优化时可改为 MRV(选候选最少的空格),但 4-9 阶规模够用
function findEmpty(board, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 0) return [r, c]
    }
  }
  return null
}

// 求解器: 找出最多 limit 个解,>= limit 时提前停
// 用于挖洞时的唯一解校验(limit=2 找到 2 个就停)
export function countSolutions(board, size, boxR, boxC, limit = 2) {
  // 深拷贝避免改原棋盘
  const work = board.map(row => row.slice())
  let count = 0
  function recurse() {
    if (count >= limit) return
    const empty = findEmpty(work, size)
    if (!empty) { count++; return }
    const [r, c] = empty
    for (let n = 1; n <= size; n++) {
      if (canPlace(work, r, c, n, size, boxR, boxC)) {
        work[r][c] = n
        recurse()
        work[r][c] = 0
        if (count >= limit) return
      }
    }
  }
  recurse()
  return count
}

// 解一遍棋盘,直接修改入参,返回是否成功
export function solveBoard(board, size, boxR, boxC) {
  const empty = findEmpty(board, size)
  if (!empty) return true
  const [r, c] = empty
  for (let n = 1; n <= size; n++) {
    if (canPlace(board, r, c, n, size, boxR, boxC)) {
      board[r][c] = n
      if (solveBoard(board, size, boxR, boxC)) return true
      board[r][c] = 0
    }
  }
  return false
}

// 生成完整解: 空棋盘 + 每个空位的候选数字打乱顺序填
export function generateFullBoard(size, boxR, boxC) {
  const board = Array.from({ length: size }, () => new Array(size).fill(0))
  function fill() {
    const empty = findEmpty(board, size)
    if (!empty) return true
    const [r, c] = empty
    const nums = shuffleInPlace(range1ToN(size))
    for (const n of nums) {
      if (canPlace(board, r, c, n, size, boxR, boxC)) {
        board[r][c] = n
        if (fill()) return true
        board[r][c] = 0
      }
    }
    return false
  }
  fill()
  return board
}

// 挖洞生成题目: 从完整解出发,随机挖洞,挖后必须保持唯一解
// 返回 { puzzle, solution }
//   puzzle: 二维数组,0 表示空白
//   solution: 完整解
//
// 策略:
//   1. 拷贝 solution 作为 puzzle
//   2. 把所有格子下标打乱顺序,逐个尝试挖
//   3. 挖一个后跑 countSolutions(limit=2),若仍唯一保留,否则恢复
//   4. 达到目标 holes 或遍历完所有格子停止
export function generatePuzzle(difficulty) {
  const d = DIFFICULTIES.find(x => x.key === difficulty)
  if (!d) throw new Error(`未知难度 ${difficulty}`)
  const { size, boxR, boxC, holes } = d
  const targetHoles = holes[0] + Math.floor(Math.random() * (holes[1] - holes[0] + 1))

  const solution = generateFullBoard(size, boxR, boxC)
  const puzzle = solution.map(row => row.slice())

  const positions = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) positions.push([r, c])
  }
  shuffleInPlace(positions)

  let holesDug = 0
  for (const [r, c] of positions) {
    if (holesDug >= targetHoles) break
    const backup = puzzle[r][c]
    puzzle[r][c] = 0
    if (countSolutions(puzzle, size, boxR, boxC, 2) === 1) {
      holesDug++
    } else {
      puzzle[r][c] = backup
    }
  }

  return { puzzle, solution, size, boxR, boxC, holesActual: holesDug, holesTarget: targetHoles }
}

// 实时校验: 当前格 (row, col) 填的 num 是否冲突
// 忽略自己,检查行/列/宫其他格
export function findConflicts(board, row, col, num, size, boxR, boxC) {
  if (!num) return []
  const conflicts = []
  for (let i = 0; i < size; i++) {
    if (i !== col && board[row][i] === num) conflicts.push([row, i])
    if (i !== row && board[i][col] === num) conflicts.push([i, col])
  }
  const br = Math.floor(row / boxR) * boxR
  const bc = Math.floor(col / boxC) * boxC
  for (let r = br; r < br + boxR; r++) {
    for (let c = bc; c < bc + boxC; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) conflicts.push([r, c])
    }
  }
  return conflicts
}

// 是否所有格子都填且无冲突
export function isComplete(board, size, boxR, boxC) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const n = board[r][c]
      if (!n) return false
      if (findConflicts(board, r, c, n, size, boxR, boxC).length) return false
    }
  }
  return true
}
