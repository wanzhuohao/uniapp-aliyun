// 24 点核心算法回归测试(uniapp-aliyun 无 CLI 测试框架,用 node 直接跑)
// 用法: node tools/test-24.mjs
//
// 覆盖:
//   - Frac 分数加减乘除
//   - findSolutions 经典案例(唯一解/多解/无解)
//   - checkExpression 玩家输入校验
// 修改 utils/games/twentyFour.js 后跑一次

import { Frac, findSolutions, checkExpression } from '../utils/games/twentyFour.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`) }
  else { failed++; console.error(`  ✗ ${msg}`) }
}

console.log('\n[Frac]')
assert(new Frac(1, 3).add(new Frac(2, 3)).eq(new Frac(1)), '1/3 + 2/3 = 1')
assert(new Frac(8).div(new Frac(3)).mul(new Frac(3)).eq(new Frac(8)), '8/3 * 3 = 8 (精度)')
assert(new Frac(3).sub(new Frac(8).div(new Frac(3))).eq(new Frac(1, 3)), '3 - 8/3 = 1/3')
assert(new Frac(8).div(new Frac(1, 3)).eq(new Frac(24)), '8 / (1/3) = 24')

console.log('\n[findSolutions]')
assert(findSolutions([3, 3, 8, 8]).length >= 1, '(3,3,8,8) 至少 1 解')
assert(findSolutions([1, 1, 1, 1]).length === 0, '(1,1,1,1) 无解')
assert(findSolutions([1, 2, 3, 4]).length > 0, '(1,2,3,4) 有解')
assert(findSolutions([3, 6, 8, 4]).length >= 5, '(3,6,8,4) 多解')

console.log('\n[checkExpression]')
assert(checkExpression('(8-2)*(3+1)', [8, 2, 3, 1]).ok, '(8-2)*(3+1) = 24')
assert(checkExpression('8÷(3-8÷3)', [8, 3, 8, 3]).ok, '8÷(3-8÷3) = 24 (分数中间)')
assert(checkExpression('(3+3)×(9-5)', [3, 3, 5, 9]).ok, '(3+3)×(9-5) 全角运算符')
assert(!checkExpression('1+1+1+1', [1, 1, 1, 1]).ok, '1+1+1+1 ≠ 24 应拒绝')
assert(!checkExpression('8+8+8', [8, 8, 8, 3]).ok, '少数字应拒绝')
assert(!checkExpression('8+8+8+8+8', [8, 8, 8, 8]).ok, '多数字应拒绝')
assert(!checkExpression('8+8+8+9', [8, 8, 8, 8]).ok, '换了数字应拒绝')
assert(checkExpression('8/(3-8/3)', [8, 3, 8, 3]).ok, '8/(3-8/3) 经典刁钻题')

console.log(`\n=== ${passed} passed, ${failed} failed ===`)
process.exit(failed ? 1 : 0)
