import assert from 'node:assert/strict'
import fs from 'node:fs'

const audioInstances = []
class FakeAudio {
  constructor(src = '') {
    this.src = src
    this.paused = false
    this.removedSrc = false
    this.loaded = false
    this.onended = null
    this.onerror = null
    audioInstances.push(this)
  }

  play() { return Promise.resolve() }
  pause() { this.paused = true }
  removeAttribute(name) {
    if (name === 'src') {
      this.src = ''
      this.removedSrc = true
    }
  }
  load() { this.loaded = true }
}

globalThis.window = {}
globalThis.Audio = FakeAudio

const { speakEn, stopEnSpeech } = await import('../utils/common/speech.js')

const first = speakEn('apple')
const firstAudio = audioInstances.at(-1)
stopEnSpeech()
await first
assert.equal(firstAudio.paused, true)
assert.equal(firstAudio.removedSrc, true)
assert.equal(firstAudio.loaded, true)
assert.equal(firstAudio.onended, null)
assert.equal(firstAudio.onerror, null)
console.log('✓ stopEnSpeech 释放音频并结束等待中的 Promise')

const superseded = speakEn('old')
const current = speakEn('new')
await superseded
stopEnSpeech()
await current
console.log('✓ 新发音会结束上一条仍在等待的发音')

for (const [file, checks] of [
  ['../pages/english/phonics.vue', [/onUnmounted\(cancelPlay\)/, /stopEnSpeech\(\)/]],
  ['../pages/english/letters.vue', [/onUnmounted\(stopEnSpeech\)/]],
  ['../components/english/WordQuestion.vue', [/onUnmounted\([\s\S]*stopEnSpeech\(\)/]],
]) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8')
  for (const check of checks) assert.match(source, check)
}
console.log('✓ 英语页面和单词题在卸载时停止音频')
