// 加载英语题库，生成稳定 id：letter_{UPPER} 或 word_{theme}_{word}
import wordsData from '../../static/data/english/words.json'
import lettersData from '../../static/data/english/letters.json'

export function getLetters() {
  return lettersData.map(l => ({ ...l, _id: `letter_${l.upper}` }))
}

export function getWordsByTheme(themes) {
  const list = Array.isArray(themes) ? themes : [themes]
  const out = []
  for (const t of list) {
    const items = wordsData[t] || []
    for (const it of items) {
      out.push({ ...it, theme: t, _id: `word_${t}_${it.word}` })
    }
  }
  return out
}

// 所有主题的扁平列表（用于生成干扰项）
export function getAllWords() {
  const out = []
  for (const t of Object.keys(wordsData)) {
    for (const it of wordsData[t]) {
      out.push({ ...it, theme: t, _id: `word_${t}_${it.word}` })
    }
  }
  return out
}
