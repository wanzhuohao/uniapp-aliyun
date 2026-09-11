import {
  BUSINESS_STORAGE_KEYS,
  CONTROL_STORAGE_KEYS,
  isBusinessStorageKey,
} from './storageRegistry.js'

const LOCK_NAME = 'learning-app-session-v1'

export class LearningStorageGateError extends Error {
  constructor(operation, key, state) {
    super(`学习数据${operation}被门禁阻止：${key}，当前状态 ${state}`)
    this.name = 'LearningStorageGateError'
    this.code = 'LEARNING_STORAGE_GATE_CLOSED'
  }
}

let activeSession = null
let activeStorageApi = null
export let sessionReady = Promise.reject(new Error('学习会话尚未安装'))
sessionReady.catch(() => {})

function requireInstalledStorage() {
  if (!activeStorageApi) throw new LearningStorageGateError('访问', '<uninstalled>', 'starting')
  return activeStorageApi
}

export const learningStorageApi = Object.freeze({
  getStorageSync(key) { return requireInstalledStorage().getStorageSync(key) },
  setStorageSync(key, value) { return requireInstalledStorage().setStorageSync(key, value) },
  removeStorageSync(key) { return requireInstalledStorage().removeStorageSync(key) },
})

export function getLearningSession() {
  return activeSession
}

export function isLearningStorageGateError(error) {
  return error instanceof LearningStorageGateError || error?.code === 'LEARNING_STORAGE_GATE_CLOSED'
}

export async function awaitLearningSession() {
  return sessionReady
}

