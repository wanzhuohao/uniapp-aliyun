import { DIAGNOSTIC_STORAGE_KEYS, STORAGE_KEYS } from './storageRegistry.js'
import { learningStorageApi } from './learningSession.js'

export const DIAGNOSTIC_CODES = Object.freeze([
  'STORAGE_READ_FAILED', 'STORAGE_WRITE_FAILED', 'BACKUP_INVALID', 'BACKUP_RESTORE_FAILED',
  'PAPER_SOURCE_MISSING', 'FILE_GENERATION_FAILED', 'DOWNLOAD_UNAVAILABLE',
  'IMAGE_CAPTURE_FAILED', 'ZIP_GENERATION_FAILED', 'QUALITY_BLOCKED', 'UNKNOWN_CONTROLLED_ERROR',
])
export const DIAGNOSTIC_MODULES = Object.freeze([
  'app', 'storage', 'backup', 'paper', 'export', 'template', 'quality', 'diagnostic',
])
const codeSet = new Set(DIAGNOSTIC_CODES)
const moduleSet = new Set(DIAGNOSTIC_MODULES)
const encoder = new TextEncoder()

function iso(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function clampText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function cleanRoute(value) {
  const path = typeof value === 'string' ? value.replace(/^#\/?/, '').split(/[?#]/)[0] : ''
  return `/${path.replace(/^\/+/, '')}`.slice(0, 256)
}

function resolveRoute(env) {
  try {
    const pages = env.getCurrentPages?.()
    const route = pages?.at?.(-1)?.route
    if (typeof route === 'string' && route) return cleanRoute(route)
  } catch {}
  const hash = typeof env.location?.hash === 'string' ? env.location.hash : ''
  return cleanRoute(hash)
}

function serializedBytes(value) {
  if (value === undefined || value === null || value === '') return 0
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return Math.min(encoder.encode(text).byteLength, Number.MAX_SAFE_INTEGER)
}

export function normalizeDiagnosticErrors(errors) {
  return (Array.isArray(errors) ? errors : [])
    .filter(item => item && codeSet.has(item.code) && moduleSet.has(item.module))
    .map(item => ({ at: iso(item.at), code: item.code, module: item.module }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20)
}

export function recordDiagnosticError(code, module = 'app', at = new Date(), storageApi = learningStorageApi) {
  if (!codeSet.has(code) || !moduleSet.has(module)) return false
  try {
    const current = storageApi.getStorageSync(STORAGE_KEYS.diagnosticErrors)
    const next = normalizeDiagnosticErrors([{ at: iso(at), code, module }, ...(Array.isArray(current) ? current : [])])
    storageApi.setStorageSync(STORAGE_KEYS.diagnosticErrors, next)
    return true
  } catch {
    return false
  }
}

export function buildDiagnosticReport({ appVersion, storageApi = learningStorageApi, errors, clock = () => new Date(), env = globalThis }) {
  const readErrors = []
  const storage = DIAGNOSTIC_STORAGE_KEYS.map(key => {
    try {
      return { key, serializedBytes: serializedBytes(storageApi.getStorageSync(key)) }
    } catch {
      readErrors.push({ at: iso(clock()), code: 'STORAGE_READ_FAILED', module: 'storage' })
      return { key, serializedBytes: 0 }
    }
  })
  let storedErrors = errors
  if (!storedErrors) {
    try { storedErrors = storageApi.getStorageSync(STORAGE_KEYS.diagnosticErrors) } catch { storedErrors = [] }
  }
  const width = Math.min(Math.max(Math.trunc(Number(env.innerWidth) || 0), 0), 10000)
  const height = Math.min(Math.max(Math.trunc(Number(env.innerHeight) || 0), 0), 10000)
  return {
    schemaVersion: 1,
    app: 'learning',
    appVersion: clampText(appVersion, 64),
    generatedAt: iso(clock()),
    route: resolveRoute(env),
    environment: {
      userAgent: clampText(env.navigator?.userAgent, 512),
      language: clampText(env.navigator?.language, 35),
      viewport: { width, height },
      online: typeof env.navigator?.onLine === 'boolean' ? env.navigator.onLine : false,
    },
    errors: normalizeDiagnosticErrors([...(Array.isArray(storedErrors) ? storedErrors : []), ...readErrors]),
    storage,
  }
}

export function downloadDiagnosticReport(report, env = globalThis) {
  if (!env.Blob || !env.URL?.createObjectURL || !env.document?.createElement) throw new Error('DOWNLOAD_UNAVAILABLE')
  const blob = new env.Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = env.URL.createObjectURL(blob)
  try {
    const link = env.document.createElement('a')
    link.href = url
    link.download = `learning-diagnostic-${report.generatedAt.slice(0, 10)}.json`
    link.click()
  } finally {
    env.URL.revokeObjectURL(url)
  }
}
