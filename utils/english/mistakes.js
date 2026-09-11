// 英语错题本：复用 common/leitner，仅增加 getWrongStats 学科特异统计
import { createLeitner } from '../common/leitner.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'

const leitner = createLeitner({ storageKey: STORAGE_KEYS.englishMistakes })

export const recordCorrect = leitner.recordCorrect
export const recordWrongAgain = leitner.recordWrongAgain
export const getAllWrongList = leitner.getAllWrongList
export const getDueList = leitner.getDueList

export function recordWrong({ grade, type, word, theme, emoji, zh, question_id, qType, upper, lower, phonics, example, exampleZh }) {
  return leitner.recordWrong({ grade, type, word, theme, emoji, zh, question_id, qType, upper, lower, phonics, example, exampleZh })
}

export function getWrongStats(grade) {
  const all = getAllWrongList(grade)
  const now = Date.now()
  const due = all.filter(r => !r.mastered && r.box < 5 && r.nextReviewAt <= now)
  return {
    total: all.length,
    letterCount: all.filter(r => r.type === 'letter').length,
    wordCount: all.filter(r => r.type === 'word').length,
    unmasteredCount: all.filter(r => r.box < 5).length,
    masteredCount: all.filter(r => r.box >= 5).length,
    dueCount: due.length,
    top5: all.filter(r => r.box < 5).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5),
  }
}
