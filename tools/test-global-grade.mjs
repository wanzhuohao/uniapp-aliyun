import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BACKUP_STORAGE_KEYS,
  BUSINESS_STORAGE_KEYS,
  LEGACY_BACKUP_STORAGE_KEYS,
  STORAGE_KEYS,
} from '../utils/common/storageRegistry.js'
import {
  ACTIVE_LEARNING_GRADE,
  LEARNING_GRADE_OPTIONS,
  initializeLearningGrade,
  isKnownLearningGrade,
  openCourseGradeSession,
  repairLearningGrade,
} from '../utils/common/gradeContext.js'
import {
  convertLegacyLearningSnapshotV1,
  mergeLearningGradeRecords,
  mergeProjectedMistakes,
  projectLearningValue,
  selectLearningGrade,
  updateLearningGradeBucket,
} from '../utils/common/gradeMigration.js'
import { installLearningSessionGate } from '../utils/common/learningSession.js'
import {
  applyRegisteredSnapshotTransaction,
  createLearningBackup,
  validateLearningBackup,
} from '../utils/common/dataBackup.js'
import { buildLearningDashboard } from '../utils/common/learningStats.js'
import { createPracticeLog } from '../utils/common/practiceLog.js'
import { createPrefsStore } from '../utils/common/prefsStore.js'
import { createLeitner } from '../utils/common/leitner.js'
import { generateQuestions } from '../utils/math/questionEngine.js'
import {
  buildOnlineSubmissionTarget,
  createOnlineSubmissionIntent,
  getHistory,
  recordWrong as recordMathWrong,
} from '../utils/math/mathStorage.js'
import { buildPaperSubmissionTarget, createPaperInstanceId, createPaperSubmissionIntent, sha256Hex } from '../utils/common/paperEngine.js'

const root = resolve(import.meta.dirname, '..')
const tests = []
const clone = value => value === undefined ? undefined : structuredClone(value)
const gradeValue = grade => ({ schemaVersion: 1, grade })
const activeGradeValue = gradeValue(ACTIVE_LEARNING_GRADE)

function test(name, fn) { tests.push({ name, fn }) }

function createPlatform(initial = {}) {
  const platform = {
    map: new Map(Object.entries(initial).map(([key, value]) => [key, clone(value)])),
    calls: [],
    failWriteKey: null,
    getStorageSync(key) {
      this.calls.push({ op: 'get', key })
      return this.map.has(key) ? this.map.get(key) : ''
    },
    setStorageSync(key, value) {
      this.calls.push({ op: 'set', key })
      if (this.failWriteKey === key) {
        this.failWriteKey = null
        throw new Error('INJECTED_SET_FAILURE')
      }
      this.map.set(key, clone(value))
    },
    removeStorageSync(key) {
      this.calls.push({ op: 'remove', key })
      this.map.delete(key)
    },
    showToast() {},
  }
  return platform
}

const platform = createPlatform({ [STORAGE_KEYS.learningGrade]: activeGradeValue })
globalThis.uni = platform
const session = installLearningSessionGate(platform, { navigatorRef: {}, documentRef: null })
await session.sessionReady

function resetPlatform(initial = {}) {
  platform.map.clear()
  platform.map.set(STORAGE_KEYS.learningGrade, clone(activeGradeValue))
  for (const [key, value] of Object.entries(initial)) platform.map.set(key, clone(value))
  platform.calls.length = 0
  platform.failWriteKey = null
}

function validPracticeLog(overrides = {}) {
  return { type: 'practice', date: '2026-09-02', totalCount: 10, correctCount: 8, createdAt: 1, ...overrides }
}

function validChineseWrong(overrides = {}) {
  return {
    _id: 'cn-1', question_id: 'cn-1', type: 'pinyin', char: '中', unit: '2-1-1',
    wrongCount: 1, correctCount: 0, box: 1, nextReviewAt: 10,
    mastered: false, lastWrongAt: 5, createdAt: 3, ...overrides,
  }
}

function emptySnapshot(keys = BACKUP_STORAGE_KEYS) {
  return Object.fromEntries(keys.map(key => [key, { present: false }]))
}

function nativeFromMap(map, events = []) {
  return {
    get(key) { events.push({ op: 'get', key }); return map.has(key) ? clone(map.get(key)) : undefined },
    has(key) { events.push({ op: 'has', key }); return map.has(key) },
    set(key, value) { events.push({ op: 'set', key }); map.set(key, clone(value)) },
    remove(key) { events.push({ op: 'remove', key }); map.delete(key) },
  }
}

