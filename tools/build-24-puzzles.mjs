// 离线生成 24 点题库
//   穷举所有 (1..13)^4 多重集,求解数量,按难度分桶,输出 JSON
//
// 用法:
//   node tools/build-24-puzzles.mjs [outputPath]
//   默认 output = static/data/games/twenty-four.json
//
// 分桶规则:
//   - 解数 0       : 跳过(无解题不出)
//   - 解数 1-2     : hard
//   - 解数 3-10    : medium
//   - 解数 > 10    : easy
//
// 输出格式:
//   { easy: [{nums, solutionCount, sample}, ...], medium: [...], hard: [...] }

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DEFAULT_OUTPUT = 'static/data/games/twenty-four.json'
const outputPath = resolve(process.argv[2] || DEFAULT_OUTPUT)

// ============= Fraction =============
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('div by zero')
    if (d < 0) { n = -n; d = -d }
    const g = gcd(Math.abs(n), d)
    this.n = n / g
    this.d = d / g
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d) }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d) }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d) }
  div(o) {
    if (o.n === 0) throw new Error('div by zero')
    return new Frac(this.n * o.d, this.d * o.n)
  }
  eq(o) { return this.n * o.d === o.n * this.d }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}` }
}

const F24 = new Frac(24)

function findSolutions(nums, opts = {}) {
  const limit = opts.limit ?? Infinity
  const items = nums.map(n => [new Frac(n), String(n)])
  const found = []

  function recurse(arr) {
    if (found.length >= limit) return
    if (arr.length === 1) {
      if (arr[0][0].eq(F24)) found.push(arr[0][1])
      return
    }
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        if (found.length >= limit) return
        const rest = []
        for (let k = 0; k < arr.length; k++) {
          if (k !== i && k !== j) rest.push(arr[k])
        }
        const [a, ea] = arr[i]
        const [b, eb] = arr[j]
        const ops = []
        if (i < j) {
          ops.push(['+', a.add(b)])
          ops.push(['×', a.mul(b)])
        }
        ops.push(['-', a.sub(b)])
        if (b.n !== 0) ops.push(['÷', a.div(b)])
        for (const [op, val] of ops) {
          const expr = `(${ea}${op}${eb})`
          recurse([...rest, [val, expr]])
        }
      }
    }
  }

  recurse(items)
  return found
}

// ============= 主流程 =============
console.log('[build-24] enumerating multisets (1..13)^4 ...')

const easy = []
const medium = []
const hard = []
let totalChecked = 0
let totalNoSolution = 0

// 枚举多重集: a <= b <= c <= d
for (let a = 1; a <= 13; a++) {
  for (let b = a; b <= 13; b++) {
    for (let c = b; c <= 13; c++) {
      for (let d = c; d <= 13; d++) {
        totalChecked++
        const nums = [a, b, c, d]
        const solutions = findSolutions(nums)
        if (solutions.length === 0) {
          totalNoSolution++
          continue
        }
        const puzzle = {
          nums,
          solutionCount: solutions.length,
          sample: solutions[0].replace(/^\((.*)\)$/, '$1') // 去掉最外层括号
        }
        if (solutions.length <= 2) hard.push(puzzle)
        else if (solutions.length <= 10) medium.push(puzzle)
        else easy.push(puzzle)
      }
    }
  }
}

console.log(`[build-24] checked: ${totalChecked}, no-solution: ${totalNoSolution}`)
console.log(`[build-24] easy: ${easy.length}, medium: ${medium.length}, hard: ${hard.length}`)

// 抽样几个看看
const samplePick = arr => arr.length ? arr[Math.floor(arr.length / 2)] : null
console.log('[build-24] sample easy:', samplePick(easy))
console.log('[build-24] sample medium:', samplePick(medium))
console.log('[build-24] sample hard:', samplePick(hard))

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify({ easy, medium, hard }), 'utf-8')
console.log(`[build-24] wrote ${outputPath}`)
