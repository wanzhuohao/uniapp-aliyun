// 一次性迁移：把 1-3/7-8 单元的字从 2-0-0 分配到正确 unit
// 顺便：删除 seed 数据错误的"已(yǐ)"，新增漏收的 7 个字
// 用法: node tools/assign-units.mjs [input] [output]
//   默认 input = static/data/questions.json，原地覆盖

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_PATH = 'static/data/questions.json'
const inputPath = resolve(process.argv[2] || DEFAULT_PATH)
const outputPath = resolve(process.argv[3] || process.argv[2] || DEFAULT_PATH)

// 单元 → 字列表
const UNIT_MAP = {
  '2-1-1': '春冬吹花飞入',
  '2-1-2': '什么古胡双言',
  '2-1-3': '青清晴苗请生',
  '2-1-4': '字红动万无明',
  '2-1-0': '文卡片合',
  '2-2-1': '共产党太阳光',
  '2-2-2': '井主江住方后',
  '2-2-3': '告的会北京广',
  '2-2-0': '写认',
  '2-3-4': '走河说让自己',
  '2-3-5': '从好们叫他回',
  '2-3-6': '快乐当书画毛',
  '2-3-0': '止斤寸丁千元',
  '2-7-14': '笔知道放平安',
  '2-7-15': '灯车站课坐老师',
  '2-7-16': '国都百听时点林',
  '2-7-17': '高兴着往瓜兔进',
  '2-7-0': '巾洗',
  '2-8-18': '她空还干身星久',
  '2-8-19': '吓为怕家象没到',
  '2-8-20': '向边行草赶过找',
  '2-8-0': '页户交父',
}

// 建 char → unit 索引
const CHAR_TO_UNIT = {}
for (const [unit, chs] of Object.entries(UNIT_MAP)) {
  for (const c of chs) CHAR_TO_UNIT[c] = unit
}

// 新增字（seed 原始数据漏收）
// 格式说明：每个字要有 pinyin + stroke 两份。公共字段放 base，分别扩展。
const NEW_CHARS = [
  {
    char: '苗', pinyin: 'miáo',
    distractors: ['máo', 'miào', 'miāo'],
    char_distractors: ['田', '草', '笛'],
    radical: '艹', structure: '上下', strokeCount: 8,
    strokes: ['横', '竖', '竖', '竖', '横折', '横', '竖', '横折', '横'],
    unit: '2-1-3',
  },
  {
    char: '党', pinyin: 'dǎng',
    distractors: ['dàng', 'dáng', 'tǎng'],
    char_distractors: ['堂', '常', '光'],
    radical: '儿', structure: '上下', strokeCount: 10,
    strokes: ['竖', '点', '撇', '点', '横折', '横', '竖', '横折钩', '撇', '竖弯钩'],
    unit: '2-2-1',
  },
  {
    char: '告', pinyin: 'gào',
    distractors: ['gāo', 'gǎo', 'kào'],
    char_distractors: ['造', '牛', '口'],
    radical: '口', structure: '上下', strokeCount: 7,
    strokes: ['撇', '横', '横', '竖', '竖', '横折', '横'],
    unit: '2-2-3',
  },
  {
    char: '己', pinyin: 'jǐ',
    distractors: ['qǐ', 'jí', 'yǐ'],
    char_distractors: ['已', '以', '巳'],
    radical: '己', structure: '独体', strokeCount: 3,
    strokes: ['横折', '横', '竖弯钩'],
    unit: '2-3-4',
  },
  {
    char: '丁', pinyin: 'dīng',
    distractors: ['tīng', 'dǐng', 'dìng'],
    char_distractors: ['工', '打', '灯'],
    radical: '一', structure: '独体', strokeCount: 2,
    strokes: ['横', '竖钩'],
    unit: '2-3-0',
  },
  {
    char: '着', pinyin: 'zhe',
    distractors: ['zhē', 'zhé', 'zhè'],
    char_distractors: ['差', '看', '羊'],
    radical: '目', structure: '上下', strokeCount: 11,
    strokes: ['点', '撇', '横', '横', '横', '撇', '竖', '横折', '横', '横', '横'],
    unit: '2-7-17',
  },
  {
    char: '交', pinyin: 'jiāo',
    distractors: ['jiǎo', 'qiāo', 'xiāo'],
    char_distractors: ['六', '文', '父'],
    radical: '亠', structure: '上下', strokeCount: 6,
    strokes: ['点', '横', '撇', '横撇/横钩', '撇', '捺'],
    unit: '2-8-0',
  },
]

function buildPinyinEntry(c) {
  return {
    char: c.char, pinyin: c.pinyin,
    distractors: c.distractors,
    char_distractors: c.char_distractors,
    unit: c.unit,
    radical: c.radical, structure: c.structure, strokeCount: c.strokeCount,
    type: 'pinyin',
  }
}

function buildStrokeEntry(c) {
  return {
    char: c.char, strokes: c.strokes, strokeCount: c.strokeCount,
    radical: c.radical, structure: c.structure,
    unit: c.unit, type: 'stroke',
  }
}

// ---- 主逻辑 ----
const raw = readFileSync(inputPath, 'utf-8')
const data = JSON.parse(raw)

let removedYi = 0
let movedCount = 0

// 1. 过滤掉错误的"已"
const filtered = data.filter(q => {
  if (q.char === '已') { removedYi++; return false }
  return true
})

// 2. 迁移 unit
for (const q of filtered) {
  const newUnit = CHAR_TO_UNIT[q.char]
  if (newUnit && q.unit !== newUnit) {
    q.unit = newUnit
    movedCount++
  }
}

// 3. 追加新字（每字 2 条）
for (const c of NEW_CHARS) {
  filtered.push(buildPinyinEntry(c))
  filtered.push(buildStrokeEntry(c))
}

// ---- 输出 ----
writeFileSync(outputPath, JSON.stringify(filtered), 'utf-8')

// ---- 报告 ----
const byUnit = filtered.reduce((m, q) => (m[q.unit] = (m[q.unit] || 0) + 1, m), {})
const sortedUnits = Object.keys(byUnit).sort()
console.log(`输入: ${inputPath}`)
console.log(`输出: ${outputPath}`)
console.log(`删除"已"条数: ${removedYi}`)
console.log(`迁移 unit 条数: ${movedCount}`)
console.log(`新增字: ${NEW_CHARS.map(c => c.char).join(',')} (×2 条/字)`)
console.log(`最终总条数: ${filtered.length}`)
console.log(`按 unit 分布:`)
for (const u of sortedUnits) console.log(`  ${u}: ${byUnit[u]}`)
