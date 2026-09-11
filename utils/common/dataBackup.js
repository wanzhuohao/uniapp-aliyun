import {
  BACKUP_STORAGE_KEYS,
  LEGACY_BACKUP_STORAGE_KEYS,
  CONTROL_STORAGE_KEYS,
  STORAGE_KEYS,
  assertRegisteredSnapshot,
} from './storageRegistry.js'
import { assertValidLearningSnapshotV2, convertLegacyLearningSnapshotV1, projectLearningValue } from './gradeMigration.js'
import { assertCurrentLearningGrade } from './gradeContext.js'

export const LEARNING_BACKUP_SCHEMA_VERSION = 2
export const LEARNING_BACKUP_APP = 'learning'
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024
const encoder = new TextEncoder()

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function hasExactKeys(value, keys) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
}

function isCanonicalIso(value) {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toISOString() === value
}

function snapshotObjectToEntries(snapshot, keys = BACKUP_STORAGE_KEYS, options = {}) {
  assertRegisteredSnapshot(snapshot, keys, options)
  if (options.schemaVersion === 2 && keys === BACKUP_STORAGE_KEYS && !snapshot[STORAGE_KEYS.learningGrade]?.present) throw new Error('BACKUP_INVALID')
  return keys.map(key => snapshot[key].present
    ? { key, present: true, value: clone(snapshot[key].value) }
    : { key, present: false })
}

function snapshotEntriesToObject(entries, keys = BACKUP_STORAGE_KEYS, options = {}) {
  if (!Array.isArray(entries) || entries.length !== keys.length) throw new Error('BACKUP_INVALID')
  const snapshot = {}
  entries.forEach((item, index) => {
    const key = keys[index]
    if (!item || typeof item !== 'object' || Array.isArray(item) || item.key !== key || typeof item.present !== 'boolean') throw new Error('BACKUP_INVALID')
    const expectedKeys = item.present ? ['key', 'present', 'value'] : ['key', 'present']
    if (Object.keys(item).length !== expectedKeys.length || expectedKeys.some(name => !Object.prototype.hasOwnProperty.call(item, name))) throw new Error('BACKUP_INVALID')
    snapshot[key] = item.present ? { present: true, value: clone(item.value) } : { present: false }
  })
  assertRegisteredSnapshot(snapshot, keys, options)
  if (options.schemaVersion === 2 && keys === BACKUP_STORAGE_KEYS && !snapshot[STORAGE_KEYS.learningGrade]?.present) throw new Error('BACKUP_INVALID')
  return snapshot
}

async function sha256(text) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) throw new Error('BACKUP_INVALID')
  const digest = await subtle.digest('SHA-256', encoder.encode(text))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function readRegistrySnapshot(native, keys = BACKUP_STORAGE_KEYS) {
  const snapshot = {}
  for (const key of keys) {
    const present = native.has(key)
    snapshot[key] = present ? { present: true, value: clone(native.get(key)) } : { present: false }
  }
  assertRegisteredSnapshot(snapshot, keys)
  return snapshot
}

function readProjectedBackupSnapshot(native) {
  const snapshot = {}
  for (const key of BACKUP_STORAGE_KEYS) {
    const present = native.has(key)
    snapshot[key] = present ? { present: true, value: projectLearningValue(key, native.get(key)) } : { present: false }
  }
  assertRegisteredSnapshot(snapshot)
  return snapshot
}

export function snapshotMatches(native, snapshot, keys = BACKUP_STORAGE_KEYS) {
  try {
    for (const key of keys) {
      const expected = snapshot[key]
      if (native.has(key) !== expected.present) return false
      if (expected.present && canonicalize(native.get(key)) !== canonicalize(expected.value)) return false
    }
    return true
  } catch {
    return false
  }
}

function writeAndVerify(native, key, item) {
  if (item.present) native.set(key, clone(item.value))
  else native.remove(key)
  if (native.has(key) !== item.present) throw new Error('STORAGE_WRITE_FAILED')
  if (item.present && canonicalize(native.get(key)) !== canonicalize(item.value)) {
    throw new Error('STORAGE_WRITE_FAILED')
  }
}

function writeControl(context, key, value) {
  context.assertLease()
  context.native.set(key, clone(value))
  if (canonicalize(context.native.get(key)) !== canonicalize(value)) throw new Error('STORAGE_WRITE_FAILED')
}

