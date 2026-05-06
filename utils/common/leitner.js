// Leitner 5 级间隔复习核心：调用方传 storageKey，返回一组方法。
// 各学科 schema 字段由调用方在 recordWrong 时透传（type/char/word/...），算法不感知。
const BOX_INTERVALS_DAYS = [1, 1, 3, 7, 15]
const DAY_MS = 24 * 60 * 60 * 1000

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

export function createLeitner({ storageKey }) {
  function loadAll() {
    try {
      const raw = uni.getStorageSync(storageKey)
      if (Array.isArray(raw)) return raw
      return []
    } catch (e) {
      return []
    }
  }

  function saveAll(list) {
    uni.setStorageSync(storageKey, list)
  }

  // 记录新错题或加重已有错题。schema 字段（type/char/word/...）由调用方任意透传。
  function recordWrong(payload) {
    const { question_id, qType, ...rest } = payload
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
        ...rest,
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

  function recordCorrect(recordId, currentBox, currentCorrectCount) {
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

  function recordWrongAgain(recordId, currentBox, currentWrongCount) {
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

  function getAllWrongList(type) {
    const all = loadAll()
    const filtered = type ? all.filter(r => r.type === type) : all
    return filtered.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
  }

  function getDueList(type) {
    const all = getAllWrongList(type)
    const now = Date.now()
    return all.filter(r => r.nextReviewAt <= now)
  }

  return { loadAll, recordWrong, recordCorrect, recordWrongAgain, getAllWrongList, getDueList }
}
