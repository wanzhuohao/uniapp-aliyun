import { createPracticeLog } from '../common/practiceLog.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'

const log = createPracticeLog({ storageKey: STORAGE_KEYS.chinesePracticeLogs })

export const recordPractice = log.recordPractice
export const getRecentLogs = log.getRecentLogs
