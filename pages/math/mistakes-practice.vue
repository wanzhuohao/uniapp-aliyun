<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="confirmBack">←</view>
      <text class="progress-text">{{ answeredCount }}/{{ questions.length }}</text>
    </view>

    <!-- 空状态 -->
    <view v-if="questions.length === 0" class="empty-state">
      <text class="empty-text">没有需要重练的题目</text>
      <view class="action-btn" @click="goBack">返回错题本</view>
    </view>

    <!-- 答题列表 -->
    <scroll-view v-else-if="!submitted" scroll-y class="question-list">
      <view
        v-for="(q, i) in questions"
        :key="i"
        class="q-row"
        :class="{ done: q.userAnswer !== '' && q.userAnswer !== undefined }"
      >
        <text class="q-index">{{ i + 1 }}.</text>

        <!-- 比大小 -->
        <template v-if="q.type === 'compare'">
          <text class="q-expr">{{ splitCompare(q.expr)[0] }}</text>
          <view class="op-btns">
            <view :class="['op-btn', q.userAnswer === '＞' && 'selected']" @click="pickAnswer(i, '＞')">＞</view>
            <view :class="['op-btn', q.userAnswer === '＝' && 'selected']" @click="pickAnswer(i, '＝')">＝</view>
            <view :class="['op-btn', q.userAnswer === '＜' && 'selected']" @click="pickAnswer(i, '＜')">＜</view>
          </view>
          <text class="q-expr">{{ splitCompare(q.expr)[1] }}</text>
        </template>

        <!-- 填空 -->
        <template v-else-if="q.type === 'fill'">
          <text v-for="(part, pi) in splitFill(q.expr)" :key="pi" class="q-expr">
            <template v-if="part === '__'">
              <input class="q-input q-input-inline" type="number" :value="q.userAnswer"
                placeholder="?" @input="onInput(i, $event)" />
            </template>
            <template v-else>{{ part }}</template>
          </text>
        </template>

        <!-- 填运算符(单边) -->
        <template v-else-if="q.type === 'fillOp'">
          <text class="q-expr">{{ splitOp(q.expr)[0] }}</text>
          <view class="op-btns">
            <view :class="['op-btn', q.userAnswer === '+' && 'selected']" @click="pickAnswer(i, '+')">+</view>
            <view :class="['op-btn', q.userAnswer === '-' && 'selected']" @click="pickAnswer(i, '-')">-</view>
          </view>
          <text class="q-expr">{{ splitOp(q.expr)[1] }}</text>
        </template>

        <!-- 填运算符(双边) -->
        <template v-else-if="q.type === 'fillOp2'">
          <view class="fillop2-row">
            <text class="fillop2-num">{{ splitOp2(q.expr)[0] }}</text>
            <view class="fillop2-btns">
              <view :class="['fillop2-btn', getOp2(q, 0) === '+' && 'selected']" @click="selectOp2(i, 0, '+')">+</view>
              <view :class="['fillop2-btn', getOp2(q, 0) === '-' && 'selected']" @click="selectOp2(i, 0, '-')">-</view>
            </view>
            <text class="fillop2-num">{{ splitOp2(q.expr)[1] }}</text>
            <view class="fillop2-btns">
              <view :class="['fillop2-btn', getOp2(q, 1) === '+' && 'selected']" @click="selectOp2(i, 1, '+')">+</view>
              <view :class="['fillop2-btn', getOp2(q, 1) === '-' && 'selected']" @click="selectOp2(i, 1, '-')">-</view>
            </view>
            <text class="fillop2-num">{{ splitOp2(q.expr)[2] }}</text>
          </view>
        </template>

        <!-- 百数表 -->
        <template v-else-if="q.type === 'hundredChart'">
          <view class="hundred-chart" :style="{ gridTemplateColumns: `repeat(${chartCols(q)}, 72rpx)` }">
            <template v-for="r in chartRows(q)" :key="r">
              <template v-for="c in chartCols(q)" :key="c">
                <view v-if="hasCell(q, r-1, c-1)"
                  :class="['hc-cell', isCenter(q, r-1, c-1) && 'hc-center']">
                  <text v-if="isCenter(q, r-1, c-1)">{{ cellVal(q, r-1, c-1) }}</text>
                  <input v-else class="hc-input" type="number"
                    :value="chartAns(q, `${r-1},${c-1}`)"
                    placeholder="?" @input="onChartInput(i, `${r-1},${c-1}`, $event)" />
                </view>
                <view v-else class="hc-empty" />
              </template>
            </template>
          </view>
        </template>

        <!-- 三角形填数 -->
        <template v-else-if="q.type === 'triangle'">
          <view class="shape-wrap">
            <text class="shape-hint">每边之和 = {{ pShape(q).target }}</text>
            <view class="tri-layout">
              <view class="tri-row tri-row-1">
                <view :class="['shape-circle', pShape(q).shown.includes('A') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('A')">{{ pShape(q).vals.A }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'A')" placeholder="?" @input="onShapeInput(i,'A',$event)" />
                </view>
              </view>
              <view class="tri-row tri-row-2">
                <view :class="['shape-circle', pShape(q).shown.includes('AB') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('AB')">{{ pShape(q).vals.AB }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'AB')" placeholder="?" @input="onShapeInput(i,'AB',$event)" />
                </view>
                <view :class="['shape-circle', pShape(q).shown.includes('AC') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('AC')">{{ pShape(q).vals.AC }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'AC')" placeholder="?" @input="onShapeInput(i,'AC',$event)" />
                </view>
              </view>
              <view class="tri-row tri-row-3">
                <view :class="['shape-circle', pShape(q).shown.includes('B') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('B')">{{ pShape(q).vals.B }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'B')" placeholder="?" @input="onShapeInput(i,'B',$event)" />
                </view>
                <view :class="['shape-circle', pShape(q).shown.includes('BC') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('BC')">{{ pShape(q).vals.BC }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'BC')" placeholder="?" @input="onShapeInput(i,'BC',$event)" />
                </view>
                <view :class="['shape-circle', pShape(q).shown.includes('C') && 'shape-given']">
                  <text v-if="pShape(q).shown.includes('C')">{{ pShape(q).vals.C }}</text>
                  <input v-else class="shape-input" type="number" :value="sAns(q,'C')" placeholder="?" @input="onShapeInput(i,'C',$event)" />
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 方形填数 -->
        <template v-else-if="q.type === 'square'">
          <view class="shape-wrap">
            <text class="shape-hint">每边之和 = {{ pShape(q).target }}</text>
            <view class="sq-layout">
              <view class="sq-row" v-for="(row, ri) in [['A','AB','B'],['DA',null,'BC'],['D','CD','C']]" :key="ri">
                <template v-for="key in row" :key="key || 'empty'">
                  <view v-if="key" :class="['shape-circle', pShape(q).shown.includes(key) && 'shape-given']">
                    <text v-if="pShape(q).shown.includes(key)">{{ pShape(q).vals[key] }}</text>
                    <input v-else class="shape-input" type="number" :value="sAns(q,key)" placeholder="?" @input="onShapeInput(i,key,$event)" />
                  </view>
                  <view v-else class="shape-empty" />
                </template>
              </view>
            </view>
          </view>
        </template>

        <!-- 普通加减/连加减 -->
        <template v-else>
          <text class="q-expr">{{ q.expr }} =</text>
          <input class="q-input" type="number" :value="q.userAnswer"
            placeholder="?" @input="onInput(i, $event)" />
        </template>

        <!-- 批改结果 -->
        <text v-if="q.checked" :class="['q-result', q.isRight ? 'right' : 'wrong']">
          {{ q.isRight ? '✓' : '✗ ' + q.answer }}
        </text>
      </view>
    </scroll-view>

    <!-- 提交 / 完成 -->
    <view v-if="questions.length > 0 && !finished" class="submit-bar">
      <view v-if="!submitted" class="submit-btn" @click="submitAll">交卷</view>
      <view v-else class="submit-btn" @click="finish">完成</view>
    </view>

    <!-- 完成页 -->
    <view v-if="finished" class="finished-area">
      <text class="finished-title">本轮完成！</text>
      <text class="finished-stat">答对 {{ correctCount }} / {{ questions.length }}</text>
      <text v-if="masteredCount > 0" class="finished-mastered">本轮掌握 {{ masteredCount }} 题</text>
      <view class="result-actions">
        <view class="action-btn primary" @click="goBack">返回错题本</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getDueList, getAllWrong, recordCorrect, recordWrongAgain } from '../../utils/math/mathStorage.js'

