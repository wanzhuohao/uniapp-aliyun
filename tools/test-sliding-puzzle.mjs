// 数字华容道核心算法回归测试
// 用法: node tools/test-sliding-puzzle.mjs

import {
  createSolvedBoard, canMove, move, shuffle, isSolved, neighborsOf, solve, nextHint
} from '../utils/games/slidingPuzzle.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`) }
  else { failed++; console.error(`  ✗ ${msg}`) }
}

console.log('\n[createSolvedBoard]')
const b3 = createSolvedBoard(3)
assert(b3.length === 9 && b3[8] === 0 && b3[0] === 1, '3x3 solved = [1..8,0]')
assert(isSolved(b3), '3x3 solved 通过 isSolved')

console.log('\n[neighborsOf]')
assert(neighborsOf(0, 3).length === 2, '角(0,0) 有 2 邻居')
assert(neighborsOf(4, 3).length === 4, '中心(1,1) 有 4 邻居')
assert(neighborsOf(8, 3).length === 2, '角(2,2) 有 2 邻居')

console.log('\n[canMove + move]')
// 8 在 idx=7, 0 在 idx=8 -> 8 可以移到 idx=8
assert(canMove(b3, 7, 3), 'idx 7 与空格(8) 相邻')
assert(!canMove(b3, 0, 3), 'idx 0 与空格(8) 不相邻')
const b3a = move(b3, 7, 3)
assert(b3a[7] === 0 && b3a[8] === 8, 'move 后 7↔8 交换')
assert(b3[7] === 8, 'move 不修改原 board')
assert(!isSolved(b3a), 'move 后非 solved')

console.log('\n[shuffle 可解性]')
// 打乱 N 次再"逆向"走应该回不到原状态,但 isSolved 不被误判
for (const size of [3, 4, 5]) {
  const shuffled = shuffle(size, 50)
  assert(shuffled.length === size * size, `shuffle ${size}x${size} 长度正确`)
  assert(shuffled.includes(0), `shuffle ${size}x${size} 含空格`)
  // 数字集合正确
  const sorted = [...shuffled].sort((a, b) => a - b)
  const expected = Array.from({ length: size * size }, (_, i) => i)
  assert(JSON.stringify(sorted) === JSON.stringify(expected),
         `shuffle ${size}x${size} 含 0..${size*size-1} 各一个`)
}

console.log('\n[逆向求解性: 任何 shuffle 都可解]')
// 直接 brute 一遍 3x3 看 100 次 shuffle 都不是已解状态(防止 shuffleMoves 太小或退化)
let allShuffled = 0
for (let i = 0; i < 100; i++) {
  const b = shuffle(3, 80)
  if (!isSolved(b)) allShuffled++
}
assert(allShuffled >= 95, `100 次 3x3 shuffle 至少 95 次离开 solved (got ${allShuffled})`)

console.log('\n[isSolved 正确性]')
assert(isSolved([1, 2, 3, 0]), '2x2 [1,2,3,0] solved')
assert(!isSolved([0, 1, 2, 3]), '2x2 [0,1,2,3] not solved')
assert(!isSolved([1, 3, 2, 0]), '2x2 [1,3,2,0] not solved')

console.log('\n[solve 求解器: 打乱→求解→验证还原]')
for (const size of [3, 4, 5]) {
  const moveCount = { 3: 80, 4: 200, 5: 400 }[size]
  const trials = size === 5 ? 8 : 20
  let maxSteps = 0
  let totalMs = 0
  let ok = 0
  let firstFailBoard = null
  for (let i = 0; i < trials; i++) {
    const b0 = shuffle(size, moveCount)
    try {
      const t0 = performance.now()
      const seq = solve(b0, size)
      totalMs += performance.now() - t0
      let cur = b0.slice()
      for (const m of seq) cur = move(cur, m, size)
      if (isSolved(cur)) ok++
      maxSteps = Math.max(maxSteps, seq.length)
    } catch (e) {
      if (!firstFailBoard) firstFailBoard = { board: b0.slice(), err: e.message }
    }
  }
  if (firstFailBoard) {
    console.error(`  ✗ size=${size}: ${ok}/${trials}, 首个失败 board=[${firstFailBoard.board}] err=${firstFailBoard.err}`)
  }
  assert(ok === trials, `size=${size}: ${trials} 次随机打乱全部解出 (max=${maxSteps} 步, avg=${(totalMs / trials).toFixed(1)}ms)`)
}

console.log('\n[solve 已通关返回空序列]')
assert(solve(createSolvedBoard(3), 3).length === 0, 'solved 3x3 → []')
assert(solve(createSolvedBoard(4), 4).length === 0, 'solved 4x4 → []')

console.log('\n[nextHint 取第一步]')
const hb3 = shuffle(3, 80)
const hint = nextHint(hb3, 3)
assert(hint !== null && canMove(hb3, hint, 3), 'nextHint 返回合法可移格子')
assert(nextHint(createSolvedBoard(3), 3) === null, '已通关 nextHint=null')

console.log(`\n=== ${passed} passed, ${failed} failed ===`)
process.exit(failed ? 1 : 0)
