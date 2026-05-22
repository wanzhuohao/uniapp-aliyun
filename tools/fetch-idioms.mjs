// 从 chinese-xinhua (pwxcoo/chinese-xinhua) idiom.json 抽出 {w, p} 数组
// 用法:
//   1) 先下载原始库到 tools/.idiom-raw.json（如已存在跳过）:
//      curl -sL -o tools/.idiom-raw.json "https://cdn.jsdelivr.net/gh/pwxcoo/chinese-xinhua@master/data/idiom.json"
//   2) node tools/fetch-idioms.mjs [inputPath] [outputPath]
//      默认 input  = tools/.idiom-raw.json
//      默认 output = static/data/games/idioms.json
//
// 输出格式: [{"w":"一帆风顺","p":"yi fan feng shun"}, ...]
// pinyin 去声调 + 小写，便于运行时同音比较；w 字符数必须 == p 词数

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const DEFAULT_INPUT = 'tools/.idiom-raw.json'
const DEFAULT_OUTPUT = 'static/data/games/idioms.json'

const inputPath = resolve(process.argv[2] || DEFAULT_INPUT)
const outputPath = resolve(process.argv[3] || DEFAULT_OUTPUT)

// 拼音去声调表
const TONE_MAP = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a',
  ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u',
  ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v',
  ü: 'v'
}
function stripTone(s) {
  return s.toLowerCase().replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, c => TONE_MAP[c] || c)
}

function isChineseIdiom(w) {
  if (!w || typeof w !== 'string') return false
  // 仅汉字、长度 3-8（绝大多数 4 字）
  if (!/^[一-龥]+$/.test(w)) return false
  return w.length >= 3 && w.length <= 8
}

console.log(`[fetch-idioms] reading ${inputPath} ...`)
const raw = JSON.parse(readFileSync(inputPath, 'utf-8'))
console.log(`[fetch-idioms] raw count: ${raw.length}`)

const seen = new Set()
const out = []
let skipShape = 0
let skipPinyin = 0
let skipDup = 0

for (const item of raw) {
  const w = item.word
  const rawP = item.pinyin
  if (!isChineseIdiom(w)) { skipShape++; continue }
  if (!rawP || typeof rawP !== 'string') { skipPinyin++; continue }
  const p = stripTone(rawP.trim().replace(/\s+/g, ' '))
  const syll = p.split(' ').filter(Boolean)
  // 拼音音节数必须等于汉字数
  if (syll.length !== w.length) { skipPinyin++; continue }
  if (seen.has(w)) { skipDup++; continue }
  seen.add(w)
  out.push({ w, p: syll.join(' ') })
}

console.log(`[fetch-idioms] kept: ${out.length}, skipShape: ${skipShape}, skipPinyin: ${skipPinyin}, skipDup: ${skipDup}`)

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, JSON.stringify(out), 'utf-8')
console.log(`[fetch-idioms] wrote ${outputPath}`)
