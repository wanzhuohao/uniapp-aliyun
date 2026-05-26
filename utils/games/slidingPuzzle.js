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

// ============ 求解器 ============
// 策略: 分块逐行/列锁定; 最后 2x2 用 BFS
// 返回一串合法移动 idx, 顺次 apply 后可回到 [1..N²-1, 0]
// 非最短解, 但 size=5 也能毫秒级返回; 用作"下一步提示"足够
export function solve(initialBoard, size) {
  if (isSolved(initialBoard)) return []
  let board = initialBoard.slice()
  const moves = []
  const locked = new Set()

  function ri(r, c) { return r * size + c }
  function rc(idx) { return [Math.floor(idx / size), idx % size] }
  function locate(v) { return board.indexOf(v) }

  function pushMove(idx) {
    if (!canMove(board, idx, size)) {
      throw new Error(`非法移动 idx=${idx}`)
    }
    board = move(board, idx, size)
    moves.push(idx)
  }

  // BFS 把空格移到 destIdx, 期间不动 forbid 集合里的格子
  function moveEmptyTo(destIdx, forbid) {
    const emptyIdx = board.indexOf(0)
    if (emptyIdx === destIdx) return
    if (forbid.has(destIdx)) {
      throw new Error(`空格目标 ${destIdx} 在 forbid 中`)
    }
    const visited = new Set([emptyIdx])
    const parent = new Map()
    const queue = [emptyIdx]
    let head = 0
    while (head < queue.length) {
      const cur = queue[head++]
      if (cur === destIdx) {
        const path = []
        let p = destIdx
        while (p !== emptyIdx) {
          path.unshift(p)
          p = parent.get(p)
        }
        for (const step of path) pushMove(step)
        return
      }
      for (const n of neighborsOf(cur, size)) {
        if (forbid.has(n) || visited.has(n)) continue
        visited.add(n)
        parent.set(n, cur)
        queue.push(n)
      }
    }
    throw new Error(`空格无法到 ${destIdx}, forbid=[${[...forbid]}]`)
  }

  // 把数字 value 一步步推到 destIdx; 期间不动 locked 和 extra
  // 每轮先 BFS 算出 value 自己在"locked+extra"约束下到 destIdx 的最短路径,
  // 然后把空格挪到该路径的下一格, swap 一步; 比贪心列/行优先更鲁棒(能绕开锁定区域)
  function moveValueTo(value, destIdx, extra = new Set()) {
    let guard = 0
    while (true) {
      if (++guard > size * size * 4) throw new Error(`moveValueTo 死循环 value=${value} dest=${destIdx}`)
      const cur = locate(value)
      if (cur === destIdx) return
      const blocked = new Set([...locked, ...extra])
      const visited = new Set([cur])
      const parent = new Map()
      const queue = [cur]
      let found = false
      let mvHead = 0
      while (mvHead < queue.length) {
        const p = queue[mvHead++]
        if (p === destIdx) { found = true; break }
        for (const n of neighborsOf(p, size)) {
          if (blocked.has(n) || visited.has(n)) continue
          visited.add(n)
          parent.set(n, p)
          queue.push(n)
        }
      }
      if (!found) throw new Error(`value ${value} 无路径到 ${destIdx}, blocked=[${[...blocked]}]`)
      let nextIdx = destIdx
      while (parent.get(nextIdx) !== cur) nextIdx = parent.get(nextIdx)
      try {
        moveEmptyTo(nextIdx, new Set([...blocked, cur]))
        pushMove(cur)
      } catch (e) {
        // 空格被孤立在 cur 旁的死胡同里(cur 自己 + blocked 把空格的所有出口堵死)
        // fallback: 把空格邻居的某个非 blocked 位置当成 nextIdx, 让 value 反向退一步,
        // 下轮重算路径绕开
        const emptyIdx = board.indexOf(0)
        const escape = neighborsOf(cur, size).find(n => n === emptyIdx && !blocked.has(n))
        if (escape === undefined) throw e
        pushMove(cur)
      }
    }
  }

  function solveRow(layer) {
    for (let col = layer; col < size - 2; col++) {
      const target = ri(layer, col)
      const value = layer * size + col + 1
      moveValueTo(value, target)
      locked.add(target)
    }
    solveLastTwoOfRow(layer)
  }

  function solveLastTwoOfRow(layer) {
    solveCornerBFS(
      layer * size + (size - 1),  // v1Val
      layer * size + size,         // v2Val
      ri(layer, size - 2),         // t1
      ri(layer, size - 1)          // t2
    )
  }

  function solveCol(layer) {
    for (let row = layer + 1; row < size - 2; row++) {
      const target = ri(row, layer)
      const value = row * size + layer + 1
      moveValueTo(value, target)
      locked.add(target)
    }
    solveLastTwoOfCol(layer)
  }

  function solveLastTwoOfCol(layer) {
    solveCornerBFS(
      (size - 2) * size + layer + 1,
      (size - 1) * size + layer + 1,
      ri(size - 2, layer),
      ri(size - 1, layer)
    )
  }

  // 行/列最后两格统一用三元状态 BFS: state=(space, v1, v2), 状态空间 ≤ N⁶ ≤ 15625
  // 优于贪心 moveValueTo: 不会因 buffer/v 位置组合切割棋盘把空格锁在死胡同
  function solveCornerBFS(v1Val, v2Val, t1, t2) {
    if (locate(v1Val) === t1 && locate(v2Val) === t2) {
      locked.add(t1); locked.add(t2)
      return
    }
    const N2 = size * size
    const sp0 = board.indexOf(0)
    const start = (sp0 * N2 + locate(v1Val)) * N2 + locate(v2Val)
    const visited = new Set([start])
    const parentState = new Map()
    const parentMove = new Map()
    parentState.set(start, -1)
    const queue = [start]
    let goalState = -1
    let head = 0
    while (head < queue.length) {
      const cur = queue[head++]
      const sp = Math.floor(cur / (N2 * N2))
      const rest = cur - sp * N2 * N2
      const vp1 = Math.floor(rest / N2)
      const vp2 = rest - vp1 * N2
      if (vp1 === t1 && vp2 === t2) { goalState = cur; break }
      for (const n of neighborsOf(sp, size)) {
        if (locked.has(n)) continue
        const newV1 = (vp1 === n) ? sp : vp1
        const newV2 = (vp2 === n) ? sp : vp2
        const nextState = (n * N2 + newV1) * N2 + newV2
        if (visited.has(nextState)) continue
        visited.add(nextState)
        parentState.set(nextState, cur)
        parentMove.set(nextState, n)
        queue.push(nextState)
      }
    }
    if (goalState < 0) throw new Error(`corner BFS 无解 v1=${v1Val} v2=${v2Val} t1=${t1} t2=${t2}`)
    const path = []
    let s = goalState
    while (parentState.get(s) !== -1) {
      path.unshift(parentMove.get(s))
      s = parentState.get(s)
    }
    for (const idx of path) pushMove(idx)
    locked.add(t1)
    locked.add(t2)
  }

  // 最后 N×N 子棋盘(N ≤ 3)用 BFS 求解, 状态空间 ≤ 9!/2 ≈ 181K, JS Map BFS 几百毫秒搞定
  // 3×3 子棋盘解决了 size=3 col-trick 在窄棋盘上被锁死的问题
  function solveLastBlock(layer) {
    const N = size - layer
    const cells = []
    for (let r = layer; r < size; r++) {
      for (let c = layer; c < size; c++) cells.push(ri(r, c))
    }
    const goalArr = cells.map(idx => idx === size * size - 1 ? 0 : idx + 1)
    const goal = goalArr.join(',')
    const snap = () => cells.map(c => board[c]).join(',')
    const start = snap()
    if (start === goal) return

    // 子棋盘内 pos (0..N²-1) → 真实 board idx 反查
    // 邻居计算: pos = r*N + c (子棋盘坐标), 邻居仍在 [0, N²) 内即可
    const visited = new Set([start])
    const parent = new Map()
    parent.set(start, null)
    const queue = [start]
    let found = false
    let head = 0
    while (head < queue.length) {
      const cur = queue[head++]
      if (cur === goal) { found = true; break }
      const arr = cur.split(',').map(Number)
      const emptyPos = arr.indexOf(0)
      const r = Math.floor(emptyPos / N), c = emptyPos % N
      const nbrs = []
      if (r > 0) nbrs.push(emptyPos - N)
      if (r < N - 1) nbrs.push(emptyPos + N)
      if (c > 0) nbrs.push(emptyPos - 1)
      if (c < N - 1) nbrs.push(emptyPos + 1)
      for (const np of nbrs) {
        const nextArr = arr.slice()
        nextArr[emptyPos] = arr[np]
        nextArr[np] = 0
        const nextState = nextArr.join(',')
        if (visited.has(nextState)) continue
        visited.add(nextState)
        parent.set(nextState, { from: cur, moveIdx: cells[np] })
        queue.push(nextState)
      }
    }
    if (!found) throw new Error(`last ${N}x${N} 不可达, board=` + board.join(','))

    const path = []
    let s = goal
    while (parent.get(s) !== null) {
      path.unshift(parent.get(s).moveIdx)
      s = parent.get(s).from
    }
    for (const idx of path) pushMove(idx)
  }

  // 主循环: 子棋盘 ≥ 3x3 时做 row+col corner BFS, 剩 2x2 交给 last block BFS
  // 整棋盘 BFS (3x3 全 9 格) 会跑 181K 状态太慢, 拆成 corner-BFS(三元状态≤729) 是关键
  let layer = 0
  while (size - layer >= 3) {
    solveRow(layer)
    solveCol(layer)
    layer++
  }
  solveLastBlock(layer)
  return moves
}

// 求"下一步"提示: 返回需要点击的格子 idx, 已通关返回 null
export function nextHint(board, size) {
  if (isSolved(board)) return null
  const moves = solve(board, size)
  return moves.length ? moves[0] : null
}
