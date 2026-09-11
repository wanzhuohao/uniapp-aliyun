// 中文用浏览器原生 TTS；英文只用有道词典公开 TTS mp3（type=2 美式女声）
let cachedVoices = []
let primed = false
let enAudio = null
let enFinish = null

function cleanupEnAudio(audio) {
  if (!audio) return
  audio.onended = null
  audio.onerror = null
  try { audio.pause() } catch (e) {}
  try { audio.removeAttribute('src'); audio.load() } catch (e) {}
}

export function stopEnSpeech() {
  if (enFinish) {
    enFinish()
    return
  }
  if (enAudio) {
    cleanupEnAudio(enAudio)
    enAudio = null
  }
}

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const vs = window.speechSynthesis.getVoices()
  if (vs && vs.length) cachedVoices = vs
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

// 在用户手势里同步调用一次，解锁 iOS/Safari 的 TTS 和 Audio
export function primeSpeech() {
  if (primed) return
  if (typeof window === 'undefined') return
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
    }
  } catch (e) {}
  try {
    const a = new Audio()
    a.muted = true
    a.play().catch(() => {})
  } catch (e) {}
  primed = true
}

function speakWith(text, { lang, rate, pitch, voiceLangPrefix }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (!text) return
  try { window.speechSynthesis.resume() } catch (e) {}
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = rate
  utterance.pitch = pitch
  if (!cachedVoices.length) loadVoices()
  const v = cachedVoices.find(x => (x.lang || '').toLowerCase().startsWith(voiceLangPrefix))
  if (v) utterance.voice = v
  window.speechSynthesis.speak(utterance)
}

export function speak(text) {
  speakWith(text, { lang: 'zh-CN', rate: 0.8, pitch: 1.1, voiceLangPrefix: 'zh' })
}

// 英语只走有道 TTS type=2（美式女声）；失败就静音，不回退 SpeechSynthesis（手机系统默认可能是男声）
// 返回 Promise：播完 / 失败 / 被打断 / 超时 都会 resolve（不 reject，避免卡流程）
// Why timeout: audio 可能因网络慢 / 浏览器静默阻止自动播放而永不触发 onended/onerror，
//              没有兜底会让调用方的 Promise.all 永远挂起，导致下一题进不去。
export function speakEn(text) {
  if (!text || typeof window === 'undefined') return Promise.resolve()
  const word = String(text).trim()
  if (!word) return Promise.resolve()
  stopEnSpeech()
  return new Promise((resolve) => {
    let settled = false
    let timer = null
    let currentAudio = null
    const finish = () => {
      if (settled) return
      settled = true
      if (timer) { clearTimeout(timer); timer = null }
      if (currentAudio === enAudio) {
        cleanupEnAudio(currentAudio)
        enAudio = null
      }
      if (enFinish === finish) enFinish = null
      resolve()
    }
    try {
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
      enAudio = new Audio(url)
      currentAudio = enAudio
      enFinish = finish
      const done = () => {
        if (currentAudio !== enAudio) return
        finish()
      }
      enAudio.onended = done
      enAudio.onerror = done
      // 兜底：最多等 4 秒，够正常单词发音（1~2 秒）；网络慢 / 静默失败也会放行
      timer = setTimeout(finish, 4000)
      const p = enAudio.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => done())
      }
    } catch (e) {
      finish()
    }
  })
}
