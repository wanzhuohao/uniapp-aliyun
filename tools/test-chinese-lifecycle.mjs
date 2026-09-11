import assert from 'node:assert/strict'
import fs from 'node:fs'

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`)
  if (start < 0) throw new Error(`找不到函数 ${name}`)
  const bodyStart = source.indexOf('{', start)
  let depth = 0
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`函数 ${name} 大括号不完整`)
}

const questionCardSource = fs.readFileSync(new URL('../components/chinese/QuestionCard.vue', import.meta.url), 'utf8')
assert.match(questionCardSource, /watch\([\s\S]*cancelPendingAnswer/)
assert.match(questionCardSource, /onBeforeUnmount\(cancelPendingAnswer\)/)
assert.match(questionCardSource, /generation !== answerGeneration/)
console.log('✓ QuestionCard 切题和卸载会使延迟答题回调失效')

const hanziSource = fs.readFileSync(new URL('../components/chinese/HanziQuestion.vue', import.meta.url), 'utf8')
const destroySource = extractFunction(hanziSource, 'destroyWriter')
let quizCancelled = 0
let animationCancelled = 0
const writer = {
  cancelQuiz() { quizCancelled++ },
  cancelAnimation() { animationCancelled++ },
}
const destroyWriter = new Function('initialWriter', `
  let loadToken = 0
  let writerInstance = initialWriter
  ${destroySource}
  return destroyWriter
`)(writer)

destroyWriter()
assert.equal(quizCancelled, 1)
assert.equal(animationCancelled, 1)
console.log('✓ destroyWriter 同时取消 HanziWriter 测验和动画')

assert.match(hanziSource, /watch\([\s\S]*destroyWriter\(\)/)
assert.match(hanziSource, /onBeforeUnmount\(\(\) => \{[\s\S]*destroyWriter\(\)/)
console.log('✓ HanziWriter 切题和卸载均执行销毁')
