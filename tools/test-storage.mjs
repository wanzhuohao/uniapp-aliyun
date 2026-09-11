import assert from 'node:assert/strict'
import fs from 'node:fs'

let toastCount = 0
const ACTIVE_GRADE = 'grade1-term2'
globalThis.uni = {
  getStorageSync(key) { return key === 'learning_grade_v1' ? { schemaVersion: 1, grade: ACTIVE_GRADE } : undefined },
  setStorageSync() { throw new Error('QuotaExceededError') },
  removeStorageSync() {},
  showToast() { toastCount++ },
}

const { installLearningSessionGate } = await import('../utils/common/learningSession.js')
await installLearningSessionGate(globalThis.uni, { navigatorRef: {}, documentRef: null }).sessionReady
const { safeSetStorage } = await import('../utils/common/safeStorage.js')
assert.doesNotThrow(() => safeSetStorage('first', { value: 1 }))
assert.equal(safeSetStorage('second', { value: 2 }), false)
assert.equal(toastCount, 1, '连续存储失败应只提示一次')
console.log('✓ 安全存储吞掉写入异常并只提示一次')

const { createPracticeLog } = await import('../utils/common/practiceLog.js')
const { createPrefsStore } = await import('../utils/common/prefsStore.js')
const { createLeitner } = await import('../utils/common/leitner.js')
const mathStorage = await import('../utils/math/mathStorage.js')
const { STORAGE_KEYS } = await import('../utils/common/storageRegistry.js')

assert.doesNotThrow(() => createPracticeLog({ storageKey: STORAGE_KEYS.chinesePracticeLogs }).recordPractice({
  grade: ACTIVE_GRADE, type: 'test', totalCount: 1, correctCount: 1,
}))
assert.doesNotThrow(() => createPrefsStore({ storageKey: STORAGE_KEYS.mathOnlinePrefs }).setPrefs(ACTIVE_GRADE, 'online', { count: 20 }))
assert.doesNotThrow(() => createLeitner({ storageKey: STORAGE_KEYS.chineseMistakes }).recordWrong({ grade: ACTIVE_GRADE, question_id: 'q1' }))
assert.doesNotThrow(() => mathStorage.saveRecord({ grade: ACTIVE_GRADE, total: 1 }))
assert.doesNotThrow(() => mathStorage.recordWrong({ grade: ACTIVE_GRADE, expr: '1+1', answer: '2', type: 'add' }))
assert.equal(toastCount, 1, '业务模块不应重复提示同一次会话的存储故障')
console.log('✓ 练习、偏好、错题与数学记录写入失败不向主流程抛异常')

const onlineSource = fs.readFileSync(new URL('../pages/math/online.vue', import.meta.url), 'utf8')
assert.match(onlineSource, /safeSetStorage\(PREFS_KEY/)
console.log('✓ 数学在线练习偏好使用安全存储')
