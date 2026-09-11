<template>
  <view class="page">
    <PageHeader title="24 点" theme="game" fallback="/pages/games/index">
      <text class="header-link" @click="goGuide">规则</text>
    </PageHeader>

    <view class="container">
      <!-- 难度切换 + 状态条 -->
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
            <text class="diff-score">+{{ d.score }}</text>
          </view>
        </view>
        <view class="status">
          <text class="status-item">连胜 <text class="status-num">{{ stats.currentStreak }}</text></text>
          <text class="status-item">总分 <text class="status-num">{{ stats.totalScore }}</text></text>
        </view>
      </view>

      <!-- loading 态 -->
      <view v-if="!puzzle" class="loading">
        <text>题库加载中…</text>
      </view>

      <template v-else>
        <!-- 数字卡区 -->
        <view class="num-area" :class="{ shake: shaking }">
          <view
            v-for="(n, idx) in puzzle.nums"
            :key="idx"
            class="num-card"
            :class="{ used: usedIndexes.has(idx) }"
            @click="addNum(idx)"
          >
            <text class="num-text">{{ n }}</text>
          </view>
        </view>

        <!-- 表达式条 -->
        <view class="expr-area">
          <scroll-view scroll-x class="expr-scroll">
            <view class="expr-inner">
              <text v-if="!tokens.length" class="expr-placeholder">点下方数字和运算符,凑出 24</text>
              <text
                v-for="(t, i) in tokens"
                :key="i"
                class="expr-token"
                :class="`tk-${t.type}`"
              >{{ tokenText(t) }}</text>
            </view>
          </scroll-view>
          <view class="expr-actions">
            <view class="expr-btn btn-back" @click="backspace">退格</view>
            <view class="expr-btn btn-clear" @click="clearExpr">清空</view>
          </view>
        </view>

        <!-- 运算符按钮 -->
        <view class="op-area">
          <view class="op-btn" v-for="op in OPS" :key="op" @click="addOp(op)">
            <text class="op-text">{{ op }}</text>
          </view>
        </view>

        <!-- 反馈区 -->
        <view class="feedback" v-if="feedback">
          <text :class="['fb-text', feedback.ok ? 'fb-ok' : 'fb-err']">{{ feedback.text }}</text>
        </view>

        <!-- 主操作 -->
        <view class="main-actions">
          <view class="action action-submit" :class="{ disabled: !canSubmit }" @click="submit">
            <text>提 交</text>
          </view>
          <view class="action action-hint" @click="useHint">
            <text>提示</text>
          </view>
          <view class="action action-skip" @click="skipPuzzle">
            <text>换一题</text>
          </view>
        </view>

        <!-- 显示解(用了提示后) -->
        <view v-if="showSolution" class="solution-box">
          <text class="sol-label">参考解</text>
          <text class="sol-text">{{ showSolution }} = 24</text>
        </view>
      </template>
    </view>

    <!-- 通关弹层 -->
    <view v-if="winning" class="win-overlay" @click="nextPuzzle">
      <view class="win-card">
        <text class="win-emoji">🎉</text>
        <text class="win-title">答对了!</text>
        <text class="win-score">+{{ lastGain }}</text>
        <text class="win-streak">连胜 {{ stats.currentStreak }}</text>
        <view class="win-btn">下一题</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  DIFFICULTIES, loadPuzzles, pickPuzzle, findOneSolution,
  checkExpression
} from '@/utils/games/twentyFour.js'
import {
  getStats, recordWin, breakStreak, recordHint
} from '@/utils/games/twentyFourStorage.js'
import { awaitLearningSession } from '@/utils/common/learningSession.js'

const OPS = ['+', '-', '×', '÷', '(', ')']

const difficulty = ref('easy')
const puzzle = ref(null)        // { nums, solutionCount, sample }
const tokens = ref([])          // [{type:'num'|'op', value, idx?}]
const feedback = ref(null)      // { ok, text }
const stats = reactive({
  totalScore: 0,
  totalWins: 0,
  byDifficulty: { easy: 0, medium: 0, hard: 0 },
  hintsUsed: 0,
  currentStreak: 0,
  bestStreak: 0,
})
const showSolution = ref(null)  // 提示后展示的 sample
const shaking = ref(false)
let shakeTimer = null
const winning = ref(false)
const lastGain = ref(0)

const usedIndexes = computed(() => {
  const s = new Set()
  for (const t of tokens.value) {
    if (t.type === 'num') s.add(t.idx)
  }
  return s
})

