// 数独核心算法回归测试 + 性能验证
// 用法: node tools/test-sudoku.mjs

import {
  DIFFICULTIES, generateFullBoard, generatePuzzle, countSolutions,
  solveBoard, findConflicts, isComplete
} from '../utils/games/sudoku.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`) }
  else { failed++; console.error(`  ✗ ${msg}`) }
}

function isFullyValid(board, size, boxR, boxC) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board[r][c]) return false
      if (findConflicts(board, r, c, board[r][c], size, boxR, boxC).length) return false
    }
  }
  return true
}

console.log('\n[generateFullBoard]')
for (const { size, boxR, boxC } of [{ size: 4, boxR: 2, boxC: 2 }, { size: 6, boxR: 2, boxC: 3 }, { size: 9, boxR: 3, boxC: 3 }]) {
  const b = generateFullBoard(size, boxR, boxC)
  assert(b.length === size && b[0].length === size, `${size}x${size} 满解尺寸正确`)
  assert(isFullyValid(b, size, boxR, boxC), `${size}x${size} 满解无冲突`)
}

console.log('\n[countSolutions 唯一解]')
const full = generateFullBoard(4, 2, 2)
assert(countSolutions(full, 4, 2, 2, 2) === 1, '4x4 完整解 -> 1 解')
const blank4 = Array.from({ length: 4 }, () => new Array(4).fill(0))
assert(countSolutions(blank4, 4, 2, 2, 2) >= 2, '4x4 空棋盘 -> 多解(limit=2 返 2)')

console.log('\n[generatePuzzle 各难度]')
for (const d of DIFFICULTIES) {
  const t0 = Date.now()
  const r = generatePuzzle(d.key)
  const dt = Date.now() - t0
  assert(r.puzzle.length === d.size, `${d.key} (${d.size}x${d.size}) 尺寸正确`)
  assert(isFullyValid(r.solution, d.size, d.boxR, d.boxC), `${d.key} 解无冲突`)
  // 挖洞数在范围内或接近(允许偏离 if difficult to dig)
  console.log(`    ${d.key}: holes ${r.holesActual}/${r.holesTarget}, ${dt}ms`)
  assert(r.holesActual >= d.holes[0] - 5, `${d.key} 挖洞数接近目标(>=${d.holes[0] - 5})`)
  assert(dt < 3000, `${d.key} 生成 < 3s(实际 ${dt}ms)`)
  // 校验唯一解
  const cs = countSolutions(r.puzzle, d.size, d.boxR, d.boxC, 2)
  assert(cs === 1, `${d.key} 题目仍唯一解`)
}

console.log('\n[findConflicts]')
const f4 = generateFullBoard(4, 2, 2)
// 故意改一个数字让它和邻居冲突
const orig = f4[0][0]
const dup = orig === 1 ? 2 : 1  // 找一个不同的数字
// 找一个同行的位置改成 orig 制造冲突
const conflicts = findConflicts(f4, 0, 1, f4[0][0], 4, 2, 2)
// 同行的 (0,0) 已经是 orig,所以 (0,1) 填 orig 应有冲突
assert(conflicts.length > 0, '同行冲突能被检出')

console.log('\n[isComplete]')
assert(isComplete(f4, 4, 2, 2), '完整满解 isComplete=true')
const puzzleCopy = f4.map(r => r.slice())
puzzleCopy[0][0] = 0
assert(!isComplete(puzzleCopy, 4, 2, 2), '有空格 isComplete=false')

console.log(`\n=== ${passed} passed, ${failed} failed ===`)
process.exit(failed ? 1 : 0)
