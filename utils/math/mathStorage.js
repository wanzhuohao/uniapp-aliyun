import { toast } from '../common/toast.js'

const MAX_RECORDS = 50
const STORAGE_KEY = 'math_history'
const WRONG_KEY = 'math_wrong_book'

// ====== 历史记录 ======
export function getHistory() {
  try {
    return JSON.parse(uni.getStorageSync(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function saveRecord(record) {
  try {
    const list = getHistory()
    record.id = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    record.createdAt = new Date().toISOString()
    list.unshift(record)
    if (list.length > MAX_RECORDS) list.length = MAX_RECORDS
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('保存数学记录失败', e)
    toast.error('保存记录失败')
  }
}

// ====== 错题本 (Leitner 盒子系统) ======
// 间隔天数: box1=1天, box2=1天, box3=3天, box4=7天, box5=15天
const BOX_INTERVALS = [1, 1, 3, 7, 15]
const DAY_MS = 86400000

function getWrongBook() {
  try {
    return JSON.parse(uni.getStorageSync(WRONG_KEY) || '[]')
  } catch { return [] }
}

function saveWrongBook(list) {
  uni.setStorageSync(WRONG_KEY, JSON.stringify(list))
}

function clampBox(b) {
  const n = Number(b ?? 1)
  return Math.max(1, Math.min(5, Math.floor(n) || 1))
}

function nextReviewAt(box) {
  return Date.now() + BOX_INTERVALS[clampBox(box) - 1] * DAY_MS
}

// 记录错题（答题后调用）
// key = 算式表达式（如 "3 + 5"），用于去重
export function recordWrong({ expr, answer, type }) {
  const list = getWrongBook()
  const existing = list.find(r => r.expr === expr)
  if (existing) {
    existing.wrongCount = (existing.wrongCount || 0) + 1
    existing.correctCount = 0
    existing.box = 1
    existing.nextReviewAt = nextReviewAt(1)
    existing.mastered = false
    existing.lastWrongAt = Date.now()
  } else {
    list.push({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      expr, answer, type,
      wrongCount: 1,
      correctCount: 0,
      box: 1,
      nextReviewAt: nextReviewAt(1),
      mastered: false,
      lastWrongAt: Date.now(),
      createdAt: Date.now(),
    })
  }
  // 上限300条，超了删最早已掌握的
  if (list.length > 300) {
    const masteredIdx = list.findIndex(r => r.mastered)
    if (masteredIdx >= 0) list.splice(masteredIdx, 1)
    else list.pop()
  }
  saveWrongBook(list)
}

// 重练答对: box+1, 推迟复习
export function recordCorrect(id) {
  const list = getWrongBook()
  const item = list.find(r => r.id === id)
  if (!item) return { mastered: false }
  item.box = Math.min(clampBox(item.box) + 1, 5)
  item.correctCount = (item.correctCount || 0) + 1
  item.nextReviewAt = nextReviewAt(item.box)
  item.mastered = item.box >= 5
  saveWrongBook(list)
  return { mastered: item.mastered }
}

// 重练答错: box回1, wrongCount+1
export function recordWrongAgain(id) {
  const list = getWrongBook()
  const item = list.find(r => r.id === id)
  if (!item) return
  item.box = 1
  item.wrongCount = (item.wrongCount || 0) + 1
  item.correctCount = 0
  item.nextReviewAt = nextReviewAt(1)
  item.mastered = false
  item.lastWrongAt = Date.now()
  saveWrongBook(list)
}

// 获取全部错题
export function getAllWrong() {
  return getWrongBook().sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
}

// 获取今日待复习
export function getDueList() {
  const now = Date.now()
  return getWrongBook()
    .filter(r => !r.mastered && (r.nextReviewAt || 0) <= now)
    .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
}

// 统计
export function getWrongStats() {
  const all = getWrongBook()
  const now = Date.now()
  const unmastered = all.filter(r => !r.mastered)
  const due = all.filter(r => !r.mastered && (r.nextReviewAt || 0) <= now)
  return {
    total: all.length,
    unmasteredCount: unmastered.length,
    masteredCount: all.length - unmastered.length,
    dueCount: due.length,
    top5: unmastered.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0)).slice(0, 5),
  }
}