function verifyFence(context, identity) {
  context.assertLease()
  const fence = context.native.get(CONTROL_STORAGE_KEYS.fence)
  if (!fence || fence.state !== 'fenced' || fence.owner !== identity.owner || fence.generation !== identity.generation) {
    throw new Error('EXCLUSIVE_LEASE_LOST')
  }
}

function clearControlPlane(context, identity) {
  verifyFence(context, identity)
  context.native.remove(CONTROL_STORAGE_KEYS.transaction)
  if (context.native.has(CONTROL_STORAGE_KEYS.transaction)) throw new Error('STORAGE_WRITE_FAILED')
  verifyFence(context, identity)
  context.native.remove(CONTROL_STORAGE_KEYS.fence)
  if (context.native.has(CONTROL_STORAGE_KEYS.fence)) throw new Error('STORAGE_WRITE_FAILED')
}

export async function createLearningBackup(context, clock = () => new Date()) {
  context.assertLease()
  const generatedAt = clock().toISOString()
  const projected = readProjectedBackupSnapshot(context.native)
  assertValidLearningSnapshotV2(projected)
  const snapshot = snapshotObjectToEntries(projected, BACKUP_STORAGE_KEYS, { schemaVersion: 2 })
  const unsigned = { schemaVersion: LEARNING_BACKUP_SCHEMA_VERSION, app: LEARNING_BACKUP_APP, generatedAt, snapshot }
  const checksum = { algorithm: 'SHA-256', value: await sha256(canonicalize(unsigned)) }
  const backup = { ...unsigned, checksum }
  const text = JSON.stringify(backup, null, 2)
  if (encoder.encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('BACKUP_INVALID')
  return { ok: true, backup, text }
}

export async function validateLearningBackup(input) {
  let text
  try { text = typeof input === 'string' ? input : JSON.stringify(input) } catch { throw new Error('BACKUP_INVALID') }
  if (encoder.encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('BACKUP_INVALID')
  let backup
  try { backup = typeof input === 'string' ? JSON.parse(input) : clone(input) } catch { throw new Error('BACKUP_INVALID') }
  if (!hasExactKeys(backup, ['schemaVersion', 'app', 'generatedAt', 'snapshot', 'checksum']) ||
      ![1, LEARNING_BACKUP_SCHEMA_VERSION].includes(backup.schemaVersion) || backup.app !== LEARNING_BACKUP_APP ||
      !isCanonicalIso(backup.generatedAt) || !hasExactKeys(backup.checksum, ['algorithm', 'value']) ||
      backup.checksum.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(backup.checksum.value || '')) throw new Error('BACKUP_INVALID')
  const keys = backup.schemaVersion === 1 ? LEGACY_BACKUP_STORAGE_KEYS : BACKUP_STORAGE_KEYS
  const snapshot = snapshotEntriesToObject(backup.snapshot, keys, { schemaVersion: backup.schemaVersion })
  const actual = await sha256(canonicalize({
    schemaVersion: backup.schemaVersion,
    app: backup.app,
    generatedAt: backup.generatedAt,
    snapshot: backup.snapshot,
  }))
  if (actual !== backup.checksum.value) throw new Error('BACKUP_INVALID')
  if (backup.schemaVersion === 1) {
    const target = convertLegacyLearningSnapshotV1(snapshot)
    const unsigned = {
      schemaVersion: LEARNING_BACKUP_SCHEMA_VERSION,
      app: LEARNING_BACKUP_APP,
      generatedAt: backup.generatedAt,
      snapshot: snapshotObjectToEntries(target),
    }
    return { ...unsigned, checksum: { algorithm: 'SHA-256', value: await sha256(canonicalize(unsigned)) } }
  }
  assertValidLearningSnapshotV2(snapshot)
  return backup
}

export async function applyRecoverableTransaction(context, targetOrReducer, kind = 'restore') {
  if (typeof targetOrReducer !== 'function') assertRegisteredSnapshot(targetOrReducer)
  const identity = { owner: context.owner, generation: context.generation }
  const fence = { state: 'fenced', ...identity }
  try {
    writeControl(context, CONTROL_STORAGE_KEYS.fence, fence)
    verifyFence(context, identity)
  } catch (error) {
    try {
      const current = context.native.get(CONTROL_STORAGE_KEYS.fence)
      if (current?.owner === identity.owner && current?.generation === identity.generation) {
        context.assertLease()
        context.native.remove(CONTROL_STORAGE_KEYS.fence)
      }
    } catch {}
    throw error
  }
  let original
  let reduced
  try {
    original = readRegistrySnapshot(context.native)
    reduced = typeof targetOrReducer === 'function' ? targetOrReducer(original) : { status: 'TARGET_READY', target: targetOrReducer }
  } catch (error) {
    try { clearControlPlane(context, identity) } catch {}
    throw error
  }
  if (reduced?.status === 'ALREADY_COMMITTED') {
    try {
      verifyFence(context, identity)
      context.native.remove(CONTROL_STORAGE_KEYS.fence)
      if (context.native.has(CONTROL_STORAGE_KEYS.fence)) throw new Error('STORAGE_WRITE_FAILED')
      return { ok: true, code: 'ALREADY_COMMITTED', committed: true }
    } catch {
      return { ok: false, code: 'CONTROL_PLANE_CLEANUP_FAILED', committed: true }
    }
  }
  if (reduced?.status !== 'TARGET_READY') {
    verifyFence(context, identity)
    context.native.remove(CONTROL_STORAGE_KEYS.fence)
    if (context.native.has(CONTROL_STORAGE_KEYS.fence)) throw new Error('STORAGE_WRITE_FAILED')
    return { ok: false, code: reduced?.status || 'PAPER_SUBMISSION_INCONSISTENT' }
  }
  const target = reduced.target
  try { assertRegisteredSnapshot(target) } catch (error) {
    try { clearControlPlane(context, identity) } catch {}
    throw error
  }
  let transaction = {
    schemaVersion: 1, kind, state: 'prepared', ...identity,
    original, target: clone(target), createdAt: new Date().toISOString(),
  }
  try {
    writeControl(context, CONTROL_STORAGE_KEYS.transaction, transaction)
    transaction = { ...transaction, state: 'applying' }
    writeControl(context, CONTROL_STORAGE_KEYS.transaction, transaction)
    for (const key of BACKUP_STORAGE_KEYS) {
      verifyFence(context, identity)
      writeAndVerify(context.native, key, target[key])
    }
    if (!snapshotMatches(context.native, target)) throw new Error('STORAGE_WRITE_FAILED')
    transaction = { ...transaction, state: 'committed' }
    writeControl(context, CONTROL_STORAGE_KEYS.transaction, transaction)
    if (!snapshotMatches(context.native, target)) throw new Error('STORAGE_WRITE_FAILED')
  } catch (error) {
    const rollbackRecord = { ...transaction, state: 'rollback_required' }
    try { writeControl(context, CONTROL_STORAGE_KEYS.transaction, rollbackRecord) } catch {}
    try {
      for (const key of BACKUP_STORAGE_KEYS) {
        verifyFence(context, identity)
        writeAndVerify(context.native, key, original[key])
      }
      if (!snapshotMatches(context.native, original)) throw new Error('BACKUP_RESTORE_FAILED')
      clearControlPlane(context, identity)
    } catch {
      throw new Error('BACKUP_RESTORE_FAILED')
    }
    throw error
  }
  try {
    clearControlPlane(context, identity)
  } catch {
    const error = new Error('CONTROL_PLANE_CLEANUP_FAILED')
    error.code = 'CONTROL_PLANE_CLEANUP_FAILED'
    error.committed = true
    throw error
  }
  return { ok: true, code: 'COMMITTED', requiresReload: kind === 'restore' }
}

export function applyRegisteredSnapshotTransaction(context, reducer, kind = 'paper', { sessionGrade } = {}) {
  if (typeof reducer !== 'function') throw new TypeError('reducer 必须是纯函数')
  assertCurrentLearningGrade(sessionGrade, context.native)
  return applyRecoverableTransaction(context, reducer, kind)
}

export async function restoreLearningBackup(context, backupInput) {
  const backup = await validateLearningBackup(backupInput)
  return applyRecoverableTransaction(context, snapshotEntriesToObject(backup.snapshot), 'restore')
}

function validFence(fence) {
  return hasExactKeys(fence, ['state', 'owner', 'generation']) && fence.state === 'fenced' &&
    typeof fence.owner === 'string' && fence.owner.length > 0 && Number.isSafeInteger(fence.generation) && fence.generation >= 0
}

function validTransaction(transaction) {
  if (!hasExactKeys(transaction, ['schemaVersion', 'kind', 'state', 'owner', 'generation', 'original', 'target', 'createdAt']) ||
      transaction.schemaVersion !== 1 || !['restore', 'paper'].includes(transaction.kind) ||
      !['prepared', 'applying', 'rollback_required', 'committed'].includes(transaction.state) ||
      typeof transaction.owner !== 'string' || !transaction.owner || !Number.isSafeInteger(transaction.generation) || transaction.generation < 0 ||
      !isCanonicalIso(transaction.createdAt)) return false
  try {
    const current = Object.keys(transaction.original).length === BACKUP_STORAGE_KEYS.length
    const keys = current ? BACKUP_STORAGE_KEYS : LEGACY_BACKUP_STORAGE_KEYS
    const options = { schemaVersion: current ? 2 : 1 }
    assertRegisteredSnapshot(transaction.original, keys, options)
    assertRegisteredSnapshot(transaction.target, keys, options)
    if (Object.keys(transaction.target).length !== keys.length) return false
    return true
  } catch {
    return false
  }
}

export async function recoverPendingLearningTransaction(context) {
  context.assertLease()
  const fence = context.native.get(CONTROL_STORAGE_KEYS.fence)
  const transaction = context.native.get(CONTROL_STORAGE_KEYS.transaction)
  if (!fence && !transaction) return { ok: true, code: 'CLEAN' }
  if (!fence && transaction) return { ok: false, code: 'CONTROL_PLANE_CORRUPTED' }
  if (!transaction) {
    if (!validFence(fence)) return { ok: false, code: 'CONTROL_PLANE_CORRUPTED' }
    verifyFence({ ...context, owner: fence.owner, generation: fence.generation }, fence)
    context.native.remove(CONTROL_STORAGE_KEYS.fence)
    if (context.native.has(CONTROL_STORAGE_KEYS.fence)) return { ok: false, code: 'BACKUP_RESTORE_FAILED' }
    return { ok: true, code: 'FENCE_CLEARED' }
  }
  if (!validFence(fence) || !validTransaction(transaction) || transaction.owner !== fence.owner || transaction.generation !== fence.generation) {
    return { ok: false, code: 'CONTROL_PLANE_CORRUPTED' }
  }
  const recoveryContext = { ...context, owner: fence.owner, generation: fence.generation }
  const transactionKeys = Object.keys(transaction.original).length === BACKUP_STORAGE_KEYS.length
    ? BACKUP_STORAGE_KEYS
    : LEGACY_BACKUP_STORAGE_KEYS
  const rollback = () => {
    assertRegisteredSnapshot(transaction.original, transactionKeys, { schemaVersion: transactionKeys === BACKUP_STORAGE_KEYS ? 2 : 1 })
    for (const key of transactionKeys) {
      verifyFence(recoveryContext, fence)
      writeAndVerify(context.native, key, transaction.original[key])
    }
    if (!snapshotMatches(context.native, transaction.original, transactionKeys)) throw new Error('BACKUP_RESTORE_FAILED')
    clearControlPlane(recoveryContext, fence)
    return { ok: true, code: 'ROLLED_BACK' }
  }
  try {
    if (['prepared', 'applying', 'rollback_required'].includes(transaction.state)) return rollback()
    if (transaction.state === 'committed') {
      if (snapshotMatches(context.native, transaction.target, transactionKeys)) {
        try {
          clearControlPlane(recoveryContext, fence)
          return { ok: true, code: 'COMMITTED_CLEANED' }
        } catch {
          return { ok: false, code: 'BACKUP_RESTORE_FAILED' }
        }
      }
      return rollback()
    }
    return { ok: false, code: 'CONTROL_PLANE_CORRUPTED' }
  } catch {
    try {
      if (context.native.has(CONTROL_STORAGE_KEYS.transaction)) {
        context.native.set(CONTROL_STORAGE_KEYS.transaction, { ...transaction, state: 'rollback_required' })
      }
    } catch {}
    return { ok: false, code: 'BACKUP_RESTORE_FAILED' }
  }
}

export function clearRegisteredLearningData(context) {
  context.assertLease()
  for (const key of BACKUP_STORAGE_KEYS) {
    context.assertLease()
    context.native.remove(key)
    if (context.native.has(key)) throw new Error('BACKUP_RESTORE_FAILED')
  }
  context.assertLease()
  context.native.remove(CONTROL_STORAGE_KEYS.transaction)
  if (context.native.has(CONTROL_STORAGE_KEYS.transaction)) throw new Error('BACKUP_RESTORE_FAILED')
  context.assertLease()
  context.native.remove(CONTROL_STORAGE_KEYS.fence)
  if (context.native.has(CONTROL_STORAGE_KEYS.fence)) throw new Error('BACKUP_RESTORE_FAILED')
  return { ok: true, code: 'REGISTERED_DATA_CLEARED', requiresReload: true }
}
