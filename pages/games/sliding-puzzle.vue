<template>
  <view class="page">
    <PageHeader title="数字华容道" theme="game" fallback="/pages/games/index">
      <text class="header-link" @click="goGuide">规则</text>
    </PageHeader>

    <view class="container">
      <!-- 难度切换 -->
      <view class="topbar">
        <view class="difficulty">
          <view
            v-for="d in DIFFICULTIES"
            :key="d.key"
            class="diff-tab"
            :class="{ active: size === d.key }"
            @click="switchSize(d.key)"
          >
            <text class="diff-label">{{ d.label }}</text>
            <text class="diff-desc">{{ d.desc }}</text>
          </view>
        </view>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-label">步数</text>
            <text class="stat-value">{{ steps }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">用时</text>
            <text class="stat-value">{{ formatTime(elapsed) }}</text>
          </view>
          <view class="stat-item" v-if="pb">
            <text class="stat-label">最佳</text>
            <text class="stat-value pb-text">{{ pb.steps }}步 / {{ formatTime(pb.time) }}</text>
          </view>
          <view class="stat-item" v-else>
            <text class="stat-label">最佳</text>
            <text class="stat-value pb-text">—</text>
          </view>
        </view>
      </view>

      <!-- 棋盘 -->
      <view class="board-wrap">
        <view
          class="board"
          :style="{ '--size': size, 'aspect-ratio': '1' }"
        >
          <view
            v-for="(n, idx) in board"
            :key="idx"
            class="tile"
            :class="{
              empty: n === 0,
              movable: n !== 0 && movableSet.has(idx),
              [`size-${size}`]: true
            }"
            @click="onTileClick(idx)"
          >
            <text v-if="n !== 0">{{ n }}</text>
          </view>
        </view>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <view class="action action-restart" @click="restart">
          <text>重新打乱</text>
        </view>
        <view class="action action-reset" @click="resetToSolved">
          <text>查看目标</text>
        </view>
      </view>

      <!-- 通关弹层 -->
      <view v-if="winning" class="win-overlay" @click="restart">
        <view class="win-card">
          <text class="win-emoji">🏆</text>
          <text class="win-title">完成!</text>
          <view class="win-stats">
            <view class="win-stat">
              <text class="ws-label">步数</text>
              <text class="ws-value">{{ steps }}</text>
              <text v-if="lastResult && lastResult.newBestSteps" class="ws-flag">破纪录</text>
            </view>
            <view class="win-stat">
              <text class="ws-label">用时</text>
              <text class="ws-value">{{ formatTime(elapsed) }}</text>
              <text v-if="lastResult && lastResult.newBestTime" class="ws-flag">破纪录</text>
            </view>
          </view>
          <view class="win-btn">再来一局</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  DIFFICULTIES, createSolvedBoard, shuffle, canMove, move, isSolved, neighborsOf
} from '@/utils/games/slidingPuzzle.js'
import { getStats, recordWin } from '@/utils/games/slidingPuzzleStorage.js'

const size = ref(3)
const board = ref(createSolvedBoard(3))
const steps = ref(0)
const startedAt = ref(0)
const elapsed = ref(0)
const winning = ref(false)
const lastResult = ref(null)
const stats = reactive(getStats())
let timer = null

const pb = computed(() => stats.pb[size.value])

const movableSet = computed(() => {
  const emptyIdx = board.value.indexOf(0)
  return new Set(neighborsOf(emptyIdx, size.value))
})

onMounted(() => {
  restart()
})

onUnmounted(() => {
  stopTimer()
})

function switchSize(s) {
  if (s === size.value) return
  size.value = s
  restart()
}

function restart() {
  const cur = DIFFICULTIES.find(d => d.key === size.value)
  board.value = shuffle(size.value, cur.shuffleMoves)
  steps.value = 0
  startedAt.value = Date.now()
  elapsed.value = 0
  winning.value = false
  lastResult.value = null
  startTimer()
}

// 查看目标态(不计入计分,玩家自己点重新打乱后会重置)
function resetToSolved() {
  stopTimer()
  board.value = createSolvedBoard(size.value)
  steps.value = 0
  elapsed.value = 0
  winning.value = false
}

