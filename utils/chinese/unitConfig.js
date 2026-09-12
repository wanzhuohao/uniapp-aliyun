// 单元-课程配置
const UNIT_CONFIG = {
  '2-1': {
    label: '第一单元',
    lessons: [
      { key: '2-1-1', label: '识字1' },
      { key: '2-1-2', label: '识字2' },
      { key: '2-1-3', label: '识字3' },
      { key: '2-1-4', label: '识字4' },
      { key: '2-1-0', label: '语文园地' },
    ]
  },
  '2-2': {
    label: '第二单元',
    lessons: [
      { key: '2-2-1', label: '阅读1' },
      { key: '2-2-2', label: '阅读2' },
      { key: '2-2-3', label: '阅读3' },
      { key: '2-2-0', label: '语文园地' },
    ]
  },
  '2-3': {
    label: '第三单元',
    lessons: [
      { key: '2-3-4', label: '阅读4' },
      { key: '2-3-5', label: '阅读5' },
      { key: '2-3-6', label: '阅读6' },
      { key: '2-3-0', label: '语文园地' },
    ]
  },
  '2-4': {
    label: '第四单元',
    lessons: [
      { key: '2-4-7', label: '阅读7' },
      { key: '2-4-8', label: '阅读8' },
      { key: '2-4-9', label: '阅读9' },
      { key: '2-4-0', label: '语文园地' },
    ]
  },
  '2-5': {
    label: '第五单元',
    lessons: [
      { key: '2-5-5', label: '识字5' },
      { key: '2-5-6', label: '识字6' },
      { key: '2-5-7', label: '识字7' },
      { key: '2-5-8', label: '识字8' },
      { key: '2-5-0', label: '语文园地' },
    ]
  },
  '2-6': {
    label: '第六单元',
    lessons: [
      { key: '2-6-10', label: '阅读10' },
      { key: '2-6-11', label: '阅读11' },
      { key: '2-6-12', label: '阅读12' },
      { key: '2-6-13', label: '阅读13' },
      { key: '2-6-0', label: '语文园地' },
    ]
  },
  '2-7': {
    label: '第七单元',
    lessons: [
      { key: '2-7-14', label: '阅读14' },
      { key: '2-7-15', label: '阅读15' },
      { key: '2-7-16', label: '阅读16' },
      { key: '2-7-17', label: '阅读17' },
      { key: '2-7-0', label: '语文园地' },
    ]
  },
  '2-8': {
    label: '第八单元',
    lessons: [
      { key: '2-8-18', label: '阅读18' },
      { key: '2-8-19', label: '阅读19' },
      { key: '2-8-20', label: '阅读20' },
      { key: '2-8-0', label: '语文园地' },
    ]
  },
}

// 二年级上（grade2-term1）预留单元骨架：单元名先占位，课程只放一个「待补充」项，
// 进单元出题为空即提示“该学期语文题库待补充”。等数据到位后再填充真实课程。
const UNIT_ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八']
const GRADE2_UNIT_CONFIG = Object.fromEntries(
  UNIT_ORDINALS.map((ord, idx) => {
    const unitKey = `3-${idx + 1}`
    return [unitKey, {
      label: `第${ord}单元`,
      lessons: [{ key: `${unitKey}-0`, label: '待补充' }],
    }]
  })
)

// 学期 → 单元配置映射。value 用 gradeContext 的学期标识（grade1-term2 / grade2-term1）。
// 一年级下（grade1-term2）沿用原有 UNIT_CONFIG（前缀 2），二年级上（grade2-term1）用占位骨架（前缀 3）。
export const SEMESTER_UNIT_CONFIGS = {
  'grade1-term2': UNIT_CONFIG,
  'grade2-term1': GRADE2_UNIT_CONFIG,
}

export const UNIT_KEYS = Object.keys(UNIT_CONFIG)

export function getLessonKeys(unitKey) {
  return (UNIT_CONFIG[unitKey]?.lessons || []).map(l => l.key)
}

// 按学期取单元配置文件：未知学期回退到一年级下，保证历史调用兼容。
export function getSemesterUnitConfig(grade) {
  return SEMESTER_UNIT_CONFIGS[grade] || UNIT_CONFIG
}

export function getSemesterUnitKeys(grade) {
  return Object.keys(getSemesterUnitConfig(grade))
}

export function getSemesterLessonKeys(grade, unit) {
  return (getSemesterUnitConfig(grade)[unit]?.lessons || []).map(l => l.key)
}