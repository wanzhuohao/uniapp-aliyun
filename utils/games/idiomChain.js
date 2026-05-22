// 成语接龙核心：词库加载 + 索引 + 判分 + AI 选词 + 提示
// 词库格式: [{ w: '一帆风顺', p: 'yi fan feng shun' }] —— 拼音已去声调

let _dict = null
let _indexByFirstChar = null     // Map<首字, idiom[]>
let _indexByFirstPinyin = null   // Map<首字拼音, idiom[]>
let _indexByWord = null          // Map<word, idiom>

// 评分规则
export const SCORE = {
  SAME_CHAR_SAME_PINYIN: 2,  // 同字同音
  SAME_PINYIN_ONLY: 1,       // 仅同音
  SAME_CHAR_ONLY: 1,         // 仅同字（多音字）
  OPPONENT_GIVEUP: 10,       // 让对手接不上
  HINT_COST: 5               // 用一次提示
}

export const REASON = {
  SAME_CHAR_SAME_PINYIN: '同字同音',
  SAME_PINYIN_ONLY: '同音不同字',
  SAME_CHAR_ONLY: '同字不同音',
  MISMATCH: '不接',
  NOT_IN_DICT: '词库里没有这个成语',
  DUPLICATED: '本局已经用过'
}

// 取首/末字
function firstChar(idiom) { return idiom.w[0] }
function lastChar(idiom) { return idiom.w[idiom.w.length - 1] }
function firstPinyin(idiom) {
  const s = idiom.p.split(' ')
  return s[0]
}
function lastPinyin(idiom) {
  const s = idiom.p.split(' ')
  return s[s.length - 1]
}

// 加载并建索引；多次调用只加载一次。
// 用 dynamic import 让 Vite/Webpack 把词库分到独立 chunk，进游戏页才加载，
// 不污染首屏（其他模块用 static import 会被打包到主 bundle，1MB+ 会显著拖慢）。
// 加载两份：成语库 + 常见四字词语补充库（AABB 叠词、祝福语等孩子日常能接触的）
export async function loadIdioms() {
  if (_dict) return _dict
  const [idiomMod, phraseMod] = await Promise.all([
    import('../../static/data/games/idioms.json'),
    import('../../static/data/games/common-phrases.json')
  ])
  const idioms = idiomMod.default || idiomMod
  const phrases = phraseMod.default || phraseMod
  if (!Array.isArray(idioms)) throw new Error('成语库格式错误')
  // phrases 已与 idioms 做过 build-time 去重，直接 concat
  _dict = Array.isArray(phrases) ? idioms.concat(phrases) : idioms
  _indexByFirstChar = new Map()
  _indexByFirstPinyin = new Map()
  _indexByWord = new Map()
  for (const it of _dict) {
    _indexByWord.set(it.w, it)
    const fc = firstChar(it)
    if (!_indexByFirstChar.has(fc)) _indexByFirstChar.set(fc, [])
    _indexByFirstChar.get(fc).push(it)
    const fp = firstPinyin(it)
    if (!_indexByFirstPinyin.has(fp)) _indexByFirstPinyin.set(fp, [])
    _indexByFirstPinyin.get(fp).push(it)
  }
  return _dict
}

// 查词
export function lookup(word) {
  return _indexByWord ? _indexByWord.get(word) : null
}

// 随机开局成语：4 字、首字非冷僻、随机抽
export function pickOpening(used = new Set()) {
  if (!_dict) return null
  // 限定 4 字成语，更"接龙友好"
  const pool = _dict.filter(it => it.w.length === 4 && !used.has(it.w))
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// 判定玩家这一手分数
// prev: 上一个成语对象；curWord: 玩家输入的成语字符串
// used: 已使用 Set<string>
// 返回 { ok, score, reason, idiom? }
export function judge(prev, curWord, used) {
  const cur = lookup(curWord)
  if (!cur) return { ok: false, score: 0, reason: REASON.NOT_IN_DICT }
  if (used.has(curWord)) return { ok: false, score: 0, reason: REASON.DUPLICATED }
  // 开局（prev=null）：合法即可，0 分（开局是 AI 出的，这里走不到；保留兜底）
  if (!prev) return { ok: true, score: 0, reason: '开局', idiom: cur }

  const prevLastC = lastChar(prev)
  const prevLastP = lastPinyin(prev)
  const curFirstC = firstChar(cur)
  const curFirstP = firstPinyin(cur)

  const sameChar = prevLastC === curFirstC
  const samePinyin = prevLastP === curFirstP

  if (sameChar && samePinyin) {
    return { ok: true, score: SCORE.SAME_CHAR_SAME_PINYIN, reason: REASON.SAME_CHAR_SAME_PINYIN, idiom: cur }
  }
  if (samePinyin) {
    return { ok: true, score: SCORE.SAME_PINYIN_ONLY, reason: REASON.SAME_PINYIN_ONLY, idiom: cur }
  }
  if (sameChar) {
    return { ok: true, score: SCORE.SAME_CHAR_ONLY, reason: REASON.SAME_CHAR_ONLY, idiom: cur }
  }
  return { ok: false, score: 0, reason: REASON.MISMATCH }
}

// AI 选词：给定 prev 和 used，返回 idiom 或 null（接不上）
// 策略：优先同字同音；再退而求其次同音/同字；都没有则认输
export function aiPick(prev, used) {
  if (!prev) return null
  const targetChar = lastChar(prev)
  const targetPinyin = lastPinyin(prev)

  const byChar = (_indexByFirstChar.get(targetChar) || []).filter(it => !used.has(it.w))
  const byPinyin = (_indexByFirstPinyin.get(targetPinyin) || []).filter(it => !used.has(it.w))

  // 优先同字同音（既在 byChar 又在 byPinyin）
  const both = byChar.filter(it => firstPinyin(it) === targetPinyin)
  if (both.length) return both[Math.floor(Math.random() * both.length)]
  // 退而求其次：union(byChar, byPinyin)，去重
  const pool = new Map()
  for (const it of byChar) pool.set(it.w, it)
  for (const it of byPinyin) pool.set(it.w, it)
  const arr = [...pool.values()]
  if (!arr.length) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// 提示：给玩家一个可接的成语（优先同字同音，再退而求其次）
export function hint(prev, used) {
  return aiPick(prev, used)
}

// 调试：词库大小
export function dictSize() {
  return _dict ? _dict.length : 0
}
