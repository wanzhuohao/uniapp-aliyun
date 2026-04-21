// 中文用浏览器原生 TTS；英文只用有道词典公开 TTS mp3（type=2 美式女声）
let speaking = false
let cachedVoices = []
let primed = false
let enAudio = null

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
  speaking = true
  utterance.onend = () => { speaking = false }
  utterance.onerror = () => { speaking = false }
  window.speechSynthesis.speak(utterance)
}

export function speak(text) {
  speakWith(text, { lang: 'zh-CN', rate: 0.8, pitch: 1.1, voiceLangPrefix: 'zh' })
}

// 英语只走有道 TTS type=2（美式女声）；失败就静音，不回退 SpeechSynthesis（手机系统默认可能是男声）
export function speakEn(text) {
  if (!text || typeof window === 'undefined') return
  const word = String(text).trim()
  if (!word) return
  try {
    if (enAudio) {
      enAudio.onended = null
      enAudio.onerror = null
      try { enAudio.pause() } catch (e) {}
      try { enAudio.removeAttribute('src'); enAudio.load() } catch (e) {}
    }
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
    enAudio = new Audio(url)
    const currentAudio = enAudio
    speaking = true
    enAudio.onended = () => { if (currentAudio === enAudio) speaking = false }
    enAudio.onerror = () => { if (currentAudio === enAudio) speaking = false }
    const p = enAudio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => { if (currentAudio === enAudio) speaking = false })
    }
  } catch (e) {
    speaking = false
  }
}

export function isSpeaking() {
  return speaking
}
