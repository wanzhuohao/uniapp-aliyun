// 验证图形填数题目的结构、答案映射和每边和；三角形允许“全中点已知”。
// 用法：node tools/validate-shape-fill.mjs [count=200]
//      使用项目中的 node：/d/nvm4w/nodejs/node.exe tools/validate-shape-fill.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const count = Number(process.argv[2]) || 200

// 读源文件、去掉 export 关键字，在独立作用域里 eval
let src = fs.readFileSync(path.resolve(__dirname, '..', 'utils/math/questionEngine.js'), 'utf8')
src = src.replace(/^import\s+\{[^}]*assertAvailableLearningGrade[^}]*\}\s+from\s+['"][^'"]+gradeContext\.js['"]\s*\r?\n/m, '')
src = src.replace(/^export\s+/gm, '')
const mod = new Function(`${src}
  return { genShapeFill, genTriangle, genSquare }`)()

const LAYOUTS = {
  triangle: {
    keys: ['A', 'B', 'C', 'AB', 'BC', 'AC'],
    edges: [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['A', 'AC', 'C']],
  },
  square: {
    keys: ['A', 'B', 'C', 'D', 'AB', 'BC', 'CD', 'DA'],
    edges: [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['C', 'CD', 'D'], ['D', 'DA', 'A']],
  },
}

let triCount = 0, sqCount = 0
let allMidpointCount = 0
const violations = []

function validateQuestion(q, index) {
  const layout = LAYOUTS[q.type]
  if (!layout) {
    violations.push({ index, type: q.type, reasons: [`未知图形类型: ${q.type}`], expr: q.expr, answer: q.answer })
    return
  }

  let data, answer
  try {
    data = JSON.parse(q.expr)
    answer = JSON.parse(q.answer)
  } catch (error) {
    violations.push({ index, type: q.type, reasons: [`JSON 解析失败: ${error.message}`], expr: q.expr, answer: q.answer })
    return
  }

  const reasons = []
  const { target, vals, shown, hidden } = data
  const expected = [...layout.keys].sort()
  const valueKeys = vals && typeof vals === 'object' ? Object.keys(vals).sort() : []
  if (JSON.stringify(valueKeys) !== JSON.stringify(expected)) reasons.push('vals 位置全集不正确')
  if (!Array.isArray(shown) || !Array.isArray(hidden)) {
    violations.push({ index, type: q.type, reasons: [...reasons, 'shown/hidden 必须是数组'], expr: q.expr, answer: q.answer })
    return
  }

  const partition = [...shown, ...hidden]
  if (new Set(partition).size !== partition.length) reasons.push('shown/hidden 存在重复或交集')
  if (JSON.stringify([...partition].sort()) !== JSON.stringify(expected)) reasons.push('shown/hidden 未完整分区全部位置')

  if (!Number.isFinite(target)) reasons.push('target 不是有限数字')
  const valuesAreValid = layout.keys.every(key => Number.isFinite(vals?.[key]))
  if (!valuesAreValid) reasons.push('vals 包含非有限数字')

  const expectedAnswer = hidden.map(key => String(vals?.[key]))
  if (!Array.isArray(answer) || JSON.stringify(answer) !== JSON.stringify(expectedAnswer)) {
    reasons.push('answer 与 hidden 顺序或数值不一致')
  }

  if (valuesAreValid) {
    for (const edge of layout.edges) {
      const sum = edge.reduce((total, key) => total + vals[key], 0)
      if (sum !== target) reasons.push(`边 ${edge.join('-')} 之和 ${sum} 不等于 ${target}`)
    }
  }

  if (reasons.length) violations.push({ index, type: q.type, reasons, expr: q.expr, answer: q.answer })
}

for (let i = 0; i < count; i++) {
  const q = mod.genShapeFill(1)
  const data = JSON.parse(q.expr)
  if (q.type === 'triangle') {
    triCount++
    if (['AB', 'BC', 'AC'].every(key => data.shown.includes(key))) allMidpointCount++
  } else {
    sqCount++
  }
  validateQuestion(q, i)
}

console.log(`样本总数: ${count}  (三角形 ${triCount} / 方形 ${sqCount})`)
console.log(`全中点三角形样本: ${allMidpointCount}`)
console.log(`结构或数学不变量违规题目: ${violations.length}`)
if (violations.length) {
  console.log(JSON.stringify(violations.slice(0, 5), null, 2))
  process.exit(1)
} else {
  console.log('✅ 全部题目的位置分区、答案映射和每边和均有效')
}
