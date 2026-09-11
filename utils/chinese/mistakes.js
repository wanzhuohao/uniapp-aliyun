// 语文错题本：复用 common/leitner，仅增加 getWrongStats 学科特异统计
import { createLeitner } from '../common/leitner.js'
import { STORAGE_KEYS } from '../common/storageRegistry.js'

const leitner = createLeitner({ storageKey: STORAGE_KEYS.chineseMistakes })

export const recordCorrect = leitner.recordCorrect
export const recordWrongAgain = leitner.recordWrongAgain
export const getAllWrongList = leitner.getAllWrongList
export const getDueList = leitner.getDueList

export function recordWrong({ grade, type, char, unit, question_id, qType }) {
  return leitner.recordWrong({ grade, type, char, unit, question_id, qType })
}

export function getWrongStats(grade) {
  const all = getAllWrongList(grade)
  const now = Date.now()
  const due = all.filter(r => !r.mastered && r.box < 5 && r.nextReviewAt <= now)
  return {
    total: all.length,
    pinyinCount: all.filter(r => r.type === 'pinyin').length,
    hanziCount: all.filter(r => r.type === 'hanzi').length,
    unmasteredCount: all.filter(r => r.box < 5).length,
    masteredCount: all.filter(r => r.box >= 5).length,
    dueCount: due.length,
    pinyinDue: due.filter(r => r.type === 'pinyin').length,
    hanziDue: due.filter(r => r.type === 'hanzi').length,
    top5: all.filter(r => r.box < 5).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5),
  }
}
