<template>
  <view class="page">
    <PageHeader title="记忆翻牌" theme="game" fallback="/pages/games/index" />

    <view class="container">
      <!-- 难度 + 状态条 -->
      <view class="topbar">
        <view class="difficulty">
          <view v-for="d in DIFFICULTIES" :key="d.key"
            class="diff-tab" :class="{ active: difficulty === d.key }"
            @click="switchDifficulty(d.key)">
            <text class="diff-label">{{ d.label }}</text>
          </view>
        </view>
        <view class="status">
          <text class="status-item">步数 <text class="status-num">{{ moves }}</text></text>
          <text class="status-item">时间 <text class="status-num">{{ timeText }}</text></text>
          <text class="status-item">配对 <text class="status-num">{{ matchedCount }}/{{ totalPairs }}</text></text>
        </view>
      </view>

      <!-- 卡牌网格 -->
      <view class="grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <view v-for="card in deck" :key="card.id"
          class="card"
          :class="{
            flipped: isFaceUp(card.id),
            matched: matched.has(card.id),
            locked: lockActive
          }"
          @click="flipCard(card.id)">
          <view class="card-inner">
            <view class="card-face card-back">
              <text class="back-mark">?</text>
            </view>
            <view class="card-face card-front">
              <text class="front-emoji">{{ card.value }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="actions">
        <view class="action action-restart" @click="restart">重新洗牌</view>
      </view>

      <!-- 通关弹层 -->
      <view v-if="winning" class="win-overlay">
        <view class="win-card">
          <text class="win-emoji">🎉</text>
          <text class="win-title">全部配对!</text>
          <text class="win-line">用了 {{ moves }} 步 · {{ timeText }}</text>
          <text v-if="newBest" class="win-best">🎯 新纪录!</text>
          <view class="win-btns">
            <view class="win-btn" @click="restart">再来一次</view>
            <view class="win-btn win-btn-ghost" @click="winning = false">看看</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { DIFFICULTIES, getDifficulty, buildDeck, isComplete } from '@/utils/games/memoryMatch.js'
import { getStats, recordWin } from '@/utils/games/memoryMatchStorage.js'

const difficulty = ref('easy')
const deck = ref([])
const open = ref([])        // 当前翻开的两张 id
const matched = ref(new Set())
const moves = ref(0)
const matchedCount = computed(() => matched.value.size / 2)
const totalPairs = computed(() => getDifficulty(difficulty.value).pairs)
const cols = computed(() => getDifficulty(difficulty.value).cols)
const winning = ref(false)
const newBest = ref(false)
const lockActive = ref(false)

// 计时
const elapsed = ref(0)
let timer = null
const timeText = computed(() => formatTime(elapsed.value))

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function startTimer() {
  stopTimer()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value++ }, 1000)
}
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function initRound(key) {
  difficulty.value = key
  deck.value = buildDeck(key)
  open.value = []
  matched.value = new Set()
  moves.value = 0
  winning.value = false
  newBest.value = false
  startTimer()
}

function switchDifficulty(key) {
  if (key !== difficulty.value) initRound(key)
}

function isFaceUp(id) {
  return openedIds.value.has(id)
}
const openedIds = computed(() => new Set([...open.value, ...matched.value]))

function flipCard(id) {
  if (lockActive.value) return
  if (matched.value.has(id) || open.value.includes(id)) return
  if (open.value.length >= 2) return
  open.value.push(id)
  if (open.value.length === 2) {
    moves.value++
    resolvePair()
  }
}

function resolvePair() {
  const [a, b] = open.value
  if (deck.value[a].value === deck.value[b].value) {
    matched.value.add(a); matched.value.add(b)
    open.value = []
    if (isComplete(matchedCount.value, difficulty.value)) {
      finish()
    }
  } else {
    lockActive.value = true
    setTimeout(() => {
      open.value = []
      lockActive.value = false
    }, 650)
  }
}

function finish() {
  stopTimer()
  const res = recordWin(difficulty.value, moves.value, elapsed.value)
  newBest.value = res.newBest
  winning.value = true
}

function restart() {
  initRound(difficulty.value)
}

initRound('easy')

onUnmounted(stopTimer)
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F2FA;
}
.container { padding: 24rpx 24rpx 60rpx; }

.topbar {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(124,77,255,0.10);
  margin-bottom: 28rpx;
}
.difficulty {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.diff-tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  background: #EDE4FB;
  border-radius: 16rpx;
  transition: all 0.2s;
}
.diff-tab.active {
  background: #7C4DFF;
  box-shadow: 0 2rpx 8rpx rgba(124,77,255,0.4);
}
.diff-label { font-size: 28rpx; font-weight: 500; color: #6B5B95; }
.diff-tab.active .diff-label { color: #fff; }
.status {
  display: flex;
  justify-content: space-around;
  padding: 4rpx 12rpx;
}
.status-item { font-size: 24rpx; color: #6B5B95; }
.status-num { font-size: 30rpx; font-weight: bold; color: #7C4DFF; margin-left: 4rpx; }

/* 卡牌网格 */
.grid {
  display: grid;
  gap: 14rpx;
  max-width: 640rpx;
  margin: 0 auto 28rpx;
}
.card {
  aspect-ratio: 1;
  perspective: 800rpx;
  cursor: pointer;
}
.card.locked { pointer-events: none; }
.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.35s cubic-bezier(.4,0,.2,1);
}
.card.flipped .card-inner { transform: rotateY(180deg); }
.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-back {
  background: linear-gradient(145deg, #B388FF 0%, #7C4DFF 100%);
  box-shadow: 0 4rpx 12rpx rgba(124,77,255,0.25);
}
.back-mark {
  font-size: 64rpx;
  font-weight: bold;
  color: rgba(255,255,255,0.85);
}
.card-front {
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
  transform: rotateY(180deg);
  border: 2rpx solid #E8DFF9;
}
.front-emoji { font-size: 64rpx; }
.card.matched .card-front {
  background: #E8F5E9;
  border-color: #A5D6A7;
}
.card.matched .front-emoji { opacity: 0.75; }

.actions {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}
.action-restart {
  background: linear-gradient(135deg, #B388FF 0%, #7C4DFF 100%);
  color: #fff;
  padding: 22rpx 72rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
  box-shadow: 0 6rpx 18rpx rgba(124,77,255,0.3);
}
.action-restart:active { transform: scale(0.97); }

/* 通关弹层 */
.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadein 0.25s;
}
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
.win-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 56rpx 70rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  animation: pop 0.3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.win-emoji { font-size: 96rpx; }
.win-title { font-size: 44rpx; font-weight: 500; color: #7C4DFF; font-family: 'STKaiti','KaiTi','楷体',serif; }
.win-line { font-size: 28rpx; color: #6B5B95; }
.win-best { font-size: 30rpx; font-weight: bold; color: #E65100; }
.win-btns { display: flex; gap: 20rpx; margin-top: 20rpx; }
.win-btn {
  background: linear-gradient(135deg, #B388FF 0%, #7C4DFF 100%);
  color: #fff;
  padding: 18rpx 44rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
}
.win-btn-ghost { background: #EDE4FB; color: #6B5B95; }
</style>