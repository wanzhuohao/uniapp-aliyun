// 中文用浏览器原生 TTS；英文用有道词典公开 TTS mp3 接口（稳定 + 音质好）
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

// 英语用有道 TTS：type=2 是美式发音
// 如果 mp3 播放失败（网络/跨域），回退到浏览器原生 TTS
export function speakEn(text) {
  if (!text || typeof window === 'undefined') return
  const word = String(text).trim()
  if (!word) return
  try {
    if (enAudio) {
      enAudio.pause()
      enAudio.src = ''
    }
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
    enAudio = new Audio(url)
    speaking = true
    enAudio.onended = () => { speaking = false }
    enAudio.onerror = () => {
      speaking = false
      speakWith(word, { lang: 'en-US', rate: 0.75, pitch: 1.0, voiceLangPrefix: 'en' })
    }
    const p = enAudio.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        speaking = false
        speakWith(word, { lang: 'en-US', rate: 0.75, pitch: 1.0, voiceLangPrefix: 'en' })
      })
    }
  } catch (e) {
    speakWith(word, { lang: 'en-US', rate: 0.75, pitch: 1.0, voiceLangPrefix: 'en' })
  }
}

export function isSpeaking() {
  return speaking
}
