import assert from 'node:assert/strict'
import fs from 'node:fs'

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`)
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

const source = fs.readFileSync(new URL('../pages/games/sudoku.vue', import.meta.url), 'utf8')
const restartSource = extractFunction(source, 'restart').replace(
  'await new Promise(r => setTimeout(r, 50))',
  'await wait()',
)

function createHarness() {
  const waits = []
  let generated = 0
  let timerStarts = 0
  const state = {
    loading: { value: false },
    winning: { value: false },
    selected: { value: null },
    lastResult: { value: null },
    difficulty: { value: 'starter' },
    current: { value: null },
    board: { value: [] },
    fixed: { value: [] },
    elapsed: { value: 0 },
    startedAt: { value: 0 },
  }
  const harness = new Function('deps', `
    const {
      loading, winning, selected, lastResult, difficulty, current,
      board, fixed, elapsed, startedAt, generatePuzzle, startTimer,
      stopTimer, wait,
    } = deps
    let restartGeneration = 0
    let disposed = false
    ${restartSource}
    return {
      restart,
      dispose() {
        disposed = true
        restartGeneration++
        stopTimer()
      },
    }
  `)({
    ...state,
    generatePuzzle(key) {
      generated++
      return { id: generated, key, puzzle: [[0]], solution: [[1]] }
    },
    startTimer() { timerStarts++ },
    stopTimer() {},
    wait() { return new Promise(resolve => waits.push(resolve)) },
  })
  return {
    ...harness,
    state,
    waits,
    generated: () => generated,
    timerStarts: () => timerStarts,
  }
}

const concurrent = createHarness()
const older = concurrent.restart()
const newer = concurrent.restart()
concurrent.waits[1]()
await newer
const newestId = concurrent.state.current.value.id
concurrent.waits[0]()
await older
assert.equal(concurrent.state.current.value.id, newestId, '旧 restart 覆盖了较新的棋盘')
assert.equal(concurrent.timerStarts(), 1, '旧 restart 启动了额外计时器')
console.log('✓ 连续 restart 只允许最新任务落地')

const unmounted = createHarness()
const pending = unmounted.restart()
unmounted.dispose()
unmounted.waits[0]()
await pending
assert.equal(unmounted.generated(), 0, '卸载后的 restart 仍生成了题目')
assert.equal(unmounted.timerStarts(), 0, '卸载后的 restart 仍启动了计时器')
console.log('✓ 卸载使等待中的 restart 失效')