function onTileClick(idx) {
  if (winning.value) return
  if (!canMove(board.value, idx, size.value)) return
  board.value = move(board.value, idx, size.value)
  steps.value += 1
  if (isSolved(board.value)) {
    stopTimer()
    lastResult.value = recordWin(size.value, steps.value, elapsed.value)
    Object.assign(stats, lastResult.value.stats)
    winning.value = true
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt.value) / 1000)
  }, 500)
}
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${ss < 10 ? '0' : ''}${ss}`
}

function goGuide() {
  uni.navigateTo({ url: '/pages/games/sliding-puzzle-guide' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #E0F2F1;
}
.header-link {
  font-size: 26rpx;
  color: #fff;
  padding: 4rpx 12rpx;
  opacity: 0.9;
}
.container {
  padding: 28rpx 32rpx 60rpx;
}

/* ===== 顶部 ===== */
.topbar {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 137, 123, 0.10);
  margin-bottom: 28rpx;
}
.difficulty {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.diff-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14rpx 0;
  background: #B2DFDB;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.diff-tab.active {
  background: #00897B;
  border-color: #00695C;
  box-shadow: 0 2rpx 8rpx rgba(0, 105, 92, 0.4);
}
.diff-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #00695C;
}
.diff-tab.active .diff-label { color: #fff; }
.diff-desc {
  font-size: 20rpx;
  color: #00897B;
  margin-top: 4rpx;
}
.diff-tab.active .diff-desc { color: #B2DFDB; }

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 4rpx 12rpx;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}
.stat-label {
  font-size: 22rpx;
  color: #00796B;
}
.stat-value {
  font-size: 30rpx;
  font-weight: bold;
  color: #004D40;
  font-family: 'Courier New', monospace;
}
.pb-text {
  font-size: 24rpx;
  color: #00897B;
}

/* ===== 棋盘 ===== */
.board-wrap {
  width: 100%;
  margin-bottom: 32rpx;
}
.board {
  display: grid;
  grid-template-columns: repeat(var(--size), 1fr);
  grid-template-rows: repeat(var(--size), 1fr);
  gap: 10rpx;
  padding: 12rpx;
  background: #B2DFDB;
  border-radius: 20rpx;
  box-shadow: inset 0 4rpx 12rpx rgba(0, 77, 64, 0.20);
}
.tile {
  background: linear-gradient(145deg, #4DB6AC 0%, #00897B 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3rpx 6rpx rgba(0, 77, 64, 0.30);
  color: #fff;
  font-family: 'Courier New', 'STKaiti', '楷体', monospace;
  font-weight: bold;
  text-shadow: 0 2rpx 4rpx rgba(0, 77, 64, 0.4);
  transition: transform 0.15s;
  user-select: none;
}
.tile.size-3 { font-size: 110rpx; }
.tile.size-4 { font-size: 80rpx; }
.tile.size-5 { font-size: 60rpx; }

.tile.empty {
  background: transparent;
  box-shadow: inset 0 2rpx 6rpx rgba(0, 77, 64, 0.30);
}
.tile.movable:active {
  transform: scale(0.92);
  background: linear-gradient(145deg, #26A69A 0%, #00796B 100%);
}

/* ===== 操作 ===== */
.actions {
  display: flex;
  gap: 16rpx;
}
.action {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 20rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 500;
  color: #fff;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
.action:active { transform: scale(0.97); }
.action-restart { background: linear-gradient(135deg, #4DB6AC 0%, #00796B 100%); }
.action-reset   { background: linear-gradient(135deg, #90A4AE 0%, #546E7A 100%); }

/* ===== 通关弹层 ===== */
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
@keyframes fadein {
  from { opacity: 0; } to { opacity: 1; }
}
.win-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 50rpx 70rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  animation: pop 0.3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pop {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.win-emoji { font-size: 96rpx; }
.win-title {
  font-size: 44rpx;
  font-weight: 500;
  color: #00695C;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.win-stats {
  display: flex;
  gap: 40rpx;
  margin: 14rpx 0 6rpx;
}
.win-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  position: relative;
}
.ws-label { font-size: 24rpx; color: #00796B; }
.ws-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #004D40;
  font-family: 'Courier New', monospace;
}
.ws-flag {
  margin-top: 4rpx;
  background: #FF7043;
  color: #fff;
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 10rpx;
  font-weight: bold;
}
.win-btn {
  margin-top: 20rpx;
  background: linear-gradient(135deg, #4DB6AC 0%, #00796B 100%);
  color: #fff;
  padding: 18rpx 60rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
</style>
