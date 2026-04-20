// 从 questions.json 里移除指定 unit 的所有条目
// 用法: node tools/remove-unit.mjs <unit> [input] [output]
//   例: node tools/remove-unit.mjs 2-0-0
//   默认 input/output = static/data/questions.json（原地覆盖）

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEFAULT_PATH = 'static/data/questions.json'
const targetUnit = process.argv[2]
if (!targetUnit) {
  console.error('用法: node tools/remove-unit.mjs <unit> [input] [output]')
  process.exit(1)
}
const inputPath = resolve(process.argv[3] || DEFAULT_PATH)
const outputPath = resolve(process.argv[4] || process.argv[3] || DEFAULT_PATH)

const data = JSON.parse(readFileSync(inputPath, 'utf-8'))
const before = data.length
const kept = data.filter(q => q.unit !== targetUnit)
const removed = before - kept.length

writeFileSync(outputPath, JSON.stringify(kept), 'utf-8')
console.log(`移除 unit=${targetUnit} 条目: ${removed} 条`)
console.log(`剩余: ${kept.length} 条`)
