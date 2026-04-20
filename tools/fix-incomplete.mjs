// 补齐 questions.json 中缺失的字段
// 用法: node tools/fix-incomplete.mjs [input] [output]
//   默认原地覆盖 static/data/questions.json

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_PATH = 'static/data/questions.json'
const inputPath = resolve(process.argv[2] || DEFAULT_PATH)
const outputPath = resolve(process.argv[3] || process.argv[2] || DEFAULT_PATH)

// 补 pinyin 条目的 char_distractors（按形近字选）
const PINYIN_PATCH = {
  '册': ['丹', '删', '则'],
  '支': ['攴', '文', '又'],
  '电': ['田', '申', '雷'],
  '衣': ['农', '依', '表'],
}

// 补 stroke 条目的 strokes 数组
const STROKE_PATCH = {
  '册': ['撇', '横折钩', '撇', '横折钩', '横'],
  '支': ['横', '竖', '撇', '捺'],
  '电': ['竖', '横折', '横', '横', '竖弯钩'],
  '衣': ['点', '横', '撇', '竖提', '撇', '捺'],
}

// 新增 stroke 条目（原数据只有 pinyin 缺 stroke）
const STROKE_APPEND = [
  {
    char: '入', strokes: ['撇', '捺'], strokeCount: 2,
    radical: '入', structure: '独体', unit: '2-1-1', type: 'stroke',
  },
]

const data = JSON.parse(readFileSync(inputPath, 'utf-8'))

let patchedPinyin = 0
let patchedStroke = 0
for (const q of data) {
  if (q.type === 'pinyin' && PINYIN_PATCH[q.char] && !Array.isArray(q.char_distractors)) {
    q.char_distractors = PINYIN_PATCH[q.char]
    patchedPinyin++
  }
  if (q.type === 'stroke' && STROKE_PATCH[q.char] && !Array.isArray(q.strokes)) {
    q.strokes = STROKE_PATCH[q.char]
    patchedStroke++
  }
}

let appended = 0
for (const entry of STROKE_APPEND) {
  // 幂等：已存在则跳过
  const exists = data.some(q => q.type === entry.type && q.char === entry.char)
  if (!exists) {
    data.push(entry)
    appended++
  }
}

writeFileSync(outputPath, JSON.stringify(data), 'utf-8')

console.log(`补 char_distractors: ${patchedPinyin} 条`)
console.log(`补 strokes: ${patchedStroke} 条`)
console.log(`新增 stroke 条目: ${appended} 条`)
console.log(`最终总条数: ${data.length}`)