const questions = ref([])
const submitted = ref(false)
const finished = ref(false)
const correctCount = ref(0)
const masteredCount = ref(0)

const answeredCount = computed(() =>
  questions.value.filter(q => q.userAnswer !== '' && q.userAnswer !== undefined).length
)

onLoad((options) => {
  const mode = options.mode || 'due'
  const list = mode === 'due' ? getDueList() : getAllWrong().filter(r => !r.mastered)
  questions.value = list.map(item => ({
    ...item,
    userAnswer: '',
    checked: false,
    isRight: false,
    _chartAnswers: {},
    _op2Answers: ['', ''],
    _shapeAnswers: {},
  }))
})

// ---- 拆分辅助 ----
function splitCompare(expr) {
  return expr.split('○').map(s => s.trim())
}
function splitFill(expr) {
  const i = expr.indexOf('__')
  if (i === -1) return [expr]
  return [expr.slice(0, i), '__', expr.slice(i + 2)]
}
function splitOp(expr) {
  return expr.split('○').map(s => s.trim())
}
function splitOp2(expr) {
  return expr.split('○').map(s => s.trim())
}

// ---- 百数表辅助 ----
function parseChart(q) {
  try { return JSON.parse(q.expr) } catch { return { rows: 0, cols: 0, cellMap: {}, centerKey: '' } }
}
function chartRows(q) { return parseChart(q).rows || 0 }
function chartCols(q) { return parseChart(q).cols || 0 }
function hasCell(q, r, c) { return `${r},${c}` in parseChart(q).cellMap }
function isCenter(q, r, c) { return `${r},${c}` === parseChart(q).centerKey }
function cellVal(q, r, c) { return parseChart(q).cellMap[`${r},${c}`] || '' }
function chartAns(q, key) { return q._chartAnswers[key] || '' }

