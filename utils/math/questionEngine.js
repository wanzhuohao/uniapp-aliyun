const LEVEL_CONFIG = {
  1: { name: '20以内加减', max: 20 },
  2: { name: '100以内±整十', max: 100, step: 10 },
  3: { name: '100以内±一位数', max: 100 },
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randTens(max) {
  return rand(1, Math.floor(max / 10)) * 10
}

// 加法: Lv.2 must have one operand as multiple of 10, other as two-digit number
function genAdd(level) {
  const cfg = LEVEL_CONFIG[level]
  let a, b
  if (cfg.step === 10) {
    a = rand(10, cfg.max - 10)
    b = randTens(Math.min(cfg.max - a, 90))
    if (b === 0) b = 10
  } else {
    a = rand(1, cfg.max - 1)
    b = rand(1, cfg.max - a)
  }
  return { expr: `${a} + ${b}`, answer: String(a + b) }
}

// 减法: Lv.2 must have subtrahend as multiple of 10
function genSub(level) {
  const cfg = LEVEL_CONFIG[level]
  let a, b
  if (cfg.step === 10) {
    b = randTens(90)
    a = rand(Math.max(b, 10), cfg.max)
  } else {
    a = rand(2, cfg.max)
    b = rand(1, a - 1)
  }
  return { expr: `${a} - ${b}`, answer: String(a - b) }
}

// 比大小: 两边可以是数字或简单算式，支持 ＞ ＝ ＜
function genCompare(level) {
  const cfg = LEVEL_CONFIG[level]
  // 随机决定两边是纯数字还是算式
  function genSide() {
    if (Math.random() > 0.4) {
      // 纯数字
      return { text: String(rand(1, cfg.max)), value: rand(1, cfg.max) }
    }
    // 简单算式
    const isAdd = Math.random() > 0.5
    if (isAdd) {
      const a = rand(1, cfg.max - 1)
      const b = rand(1, cfg.max - a)
      return { text: `${a}+${b}`, value: a + b }
    } else {
      const a = rand(2, cfg.max)
      const b = rand(1, a - 1)
      return { text: `${a}-${b}`, value: a - b }
    }
  }
  const left = genSide()
  const right = genSide()
  let answer
  if (left.value > right.value) answer = '＞'
  else if (left.value < right.value) answer = '＜'
  else answer = '＝'
  return { expr: `${left.text} ○ ${right.text}`, answer, type: 'compare' }
}

// 填空: a + __ = c or __ - b = c, blank is positive integer
function genFillBlank(level) {
  const cfg = LEVEL_CONFIG[level]
  const isAdd = Math.random() > 0.5
  let a, b
  if (isAdd) {
    a = rand(1, cfg.max - 1)
    b = rand(1, cfg.max - a)
    if (Math.random() > 0.5) {
      return { expr: `__ + ${b} = ${a + b}`, answer: String(a), type: 'fill' }
    } else {
      return { expr: `${a} + __ = ${a + b}`, answer: String(b), type: 'fill' }
    }
  } else {
    a = rand(2, cfg.max)
    b = rand(1, a - 1)
    if (Math.random() > 0.5) {
      return { expr: `__ - ${b} = ${a - b}`, answer: String(a), type: 'fill' }
    } else {
      return { expr: `${a} - __ = ${a - b}`, answer: String(b), type: 'fill' }
    }
  }
}

// 连加连减: a+b+c or a-b-c, intermediate and final results >= 0, total <= max
function genChain(level) {
  const cfg = LEVEL_CONFIG[level]
  const max = cfg.max
  for (let attempt = 0; attempt < 20; attempt++) {
    const isAdd = Math.random() > 0.5
    if (isAdd) {
      const a = rand(1, Math.floor(max / 3))
      const b = rand(1, Math.floor((max - a) / 2))
      const c = rand(1, max - a - b)
      return { expr: `${a} + ${b} + ${c}`, answer: String(a + b + c) }
    } else {
      const a = rand(3, max)
      const b = rand(1, a - 1)
      const c = rand(0, a - b)
      if (c > 0) {
        return { expr: `${a} - ${b} - ${c}`, answer: String(a - b - c) }
      }
    }
  }
  const a = rand(1, 5), b = rand(1, 5), c = rand(1, 5)
  return { expr: `${a} + ${b} + ${c}`, answer: String(a + b + c) }
}

// 填运算符: 单边 a ○ b = c，或双边 a ○ b = c ○ d
function genFillOp(level) {
  const cfg = LEVEL_CONFIG[level]
  // 约40%概率出双边题
  if (Math.random() < 0.4) return genFillOpDouble(level)
  const isAdd = Math.random() > 0.5
  let a, b, c
  if (isAdd) {
    a = rand(1, cfg.max - 1)
    b = rand(1, cfg.max - a)
    c = a + b
  } else {
    a = rand(2, cfg.max)
    b = rand(1, a - 1)
    c = a - b
  }
  return { expr: `${a} ○ ${b} = ${c}`, answer: isAdd ? '+' : '-', type: 'fillOp' }
}

// 双边填运算符: a ○ b = c ○ d，两边都要填
function genFillOpDouble(level) {
  const cfg = LEVEL_CONFIG[level]
  for (let attempt = 0; attempt < 20; attempt++) {
    // 先确定目标值
    const target = rand(2, cfg.max - 1)
    // 左边: a op1 b = target
    const leftAdd = Math.random() > 0.5
    let a, b
    if (leftAdd) {
      a = rand(1, target - 1)
      b = target - a
    } else {
      a = rand(target + 1, Math.min(cfg.max, target + cfg.max))
      b = a - target
      if (b <= 0 || a > cfg.max) continue
    }
    // 右边: c op2 d = target
    const rightAdd = Math.random() > 0.5
    let c, d
    if (rightAdd) {
      c = rand(1, target - 1)
      d = target - c
    } else {
      c = rand(target + 1, Math.min(cfg.max, target + cfg.max))
      d = c - target
      if (d <= 0 || c > cfg.max) continue
    }
    const op1 = leftAdd ? '+' : '-'
    const op2 = rightAdd ? '+' : '-'
    return {
      expr: `${a} ○ ${b} = ${c} ○ ${d}`,
      answer: `${op1},${op2}`,
      type: 'fillOp2',
    }
  }
  // fallback: 简单加法等式
  const t = rand(3, Math.floor(cfg.max / 2))
  const a = rand(1, t - 1), b = t - a
  const c = rand(1, t - 1), d = t - c
  return { expr: `${a} ○ ${b} = ${c} ○ ${d}`, answer: '+,+', type: 'fillOp2' }
}

// 百数表填空: 不规则形状(十字/L/T形等)，只给1个数，其余全填
// 从中间向外随机生长5~8个格子，值按百数表规律: 左右±1, 上下±10
function genHundredChart(level) {
  const cfg = LEVEL_CONFIG[level]
  // 百数表固定用1~100范围，不受难度级别限制
  const center = rand(22, 79)
  const cellCount = rand(5, 8)
  const cells = [{ r: 0, c: 0 }]
  const cellSet = new Set(['0,0'])
  const dirs = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]

  let attempts = 0
  while (cells.length < cellCount && attempts < 100) {
    attempts++
    const base = cells[Math.floor(Math.random() * cells.length)]
    const dir = dirs[Math.floor(Math.random() * dirs.length)]
    const nr = base.r + dir.r, nc = base.c + dir.c
    const key = `${nr},${nc}`
    if (cellSet.has(key)) continue
    const val = center + nr * 10 + nc
    if (val < 1 || val > 100) continue
    cells.push({ r: nr, c: nc })
    cellSet.add(key)
  }

  // 计算网格边界
  const minR = Math.min(...cells.map(c => c.r))
  const maxR = Math.max(...cells.map(c => c.r))
  const minC = Math.min(...cells.map(c => c.c))
  const maxC = Math.max(...cells.map(c => c.c))
  const rows = maxR - minR + 1
  const cols = maxC - minC + 1

  // cellMap: "行,列" -> 值
  const cellMap = {}
  for (const cell of cells) {
    const gr = cell.r - minR, gc = cell.c - minC
    cellMap[`${gr},${gc}`] = center + cell.r * 10 + cell.c
  }

  const centerKey = `${0 - minR},${0 - minC}`
  const allKeys = Object.keys(cellMap)
  const hiddenKeys = allKeys.filter(k => k !== centerKey)

  return {
    expr: JSON.stringify({ center, rows, cols, cellMap, centerKey, hiddenKeys }),
    answer: JSON.stringify(hiddenKeys.map(k => String(cellMap[k]))),
    type: 'hundredChart',
  }
}

