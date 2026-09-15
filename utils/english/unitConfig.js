// 英语单元-课程配置（按学期/年级组织）
// 1-2 年级沿用启蒙英语（主题式单词），本配置服务 3 年级及以后的"按单元/课文"模式。
// 目前课文与单词未录入，单元仅为空白骨架，待课文内容就位后在此填充真实课程。

const UNIT_ORDINALS = ['一', '二', '三', '四', '五', '六', '七', '八']

function buildPlaceholderUnits(unitCount = 8) {
  return Object.fromEntries(
    UNIT_ORDINALS.slice(0, unitCount).map((ord, idx) => {
      const unitKey = `${idx + 1}`
      return [unitKey, {
        label: `第${ord}单元`,
        lessons: [{ key: `${unitKey}-0`, label: '待补充' }],
      }]
    })
  )
}

// 三年级及以后各学期：第 1~8 单元空白骨架
export const SEMESTER_ENGLISH_UNIT_CONFIGS = {
  'grade3-term1': buildPlaceholderUnits(8),
  'grade3-term2': buildPlaceholderUnits(8),
  'grade4-term1': buildPlaceholderUnits(8),
  'grade4-term2': buildPlaceholderUnits(8),
  'grade5-term1': buildPlaceholderUnits(8),
  'grade5-term2': buildPlaceholderUnits(8),
  'grade6-term1': buildPlaceholderUnits(8),
  'grade6-term2': buildPlaceholderUnits(8),
}

export function getEnglishUnitConfig(grade) {
  return SEMESTER_ENGLISH_UNIT_CONFIGS[grade] || null
}

export function getEnglishUnitKeys(grade) {
  const cfg = getEnglishUnitConfig(grade)
  return cfg ? Object.keys(cfg) : []
}

export function getEnglishLessonKeys(grade, unit) {
  return (getEnglishUnitConfig(grade)?.[unit]?.lessons || []).map(l => l.key)
}