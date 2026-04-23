<template>
  <view class="phonics-page">
    <PageHeader title="自然拼读" theme="english" />

    <!-- 顶部说明 -->
    <view class="intro">
      <text class="intro-title">Jolly Phonics 42 音</text>
      <text class="intro-sub">分 7 组，按顺序学最有效</text>
    </view>

    <!-- 组别 Tab -->
    <scroll-view class="group-tabs" scroll-x>
      <view
        v-for="g in phonics"
        :key="g.group"
        :class="['tab', activeGroup === g.group && 'tab-active']"
        @click="selectGroup(g.group)"
      >
        <text class="tab-num">{{ g.group }}</text>
        <text class="tab-name">{{ g.groupName }}</text>
      </view>
    </scroll-view>

    <view v-if="currentGroup" class="group-hint">{{ currentGroup.groupHint }}</view>

    <!-- 音卡片网格 -->
    <view v-if="currentGroup" class="sound-grid">
      <view
        v-for="(s, i) in currentGroup.sounds"
        :key="s.letters"
        :class="['sound-cell', activeIdx === i && 'sound-cell-active']"
        @click="selectSound(i)"
      >
        <text class="sound-letters">{{ s.letters }}</text>
        <text class="sound-ipa">{{ s.ipa }}</text>
      </view>
    </view>

    <!-- 详情卡 -->
    <view v-if="currentSound" class="detail">
      <view class="detail-big" @click="playSound(currentSound)">
        <text class="big-letters">{{ currentSound.letters }}</text>
        <text class="big-ipa">{{ currentSound.ipa }}</text>
        <text class="big-hint">🔊 点这里读音</text>
      </view>

      <view class="tip">
        <text class="tip-label">口诀</text>
        <text class="tip-text">{{ currentSound.tip }}</text>
      </view>

      <view class="examples">
        <text class="examples-label">例词跟读</text>
        <view class="example-row">
          <view
            v-for="word in currentSound.examples"
            :key="word"
            class="example-chip"
            @click="playWord(word)"
          >
            <text class="chip-icon">🔊</text>
            <text class="chip-word">{{ word }}</text>
          </view>
        </view>
      </view>

      <view class="actions">
        <view class="act-btn primary" @click="playAll">🔊 全部例词</view>
      </view>

      <view class="nav-actions">
        <view class="nav-btn" :class="{ disabled: activeIdx === 0 }" @click="prev">← 上一个</view>
        <view class="nav-btn" :class="{ disabled: activeIdx === currentGroup.sounds.length - 1 }" @click="next">下一个 →</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { speakEn, primeSpeech } from '../../utils/common/speech.js'
import phonicsData from '../../static/data/english/phonics.json'

const phonics = ref(phonicsData)
const activeGroup = ref(1)
const activeIdx = ref(0)

const currentGroup = computed(() => phonics.value.find(g => g.group === activeGroup.value) || null)
const currentSound = computed(() => currentGroup.value ? currentGroup.value.sounds[activeIdx.value] : null)

function selectGroup(g) {
  primeSpeech()
  activeGroup.value = g
  activeIdx.value = 0
}

function selectSound(i) {
  primeSpeech()
  activeIdx.value = i
  if (currentSound.value) playSound(currentSound.value)
}

// 本地 IPA 音素 mp3（Wikimedia Commons CC 录音），按 audioFiles 数组顺序播
// 双元音/复合音如 /eɪ/ 是 e_close.mp3 + i_short.mp3 拼播
let phonemeAudio = null
function playPhonemeFile(file) {
  return new Promise(resolve => {
    try {
      if (phonemeAudio) {
        phonemeAudio.onended = null
        phonemeAudio.onerror = null
        try { phonemeAudio.pause() } catch (e) {}
      }
      phonemeAudio = new Audio(`/static/audio/phonics/${file}`)
      const cur = phonemeAudio
      const done = () => { if (cur === phonemeAudio) resolve() }
      phonemeAudio.onended = done
      phonemeAudio.onerror = done
      const t = setTimeout(done, 3000)
      phonemeAudio.onended = () => { clearTimeout(t); done() }
      const p = phonemeAudio.play()
      if (p && typeof p.catch === 'function') p.catch(() => done())
    } catch (e) { resolve() }
  })
}

async function playSound(s) {
  if (!s || !s.audioFiles || !s.audioFiles.length) return
  for (const f of s.audioFiles) {
    await playPhonemeFile(f)
  }
}

function playWord(word) {
  speakEn(word)
}

async function playAll() {
  if (!currentSound.value) return
  for (const w of currentSound.value.examples) {
    await speakEn(w)
  }
}

function prev() {
  if (activeIdx.value > 0) {
    activeIdx.value--
    if (currentSound.value) playSound(currentSound.value)
  }
}
function next() {
  if (currentGroup.value && activeIdx.value < currentGroup.value.sounds.length - 1) {
    activeIdx.value++
    if (currentSound.value) playSound(currentSound.value)
  }
}
</script>

