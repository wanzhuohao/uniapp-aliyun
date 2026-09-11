import { assertAvailableLearningGrade } from './gradeContext.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function localDateString(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfLocalDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function validCounts(total, correct) {
  return Number.isInteger(total) && total >= 0 && Number.isInteger(correct) && correct >= 0 && correct <= total
}

function aggregatePractice(logs, grade, allowedTypes, getDate, getCounts) {
  const byDate = new Map()
  for (const log of Array.isArray(logs) ? logs : []) {
    if (!log || log.grade !== grade || (allowedTypes && !allowedTypes.has(log.type))) continue
    const date = getDate(log)
    const { total, correct } = getCounts(log)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !validCounts(total, correct)) continue
    const current = byDate.get(date) || { total: 0, correct: 0 }
    current.total += total
    current.correct += correct
    byDate.set(date, current)
  }
  return byDate
}

function mergeDay(target, subject, values) {
  target.subjects[subject] = values
  target.total += values.total
  target.correct += values.correct
}

export function getLocalWeekId(now = new Date()) {
  const date = startOfLocalDay(now)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return localDateString(date)
}

export function buildLearningDashboard(input, now = new Date()) {
  const grade = assertAvailableLearningGrade(input?.grade)
  const today = startOfLocalDay(now)
  const chinese = aggregatePractice(input.chineseLogs, grade, null, log => log.date, log => ({ total: log.totalCount, correct: log.correctCount }))
  const english = aggregatePractice(input.englishLogs, grade, null, log => log.date, log => ({ total: log.totalCount, correct: log.correctCount }))
  const math = aggregatePractice(
    input.mathHistory,
    grade,
    new Set(['online', 'focus', 'paper']),
    log => localDateString(log.createdAt),
    log => ({ total: log.total, correct: log.correct })
  )
  const days = []
  for (let index = 6; index >= 0; index--) {
    const date = new Date(today)
    date.setDate(today.getDate() - index)
    const key = localDateString(date)
    const row = { date: key, label: `${date.getMonth() + 1}/${date.getDate()}`, total: 0, correct: 0, accuracy: null, subjects: {} }
    for (const [subject, map] of [['chinese', chinese], ['math', math], ['english', english]]) {
      const value = map.get(key) || { total: 0, correct: 0 }
      mergeDay(row, subject, { ...value, accuracy: value.total ? value.correct / value.total : null })
    }
    row.accuracy = row.total ? row.correct / row.total : null
    days.push(row)
  }
  const dueCount = ['chineseDue', 'mathDue', 'englishDue']
    .map(key => Array.isArray(input[key]) ? input[key].filter(item => item?.grade === grade && item?.resolvable !== false).length : 0)
    .reduce((sum, value) => sum + value, 0)
  const activeDates = new Set([...chinese.keys(), ...math.keys(), ...english.keys()].filter(key => {
    const total = (chinese.get(key)?.total || 0) + (math.get(key)?.total || 0) + (english.get(key)?.total || 0)
    return total > 0
  }))
  const latest = [...activeDates].sort().at(-1) || null
  const todayKey = localDateString(today)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = localDateString(yesterday)
  let streak = 0
  if (latest === todayKey || latest === yesterdayKey) {
    const cursor = new Date(latest + 'T00:00:00')
    while (activeDates.has(localDateString(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }
  const todayRow = days.at(-1)
  const weekId = getLocalWeekId(today)
  const weekCorrect = days.filter(day => day.date >= weekId).reduce((sum, day) => sum + day.correct, 0)
  const goalBucket = input.goal?.schemaVersion === 2 ? input.goal.byGrade?.[grade] : input.goal
  const challengeBucket = input.challenge?.schemaVersion === 2 ? input.challenge.byGrade?.[grade] : input.challenge
  const goal = Number.isInteger(goalBucket?.dailyTarget) && goalBucket.dailyTarget >= 10 && goalBucket.dailyTarget <= 200
    ? goalBucket.dailyTarget : 20
  const priorBadge = challengeBucket?.badges?.[weekId] || null
  const achieved = weekCorrect >= 100
  const challenge = {
    weekId,
    target: 100,
    correct: weekCorrect,
    achieved,
    badgeAt: achieved ? (priorBadge?.earnedAt || now.toISOString()) : null,
    badgeEarnedNow: achieved && !priorBadge,
  }
  return {
    today: todayRow,
    days,
    dueCount,
    goal: { dailyTarget: goal, completed: todayRow.total, progress: Math.min(todayRow.total / goal, 1) },
    streak: { days: streak, latestDate: latest, broken: !!latest && latest < yesterdayKey, todayPending: latest === yesterdayKey },
    challenge,
    empty: days.every(day => day.total === 0),
  }
}

export function calculateSubjectWeakness({ total, correct, dueCount }) {
  const accuracyPercent = total > 0 ? (correct / total) * 100 : 50
  return 100 - accuracyPercent + Math.min(Math.max(Number(dueCount) || 0, 0), 20) * 5
}

export function sevenDayStart(now = new Date()) {
  return startOfLocalDay(now).getTime() - 6 * DAY_MS
}