const canSubmit = computed(() => {
  if (!puzzle.value) return false
  if (usedIndexes.value.size !== puzzle.value.nums.length) return false
  // 至少要有一个运算符
  return tokens.value.some(t => t.type === 'op' && '+-×÷'.includes(t.value))
})

onMounted(async () => {
  try {
    await awaitLearningSession()
    Object.assign(stats, getStats())
    await loadPuzzles()
    nextPuzzle()
  } catch (e) {
    feedback.value = { ok: false, text: '题库加载失败: ' + e.message }
  }
})

onUnmounted(() => {
  if (shakeTimer) clearTimeout(shakeTimer)
})

function switchDifficulty(key) {
  if (key === difficulty.value) return
  difficulty.value = key
  nextPuzzle()
}

function nextPuzzle() {
  winning.value = false
  showSolution.value = null
  feedback.value = null
  tokens.value = []
  puzzle.value = pickPuzzle(difficulty.value)
}

function addNum(idx) {
  if (usedIndexes.value.has(idx)) return
  // 紧挨数字/右括号 -> 拒绝(必须先来个运算符)
  const last = tokens.value[tokens.value.length - 1]
  if (last && (last.type === 'num' || last.value === ')')) {
    return shake()
  }
  tokens.value.push({ type: 'num', value: puzzle.value.nums[idx], idx })
  feedback.value = null
}

function addOp(op) {
  const last = tokens.value[tokens.value.length - 1]
  if (op === '(') {
    // ( 不能紧跟在数字或 ) 后面（缺乘号）
    if (last && (last.type === 'num' || last.value === ')')) return shake()
  } else if (op === ')') {
    // ) 必须有未配对的 (
    if (!last) return shake()
    let opens = 0
    for (const t of tokens.value) {
      if (t.value === '(') opens++
      else if (t.value === ')') opens--
    }
    if (opens <= 0) return shake()
    if (last.value === '(' || (last.type === 'op' && '+-×÷'.includes(last.value))) return shake()
  } else {
    // 二元运算符: 前面必须是数字或 )
    if (!last || (last.type === 'op' && last.value !== ')')) return shake()
  }
  tokens.value.push({ type: 'op', value: op })
  feedback.value = null
}

function tokenText(t) { return String(t.value) }

function backspace() {
  if (!tokens.value.length) return
  tokens.value.pop()
  feedback.value = null
}

function clearExpr() {
  tokens.value = []
  feedback.value = null
}

function shake() {
  shaking.value = true
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => { shaking.value = false }, 320)
}

function exprString() {
  return tokens.value.map(t => t.value).join('')
}

function submit() {
  if (!canSubmit.value) return shake()
  const result = checkExpression(exprString(), puzzle.value.nums)
  if (result.ok) {
    const score = DIFFICULTIES.find(d => d.key === difficulty.value).score
    // 用过提示本题不计分,但保留通关动画 & 连胜
    const actual = showSolution.value ? 0 : score
    lastGain.value = actual
    const newStats = recordWin(difficulty.value, actual)
    Object.assign(stats, newStats)
    feedback.value = { ok: true, text: '答对了!' }
    winning.value = true
  } else {
    feedback.value = { ok: false, text: result.reason || '不对哦' }
    shake()
  }
}

function useHint() {
  if (!puzzle.value) return
  if (showSolution.value) return
  showSolution.value = puzzle.value.sample || findOneSolution(puzzle.value.nums)
  const newStats = recordHint()
  Object.assign(stats, newStats)
  feedback.value = { ok: false, text: '看了提示,本题不计分,但通关后连胜继续' }
}

function skipPuzzle() {
  const newStats = breakStreak()
  Object.assign(stats, newStats)
  nextPuzzle()
}

