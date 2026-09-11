<template>
  <view class="container">
    <!-- Header -->
    <PageHeader title="练习记录" theme="math" />

    <!-- Tab Bar -->
    <view class="tab-row">
      <text
        v-for="(tab, i) in tabs"
        :key="i"
        :class="['tab-btn', activeTab === tab.value && 'active']"
        @click="switchTab(tab.value)"
      >{{ tab.label }}</text>
    </view>

    <!-- Record List -->
    <scroll-view scroll-y class="record-list">
      <view v-if="filteredList.length === 0" class="empty">
        <text class="empty-text">暂无记录</text>
      </view>

      <view
        v-for="(record, index) in filteredList"
        :key="record.id"
        class="record-card"
      >
        <!-- Card Header (clickable) -->
        <view class="card-header" @click="toggleExpand(index)">
          <view class="card-header-left">
            <!-- Type Badge -->
            <text
              :class="['type-badge', record.type === 'online' ? 'badge-online' : 'badge-print']"
            >{{ record.type === 'online' ? '在线' : '打印' }}</text>

            <!-- Difficulty -->
            <text class="difficulty-name">{{ getLevelName(record.level) }}</text>

            <!-- Question Count -->
            <text class="question-count">{{ record.questions ? record.questions.length : 0 }} 题</text>
          </view>

          <view class="card-header-right">
            <view class="card-meta">
              <!-- Online: accuracy + time -->
              <view v-if="record.type === 'online'" class="meta-row">
                <text class="accuracy-text">{{ getAccuracy(record) }}%</text>
                <text class="time-text">{{ formatTime(record.elapsed) }}</text>
              </view>
              <!-- Print: label -->
              <view v-else class="meta-row">
                <text class="print-label">打印练习</text>
              </view>
              <text class="date-text">{{ formatDate(record.createdAt) }}</text>
            </view>
            <text class="expand-arrow">{{ expandedIndex === index ? '▼' : '▶' }}</text>
          </view>
        </view>

        <!-- Expanded Detail -->
        <view v-if="expandedIndex === index" class="card-detail">
          <view class="detail-grid">
            <view
              v-for="(q, qi) in record.questions"
              :key="qi"
              :class="['grid-item',
                record.type === 'online' && q.isCorrect === false && 'grid-item-wrong',
                (q.type === 'hundredChart' || q.type === 'triangle' || q.type === 'triangle-free' || q.type === 'square') && 'grid-item-chart']"
            >
              <!-- 百数表：mini 网格 -->
              <template v-if="q.type === 'hundredChart'">
                <view class="mini-chart-wrap">
                  <view class="mini-chart" :style="{ gridTemplateColumns: `repeat(${parseChart(q.expr).cols}, 40rpx)` }">
                    <template v-for="r in parseChart(q.expr).rows" :key="r">
                      <template v-for="c in parseChart(q.expr).cols" :key="c">
                        <text v-if="`${r-1},${c-1}` in parseChart(q.expr).cellMap"
                          :class="['mc-cell', `${r-1},${c-1}` === parseChart(q.expr).centerKey ? 'mc-center' : 'mc-ans']"
                        >{{ parseChart(q.expr).cellMap[`${r-1},${c-1}`] }}</text>
                        <view v-else class="mc-empty" />
                      </template>
                    </template>
                  </view>
                  <text v-if="record.type === 'online' && q.isCorrect !== false" class="grid-correct"> ✓</text>
                  <text v-if="record.type === 'online' && q.isCorrect === false" class="grid-answer"> ✗</text>
                </view>
              </template>
              <!-- 三角形填数（含自由填） -->
              <template v-else-if="q.type === 'triangle' || q.type === 'triangle-free'">
                <view class="mini-shape-wrap">
                  <view class="mini-tri">
                    <view class="mt-row mt-row-1">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('A') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.A }}</text>
                    </view>
                    <view class="mt-row mt-row-2">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('AB') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.AB }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('AC') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.AC }}</text>
                    </view>
                    <view class="mt-row">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('B') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.B }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('BC') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.BC }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('C') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.C }}</text>
                    </view>
                  </view>
                  <text v-if="record.type === 'online' && q.isCorrect !== false" class="grid-correct"> ✓</text>
                  <text v-if="record.type === 'online' && q.isCorrect === false" class="grid-answer"> ✗</text>
                </view>
              </template>
              <!-- 方形填数 -->
              <template v-else-if="q.type === 'square'">
                <view class="mini-shape-wrap">
                  <view class="mini-sq">
                    <view class="ms-row">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('A') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.A }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('AB') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.AB }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('B') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.B }}</text>
                    </view>
                    <view class="ms-row">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('DA') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.DA }}</text>
                      <view class="mt-empty" />
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('BC') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.BC }}</text>
                    </view>
                    <view class="ms-row">
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('D') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.D }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('CD') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.CD }}</text>
                      <text :class="['mt-c', parseShape(q.expr).shown.includes('C') ? 'mc-center' : 'mc-ans']">{{ parseShape(q.expr).vals.C }}</text>
                    </view>
                  </view>
                  <text v-if="record.type === 'online' && q.isCorrect !== false" class="grid-correct"> ✓</text>
                  <text v-if="record.type === 'online' && q.isCorrect === false" class="grid-answer"> ✗</text>
                </view>
              </template>
              <!-- 填运算符(单边+双边) -->
              <template v-else-if="q.type === 'fillOp' || q.type === 'fillOp2'">
                <template v-if="record.type === 'online' && q.isCorrect !== false">
                  <text class="grid-expr">{{ formatOpExpr(q) }}</text>
                  <text class="grid-correct"> ✓</text>
                </template>
                <template v-else-if="record.type === 'online'">
                  <text class="grid-expr">{{ formatOpExpr(q) }}</text>
                  <text class="grid-answer"> ✗</text>
                </template>
                <template v-else>
                  <text class="grid-expr">{{ formatOpExpr(q) }}</text>
                </template>
              </template>
              <!-- 普通题 -->
              <template v-else>
                <!-- 打印记录 -->
                <template v-if="record.type !== 'online'">
                  <text class="grid-expr">{{ exprParts(q.expr).before }}</text>
                  <text class="grid-answer">{{ q.answer }}</text>
                  <text class="grid-expr">{{ exprParts(q.expr).after }}</text>
                </template>
                <!-- 在线答对 -->
                <template v-else-if="q.isCorrect !== false">
                  <text class="grid-expr">{{ exprParts(q.expr).before }}</text>
                  <text class="grid-correct">{{ q.answer }}</text>
                  <text class="grid-expr">{{ exprParts(q.expr).after }}</text>
                  <text class="grid-correct"> ✓</text>
                </template>
                <!-- 在线答错 -->
                <template v-else>
                  <text class="grid-expr">{{ exprParts(q.expr).before }}</text>
                  <text class="grid-wrong-user">{{ q.userAnswer || '?' }}</text>
                  <text class="grid-answer"> → {{ q.answer }}</text>
                  <text class="grid-expr">{{ exprParts(q.expr).after }}</text>
                </template>
              </template>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import { getHistory } from '../../utils/math/mathStorage.js'