<style scoped>
.phonics-page {
  min-height: 100vh;
  background: #F5FBFB;
  padding-bottom: 60rpx;
}

.intro {
  padding: 24rpx 40rpx 12rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.intro-title {
  font-size: 38rpx;
  font-weight: 900;
  color: #1F3A3A;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  letter-spacing: 1rpx;
}
.intro-sub {
  font-size: 24rpx;
  color: #6B8787;
}

/* 组别 tabs */
.group-tabs {
  white-space: nowrap;
  padding: 16rpx 32rpx 8rpx;
}
.tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 14rpx 24rpx;
  margin-right: 14rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(31,58,58,0.06);
  min-width: 110rpx;
  transition: all 0.2s;
}
.tab-num {
  font-size: 30rpx;
  font-weight: 900;
  color: #26A69A;
  font-family: 'Quicksand', sans-serif;
}
.tab-name {
  font-size: 20rpx;
  color: #6B8787;
  margin-top: 2rpx;
}
.tab-active {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  box-shadow: 0 6rpx 16rpx rgba(38,166,154,0.3);
}
.tab-active .tab-num,
.tab-active .tab-name { color: #fff; }

.group-hint {
  margin: 8rpx 40rpx 16rpx;
  font-size: 24rpx;
  color: #8EA5A5;
  letter-spacing: 1rpx;
}

/* 音卡片网格 */
.sound-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding: 0 32rpx 24rpx;
}
.sound-cell {
  padding: 24rpx 12rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  box-shadow: 0 4rpx 12rpx rgba(31,58,58,0.06);
  transition: all 0.2s;
  box-sizing: border-box;
  border: 4rpx solid transparent;
}
.sound-cell:active { transform: scale(0.96); }
.sound-cell-active {
  border-color: #26A69A;
  background: #E0F2F1;
}
.sound-letters {
  font-size: 38rpx;
  font-weight: 900;
  color: #1F3A3A;
  font-family: 'Quicksand', 'Comic Sans MS', sans-serif;
  letter-spacing: 1rpx;
}
.sound-ipa {
  font-size: 22rpx;
  color: #FF8A65;
  font-family: 'Quicksand', sans-serif;
}

/* 详情卡 */
.detail {
  margin: 8rpx 32rpx 0;
  padding: 36rpx 32rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,58,58,0.08);
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.detail-big {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0;
  background: linear-gradient(135deg, #FFF4E6, #FFE0B2);
  border-radius: 20rpx;
}
.big-letters {
  font-size: 100rpx;
  font-weight: 900;
  color: #FF8A65;
  font-family: 'Quicksand', 'Comic Sans MS', sans-serif;
  letter-spacing: 4rpx;
  line-height: 1.1;
}
.big-ipa {
  font-size: 36rpx;
  color: #7A5B00;
  font-family: 'Quicksand', sans-serif;
}
.big-hint {
  font-size: 22rpx;
  color: #B07A00;
  margin-top: 4rpx;
  letter-spacing: 1rpx;
}

.tip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 24rpx;
  background: #F5FBFB;
  border-radius: 16rpx;
}
.tip-label {
  font-size: 22rpx;
  color: #fff;
  background: #26A69A;
  padding: 6rpx 14rpx;
  border-radius: 10rpx;
  font-weight: bold;
  flex-shrink: 0;
}
.tip-text {
  font-size: 28rpx;
  color: #1F3A3A;
}

.examples-label {
  display: block;
  font-size: 24rpx;
  color: #8EA5A5;
  margin-bottom: 12rpx;
  letter-spacing: 1rpx;
}
.example-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}
.example-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 22rpx;
  background: #E0F2F1;
  border-radius: 24rpx;
  transition: transform 0.2s;
}
.example-chip:active { transform: scale(0.95); }
.chip-icon { font-size: 24rpx; }
.chip-word {
  font-size: 30rpx;
  color: #1E8E82;
  font-weight: bold;
  font-family: 'Quicksand', 'Comic Sans MS', sans-serif;
}

.actions {
  display: flex;
  justify-content: center;
}
.act-btn {
  padding: 18rpx 48rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: bold;
  letter-spacing: 1rpx;
}
.act-btn.primary {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff;
  box-shadow: 0 6rpx 16rpx rgba(38,166,154,0.3);
}
.act-btn:active { transform: scale(0.96); }

.nav-actions {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding-top: 8rpx;
  border-top: 1rpx dashed #C6DEDE;
}
.nav-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  background: #F5FBFB;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #1E8E82;
  font-weight: bold;
}
.nav-btn.disabled {
  color: #C6DEDE;
  background: #FAFAFA;
}
</style>
