let storageWarningShown = false

import { isLearningStorageGateError, learningStorageApi } from './learningSession.js'

function showStorageWarningOnce() {
  if (storageWarningShown) return
  storageWarningShown = true
  try {
    uni.showToast({
      title: '本地存储失败，本次进度可能无法保留',
      icon: 'none',
      duration: 2500,
    })
  } catch (e) {}
}

export function safeSetStorage(key, value) {
  try {
    learningStorageApi.setStorageSync(key, value)
    return true
  } catch (e) {
    if (isLearningStorageGateError(e)) throw e
    showStorageWarningOnce()
    return false
  }
}
