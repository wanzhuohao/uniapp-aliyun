export { shuffle, sampleWithout } from '../common/random.js'

// 汉字题干扰项生成 — 共享逻辑，避免 hanzi.vue 和 mistakes-practice.vue 重复

export const ALL_STRUCTURES = ['上下', '左右', '独体', '半包围', '全包围']

/**
 * 生成部首题选项
 * @param {string} correct - 正确部首
 * @param {string[]} allRadicals - 所有可用部首
 * @returns {object[]} options
 */
export function buildRadicalOptions(correct, allRadicals) {
  const distractors = sampleWithout(allRadicals.filter(r => r !== correct), 3)
  return [
    { label: correct, isCorrect: true },
    ...distractors.map(d => ({ label: d, isCorrect: false }))
  ]
}

/**
 * 生成结构题选项
 * @param {string} correct - 正确结构
 * @returns {object[]} options
 */
export function buildStructureOptions(correct) {
  const distractors = ALL_STRUCTURES.filter(s => s !== correct).slice(0, 3)
  return [
    { label: correct, isCorrect: true },
    ...distractors.map(d => ({ label: d, isCorrect: false }))
  ]
}

/**
 * 生成笔画数题选项
 * @param {number} correct - 正确笔画数
 * @returns {object[]} options
 */
export function buildStrokeCountOptions(correct) {
  const candidates = [correct - 2, correct - 1, correct + 1, correct + 2, correct + 3]
  const distractors = candidates.filter(n => n > 0 && n !== correct)
  return [
    { label: correct + ' 画', isCorrect: true },
    ...distractors.slice(0, 3).map(d => ({ label: d + ' 画', isCorrect: false }))
  ]
}
