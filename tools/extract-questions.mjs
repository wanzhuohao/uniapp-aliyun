// 从 uniapp 的 seed-questions 云函数源文件抽 questionsData 数组 → JSON
// 用法: node tools/extract-questions.mjs [inputPath] [outputPath]
//   默认 input  = ../uniapp/uniCloud-alipay/cloudfunctions/seed-questions/index.js
//   默认 output = static/data/questions.json

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DEFAULT_INPUT = '../uniapp/uniCloud-alipay/cloudfunctions/seed-questions/index.js'
const DEFAULT_OUTPUT = 'static/data/questions.json'

const inputPath = resolve(process.argv[2] || DEFAULT_INPUT)
const outputPath = resolve(process.argv[3] || DEFAULT_OUTPUT)

const src = readFileSync(inputPath, 'utf-8')

const marker = 'const questionsData = '
const start = src.indexOf(marker)
if (start < 0) throw new Error('找不到 questionsData 定义')

const arrStart = src.indexOf('[', start)
let depth = 0
let end = -1
let inStr = false
let strCh = ''
let esc = false
for (let i = arrStart; i < src.length; i++) {
  const ch = src[i]
  if (inStr) {
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === strCh) inStr = false
    continue
  }
  if (ch === '"' || ch === "'") { inStr = true; strCh = ch; continue }
  if (ch === '[') depth++
  else if (ch === ']') {
    depth--
    if (depth === 0) { end = i; break }
  }
}
if (end < 0) throw new Error('数组闭合括号未找到')

const arrText = src.slice(arrStart, end + 1)
const data = eval(arrText)

if (!Array.isArray(data)) throw new Error('解析结果不是数组')

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(data), 'utf-8')

const byType = data.reduce((m, q) => (m[q.type] = (m[q.type] || 0) + 1, m), {})
const byUnit = data.reduce((m, q) => (m[q.unit] = (m[q.unit] || 0) + 1, m), {})

console.log(`导出 ${data.length} 条题目 → ${outputPath}`)
console.log('按 type:', byType)
console.log('按 unit:', byUnit)
