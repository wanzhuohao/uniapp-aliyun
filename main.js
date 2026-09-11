import { createSSRApp } from 'vue'
import App from './App.vue'
import { installLearningSessionGate } from './utils/common/learningSession.js'
import { clearRegisteredLearningData, recoverPendingLearningTransaction } from './utils/common/dataBackup.js'

export let learningSession
export let sessionReady

export function createApp() {
  // HBuilderX 会把直接的 uni.* 调用编译为平台 API，但不能把整个 `uni`
  // 对象作为可猴补丁的运行时对象传递，因此用显式适配器承接门禁。
  const platformStorageApi = {
    getStorageSync: key => uni.getStorageSync(key),
    setStorageSync: (key, value) => uni.setStorageSync(key, value),
    removeStorageSync: key => uni.removeStorageSync(key),
  }
  learningSession = installLearningSessionGate(platformStorageApi, {
    recoverStartup: recoverPendingLearningTransaction,
    clearRecovery: clearRegisteredLearningData,
  })
  sessionReady = learningSession.sessionReady
  const app = createSSRApp(App)
  app.provide('learningSession', learningSession)
  return { app }
}
