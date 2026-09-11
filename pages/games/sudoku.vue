<template>
  <view class="page">
    <PageHeader title="迷你数独" theme="game" fallback="/pages/games/index">
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
            :class="{ active: difficulty === d.key }"
            @click="switchDifficulty(d.key)"
          >
            <text class="diff-label">{{ d.label }}</text>
            <text class="diff-meta">{{ d.size }}×{{ d.size }} · +{{ d.score }}</text>
          </view>
        </view>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-label">用时</text>
            <text class="stat-value">{{ formatTime(elapsed) }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">通关</text>
            <text class="stat-value">{{ stats.byDifficulty[difficulty] || 0 }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">最佳</text>
            <text class="stat-value pb-text">{{ pb ? formatTime(pb) : '—' }}</text>
          </view>
        </view>
      </view>

      <!-- loading -->
      <view v-if="loading" class="loading">
        <text>题目生成中...</text>
      </view>

      <template v-else-if="current">
        <!-- 棋盘 -->
        <view class="board-wrap">
          <view class="board" :class="`size-${cfg.size}`">
            <view
              v-for="(_, idx) in flatCells"
              :key="idx"
              class="cell"
              :class="cellClass(idx)"
              @click="selectCell(idx)"
            >
              <text v-if="getCell(idx) !== 0">{{ getCell(idx) }}</text>
            </view>
          </view>
        </view>

        <!-- 数字键盘 -->
        <view class="keypad" :class="`pad-${cfg.size}`">
          <view
            v-for="n in cfg.size"
            :key="n"
            class="key"
            @click="putNumber(n)"
          >
            <text>{{ n }}</text>
          </view>
          <view class="key key-clear" @click="putNumber(0)">
            <text>清</text>
          </view>
        </view>

        <!-- 操作 -->
        <view class="actions">
          <view class="action action-hint" @click="useHint">
            <text>提示</text>
          </view>
          <view class="action action-restart" @click="restart">
            <text>新题</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 通关弹层 -->
    <view v-if="winning" class="win-overlay" @click="restart">
      <view class="win-card">
        <text class="win-emoji">🎯</text>
        <text class="win-title">完成!</text>
        <text class="win-score">+{{ lastGain }}</text>
        <view class="win-stats">
          <view class="win-stat">
            <text class="ws-label">用时</text>
            <text class="ws-value">{{ formatTime(elapsed) }}</text>
            <text v-if="lastResult && lastResult.newBest" class="ws-flag">破纪录</text>
          </view>
        </view>
        <view class="win-btn">下一题</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  DIFFICULTIES, generatePuzzle, findConflicts, isComplete
} from '@/utils/games/sudoku.js'
import { getStats, recordWin, recordHint } from '@/utils/games/sudokuStorage.js'
import { awaitLearningSession } from '@/utils/common/learningSession.js'

const difficulty = ref('starter')
const loading = ref(false)
const current = ref(null)        // { puzzle, solution, size, boxR, boxC }
const board = ref([])            // 当前玩家填的状态(二维)
const fixed = ref([])            // 哪些格子是预填(二维 bool)
const selected = ref(null)       // { row, col } 当前选中格
const elapsed = ref(0)
const startedAt = ref(0)
const winning = ref(false)
const lastResult = ref(null)
const lastGain = ref(0)
const stats = reactive({
  totalScore: 0,
  totalWins: 0,
  hintsUsed: 0,
  byDifficulty: { starter: 0, easy: 0, medium: 0, hard: 0 },
  pb: { starter: null, easy: null, medium: null, hard: null },
})
let timer = null
let restartGeneration = 0
let disposed = false

const cfg = computed(() => DIFFICULTIES.find(d => d.key === difficulty.value))
const pb = computed(() => stats.pb[difficulty.value])

// 把二维板拍平给 v-for(uniapp 二维渲染麻烦)
const flatCells = computed(() => {
  const sz = cfg.value.size
  const arr = []
  for (let i = 0; i < sz * sz; i++) arr.push(i)
  return arr
})

// 所有冲突格(选中格冲突高亮)
const conflictSet = computed(() => {
  const s = new Set()
  if (!current.value || !selected.value) return s
  const { row, col } = selected.value
  const v = board.value[row][col]
  if (!v) return s
  const conflicts = findConflicts(board.value, row, col, v,
    cfg.value.size, cfg.value.boxR, cfg.value.boxC)
  for (const [r, c] of conflicts) s.add(r * cfg.value.size + c)
  s.add(row * cfg.value.size + col)
  return s
})

onMounted(async () => {
  await awaitLearningSession()
  Object.assign(stats, getStats())
  restart()
})

onUnmounted(() => {
  disposed = true
  restartGeneration++
  stopTimer()
})

function getCell(idx) {
  const sz = cfg.value.size
  return board.value[Math.floor(idx / sz)][idx % sz]
}

function cellClass(idx) {
  const sz = cfg.value.size
  const r = Math.floor(idx / sz)
  const c = idx % sz
  const isFixed = fixed.value[r] && fixed.value[r][c]
  const isSelected = selected.value && selected.value.row === r && selected.value.col === c
  const isConflict = conflictSet.value.has(idx)
  const { boxR, boxC } = cfg.value
  // 宫格边框: 行/列在宫格分隔线上的格子加粗边框
  const boxBorderRight = (c + 1) % boxC === 0 && c < sz - 1
  const boxBorderBottom = (r + 1) % boxR === 0 && r < sz - 1
  return {
    fixed: isFixed,
    selected: isSelected,
    conflict: isConflict,
    'box-r': boxBorderRight,
    'box-b': boxBorderBottom
  }
}

function switchDifficulty(key) {
  if (key === difficulty.value) return
  difficulty.value = key
  restart()
}

async function restart() {
  const generation = ++restartGeneration
  const difficultyKey = difficulty.value
  loading.value = true
  winning.value = false
  selected.value = null
  lastResult.value = null
  // 用 setTimeout 让 loading 态先显示出来再开始计算
  await new Promise(r => setTimeout(r, 50))
  if (disposed || generation !== restartGeneration) return
  const r = generatePuzzle(difficultyKey)
  current.value = r
  board.value = r.puzzle.map(row => row.slice())
  fixed.value = r.puzzle.map(row => row.map(n => n !== 0))
  elapsed.value = 0
  startedAt.value = Date.now()
  loading.value = false
  startTimer()
}

function selectCell(idx) {
  if (winning.value) return
  const sz = cfg.value.size
  const r = Math.floor(idx / sz)
  const c = idx % sz
  if (fixed.value[r][c]) {
    selected.value = null  // 预填格不可选(避免误触)
    return
  }
  selected.value = { row: r, col: c }
}

function putNumber(n) {
  if (!selected.value) return
  const { row, col } = selected.value
  if (fixed.value[row][col]) return
  // 立即响应,避免 reactive 二维数组某些环境 set 不触发
  const newBoard = board.value.map(r => r.slice())
  newBoard[row][col] = n
  board.value = newBoard
  checkWin()
}

function checkWin() {
  const { size, boxR, boxC } = cfg.value
  if (!isComplete(board.value, size, boxR, boxC)) return
  stopTimer()
  const score = cfg.value.score
  const actual = score  // 这里不扣提示分,提示分独立在 useHint 里扣
  lastGain.value = actual
  const r = recordWin(difficulty.value, actual, elapsed.value)
  Object.assign(stats, r.stats)
  lastResult.value = r
  winning.value = true
}

function useHint() {
  if (!selected.value) {
    uni.showToast({ title: '请先选一个空格', icon: 'none', duration: 1200 })
    return
  }
  const { row, col } = selected.value
  if (fixed.value[row][col]) return
  const correct = current.value.solution[row][col]
  putNumber(correct)
  // 提示填的格视为预填,不能再改(避免反复用提示)
  const newFixed = fixed.value.map(r => r.slice())
  newFixed[row][col] = true
  fixed.value = newFixed
  const newStats = recordHint()
  Object.assign(stats, newStats)
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
  uni.navigateTo({ url: '/pages/games/sudoku-guide' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FCE4EC;
}
.header-link {
  font-size: 26rpx;
  color: #fff;
  padding: 4rpx 12rpx;
  opacity: 0.9;
}
.container {
  padding: 16rpx 28rpx 32rpx;
}

/* ===== 顶部 ===== */
.topbar {
  background: #fff;
  border-radius: 20rpx;
  padding: 12rpx 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(194, 24, 91, 0.10);
  margin-bottom: 16rpx;
}
.difficulty {
  display: flex;
  gap: 8rpx;
  margin-bottom: 10rpx;
}
.diff-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0;
  background: #F8BBD0;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.diff-tab.active {
  background: #EC407A;
  border-color: #C2185B;
  box-shadow: 0 2rpx 8rpx rgba(194, 24, 91, 0.4);
}
.diff-label {
  font-size: 24rpx;
  font-weight: 500;
  color: #880E4F;
  line-height: 1.2;
}
.diff-tab.active .diff-label { color: #fff; }
.diff-meta {
  font-size: 16rpx;
  color: #AD1457;
  margin-top: 1rpx;
  line-height: 1.2;
}
.diff-tab.active .diff-meta { color: #FCE4EC; }

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 2rpx 8rpx;
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}
.stat-label {
  font-size: 22rpx;
  color: #AD1457;
}
.stat-value {
  font-size: 26rpx;
  font-weight: bold;
  color: #880E4F;
  font-family: 'Courier New', monospace;
}
.pb-text { color: #C2185B; }

/* ===== loading ===== */
.loading {
  text-align: center;
  padding: 80rpx;
  color: #AD1457;
  font-size: 28rpx;
}

/* ===== 棋盘 ===== */
.board-wrap {
  background: #fff;
  border-radius: 16rpx;
  padding: 10rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(194, 24, 91, 0.10);
}
.board {
  display: grid;
  width: 100%;
  aspect-ratio: 1;
  background: #C2185B;
  border: 3rpx solid #C2185B;
  border-radius: 8rpx;
  overflow: hidden;
}
.board.size-4 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
.board.size-6 { grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(6, 1fr); }
.board.size-9 { grid-template-columns: repeat(9, 1fr); grid-template-rows: repeat(9, 1fr); }

.cell {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-weight: 500;
  color: #5D4037;
  border: 1rpx solid #F8BBD0;
}
.board.size-4 .cell { font-size: 64rpx; }
.board.size-6 .cell { font-size: 48rpx; }
.board.size-9 .cell { font-size: 34rpx; }

.cell.fixed {
  background: #F8BBD0;
  color: #4A148C;
  font-weight: bold;
}
.cell.selected {
  background: #FFF59D;
}
.cell.conflict {
  color: #C62828;
  background: #FFCDD2;
}
.cell.fixed.conflict {
  background: #EF9A9A;
}
.cell.box-r { border-right: 3rpx solid #C2185B; }
.cell.box-b { border-bottom: 3rpx solid #C2185B; }

/* ===== 数字键盘 ===== */
.keypad {
  display: grid;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.pad-4 { grid-template-columns: repeat(5, 1fr); }
.pad-6 { grid-template-columns: repeat(7, 1fr); }
.pad-9 { grid-template-columns: repeat(10, 1fr); }
.key {
  background: #fff;
  border-radius: 12rpx;
  padding: 14rpx 0;
  text-align: center;
  box-shadow: 0 3rpx 8rpx rgba(194, 24, 91, 0.10);
  font-family: 'Courier New', monospace;
  font-size: 32rpx;
  font-weight: bold;
  color: #C2185B;
  transition: transform 0.15s;
}
.key:active { transform: scale(0.94); background: #F8BBD0; }
.key-clear {
  color: #8E24AA;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}

/* ===== 操作 ===== */
.actions {
  display: flex;
  gap: 14rpx;
}
.action {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 16rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  color: #fff;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
.action:active { transform: scale(0.97); }
.action-hint    { background: linear-gradient(135deg, #FF8A65 0%, #E64A19 100%); }
.action-restart { background: linear-gradient(135deg, #EC407A 0%, #C2185B 100%); }

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
  padding: 56rpx 70rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
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
  color: #880E4F;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.win-score {
  font-size: 56rpx;
  font-weight: bold;
  color: #C2185B;
}
.win-stats {
  display: flex;
  gap: 30rpx;
  margin: 8rpx 0;
}
.win-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.ws-label { font-size: 24rpx; color: #AD1457; }
.ws-value {
  font-size: 42rpx;
  font-weight: bold;
  color: #880E4F;
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
  margin-top: 18rpx;
  background: linear-gradient(135deg, #EC407A 0%, #C2185B 100%);
  color: #fff;
  padding: 18rpx 60rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
</style>
