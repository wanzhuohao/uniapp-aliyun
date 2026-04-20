// 单元-课程配置
export const UNIT_CONFIG = {
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

export const UNIT_KEYS = Object.keys(UNIT_CONFIG)

export function getLessonKeys(unitKey) {
  return (UNIT_CONFIG[unitKey]?.lessons || []).map(l => l.key)
}