function onChartInput(idx, key, e) {
  const q = questions.value[idx]
  q._chartAnswers[key] = e.detail.value
  const data = parseChart(q)
  q.userAnswer = JSON.stringify((data.hiddenKeys || []).map(k => q._chartAnswers[k] || ''))
}

// ---- 双边运算符辅助 ----
function getOp2(q, idx) { return q._op2Answers[idx] || '' }
function selectOp2(qIdx, opIdx, symbol) {
  const q = questions.value[qIdx]
  q._op2Answers[opIdx] = symbol
  q.userAnswer = q._op2Answers.join(',')
}

// ---- 图形填数辅助 ----
function pShape(q) {
  try { return JSON.parse(q.expr) } catch { return { target: 0, vals: {}, shown: [], hidden: [] } }
}
function sAns(q, key) { return (q._shapeAnswers || {})[key] || '' }
function onShapeInput(idx, key, e) {
  const q = questions.value[idx]
  if (!q._shapeAnswers) q._shapeAnswers = {}
  q._shapeAnswers[key] = e.detail.value
  const data = pShape(q)
  q.userAnswer = JSON.stringify(data.hidden.map(k => q._shapeAnswers[k] || ''))
}

// ---- 通用输入 ----
function onInput(idx, e) {
  questions.value[idx].userAnswer = e.detail.value
}
function pickAnswer(idx, val) {
  questions.value[idx].userAnswer = val
}

// ---- 交卷 ----
function submitAll() {
  uni.showModal({
    title: '确认交卷',
    content: `已答 ${answeredCount.value}/${questions.value.length} 题，确定交卷？`,
    success(res) {
      if (res.confirm) doSubmit()
    },
  })
}

function doSubmit() {
  submitted.value = true
  for (const q of questions.value) {
    q.checked = true
    q.isRight = String(q.userAnswer) === String(q.answer)
    if (q.isRight) {
      correctCount.value++
      const r = recordCorrect(q.id)
      if (r.mastered) masteredCount.value++
    } else {
      recordWrongAgain(q.id)
    }
  }
}

function finish() {
  finished.value = true
}

function goBack() {
  uni.navigateBack()
}

