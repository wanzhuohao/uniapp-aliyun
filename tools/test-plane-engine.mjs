import assert from 'node:assert/strict'
import { createEngine } from '../pages/games/plane/engine.js'

let nextFrameId = 1
const frames = new Map()
const raf = callback => {
  const id = nextFrameId++
  frames.set(id, callback)
  return id
}
const caf = id => frames.delete(id)
function runFrame(timestamp) {
  const id = Math.max(...frames.keys())
  const callback = frames.get(id)
  frames.delete(id)
  callback(timestamp)
}

const engine = createEngine({
  width: 600,
  height: 300,
  raf,
  caf,
  onUpgrade() {},
  onGameOver() {},
  onRevive() {},
  onStats() {},
  onFrame() {},
})

engine.start()
let before = engine.getRenderState().player.x
engine.setTarget(600, engine.getRenderState().player.y)
runFrame(1000)
runFrame(1050)
const initialDistance = engine.getRenderState().player.x - before

engine.reset()
before = engine.getRenderState().player.x
engine.setTarget(600, engine.getRenderState().player.y)
runFrame(2000)
runFrame(2050)
const resetDistance = engine.getRenderState().player.x - before
engine.stop()

assert.equal(initialDistance, resetDistance)
assert.equal(initialDistance, 10)
console.log('✓ 横屏首次进入与 reset 后使用相同的短边速度基准')
