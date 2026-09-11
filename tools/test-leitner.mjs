import assert from 'node:assert/strict'

const storage = new Map()
const ACTIVE_GRADE = 'grade1-term2'
storage.set('learning_grade_v1', { schemaVersion: 1, grade: ACTIVE_GRADE })
globalThis.uni = {
  getStorageSync(key) {
    return storage.get(key)
  },
  setStorageSync(key, value) {
    storage.set(key, value)
  },
  removeStorageSync(key) {
    storage.delete(key)
  },
}

const { installLearningSessionGate } = await import('../utils/common/learningSession.js')
await installLearningSessionGate(globalThis.uni, { navigatorRef: {}, documentRef: null }).sessionReady
const { createLeitner } = await import('../utils/common/leitner.js')
const chinese = await import('../utils/chinese/mistakes.js')
const english = await import('../utils/english/mistakes.js')

let passed = 0
function test(name, fn) {
  fn()
  passed++
  console.log(`✓ ${name}`)
}

function dueRecord(overrides = {}) {
  return {
    grade: ACTIVE_GRADE,
    _id: 'record',
    question_id: 'question',
    type: 'word',
    box: 1,
    mastered: false,
    nextReviewAt: Date.now() - 1000,
    wrongCount: 1,
    correctCount: 0,
    lastWrongAt: Date.now() - 2000,
    createdAt: Date.now() - 3000,
    char: '中',
    unit: '2-1-1',
    word: 'cat',
    theme: 'animals',
    ...overrides,
  }
}

test('公共 Leitner due 队列排除已掌握记录', () => {
  storage.set('test_mistakes', [
    dueRecord({ _id: 'due', question_id: 'due' }),
    dueRecord({ _id: 'mastered', question_id: 'mastered', box: 5, mastered: true }),
  ])
  const leitner = createLeitner({ storageKey: 'test_mistakes' })
  assert.deepEqual(leitner.getDueList(ACTIVE_GRADE).map(record => record._id), ['due'])
})

for (const [name, module, storageKey, type] of [
  ['语文', chinese, 'chinese_mistakes', 'pinyin'],
  ['英语', english, 'english_mistakes', 'word'],
]) {
  test(`${name} dueCount 排除已掌握记录`, () => {
    storage.set(storageKey, [
      dueRecord({ _id: `${name}-due`, question_id: `${name}-due`, type }),
      dueRecord({ _id: `${name}-mastered`, question_id: `${name}-mastered`, type, box: 5, mastered: true }),
    ])
    assert.equal(module.getWrongStats(ACTIVE_GRADE).dueCount, 1)
  })
}

console.log(`\n=== ${passed} passed, 0 failed ===`)