function createOverlay(documentRef) {
  if (!documentRef?.body) return { update() {}, remove() {}, setRecoveryActions() {} }
  const id = 'learning-session-gate-overlay'
  let element = documentRef.getElementById(id)
  let message
  let actions
  if (!element) {
    element = documentRef.createElement('div')
    element.id = id
    Object.assign(element.style, {
      position: 'fixed', inset: '0', zIndex: '2147483647', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      background: '#f7f5f0', color: '#2a2520', textAlign: 'center',
      fontFamily: 'system-ui, sans-serif', whiteSpace: 'pre-line',
      flexDirection: 'column', gap: '18px',
    })
    message = documentRef.createElement('div')
    actions = documentRef.createElement('div')
    Object.assign(actions.style, { display: 'none', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' })
    element.appendChild(message)
    element.appendChild(actions)
    documentRef.body.appendChild(element)
  } else {
    message = element.firstElementChild || element
    actions = element.lastElementChild === message ? null : element.lastElementChild
  }
  return {
    update(value) { if (!element.isConnected) documentRef.body.appendChild(element); message.textContent = value },
    setRecoveryActions({ onRetry, onClear } = {}) {
      if (!actions) return
      actions.replaceChildren()
      if (typeof onRetry !== 'function' || typeof onClear !== 'function') {
        actions.style.display = 'none'
        return
      }
      const makeButton = (label, action, danger = false) => {
        const button = documentRef.createElement('button')
        button.type = 'button'
        button.textContent = label
        Object.assign(button.style, { padding: '10px 18px', borderRadius: '8px', border: '1px solid #8b7355', cursor: 'pointer', background: danger ? '#a62d33' : '#fff', color: danger ? '#fff' : '#2a2520' })
        button.addEventListener('click', async () => {
          if (danger && !documentRef.defaultView?.confirm?.('安全清空会永久删除本机全部学习记录，确定继续？')) return
          for (const child of actions.children) child.disabled = true
          try { await action() } finally { for (const child of actions.children) child.disabled = false }
        })
        return button
      }
      actions.appendChild(makeButton('重试恢复', onRetry))
      actions.appendChild(makeButton('安全清空学习数据', onClear, true))
      actions.style.display = 'flex'
    },
    remove() { element.remove() },
  }
}

function makeIdentity(cryptoRef = globalThis.crypto) {
  const random = cryptoRef?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return { owner: random, generation: Date.now() }
}

function hasDirtyControlPlane(native) {
  return native.has(CONTROL_STORAGE_KEYS.transaction) || native.has(CONTROL_STORAGE_KEYS.fence)
}

export function installLearningSessionGate(storageApi, options = {}) {
  if (activeSession) return activeSession
  if (!storageApi) throw new Error('学习会话安装失败：uni 存储 API 不可用，请刷新页面')

  const navigatorRef = options.navigatorRef ?? globalThis.navigator
  const locationRef = options.locationRef ?? globalThis.location
  const documentRef = options.documentRef ?? globalThis.document
  const locks = options.locks ?? navigatorRef?.locks
  const recoverStartup = options.recoverStartup
  const clearRecovery = options.clearRecovery
  const rawGet = storageApi.getStorageSync.bind(storageApi)
  const rawSet = storageApi.setStorageSync.bind(storageApi)
  const rawRemove = storageApi.removeStorageSync.bind(storageApi)
  const states = new Set(['starting', 'ready', 'exclusive', 'recovery-required', 'reload-required'])
  let state = 'starting'
  let gateOpen = false
  let sharedRelease = null
  let sharedRequest = null
  let sharedAcquired = false
  let leaseNonce = null
  let leaseActive = false
  let resolveReady
  let rejectReady
  const readyPromise = new Promise((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })
  readyPromise.catch(() => {})
  const overlay = createOverlay(documentRef)
  overlay.update('正在检查本机学习数据，请稍候…')

  const native = Object.freeze({
    get(key) {
      const value = rawGet(key)
      return value === '' ? undefined : value
    },
    has(key) {
      const value = rawGet(key)
      return value !== '' && value !== undefined && value !== null
    },
    set(key, value) { rawSet(key, value) },
    remove(key) { rawRemove(key) },
  })

  function setState(next) {
    if (!states.has(next)) throw new Error(`未知学习会话状态：${next}`)
    state = next
  }

  function assertBusinessAccess(operation, key) {
    if (isBusinessStorageKey(key) && !gateOpen) {
      throw new LearningStorageGateError(operation, key, state)
    }
  }

  storageApi.getStorageSync = function gatedGet(key) {
    assertBusinessAccess('读取', key)
    return rawGet(key)
  }
  storageApi.setStorageSync = function gatedSet(key, value) {
    assertBusinessAccess('写入', key)
    return rawSet(key, value)
  }
  storageApi.removeStorageSync = function gatedRemove(key) {
    assertBusinessAccess('删除', key)
    return rawRemove(key)
  }
  activeStorageApi = storageApi

  function openGate() {
    gateOpen = true
    setState('ready')
    overlay.setRecoveryActions()
    overlay.remove()
    resolveReady(session)
  }

  function closeGate(message = '正在安全处理学习数据，请勿关闭页面…') {
    gateOpen = false
    overlay.update(message)
  }

  function showRecoveryRequired(code = 'BACKUP_RESTORE_FAILED') {
    gateOpen = false
    setState('recovery-required')
    overlay.update(`学习数据恢复未完成，业务数据已锁定。\n可重试恢复，或在确认不再需要本机记录后安全清空。\n错误码：${code}`)
    overlay.setRecoveryActions({ onRetry: retryRecovery, onClear: safeClearRecovery })
  }

  function requestReload(message) {
    setState('reload-required')
    overlay.setRecoveryActions()
    overlay.update(message)
    if (typeof locationRef?.reload !== 'function') {
      overlay.update('数据处理完成，但当前环境不能自动刷新。请手动刷新页面后继续。')
      return
    }
    try { locationRef.reload() } catch {
      overlay.update('数据处理完成，但自动刷新失败。请手动刷新页面后继续。')
    }
  }

  async function acquireShared({ inspectControls = false } = {}) {
    if (!locks?.request) return { acquired: false, dirty: hasDirtyControlPlane(native) }
    let notify
    const acquired = new Promise(resolve => { notify = resolve })
    let dirty = false
    sharedRequest = locks.request(LOCK_NAME, { mode: 'shared' }, async lock => {
      if (!lock) {
        notify(false)
        return
      }
      sharedAcquired = true
      dirty = inspectControls && hasDirtyControlPlane(native)
      notify(true)
      if (dirty) {
        sharedAcquired = false
        return
      }
      await new Promise(resolve => { sharedRelease = resolve })
      sharedRelease = null
      sharedAcquired = false
    })
    const ok = await acquired
    if (dirty) await sharedRequest
    return { acquired: ok, dirty }
  }

  async function releaseShared() {
    if (!sharedAcquired) return
    sharedRelease?.()
    await sharedRequest
  }

  function makeContext(identity, mode) {
    const contextNonce = leaseNonce
    return Object.freeze({
      ...identity,
      mode,
      native,
      businessKeys: BUSINESS_STORAGE_KEYS,
      assertLease() {
        if (mode === 'unlocked') {
          if (gateOpen || state !== 'exclusive') throw new Error('EXCLUSIVE_LEASE_LOST')
          return true
        }
        if (!leaseActive || !leaseNonce || contextNonce !== leaseNonce || state !== 'exclusive') {
          throw new Error('EXCLUSIVE_LEASE_LOST')
        }
        return true
      },
    })
  }

  async function runExclusive(operation, { allowUnlocked = false, purpose = 'restore' } = {}) {
    closeGate(purpose === 'backup' ? '正在生成完整备份，请勿切换标签页…' : '正在安全更新学习数据，请勿关闭页面…')
    await releaseShared()
    if (!locks?.request) {
      if (!allowUnlocked) {
        openGate()
        return { ok: false, code: 'WEB_LOCKS_UNAVAILABLE' }
      }
      setState('exclusive')
      const identity = makeIdentity(options.cryptoRef)
      try {
        const result = await operation(makeContext(identity, 'unlocked'))
        if (result?.requiresReload) requestReload('学习数据已更新，正在重新载入页面…')
        else if (hasDirtyControlPlane(native)) showRecoveryRequired('BACKUP_RESTORE_FAILED')
        else openGate()
        return result
      } catch (error) {
        if (hasDirtyControlPlane(native) || purpose === 'restore') showRecoveryRequired(error?.message)
        else openGate()
        throw error
      }
    }

    let result = { ok: false, code: 'OTHER_SESSION_ACTIVE' }
    try {
      await locks.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, async lock => {
        if (!lock) return
        setState('exclusive')
        leaseNonce = makeIdentity(options.cryptoRef).owner
        leaseActive = true
        const identity = makeIdentity(options.cryptoRef)
        try {
          result = await operation(makeContext(identity, 'locked'))
        } finally {
          leaseActive = false
          leaseNonce = null
        }
      })
    } catch (error) {
      if (purpose === 'backup' || (purpose === 'paper' && !hasDirtyControlPlane(native))) {
        await acquireShared()
        openGate()
      } else {
        showRecoveryRequired(error?.message)
      }
      throw error
    }
    if (!result?.ok && result?.code === 'OTHER_SESSION_ACTIVE') {
      await acquireShared()
      openGate()
      return result
    }
    if (result?.requiresReload) {
      requestReload('学习数据已更新，正在重新载入页面…')
      return result
    }
    if (hasDirtyControlPlane(native)) {
      showRecoveryRequired(result?.code || 'BACKUP_RESTORE_FAILED')
      return result?.committed ? result : { ok: false, code: 'BACKUP_RESTORE_FAILED' }
    }
    await acquireShared()
    openGate()
    return result
  }

  async function runRecoveryControl(operation) {
    if (state !== 'recovery-required' || !locks?.request || typeof operation !== 'function') {
      return { ok: false, code: 'RECOVERY_UNAVAILABLE' }
    }
    closeGate('正在处理异常学习数据，请勿关闭页面…')
    let result = { ok: false, code: 'BACKUP_RESTORE_FAILED' }
    try {
      await locks.request(LOCK_NAME, { mode: 'exclusive' }, async lock => {
        if (!lock) return
        setState('exclusive')
        leaseNonce = makeIdentity(options.cryptoRef).owner
        leaseActive = true
        const fence = native.get(CONTROL_STORAGE_KEYS.fence)
        const identity = fence && typeof fence.owner === 'string' && Number.isSafeInteger(fence.generation)
          ? { owner: fence.owner, generation: fence.generation }
          : makeIdentity(options.cryptoRef)
        try { result = await operation(makeContext(identity, 'locked')) }
        finally { leaseActive = false; leaseNonce = null }
      })
      if (!result?.ok || hasDirtyControlPlane(native)) {
        showRecoveryRequired(result?.code || 'BACKUP_RESTORE_FAILED')
        return result
      }
      requestReload('学习数据处理完成，正在重新载入页面…')
      return { ...result, requiresReload: true }
    } catch (error) {
      showRecoveryRequired(error?.message)
      throw error
    }
  }

  function retryRecovery() {
    return runRecoveryControl(recoverStartup)
  }

  function safeClearRecovery() {
    return runRecoveryControl(clearRecovery)
  }

  async function recoverOnStartup() {
    const shared = await acquireShared({ inspectControls: true })
    if (!shared.dirty) {
      openGate()
      return
    }
    setState('recovery-required')
    overlay.update('检测到上次数据操作未完成，正在恢复…')
    if (!locks?.request || typeof recoverStartup !== 'function') {
      rejectReady(new Error('检测到未完成的数据操作，请在支持 Web Locks 的浏览器中打开数据中心恢复'))
      return
    }
    await locks.request(LOCK_NAME, { mode: 'exclusive' }, async lock => {
      if (!lock) return
      setState('exclusive')
      leaseNonce = makeIdentity(options.cryptoRef).owner
      leaseActive = true
      try {
        const fence = native.get(CONTROL_STORAGE_KEYS.fence)
        const identity = fence && typeof fence.owner === 'string'
          ? { owner: fence.owner, generation: fence.generation }
          : makeIdentity(options.cryptoRef)
        const result = await recoverStartup(makeContext(identity, 'locked'))
        if (!result?.ok) throw new Error(result?.code || 'BACKUP_RESTORE_FAILED')
      } finally {
        leaseActive = false
        leaseNonce = null
      }
    })
    requestReload('数据恢复完成，正在重新载入页面…')
  }

  const session = Object.freeze({
    sessionReady: readyPromise,
    exclusiveDataOpsSupported: !!locks?.request,
    getState: () => state,
    isGateOpen: () => gateOpen,
    native,
    runExclusiveBackup: operation => runExclusive(operation, { purpose: 'backup' }),
    runExclusiveRestore: operation => runExclusive(operation, { purpose: 'restore' }),
    runPaperMutation: operation => runExclusive(operation, { allowUnlocked: true, purpose: 'paper' }),
    retryRecovery,
    safeClearRecovery,
  })
  activeSession = session
  sessionReady = readyPromise
  void recoverOnStartup().catch(error => {
    showRecoveryRequired(error?.message)
    rejectReady(error)
  })
  return session
}
