import { createPracticeLog } from '../common/practiceLog.js'

const log = createPracticeLog({ storageKey: 'chinese_practice_logs' })

export const recordPractice = log.recordPractice
export const getRecentLogs = log.getRecentLogs