import { LEVEL_CONFIG } from '../../utils/math/questionEngine.js'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'

let sessionGrade

const tabs = [
  { label: '全部', value: 'all' },
  { label: '在线', value: 'online' },
  { label: '打印', value: 'print' },
]

const activeTab = ref('all')
const expandedIndex = ref(-1)
const records = ref([])

function switchTab(value) {
  activeTab.value = value
  expandedIndex.value = -1
}

function toggleExpand(index) {
  expandedIndex.value = expandedIndex.value === index ? -1 : index
}

const filteredList = computed(() => {
  if (activeTab.value === 'all') return records.value
  return records.value.filter(r => r.type === activeTab.value)
})

function getLevelName(level) {
  if (level === 'mix') return '混合'
  const cfg = LEVEL_CONFIG[level]
  return cfg ? cfg.name : String(level)
}

function getAccuracy(record) {
  if (!record.questions) return 0
  const total = record.questions.length
  if (total === 0) return 0
  // 兼容两种格式：q.isCorrect 或 record.correct
  if (record.correct != null) return Math.round((record.correct / total) * 100)
  const correct = record.questions.filter(q => q.isCorrect !== false).length
  return Math.round((correct / total) * 100)
}

// 百数表 JSON 解析
function parseChart(exprStr) {
  try { return JSON.parse(exprStr) } catch { return { center: 0, rows: 0, cols: 0, cellMap: {}, centerKey: '', hiddenKeys: [] } }
}

// 图形填数 JSON 解析
function parseShape(exprStr) {
  try { return JSON.parse(exprStr) } catch { return { target: 0, vals: {}, shown: [], hidden: [] } }
}

// 填运算符：把 ○ 替换为实际答案
function formatOpExpr(q) {
  if (q.type === 'fillOp2') {
    const ops = (q.answer || '').split(',')
    const parts = q.expr.split('○')
    if (parts.length === 3 && ops.length === 2) {
      return `${parts[0].trim()} ${ops[0]} ${parts[1].trim()} ${ops[1]} ${parts[2].trim()}`
    }
  }
  return q.expr.replace('○', q.answer || '?')
}

// 拆算式为答案前后两部分
// 填空 "__ + 3 = 10" → { before: "", after: " + 3 = 10" }
// 比大小 "8 ○ 11" → { before: "8 ", after: " 11" }
// 普通 "3 + 5" → { before: "3 + 5 = ", after: "" }
function exprParts(expr) {
  if (expr.includes('__')) {
    const i = expr.indexOf('__')
    return { before: expr.slice(0, i), after: expr.slice(i + 2) }
  }
  if (expr.includes('○')) {
    const i = expr.indexOf('○')
    return { before: expr.slice(0, i), after: expr.slice(i + 1) }
  }
  return { before: expr + ' = ', after: '' }
}


