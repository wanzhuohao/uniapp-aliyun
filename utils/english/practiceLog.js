import { createPracticeLog } from '../common/practiceLog.js'

const log = createPracticeLog({ storageKey: 'english_practice_logs' })

export const recordPractice = log.recordPractice