function confirmBack() {
  if (submitted.value || questions.value.length === 0) {
    goBack()
    return
  }
  uni.showModal({
    title: '退出重练',
    content: '确定退出？当前进度不会保存。',
    success(res) { if (res.confirm) goBack() },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn {
  font-size: 36rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0f0f0;
}
.back-btn:active { transform: scale(0.9); }
.progress-text {
  font-size: 28rpx;
  color: #999;
  font-weight: bold;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32rpx;
}
.empty-text {
  font-size: 32rpx;
  color: #888;
}

/* 题目列表 */
.question-list {
  flex: 1;
  padding: 16rpx 24rpx 140rpx;
}
.q-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  background: #fff;
  border-radius: 16rpx;
  border-left: 6rpx solid transparent;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.q-row.done { border-left-color: #42A5F5; }
.q-index {
  font-size: 24rpx;
  color: #bbb;
  width: 48rpx;
  text-align: right;
  flex-shrink: 0;
}
.q-expr {
  font-size: 34rpx;
  font-weight: bold;
}
.q-input {
  width: 120rpx;
  height: 60rpx;
  border: 3rpx solid #E0E0E0;
  border-radius: 12rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  background: #fff;
}
.q-input-inline {
  display: inline-block;
  width: 100rpx;
  height: 52rpx;
  margin: 0 4rpx;
  vertical-align: middle;
  border-bottom: 3rpx solid #42A5F5;
  border-top: none;
  border-left: none;
  border-right: none;
  border-radius: 0;
}

/* 选择按钮 */
.op-btns {
  display: flex;
  gap: 12rpx;
}
.op-btn {
  width: 72rpx;
  height: 56rpx;
  border: 3rpx solid #E0E0E0;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  color: #555;
}
.op-btn.selected {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}
.op-btn:active { transform: scale(0.93); }

/* 双边填运算符紧凑 */
.fillop2-row { display: flex; align-items: center; gap: 4rpx; }
.fillop2-num { font-size: 32rpx; font-weight: bold; white-space: nowrap; }
.fillop2-btns { display: flex; gap: 6rpx; }
.fillop2-btn {
  width: 52rpx; height: 48rpx;
  border: 3rpx solid #E0E0E0; border-radius: 8rpx;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: bold; background: #fff; color: #555;
}
.fillop2-btn.selected { background: #42A5F5; color: #fff; border-color: #42A5F5; }
.fillop2-btn:active { transform: scale(0.93); }

/* 百数表 */
.hundred-chart { display: grid; gap: 0; }
.hc-cell {
  width: 72rpx; height: 72rpx;
  border: 2rpx solid #ccc;
  display: flex; align-items: center; justify-content: center;
  font-size: 30rpx; font-weight: bold; background: #FFF8E1;
}
.hc-center { background: #E3F2FD; color: #1565C0; }
.hc-empty { width: 72rpx; height: 72rpx; }
.hc-input {
  width: 62rpx; height: 62rpx;
  text-align: center; font-size: 26rpx; font-weight: bold;
  border: none; background: transparent;
}

/* 图形填数 */
.shape-wrap { display: flex; flex-direction: column; align-items: center; width: 100%; }
.shape-hint { font-size: 24rpx; color: #999; margin-bottom: 12rpx; }
.shape-circle {
  width: 68rpx; height: 68rpx; border-radius: 50%;
  border: 3rpx solid #ccc; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; font-weight: bold; background: #FFF8E1;
}
.shape-given { background: #E3F2FD; color: #1565C0; border-color: #90CAF9; }
.shape-empty { width: 68rpx; height: 68rpx; }
.shape-input { width: 56rpx; height: 56rpx; text-align: center; font-size: 24rpx; font-weight: bold; border: none; background: transparent; }
.tri-layout { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.tri-row { display: flex; justify-content: center; gap: 16rpx; }
.tri-row-2 { gap: 72rpx; }
.sq-layout { display: flex; flex-direction: column; gap: 8rpx; }
.sq-row { display: flex; justify-content: center; gap: 16rpx; }

/* 批改结果 */
.q-result {
  font-size: 28rpx;
  font-weight: bold;
  margin-left: 8rpx;
}
.q-result.right { color: #4CAF50; }
.q-result.wrong { color: #E53935; }

/* 提交栏 */
.submit-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 24rpx 48rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
  z-index: 10;
}
.submit-btn {
  text-align: center;
  padding: 24rpx;
  background: #42A5F5;
  color: #fff;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
}
.submit-btn:active { transform: scale(0.97); }

/* 完成页 */
.finished-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
}
.finished-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #42A5F5;
  margin-bottom: 24rpx;
}
.finished-stat {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 12rpx;
}
.finished-mastered {
  font-size: 28rpx;
  color: #4CAF50;
  font-weight: bold;
  margin-bottom: 16rpx;
}
.result-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  width: 100%;
  max-width: 500rpx;
  margin-top: 48rpx;
}
.action-btn {
  text-align: center;
  padding: 24rpx;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  border: 4rpx solid #E0E0E0;
  color: #333;
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}
</style>