function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const M = d.getMonth() + 1
  const D = d.getDate()
  const HH = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${M}/${D} ${HH}:${mm}`
}

onShow(async () => {
  await awaitLearningSession()
  if (!sessionGrade) sessionGrade = openCourseGradeSession()
  records.value = getHistory(sessionGrade)
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #F0F4F9;
  display: flex;
  flex-direction: column;
}

.container {
  background: #F0F4F9;
  background-image:
    linear-gradient(rgba(66,165,245,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66,165,245,0.05) 1px, transparent 1px);
  background-size: 40rpx 40rpx;
}

/* Tab Bar */
.tab-row {
  display: flex;
  padding: 20rpx 20rpx 16rpx;
  gap: 12rpx;
  background: transparent;
}

.tab-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #6B88A3;
  background: #fff;
  font-weight: 500;
  border: 2rpx solid #D8E4F0;
  box-shadow: 0 2rpx 8rpx rgba(30,90,142,0.04);
  transition: all 0.2s cubic-bezier(.4,0,.2,1);
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

.tab-btn.active {
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  border-color: transparent;
  font-weight: bold;
  box-shadow: 0 4rpx 12rpx rgba(66,165,245,0.25);
}

/* Record List */
.record-list {
  flex: 1;
  padding: 8rpx 20rpx 40rpx;
}

/* Empty State */
.empty {
  text-align: center;
  padding: 160rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #8EA8BF;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 4rpx;
}

/* Record Card */
.record-card {
  position: relative;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 14rpx rgba(30,90,142,0.05);
  border: 2rpx solid #D8E4F0;
  transition: transform 0.2s;
}
.record-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background: linear-gradient(180deg, #42A5F5, #1E88E5);
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
}

.card-header-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex: 1;
  min-width: 0;
}

.card-header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex-shrink: 0;
}

/* Type Badge */
.type-badge {
  font-size: 20rpx;
  font-weight: 900;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  color: #fff;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 2rpx;
}

.badge-online {
  background: #1E5A8E;
}

.badge-print {
  background: #8EA8BF;
}

/* Difficulty + Count */
.difficulty-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #0F2B48;
}

.question-count {
  font-size: 24rpx;
  color: #6B88A3;
  font-family: 'Courier New', 'Consolas', monospace;
  padding: 2rpx 10rpx;
  background: #E3F0FA;
  border-radius: 6rpx;
}

/* Meta */
.card-meta {
  text-align: right;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.accuracy-text {
  font-size: 30rpx;
  font-weight: 900;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
}

.time-text {
  font-size: 22rpx;
  color: #6B88A3;
  font-family: 'Courier New', 'Consolas', monospace;
}

.print-label {
  font-size: 22rpx;
  color: #8EA8BF;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

.date-text {
  font-size: 20rpx;
  color: #8EA8BF;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

/* Expand Arrow */
.expand-arrow {
  font-size: 20rpx;
  color: #2A7AB8;
  margin-left: 4rpx;
  transition: transform 0.2s;
}

/* Card Detail */
.card-detail {
  border-top: 2rpx dashed #D8E4F0;
  padding: 18rpx 20rpx;
  background: #F7FAFD;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4rpx 8rpx;
  font-size: 26rpx;
  line-height: 1.8;
}
@media (min-width: 768px) {
  .detail-grid {
    grid-template-columns: repeat(4, 1fr);
    font-size: 24rpx;
  }
}

.grid-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
}

.grid-item-wrong {
  background: #FFEBEE;
  border: 1rpx solid #FFCDD2;
}

/* 百数表占满整行 */
.grid-item-chart {
  grid-column: 1 / -1;
  white-space: normal;
  overflow: visible;
}

.mini-chart-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.mini-chart {
  display: grid;
  gap: 2rpx;
}
.mc-cell {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: bold;
  border-radius: 4rpx;
}
.mc-center {
  background: #E3F2FD;
  color: #1565C0;
}
.mc-ans {
  background: #FFF3E0;
  color: #E65100;
}
.mc-empty {
  width: 40rpx;
  height: 40rpx;
}

/* 图形填数历史 mini 布局 */
.mini-shape-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.mt-c {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: bold;
}
.mt-empty { width: 36rpx; height: 36rpx; }
.mini-tri { display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.mt-row { display: flex; justify-content: center; gap: 4rpx; }
.mt-row-2 { gap: 24rpx; }
.mini-sq { display: flex; flex-direction: column; gap: 2rpx; }
.ms-row { display: flex; justify-content: center; gap: 4rpx; }

.grid-expr {
  color: #333;
  font-family: monospace;
}

.grid-answer {
  font-weight: bold;
  color: #E53935;
  font-family: monospace;
}

.grid-correct {
  color: #4CAF50;
  font-weight: bold;
  font-family: monospace;
}

.grid-wrong-user {
  color: #999;
  text-decoration: line-through;
  font-family: monospace;
  margin-right: 4rpx;
}
</style>