const TYPE_GENERATORS = { add: genAdd, sub: genSub, compare: genCompare, fill: genFillBlank, chain: genChain, fillOp: genFillOp, hundredChart: genHundredChart }
const MIX_TYPES = ['add', 'add', 'sub', 'sub', 'compare', 'fill', 'chain', 'fillOp', 'hundredChart']
const PRINT_TYPES = ['add', 'add', 'sub', 'sub', 'chain']
const PRINT_NO_CHAIN_TYPES = ['add', 'sub']

// Main export: generate questions
// questionType: string | string[] — 'add'/'sub'/'compare'/'fill'/'chain'/'mix'/'print' 或数组如 ['add','sub']
// level: number | string | number[] — 1/2/3/'mix' 或数组如 [1,2]
export function generateQuestions({ level, count, questionType = 'mix' }) {
  // 支持数组形式的 level
  let levels
  if (Array.isArray(level)) levels = level
  else if (level === 'mix') levels = [1, 2, 3]
  else levels = [level]

  const seen = new Set()
  const questions = []

  // 支持数组形式的 questionType
  let typePool
  if (Array.isArray(questionType)) typePool = questionType
  else if (questionType === 'mix') typePool = MIX_TYPES
  else if (questionType === 'print') typePool = PRINT_TYPES
  else if (questionType === 'print-no-chain') typePool = PRINT_NO_CHAIN_TYPES
  else typePool = [questionType]

  for (let i = 0; i < count; i++) {
    const lv = levels[Math.floor(Math.random() * levels.length)]
    let q = null
    for (let retry = 0; retry < 10; retry++) {
      const type = typePool[Math.floor(Math.random() * typePool.length)]
      const gen = TYPE_GENERATORS[type]
      q = gen(lv)
      if (!q.type) q.type = type
      if (!seen.has(q.expr)) { seen.add(q.expr); break }
    }
    questions.push(q)
  }
  return questions
}

export { LEVEL_CONFIG }
