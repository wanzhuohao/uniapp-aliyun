// 题库加载：读 static/data/questions.json，按 type + unit 过滤
// 替代原支付宝云 db.collection('questions').where(...).get()
import questionsData from '../../static/data/questions.json'
import { assertAvailableLearningGrade } from '../common/gradeContext.js'

function makeId(q) {
  return `${q.type}_${q.char}_${q.unit}`
}

// 启动时一次性给每条题目生成稳定 _id（错题本 question_id 和 map key 用）
let _indexed = null
function ensureIndexed() {
  if (_indexed) return _indexed
  _indexed = questionsData.map(q => ({ ...q, _id: makeId(q) }))
  return _indexed
}

// unit 可以是单个字符串或数组；返回命中数据，无匹配返回 null（与原 cloudDb 行为一致）
export function getQuestions(grade, type, unit) {
  assertAvailableLearningGrade(grade)
  const all = ensureIndexed()
  const units = Array.isArray(unit) ? unit : [unit]
  const set = new Set(units)
  const list = all.filter(q => q.type === type && set.has(q.unit)).map(q => ({ ...q, grade }))
  return list.length > 0 ? list : null
}
