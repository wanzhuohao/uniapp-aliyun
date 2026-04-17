// 验证图形填数题目的难度规则：每道题至少有一条边"已知 2 个数字"
// 用法：node tools/validate-shape-fill.mjs [count=200]
//      使用项目中的 node：/d/nvm4w/nodejs/node.exe tools/validate-shape-fill.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const count = Number(process.argv[2]) || 200

// 读源文件、去掉 export 关键字，在独立作用域里 eval
let src = fs.readFileSync(path.resolve(__dirname, '..', 'utils/math/questionEngine.js'), 'utf8')
src = src.replace(/^export\s+/gm, '')
const mod = new Function(`${src}
  return { genShapeFill, genTriangle, genSquare }`)()

// 每条边由 [2 顶点 + 1 中点] 组成
const EDGES_TRI = [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['A', 'AC', 'C']]
const EDGES_SQ = [['A', 'AB', 'B'], ['B', 'BC', 'C'], ['C', 'CD', 'D'], ['D', 'DA', 'A']]

let triCount = 0, sqCount = 0
const violations = []

for (let i = 0; i < count; i++) {
  const q = mod.genShapeFill(1)
  const { shown } = JSON.parse(q.expr)
  const edges = q.type === 'triangle' ? EDGES_TRI : EDGES_SQ
  if (q.type === 'triangle') triCount++
  else sqCount++

  const maxKnownOnAnyEdge = Math.max(
    ...edges.map(edge => edge.filter(k => shown.includes(k)).length)
  )
  if (maxKnownOnAnyEdge < 2) {
    violations.push({ i, type: q.type, shown, expr: q.expr })
  }
}

console.log(`样本总数: ${count}  (三角形 ${triCount} / 方形 ${sqCount})`)
console.log(`违规题目（无任何边已知2数）: ${violations.length}`)
if (violations.length) {
  console.log(JSON.stringify(violations.slice(0, 5), null, 2))
  process.exit(1)
} else {
  console.log('✅ 全部题目至少有一条边已知 2 个数字')
}