function transactionContext(native, identity = { owner: 'global-grade-test', generation: 1 }) {
  return { ...identity, native, businessKeys: BUSINESS_STORAGE_KEYS, assertLease: () => true }
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function signedBackup(schemaVersion, snapshot) {
  const unsigned = { schemaVersion, app: 'learning', generatedAt: '2026-09-02T00:00:00.000Z', snapshot }
  return {
    ...unsigned,
    checksum: { algorithm: 'SHA-256', value: createHash('sha256').update(canonicalize(unsigned)).digest('hex') },
  }
}

test('G01 首次进入只初始化唯一全局年级，备份 key 为 19/18', () => {
  const adapter = createPlatform()
  assert.equal(initializeLearningGrade(adapter), ACTIVE_LEARNING_GRADE)
  assert.deepEqual(adapter.map.get(STORAGE_KEYS.learningGrade), activeGradeValue)
  assert.deepEqual([...new Set(adapter.calls.map(item => item.key))], [STORAGE_KEYS.learningGrade])
  assert.equal(BACKUP_STORAGE_KEYS.length, 19)
  assert.equal(LEGACY_BACKUP_STORAGE_KEYS.length, 18)
  assert.equal(BACKUP_STORAGE_KEYS.filter(key => key === STORAGE_KEYS.learningGrade).length, 1)
})

test('G02 非法年级 fail-closed，修复只覆盖年级 key', () => {
  for (const invalid of [null, {}, { schemaVersion: 1, grade: 'grade2' }, { schemaVersion: 2, grade: ACTIVE_LEARNING_GRADE }]) {
    const sentinel = [{ keep: invalid === null ? 'null' : JSON.stringify(invalid) }]
    const adapter = createPlatform({
      [STORAGE_KEYS.learningGrade]: invalid,
      [STORAGE_KEYS.chinesePracticeLogs]: sentinel,
    })
    assert.throws(() => openCourseGradeSession(adapter), error => error?.code === 'LEARNING_GRADE_UNAVAILABLE')
    assert.equal(repairLearningGrade(adapter), ACTIVE_LEARNING_GRADE)
    assert.deepEqual(adapter.map.get(STORAGE_KEYS.learningGrade), activeGradeValue)
    assert.deepEqual(adapter.map.get(STORAGE_KEYS.chinesePracticeLogs), sentinel)
    assert.equal(adapter.calls.filter(item => item.op !== 'get').every(item => item.key === STORAGE_KEYS.learningGrade), true)
  }
  const nullAdapter = createPlatform({ [STORAGE_KEYS.learningGrade]: null })
  assert.throws(() => initializeLearningGrade(nullAdapter), error => error?.code === 'LEARNING_GRADE_UNAVAILABLE')
  assert.equal(nullAdapter.calls.some(item => item.op === 'set'), false)
})

test('G03 首页是唯一年级选择入口，所有学习页展示冻结年级且综合卷无局部选择器', () => {
  assert.deepEqual(LEARNING_GRADE_OPTIONS.map(item => [item.value, item.disabled]), [
    ['grade1-term2', false], ['grade2', true], ['grade3', true], ['grade4', true], ['grade5', true], ['grade6', true],
  ])
  const home = readFileSync(resolve(root, 'pages/index/index.vue'), 'utf8')
  assert.match(home, /LEARNING_GRADE_OPTIONS/)
  const paper = readFileSync(resolve(root, 'pages/learning/paper.vue'), 'utf8')
  assert.match(paper, /openCourseGradeSession\(\)/)
  assert.doesNotMatch(paper, /LEARNING_GRADE_OPTIONS|gradeOptions|v-for="grade/)
  for (const directory of ['math', 'chinese', 'english', 'learning']) {
    for (const name of readdirSync(resolve(root, 'pages', directory)).filter(name => name.endsWith('.vue'))) {
      const source = readFileSync(resolve(root, 'pages', directory, name), 'utf8')
      assert.match(source, /<PageHeader|<GradeBadge/, `${directory}/${name} 未展示年级`)
    }
  }
  const badge = readFileSync(resolve(root, 'components/learning/GradeBadge.vue'), 'utf8')
  const header = readFileSync(resolve(root, 'components/PageHeader.vue'), 'utf8')
  assert.match(badge, /course-gate-overlay/)
  assert.match(badge, /v-if="!label"/)
  assert.doesNotMatch(header, /gradeLabel\.value\s*=\s*['"]年级待修复/)
  for (const path of ['pages/chinese/result.vue', 'pages/english/result.vue']) {
    const source = readFileSync(resolve(root, path), 'utf8')
    assert.match(source, /v-if="courseReady"/, `${path} 必须等待年级校验后再渲染成绩`)
  }
})

test('G04 缺失、非法和未开放年级在业务存储前失败', () => {
  resetPlatform()
  const practice = createPracticeLog({ storageKey: STORAGE_KEYS.chinesePracticeLogs })
  const prefs = createPrefsStore({ storageKey: STORAGE_KEYS.chineseState })
  const leitner = createLeitner({ storageKey: STORAGE_KEYS.chineseMistakes })
  const cases = [
    () => generateQuestions({ grade: null, level: 1, count: 1 }),
    () => buildLearningDashboard({ grade: 'grade2' }, new Date('2026-09-02T00:00:00.000Z')),
    () => practice.loadAll('grade2'),
    () => practice.recordPractice({ grade: undefined, type: 'pinyin', totalCount: 1, correctCount: 1 }),
    () => prefs.load('grade2'),
    () => leitner.loadAll('grade2'),
    () => getHistory('grade2'),
  ]
  platform.calls.length = 0
  for (const run of cases) assert.throws(run, error => error?.code === 'LEARNING_GRADE_UNAVAILABLE')
  assert.deepEqual(platform.calls, [])
  assert.equal(isKnownLearningGrade('grade2'), true)
  assert.equal(isKnownLearningGrade('grade2-term1'), false)
})

test('G05 旧日志只投影到一年级并保持顺序、原值与幂等性', () => {
  const source = [
    validPracticeLog({ marker: 'legacy' }),
    validPracticeLog({ grade: ACTIVE_LEARNING_GRADE, marker: 'active', createdAt: 2 }),
    validPracticeLog({ grade: 'grade2', marker: 'other', createdAt: 3 }),
    { broken: true },
  ]
  const before = clone(source)
  const projected = projectLearningValue(STORAGE_KEYS.chinesePracticeLogs, source)
  assert.deepEqual(projected.map(item => item.marker), ['legacy', 'active', 'other', undefined])
  assert.equal(projected[0].grade, ACTIVE_LEARNING_GRADE)
  assert.deepEqual(selectLearningGrade(STORAGE_KEYS.chinesePracticeLogs, source, ACTIVE_LEARNING_GRADE).map(item => item.marker), ['legacy', 'active'])
  assert.deepEqual(source, before)
  assert.deepEqual(projectLearningValue(STORAGE_KEYS.chinesePracticeLogs, projected), projected)
})

test('G06 偏好、状态、目标和挑战按年级投影，更新保留其他年级桶', () => {
  const legacyValues = new Map([
    [STORAGE_KEYS.mathOnlinePrefs, { count: 20 }],
    [STORAGE_KEYS.chineseState, { currentUnit: '2-1' }],
    [STORAGE_KEYS.englishState, { prefs: { words: { theme: 'animals' } } }],
    [STORAGE_KEYS.learningGoal, { schemaVersion: 1, dailyTarget: 20, updatedAt: '2026-09-02T00:00:00.000Z' }],
    [STORAGE_KEYS.learningChallenge, { schemaVersion: 1, badges: {} }],
  ])
  for (const [key, value] of legacyValues) {
    const projected = projectLearningValue(key, value)
    assert.deepEqual(Object.keys(projected.byGrade), [ACTIVE_LEARNING_GRADE])
    assert.deepEqual(projectLearningValue(key, projected), projected)
  }
  const current = { schemaVersion: 2, byGrade: { [ACTIVE_LEARNING_GRADE]: { currentUnit: '2-1' }, grade2: { keep: true } } }
  const updated = updateLearningGradeBucket(STORAGE_KEYS.chineseState, current, ACTIVE_LEARNING_GRADE, () => ({ currentUnit: '2-2' }))
  assert.deepEqual(updated.byGrade.grade2, { keep: true })
  assert.deepEqual(updated.byGrade[ACTIVE_LEARNING_GRADE], { currentUnit: '2-2' })
  assert.deepEqual(current.byGrade[ACTIVE_LEARNING_GRADE], { currentUnit: '2-1' })
})

test('G07 重复错题确定性合并，冲突 ID 原样保留但不进入当前课程', () => {
  const legacy = validChineseWrong({ _id: 'cn-1', question_id: 'cn-1', marker: 'legacy', wrongCount: 5, correctCount: 1, box: 3, nextReviewAt: 40, lastWrongAt: 10, createdAt: 2 })
  delete legacy.grade
  const explicit = validChineseWrong({ grade: ACTIVE_LEARNING_GRADE, marker: 'explicit', wrongCount: 2, correctCount: 2, box: 2, nextReviewAt: 30, lastWrongAt: 20, createdAt: 4 })
  const invalid = validChineseWrong({ grade: ACTIVE_LEARNING_GRADE, _id: 'bad-a', question_id: 'bad-b', marker: 'invalid' })
  const source = [legacy, explicit, invalid]
  const merged = mergeProjectedMistakes(source, STORAGE_KEYS.chineseMistakes)
  assert.equal(merged.length, 2)
  assert.deepEqual(merged[0], {
    ...explicit, wrongCount: 5, correctCount: 2, box: 2, nextReviewAt: 30,
    mastered: false, lastWrongAt: 20, createdAt: 2,
  })
  assert.deepEqual(merged[1], invalid)
  assert.deepEqual(selectLearningGrade(STORAGE_KEYS.chineseMistakes, source, ACTIVE_LEARNING_GRADE), [merged[0]])
  assert.deepEqual(mergeProjectedMistakes(merged, STORAGE_KEYS.chineseMistakes), merged)
})

test('G08 旧日志懒升级写失败不破坏原值，重试成功后带 grade', () => {
  const legacy = validPracticeLog({ marker: 'legacy' })
  resetPlatform({ [STORAGE_KEYS.chinesePracticeLogs]: [legacy] })
  const practice = createPracticeLog({ storageKey: STORAGE_KEYS.chinesePracticeLogs })
  platform.failWriteKey = STORAGE_KEYS.chinesePracticeLogs
  assert.equal(practice.recordPractice({ grade: ACTIVE_LEARNING_GRADE, type: 'pinyin', totalCount: 1, correctCount: 1 }), false)
  assert.deepEqual(platform.map.get(STORAGE_KEYS.chinesePracticeLogs), [legacy])
  assert.equal(practice.recordPractice({ grade: ACTIVE_LEARNING_GRADE, type: 'pinyin', totalCount: 1, correctCount: 1 }), true)
  const saved = platform.map.get(STORAGE_KEYS.chinesePracticeLogs)
  assert.equal(saved.length, 2)
  assert.equal(saved.every(item => item.grade === ACTIVE_LEARNING_GRADE), true)

  const activeA = validPracticeLog({ grade: ACTIVE_LEARNING_GRADE, marker: 'active-a', createdAt: 10 })
  const invalidGrade = validPracticeLog({ grade: 'future-grade', marker: 'invalid-grade', createdAt: 11 })
  const otherGrade = validPracticeLog({ grade: 'grade2', marker: 'other-grade', createdAt: 12 })
  const activeB = validPracticeLog({ grade: ACTIVE_LEARNING_GRADE, marker: 'active-b', createdAt: 13 })
  resetPlatform({ [STORAGE_KEYS.chinesePracticeLogs]: [activeA, invalidGrade, otherGrade, activeB] })
  assert.equal(practice.recordPractice({ grade: ACTIVE_LEARNING_GRADE, type: 'pinyin', totalCount: 1, correctCount: 1 }), true)
  const positioned = platform.map.get(STORAGE_KEYS.chinesePracticeLogs)
  assert.deepEqual(positioned.slice(0, 4).map(item => item.marker), ['active-a', 'invalid-grade', 'other-grade', 'active-b'])
  assert.deepEqual(positioned[1], invalidGrade)
  assert.deepEqual(positioned[2], otherGrade)
  assert.equal(positioned[4].grade, ACTIVE_LEARNING_GRADE)

  for (const [key, full] of [
    [STORAGE_KEYS.chineseMistakes, [validChineseWrong({ grade: ACTIVE_LEARNING_GRADE, marker: 'active' }), validChineseWrong({ grade: 'future-grade', marker: 'invalid' }), validChineseWrong({ grade: 'grade2', marker: 'other' })]],
    [STORAGE_KEYS.mathHistory, [
      { grade: ACTIVE_LEARNING_GRADE, type: 'online', createdAt: '2026-09-02T00:00:00.000Z', marker: 'active' },
      { grade: 'future-grade', type: 'online', createdAt: '2026-09-02T00:00:01.000Z', marker: 'invalid' },
      { grade: 'grade2', type: 'online', createdAt: '2026-09-02T00:00:02.000Z', marker: 'other' },
    ]],
  ]) {
    const current = selectLearningGrade(key, key === STORAGE_KEYS.mathHistory ? JSON.stringify(full) : full, ACTIVE_LEARNING_GRADE)
    const next = [{ ...current[0], marker: 'updated' }, { ...current[0], marker: 'new' }]
    const merged = mergeLearningGradeRecords(key, full, ACTIVE_LEARNING_GRADE, next)
    assert.deepEqual(merged.map(item => item.marker), ['updated', 'invalid', 'other', 'new'])
    assert.deepEqual(merged[1], full[1])
    assert.deepEqual(merged[2], full[2])
  }

  const wrong = validChineseWrong({ grade: ACTIVE_LEARNING_GRADE })
  resetPlatform({ [STORAGE_KEYS.chineseMistakes]: [wrong] })
  const leitner = createLeitner({ storageKey: STORAGE_KEYS.chineseMistakes })
  platform.failWriteKey = STORAGE_KEYS.chineseMistakes
  assert.equal(leitner.recordCorrect(ACTIVE_LEARNING_GRADE, wrong._id, wrong.box, wrong.correctCount).saved, false)
  assert.deepEqual(platform.map.get(STORAGE_KEYS.chineseMistakes), [wrong])
  platform.failWriteKey = STORAGE_KEYS.chineseMistakes
  assert.equal(leitner.recordWrongAgain(ACTIVE_LEARNING_GRADE, wrong._id, wrong.box, wrong.wrongCount), false)
  assert.deepEqual(platform.map.get(STORAGE_KEYS.chineseMistakes), [wrong])
})

test('G09 当前年级写错题不修改其他年级同题记录', () => {
  const other = {
    grade: 'grade2', id: 'other-1', expr: '1 + 1', answer: '2', type: 'add', marker: 'keep',
    wrongCount: 7, correctCount: 0, box: 1, nextReviewAt: 10, mastered: false, lastWrongAt: 9, createdAt: 8,
  }
  resetPlatform({ [STORAGE_KEYS.mathWrongBook]: JSON.stringify([other]) })
  assert.equal(recordMathWrong({ grade: ACTIVE_LEARNING_GRADE, expr: '1 + 1', answer: '2', type: 'add' }), true)
  const saved = JSON.parse(platform.map.get(STORAGE_KEYS.mathWrongBook))
  assert.deepEqual(saved.find(item => item.grade === 'grade2'), other)
  assert.equal(saved.filter(item => item.grade === ACTIVE_LEARNING_GRADE).length, 1)
})

test('G10 课程期间年级变化使普通写与事务写在首个业务写前失败', () => {
  resetPlatform({ [STORAGE_KEYS.chinesePracticeLogs]: [] })
  const practice = createPracticeLog({ storageKey: STORAGE_KEYS.chinesePracticeLogs })
  platform.map.set(STORAGE_KEYS.learningGrade, gradeValue('grade2'))
  platform.calls.length = 0
  assert.throws(
    () => practice.recordPractice({ grade: ACTIVE_LEARNING_GRADE, type: 'pinyin', totalCount: 1, correctCount: 1 }),
    error => error?.code === 'LEARNING_GRADE_CHANGED',
  )
  assert.equal(platform.calls.some(item => item.op === 'set' || item.op === 'remove'), false)

  const events = []
  const map = new Map([[STORAGE_KEYS.learningGrade, gradeValue('grade2')]])
  assert.throws(
    () => applyRegisteredSnapshotTransaction(
      transactionContext(nativeFromMap(map, events)),
      original => ({ status: 'TARGET_READY', target: original }),
      'paper',
      { sessionGrade: ACTIVE_LEARNING_GRADE },
    ),
    error => error?.code === 'LEARNING_GRADE_CHANGED',
  )
  assert.equal(events.some(item => item.op === 'set' || item.op === 'remove'), false)
})

test('G11 v1 备份确定性升级到 v2，v2 年级与非法记录边界可验证', async () => {
  const legacyObject = emptySnapshot(LEGACY_BACKUP_STORAGE_KEYS)
  legacyObject[STORAGE_KEYS.englishMistakes] = {
    present: true,
    value: [{
      _id: 'letter-a', question_id: 'letter-a', type: 'letter', upper: 'A', lower: 'a',
      wrongCount: 1, correctCount: 0, box: 1, nextReviewAt: 1,
      mastered: false, lastWrongAt: 1, createdAt: 1,
    }],
  }
  const convertedA = convertLegacyLearningSnapshotV1(legacyObject)
  const convertedB = convertLegacyLearningSnapshotV1(legacyObject)
  assert.deepEqual(convertedA, convertedB)
  assert.deepEqual(convertedA[STORAGE_KEYS.learningGrade], { present: true, value: activeGradeValue })

  const legacyEntries = LEGACY_BACKUP_STORAGE_KEYS.map(key => ({ key, ...legacyObject[key] }))
  const upgraded = await validateLearningBackup(signedBackup(1, legacyEntries))
  assert.equal(upgraded.schemaVersion, 2)
  assert.equal(upgraded.snapshot.length, 19)

  const badLegacy = clone(legacyObject)
  badLegacy[STORAGE_KEYS.chineseMistakes] = { present: true, value: [validChineseWrong({ _id: 'a', question_id: 'b' })] }
  const badLegacyEntries = LEGACY_BACKUP_STORAGE_KEYS.map(key => ({ key, ...badLegacy[key] }))
  await assert.rejects(() => validateLearningBackup(signedBackup(1, badLegacyEntries)), /BACKUP_INVALID/)

  const runtimeInvalid = validChineseWrong({ grade: ACTIVE_LEARNING_GRADE, _id: 'a', question_id: 'b', marker: 'runtime-invalid' })
  const runtimeMap = new Map([
    [STORAGE_KEYS.learningGrade, activeGradeValue],
    [STORAGE_KEYS.chineseMistakes, [runtimeInvalid]],
  ])
  const created = await createLearningBackup(transactionContext(nativeFromMap(runtimeMap)))
  assert.deepEqual(await validateLearningBackup(created.backup), created.backup)
  assert.deepEqual(created.backup.snapshot.find(item => item.key === STORAGE_KEYS.chineseMistakes).value, [runtimeInvalid])

  const missingGrade = clone(created.backup)
  const missingIndex = missingGrade.snapshot.findIndex(item => item.key === STORAGE_KEYS.learningGrade)
  missingGrade.snapshot[missingIndex] = { key: STORAGE_KEYS.learningGrade, present: false }
  await assert.rejects(() => validateLearningBackup(signedBackup(2, missingGrade.snapshot)), /BACKUP_INVALID/)
  const unavailableGrade = clone(created.backup)
  unavailableGrade.snapshot[missingIndex].value = gradeValue('grade2')
  await assert.rejects(() => validateLearningBackup(signedBackup(2, unavailableGrade.snapshot)), /BACKUP_INVALID/)

  const malformedV2 = clone(created.backup)
  const logsIndex = malformedV2.snapshot.findIndex(item => item.key === STORAGE_KEYS.chinesePracticeLogs)
  malformedV2.snapshot[logsIndex] = { key: STORAGE_KEYS.chinesePracticeLogs, present: true, value: [{ grade: ACTIVE_LEARNING_GRADE, foo: 'bar' }] }
  await assert.rejects(() => validateLearningBackup(signedBackup(2, malformedV2.snapshot)), /BACKUP_INVALID/)

  const missingItemGrade = clone(created.backup)
  missingItemGrade.snapshot[logsIndex] = { key: STORAGE_KEYS.chinesePracticeLogs, present: true, value: [validPracticeLog()] }
  await assert.rejects(() => validateLearningBackup(signedBackup(2, missingItemGrade.snapshot)), /BACKUP_INVALID/)

  const malformedHistory = clone(created.backup)
  const historyIndex = malformedHistory.snapshot.findIndex(item => item.key === STORAGE_KEYS.mathHistory)
  malformedHistory.snapshot[historyIndex] = { key: STORAGE_KEYS.mathHistory, present: true, value: JSON.stringify([{ grade: ACTIVE_LEARNING_GRADE, foo: 'bar' }]) }
  await assert.rejects(() => validateLearningBackup(signedBackup(2, malformedHistory.snapshot)), /BACKUP_INVALID/)

  const explicitInvalidGrade = clone(created.backup)
  explicitInvalidGrade.snapshot[logsIndex] = { key: STORAGE_KEYS.chinesePracticeLogs, present: true, value: [validPracticeLog({ grade: 'future-grade' })] }
  assert.deepEqual(await validateLearningBackup(signedBackup(2, explicitInvalidGrade.snapshot)), signedBackup(2, explicitInvalidGrade.snapshot))

  const badState = clone(legacyObject)
  badState[STORAGE_KEYS.chineseState] = { present: true, value: { currentUnit: 'not-a-real-unit' } }
  const badStateEntries = LEGACY_BACKUP_STORAGE_KEYS.map(key => ({ key, ...badState[key] }))
  await assert.rejects(() => validateLearningBackup(signedBackup(1, badStateEntries)), /BACKUP_INVALID/)

  const badDiagnostic = clone(created.backup)
  const diagnosticIndex = badDiagnostic.snapshot.findIndex(item => item.key === STORAGE_KEYS.diagnosticErrors)
  badDiagnostic.snapshot[diagnosticIndex] = { key: STORAGE_KEYS.diagnosticErrors, present: true, value: [{ at: '2026-09-02T00:00:00.000Z', code: 'NOT_ALLOWED', module: 'storage' }] }
  await assert.rejects(() => validateLearningBackup(signedBackup(2, badDiagnostic.snapshot)), /BACKUP_INVALID/)
})

test('G12 游戏域不读取年级，数据中心仍通过 19-key registry 备份', () => {
  for (const path of [
    ...readdirSync(resolve(root, 'utils/games')).filter(name => name.endsWith('.js')).map(name => resolve(root, 'utils/games', name)),
    ...readdirSync(resolve(root, 'pages/games'), { recursive: true }).filter(name => name.endsWith('.vue')).map(name => resolve(root, 'pages/games', name)),
  ]) {
    const source = readFileSync(path, 'utf8')
    assert.doesNotMatch(source, /gradeContext|learning_grade_v1/, `${path} 不应依赖学习年级`)
    if (source.includes('<PageHeader')) assert.match(source, /theme="game"/)
  }
  const backupSource = readFileSync(resolve(root, 'utils/common/dataBackup.js'), 'utf8')
  const dataCenterSource = readFileSync(resolve(root, 'pages/learning/data-center.vue'), 'utf8')
  assert.match(backupSource, /BACKUP_STORAGE_KEYS/)
  assert.match(dataCenterSource, /createLearningBackup/)
  assert.match(dataCenterSource, /:show-grade="false"/)
  assert.match(dataCenterSource, /gradeStatus/)
  assert.match(dataCenterSource, /年级状态异常.*诊断或恢复/s)
})

test('G13 字母错题来源使用 upper/lower 契约', () => {
  const sourceModule = readFileSync(resolve(root, 'utils/common/paperSources.js'), 'utf8')
  const letterLine = sourceModule.split(/\r?\n/).find(line => line.includes("type: 'letter'")) || ''
  assert.match(letterLine, /upper:\s*item\.upper/)
  assert.match(letterLine, /lower:\s*item\.lower/)
  assert.doesNotMatch(letterLine, /word:\s*item\.upper|theme:\s*'letters'/)
})

test('G14 试卷提交结构在判题与 reducer 前严格校验', async () => {
  assert.equal(sha256Hex('abc'), createHash('sha256').update('abc').digest('hex'))
  const questions = [0, 1, 2].flatMap(index => ([
    {
      id: `cn-${index}`, subject: 'chinese', grade: ACTIVE_LEARNING_GRADE, kind: 'choice', prompt: '拼音',
      options: [{ label: 'zhōng', value: 'zhōng' }], answer: 'zhōng', due: false,
      sourceRef: { question_id: `cn-${index}`, type: 'pinyin', char: '中', unit: '2-1-1', qType: 'paper' },
    },
    {
      id: `math-${index}`, subject: 'math', grade: ACTIVE_LEARNING_GRADE, kind: 'input', prompt: '1 + 1',
      answer: '2', due: false, sourceRef: { expr: '1 + 1', answer: '2', type: 'add' },
    },
    {
      id: `en-${index}`, subject: 'english', grade: ACTIVE_LEARNING_GRADE, kind: 'choice', prompt: '单词',
      options: [{ label: 'cat', value: 'cat' }], answer: 'cat', due: false,
      sourceRef: { question_id: `en-${index}`, type: 'word', word: 'cat', theme: 'animals', qType: 'paper' },
    },
  ]))
  const input = {
    grade: ACTIVE_LEARNING_GRADE,
    paperInstanceId: createPaperInstanceId(),
    seed: 'strict-paper',
    questions,
    answers: questions.map(item => item.answer),
    submittedAt: '2026-09-02T00:00:00.000Z',
  }
  const validIntent = await createPaperSubmissionIntent(input)
  await assert.rejects(() => createPaperSubmissionIntent({ ...input, submittedAt: 'not-iso' }), /PAPER_SUBMISSION_INVALID/)
  await assert.rejects(() => createPaperSubmissionIntent({ ...input, seed: '' }), /PAPER_SUBMISSION_INVALID/)
  await assert.rejects(() => createPaperSubmissionIntent({ ...input, questions: input.questions.map((item, index) => index === 0 ? { ...item, subject: 'unknown' } : item) }), /PAPER_SUBMISSION_INVALID/)
  const malformedIntent = clone(validIntent)
  malformedIntent.answers[0].question.subject = 'unknown'
  assert.deepEqual(buildPaperSubmissionTarget(emptySnapshot(), malformedIntent), { status: 'PAPER_SUBMISSION_INCONSISTENT' })

  let businessSnapshotReads = 0
  const unreadableSnapshot = new Proxy({}, {
    get() { businessSnapshotReads++; throw new Error('BUSINESS_SNAPSHOT_ACCESSED') },
    ownKeys() { businessSnapshotReads++; throw new Error('BUSINESS_SNAPSHOT_ACCESSED') },
  })
  const tamperedBeforeSnapshot = clone(validIntent)
  tamperedBeforeSnapshot.seed = 'tampered-before-snapshot'
  assert.deepEqual(buildPaperSubmissionTarget(unreadableSnapshot, tamperedBeforeSnapshot), { status: 'PAPER_SUBMISSION_INCONSISTENT' })
  assert.equal(businessSnapshotReads, 0)

  const poisonedSource = clone(input)
  poisonedSource.questions[2].sourceRef.grade = 'grade2'
  poisonedSource.questions[2].sourceRef._id = 'poison'
  await assert.rejects(() => createPaperSubmissionIntent(poisonedSource), /PAPER_SUBMISSION_INVALID/)

  const mismatchedMathSource = clone(input)
  mismatchedMathSource.questions[1].sourceRef.expr = 'not-json-or-the-question-expression'
  await assert.rejects(() => createPaperSubmissionIntent(mismatchedMathSource), /PAPER_SUBMISSION_INVALID/)

  for (const [label, mutate] of [
    ['seed', intent => { intent.seed = 'tampered-seed' }],
    ['submissionId', intent => { intent.submissionId = 'a'.repeat(64) }],
    ['submissionDigest', intent => { intent.submissionDigest = 'b'.repeat(64) }],
    ['sourceRef', intent => { intent.answers[2].question.sourceRef.theme = 'tampered-theme' }],
    ['userAnswer', intent => {
      intent.answers[2].userAnswer = 'dog'
      intent.answers[2].correct = false
    }],
  ]) {
    const tampered = clone(validIntent)
    mutate(tampered)
    assert.deepEqual(buildPaperSubmissionTarget(emptySnapshot(), tampered), { status: 'PAPER_SUBMISSION_INCONSISTENT' }, label)
  }
})

test('G15 数学在线失败重试冻结答案且结果只读取提交意图', async () => {
  const onlineIntent = await createOnlineSubmissionIntent({
    grade: ACTIVE_LEARNING_GRADE,
    onlineInstanceId: 'a'.repeat(32),
    submittedAt: '2026-09-02T08:00:00.000Z',
    record: {
      level: 1,
      questionType: ['add'],
      total: 1,
      correct: 0,
      elapsed: 1,
      questions: [{ expr: '1 + 1', answer: '2', type: 'add', userAnswer: '3', isCorrect: false }],
    },
  })
  assert.equal(Object.isFrozen(onlineIntent.record), true)
  assert.equal(Object.isFrozen(onlineIntent.record.questions), true)
  assert.equal(Object.isFrozen(onlineIntent.record.questions[0]), true)
  const tampered = clone(onlineIntent)
  tampered.record.questions[0].userAnswer = '2'
  tampered.record.questions[0].isCorrect = true
  tampered.record.correct = 1
  tampered.submissionDigest = 'c'.repeat(64)
  assert.deepEqual(buildOnlineSubmissionTarget(emptySnapshot(), tampered), { status: 'PAPER_SUBMISSION_INCONSISTENT' })

  const onlineSource = readFileSync(resolve(root, 'pages/math/online.vue'), 'utf8')
  assert.match(onlineSource, /runPaperMutation/)
  assert.match(onlineSource, /applyRegisteredSnapshotTransaction/)
  assert.match(onlineSource, /createOnlineSubmissionIntent/)
  assert.match(onlineSource, /submissionFrozen\.value\s*=\s*true/)
  assert.match(onlineSource, /if\s*\(submissionFrozen\.value\)\s*return/)
  assert.match(onlineSource, /resultQuestions\.value\s*=\s*frozenIntent\.record\.questions/)
  assert.doesNotMatch(onlineSource, /\bsaveRecord\s*\(/)
  assert.doesNotMatch(onlineSource, /\brecordWrong\s*\(/)
})

test('G16 语英练习持久化失败必须停留当前题且不显示成功', () => {
  for (const path of [
    'pages/chinese/pinyin.vue',
    'pages/chinese/hanzi.vue',
    'pages/chinese/learn.vue',
    'pages/english/words.vue',
    'pages/chinese/mistakes-practice.vue',
    'pages/english/mistakes-practice.vue',
  ]) {
    const source = readFileSync(resolve(root, path), 'utf8')
    assert.match(source, /showStorageFailure/, `${path} 缺少持久化失败提示`)
    assert.match(source, /const\s+\w+\s*=\s*(recordWrong|recordPractice|recordCorrect|recordWrongAgain)\s*\(/, `${path} 未接收写入结果`)
    assert.match(source, /if\s*\(\s*!\w+(?:\?\.saved)?\s*\)/, `${path} 未检查写入结果`)
  }
})

let passed = 0
for (const item of tests) {
  try {
    await item.fn()
    passed++
    console.log(`PASS ${item.name}`)
  } catch (error) {
    console.error(`FAIL ${item.name}`)
    console.error(error)
    process.exitCode = 1
  }
}

console.log(`${passed}/${tests.length} global grade tests passed`)
