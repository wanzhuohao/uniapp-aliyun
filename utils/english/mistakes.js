// 英语错题本：复用 common/leitner，仅增加 getWrongStats 学科特异统计
import { createLeitner } from '../common/leitner.js'

const leitner = createLeitner({ storageKey: 'english_mistakes' })

export const recordCorrect = leitner.recordCorrect
export const recordWrongAgain = leitner.recordWrongAgain
export const getAllWrongList = leitner.getAllWrongList
export const getDueList = leitner.getDueList

export function recordWrong({ type, word, theme, emoji, zh, question_id, qType }) {
  leitner.recordWrong({ type, word, theme, emoji, zh, question_id, qType })
}

export function getWrongStats() {
  const all = getAllWrongList()
  const now = Date.now()
  const due = all.filter(r => r.nextReviewAt <= now)
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
