// 错题本：Leitner 5 级间隔复习，localStorage 版
// box 1-5 间隔（天）：1/1/3/7/15
const BOX_INTERVALS_DAYS = [1, 1, 3, 7, 15]
const DAY_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'chinese_mistakes'

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

function effectiveNextReviewAt(record, now = Date.now()) {
  if (record.nextReviewAt != null) return record.nextReviewAt
  if (record.mastered && record.box == null) return now + 15 * DAY_MS
  return 0
}

function effectiveBox(record) {
  if (record.box != null) return clampBox(record.box)
  if (record.mastered) return 5
  return 1
}

// 记录一次错题。question_id 建议传 questionLoader 生成的稳定 _id
export function recordWrong({ type, char, unit, question_id, qType }) {
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
      char,
      unit,
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

// 重练答对：box+1，次复习时间推后；box=5 视为 mastered
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

// 重练答错：box 回到 1，wrongCount+1，次日再练
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
  return all.filter(r => effectiveNextReviewAt(r, now) <= now)
}

export function getUnmasteredList(type) {
  const all = getAllWrongList(type)
  return all.filter(r => effectiveBox(r) < 5)
}

export function getWrongStats() {
  const all = getAllWrongList()
  const now = Date.now()
  const due = all.filter(r => effectiveNextReviewAt(r, now) <= now)
  return {
    total: all.length,
    pinyinCount: all.filter(r => r.type === 'pinyin').length,
    hanziCount: all.filter(r => r.type === 'stroke' || r.type === 'hanzi').length,
    strokeCount: all.filter(r => r.type === 'stroke' || r.type === 'hanzi').length,
    unmasteredCount: all.filter(r => effectiveBox(r) < 5).length,
    masteredCount: all.filter(r => effectiveBox(r) >= 5).length,
    dueCount: due.length,
    pinyinDue: due.filter(r => r.type === 'pinyin').length,
    hanziDue: due.filter(r => r.type === 'stroke' || r.type === 'hanzi').length,
    top5: all.filter(r => effectiveBox(r) < 5).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5),
  }
}
