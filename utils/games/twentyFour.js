// 24 点核心：分数运算 + 表达式校验 + 解枚举 + 题库加载
//
// 题目格式（与 build-24-puzzles.mjs 输出对齐）:
//   { nums: [3,3,8,8], solutionCount: 1, sample: '8/(3-8/3)' }
//
// 关键约定:
//   - 中间结果允许分数（如 8/3）,所以全程用 Frac 类,不用 float
//   - 玩家输入表达式校验时,数字必须严格用且只用一次(多重集相等)

// ============= Fraction =============

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

export class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error('division by zero')
    if (d < 0) { n = -n; d = -d }
    const g = gcd(Math.abs(n), d)
    this.n = n / g
    this.d = d / g
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d) }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d) }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d) }
  div(o) {
    if (o.n === 0) throw new Error('division by zero')
    return new Frac(this.n * o.d, this.d * o.n)
  }
  eq(o)  { return this.n * o.d === o.n * this.d }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}` }
}

const F24 = new Frac(24)

// ============= 解枚举 =============
// 对一组数字穷举所有 +-×÷ 二叉树表达式,统计 = 24 的解数量并保留一个示例。
// 不做严格去重(交换律下会有重复),作为难度分级的相对指标足够。
//
// 性能: 4 个数 ~7680 种表达式,几毫秒内完成。
export function findSolutions(nums, opts = {}) {
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
        // 交换律剪枝: + 和 × 仅在 i<j 时算一次
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

// 找一个解（用于提示）
export function findOneSolution(nums) {
  const r = findSolutions(nums, { limit: 1 })
  return r[0] || null
}

// 是否有解
export function hasSolution(nums) {
  return findSolutions(nums, { limit: 1 }).length > 0
}

// ============= 表达式校验 =============
// 校验玩家输入的表达式:
//   1. 仅含合法字符,数字 multiset 与 nums 相等
//   2. 用 shunting-yard 转 RPN 后用 Frac 求值
//   3. 结果 = 24
//
// 兼容: × ÷ 与 * /、全角空格、全角括号。

const OP_MAP = { '×': '*', '÷': '/', '＋': '+', '－': '-', '（': '(', '）': ')' }

function normalize(s) {
  let out = ''
  for (const ch of s) {
    out += OP_MAP[ch] ?? ch
  }
  return out.replace(/\s+/g, '')
}

function tokenize(s) {
  const tokens = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/[0-9]/.test(ch)) {
      let num = ''
      while (i < s.length && /[0-9]/.test(s[i])) { num += s[i]; i++ }
      tokens.push({ type: 'num', value: parseInt(num, 10) })
    } else if ('+-*/()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
    } else {
      throw new Error(`非法字符: ${ch}`)
    }
  }
  return tokens
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 }

function toRPN(tokens) {
  const out = []
  const stack = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'num') {
      out.push(t)
    } else if (t.value === '(') {
      stack.push(t)
    } else if (t.value === ')') {
      while (stack.length && stack[stack.length - 1].value !== '(') {
        out.push(stack.pop())
      }
      if (!stack.length) throw new Error('括号不匹配')
      stack.pop() // 弹掉 (
    } else {
      // 处理一元负号: + - 出现在表达式开头或 ( 之后,且后面是数字
      if ((t.value === '-' || t.value === '+') &&
          (i === 0 || (tokens[i - 1].type === 'op' && tokens[i - 1].value !== ')'))) {
        // 把下一个数字吞掉变成带符号数字（24 点中负数中间结果也可能出现）
        const next = tokens[i + 1]
        if (next && next.type === 'num') {
          out.push({ type: 'num', value: t.value === '-' ? -next.value : next.value })
          i++
          continue
        }
      }
      while (stack.length && stack[stack.length - 1].value !== '(' &&
             PREC[stack[stack.length - 1].value] >= PREC[t.value]) {
        out.push(stack.pop())
      }
      stack.push(t)
    }
  }
  while (stack.length) {
    const top = stack.pop()
    if (top.value === '(' || top.value === ')') throw new Error('括号不匹配')
    out.push(top)
  }
  return out
}

function evalRPN(rpn) {
  const stack = []
  for (const t of rpn) {
    if (t.type === 'num') {
      stack.push(new Frac(t.value))
    } else {
      if (stack.length < 2) throw new Error('表达式不完整')
      const b = stack.pop()
      const a = stack.pop()
      switch (t.value) {
        case '+': stack.push(a.add(b)); break
        case '-': stack.push(a.sub(b)); break
        case '*': stack.push(a.mul(b)); break
        case '/':
          if (b.n === 0) throw new Error('除以零')
          stack.push(a.div(b))
          break
      }
    }
  }
  if (stack.length !== 1) throw new Error('表达式不完整')
  return stack[0]
}

// 校验入口
// 返回: { ok: bool, value?: Frac, reason?: string, usedNums?: number[] }
export function checkExpression(rawExpr, nums) {
  if (!rawExpr || !rawExpr.trim()) return { ok: false, reason: '请输入算式' }
  let s = normalize(rawExpr)
  let tokens
  try {
    tokens = tokenize(s)
  } catch (e) {
    return { ok: false, reason: e.message }
  }
  // 数字 multiset 必须相等
  const used = tokens.filter(t => t.type === 'num').map(t => t.value)
  if (used.length !== nums.length) {
    return { ok: false, reason: `要正好用 ${nums.length} 个数字（你用了 ${used.length} 个）` }
  }
  const sortedUsed = [...used].sort((a, b) => a - b)
  const sortedNums = [...nums].sort((a, b) => a - b)
  for (let i = 0; i < sortedNums.length; i++) {
    if (sortedUsed[i] !== sortedNums[i]) {
      return { ok: false, reason: `要用这 4 个数字: ${nums.join(', ')}` }
    }
  }
  let value
  try {
    const rpn = toRPN(tokens)
    value = evalRPN(rpn)
  } catch (e) {
    return { ok: false, reason: e.message }
  }
  if (!value.eq(F24)) {
    return { ok: false, reason: `算出来是 ${value.toString()}，不是 24`, value }
  }
  return { ok: true, value, usedNums: used }
}

// ============= 题库加载 =============
// 题库格式: { easy: Puzzle[], medium: Puzzle[], hard: Puzzle[] }
// Puzzle: { nums: number[], solutionCount: number, sample: string }
let _puzzles = null
export async function loadPuzzles() {
  if (_puzzles) return _puzzles
  const mod = await import('../../static/data/games/twenty-four.json')
  _puzzles = mod.default || mod
  return _puzzles
}

export function isLoaded() { return _puzzles !== null }

// 随机抽一题
export function pickPuzzle(difficulty) {
  if (!_puzzles) throw new Error('未加载题库,先 await loadPuzzles()')
  const arr = _puzzles[difficulty]
  if (!arr || !arr.length) throw new Error(`难度 ${difficulty} 无题目`)
  return arr[Math.floor(Math.random() * arr.length)]
}

export const DIFFICULTIES = [
  { key: 'easy',   label: '简单', score: 10 },
  { key: 'medium', label: '中等', score: 20 },
  { key: 'hard',   label: '困难', score: 30 }
]