function goGuide() {
  uni.navigateTo({ url: '/pages/games/twenty-four-guide' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FFF8E7;
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

/* ===== 顶部状态条 ===== */
.topbar {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(229, 81, 0, 0.10);
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
  background: #FFF1D6;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}
.diff-tab.active {
  background: #FF9800;
  border-color: #E65100;
  box-shadow: 0 2rpx 8rpx rgba(230, 81, 0, 0.4);
}
.diff-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #BF6A00;
}
.diff-tab.active .diff-label {
  color: #fff;
}
.diff-score {
  font-size: 20rpx;
  color: #B97500;
  margin-top: 4rpx;
}
.diff-tab.active .diff-score {
  color: #FFE0B2;
}

.status {
  display: flex;
  justify-content: space-between;
  padding: 4rpx 12rpx;
}
.status-item {
  font-size: 24rpx;
  color: #8B5A00;
}
.status-num {
  font-size: 28rpx;
  font-weight: bold;
  color: #E65100;
  margin-left: 6rpx;
}

/* ===== loading ===== */
.loading {
  text-align: center;
  padding: 80rpx;
  color: #B97500;
  font-size: 28rpx;
}

/* ===== 数字卡 ===== */
.num-area {
  display: flex;
  gap: 20rpx;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.num-area.shake {
  animation: shake 0.32s;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8rpx); }
  40% { transform: translateX(8rpx); }
  60% { transform: translateX(-6rpx); }
  80% { transform: translateX(6rpx); }
}
.num-card {
  flex: 1;
  aspect-ratio: 1;
  background: linear-gradient(145deg, #FFB74D 0%, #FB8C00 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(230, 81, 0, 0.30);
  transition: all 0.2s;
}
.num-card:active {
  transform: scale(0.94);
}
.num-card.used {
  background: #D7CCC8;
  box-shadow: none;
  opacity: 0.5;
}
.num-text {
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 96rpx;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.2);
}

/* ===== 表达式条 ===== */
.expr-area {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(229, 81, 0, 0.08);
}
.expr-scroll {
  width: 100%;
  white-space: nowrap;
  min-height: 64rpx;
  background: #FFF1D6;
  border-radius: 12rpx;
  padding: 10rpx 16rpx;
  margin-bottom: 14rpx;
}
.expr-inner {
  display: inline-flex;
  align-items: center;
  min-height: 44rpx;
}
.expr-placeholder {
  color: #C49460;
  font-size: 24rpx;
  line-height: 44rpx;
}
.expr-token {
  font-size: 40rpx;
  font-weight: bold;
  margin: 0 4rpx;
  font-family: 'Courier New', monospace;
}
.tk-num { color: #BF360C; }
.tk-op  { color: #E65100; }
.expr-actions {
  display: flex;
  gap: 14rpx;
  justify-content: flex-end;
}
.expr-btn {
  padding: 10rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #fff;
}
.btn-back  { background: #FFA726; }
.btn-clear { background: #BCAAA4; }

/* ===== 运算符按钮 ===== */
.op-area {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14rpx;
  margin-bottom: 28rpx;
}
.op-btn {
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx 0;
  text-align: center;
  box-shadow: 0 3rpx 10rpx rgba(229, 81, 0, 0.10);
  transition: transform 0.15s;
}
.op-btn:active { transform: scale(0.94); }
.op-text {
  font-family: 'Courier New', monospace;
  font-size: 42rpx;
  font-weight: bold;
  color: #E65100;
}

/* ===== 反馈 & 主操作 ===== */
.feedback {
  text-align: center;
  margin-bottom: 24rpx;
  min-height: 40rpx;
}
.fb-text { font-size: 28rpx; }
.fb-ok  { color: #2E7D32; }
.fb-err { color: #C62828; }

.main-actions {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.action {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 20rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  color: #fff;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
.action:active { transform: scale(0.97); }
.action-submit { background: linear-gradient(135deg, #66BB6A 0%, #388E3C 100%); }
.action-submit.disabled { background: #BDBDBD; opacity: 0.6; }
.action-hint   { background: linear-gradient(135deg, #FFB74D 0%, #F57C00 100%); }
.action-skip   { background: linear-gradient(135deg, #90A4AE 0%, #546E7A 100%); }

.solution-box {
  background: #FFF3E0;
  border: 2rpx dashed #FFB74D;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.sol-label {
  font-size: 22rpx;
  color: #BF6A00;
  background: #FFB74D;
  color: #fff;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.sol-text {
  font-family: 'Courier New', monospace;
  font-size: 30rpx;
  font-weight: bold;
  color: #BF360C;
  flex: 1;
}

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
  from { opacity: 0; }
  to { opacity: 1; }
}
.win-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 60rpx 80rpx;
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
.win-emoji {
  font-size: 96rpx;
}
.win-title {
  font-size: 44rpx;
  font-weight: 500;
  color: #2E7D32;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.win-score {
  font-size: 56rpx;
  font-weight: bold;
  color: #E65100;
}
.win-streak {
  font-size: 26rpx;
  color: #8B5A00;
}
.win-btn {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #FFB74D 0%, #F57C00 100%);
  color: #fff;
  padding: 18rpx 60rpx;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
</style>
