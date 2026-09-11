<template>
  <view class="phonics-page">
    <PageHeader title="自然拼读" theme="english" />

    <!-- 顶部说明 -->
    <view class="intro">
      <text class="intro-title">Jolly Phonics 42 音</text>
      <text class="intro-sub">分 7 组，按顺序学最有效</text>
    </view>

    <!-- 组别 Tab（2 行 × 4 列栅格，7 组占 7 格） -->
    <view class="group-tabs">
      <view
        v-for="g in phonics"
        :key="g.group"
        :class="['tab', activeGroup === g.group && 'tab-active']"
        @click="selectGroup(g.group)"
      >
        <text class="tab-num">{{ g.group }}</text>
        <text class="tab-name">{{ g.groupName }}</text>
      </view>
    </view>

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

      <view class="nav-actions">
        <view class="nav-btn" :class="{ disabled: activeIdx === 0 }" @click="prev">← 上一个</view>
        <view class="nav-btn" :class="{ disabled: activeIdx === currentGroup.sounds.length - 1 }" @click="next">下一个 →</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { speakEn, primeSpeech, stopEnSpeech } from '../../utils/common/speech.js'
import phonicsData from '../../static/data/english/phonics.json'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'

const phonics = ref([])
const activeGroup = ref(1)
const activeIdx = ref(0)

const currentGroup = computed(() => phonics.value.find(g => g.group === activeGroup.value) || null)
const currentSound = computed(() => currentGroup.value ? currentGroup.value.sounds[activeIdx.value] : null)

// 播放 generation token，切换发音时递增以中断上一条 playAll 循环
let playGen = 0

function cancelPlay() {
  playGen++
  stopEnSpeech()
}

function selectGroup(g) {
  primeSpeech()
  cancelPlay()
  activeGroup.value = g
  activeIdx.value = 0
}

function selectSound(i) {
  primeSpeech()
  activeIdx.value = i
  playAll()
}

function playWord(word) {
  cancelPlay()
  speakEn(word)
}

async function playAll() {
  if (!currentSound.value) return
  const gen = ++playGen
  for (const w of currentSound.value.examples) {
    if (gen !== playGen) return
    await speakEn(w)
    if (gen !== playGen) return
  }
}

function prev() {
  if (activeIdx.value > 0) {
    activeIdx.value--
    playAll()
  }
}
function next() {
  if (currentGroup.value && activeIdx.value < currentGroup.value.sounds.length - 1) {
    activeIdx.value++
    playAll()
  }
}

onMounted(async () => {
  await awaitLearningSession()
  openCourseGradeSession()
  phonics.value = phonicsData
})

onUnmounted(cancelPlay)
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

/* 组别 tabs：2 行 × 4 列栅格 */
.group-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14rpx;
  padding: 16rpx 32rpx 8rpx;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 8rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(31,58,58,0.06);
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
  border-color: #FF8A65;
  background: linear-gradient(135deg, #FFF4E6, #FFE0B2);
  box-shadow: 0 6rpx 18rpx rgba(255,138,101,0.3);
}
.sound-cell-active .sound-letters { color: #FF8A65; }
.sound-cell-active .sound-ipa { color: #7A5B00; }
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
