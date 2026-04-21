// 英语错题本：Leitner 5 级
const BOX_INTERVALS_DAYS = [1, 1, 3, 7, 15]
const DAY_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'english_mistakes'

function loadAll() {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (Array.isArray(raw)) return raw
    return []
  } catch (e) {
    return []
  }
}

function saveAll(list) {
  uni.setStorageSync(STORAGE_KEY, list)
}

function clampBox(b) {
  const n = Number(b ?? 1)
  if (!Number.isFinite(n) || n < 1) return 1
  if (n > 5) return 5
  return Math.floor(n)
}

function nextReviewFromBox(box) {
  const idx = clampBox(box) - 1
  return Date.now() + BOX_INTERVALS_DAYS[idx] * DAY_MS
}

export function recordWrong({ type, word, theme, emoji, zh, question_id, qType }) {
  const all = loadAll()
  const idx = all.findIndex(r => r.question_id === question_id)
  if (idx >= 0) {
    const old = all[idx]
    all[idx] = {
      ...old,
      wrongCount: (old.wrongCount || 0) + 1,
      correctCount: 0,
      box: 1,
      nextReviewAt: nextReviewFromBox(1),
      mastered: false,
      lastWrongAt: Date.now(),
      ...(qType ? { qType } : {}),
    }
  } else {
    all.push({
      _id: question_id,
      question_id,
      type,
      word,
      theme,
      emoji,
      zh,
      wrongCount: 1,
      correctCount: 0,
      box: 1,
      nextReviewAt: nextReviewFromBox(1),
      mastered: false,
      lastWrongAt: Date.now(),
      createdAt: Date.now(),
      ...(qType ? { qType } : {}),
    })
  }
  saveAll(all)
}

export function recordCorrect(recordId, currentBox, currentCorrectCount) {
  const all = loadAll()
  const idx = all.findIndex(r => r._id === recordId)
  if (idx < 0) {
    return { mastered: false, box: clampBox(currentBox), nextReviewAt: null, correctCount: currentCorrectCount }
  }
  const box = clampBox(currentBox)
  const newBox = Math.min(box + 1, 5)
  const nextReviewAt = nextReviewFromBox(newBox)
  const newCorrectCount = (currentCorrectCount || 0) + 1
  const mastered = newBox >= 5
  all[idx] = { ...all[idx], box: newBox, nextReviewAt, correctCount: newCorrectCount, mastered }
  saveAll(all)
  return { mastered, box: newBox, nextReviewAt, correctCount: newCorrectCount }
}

export function recordWrongAgain(recordId, currentBox, currentWrongCount) {
  const all = loadAll()
  const idx = all.findIndex(r => r._id === recordId)
  if (idx < 0) return
  all[idx] = {
    ...all[idx],
    box: 1,
    nextReviewAt: nextReviewFromBox(1),
    wrongCount: (currentWrongCount || 0) + 1,
    correctCount: 0,
    mastered: false,
    lastWrongAt: Date.now(),
  }
  saveAll(all)
}

export function getAllWrongList(type) {
  const all = loadAll()
  const filtered = type ? all.filter(r => r.type === type) : all
  return filtered.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
}

export function getDueList(type) {
  const all = getAllWrongList(type)
  const now = Date.now()
  return all.filter(r => r.nextReviewAt <= now)
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
