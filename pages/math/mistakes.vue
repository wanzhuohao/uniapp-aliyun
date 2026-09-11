<template>
  <view class="container">
    <PageHeader title="错题本" theme="math" />

    <!-- 统计概览 -->
    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">{{ stats.total }}</text>
        <text class="stat-label">总错题</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.unmasteredCount }}</text>
        <text class="stat-label">未掌握</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.masteredCount }}</text>
        <text class="stat-label">已掌握</text>
      </view>
      <view class="stat-card">
        <text class="stat-num due-num">{{ stats.dueCount }}</text>
        <text class="stat-label">今日待复习</text>
      </view>
    </view>

    <!-- 高频错题 TOP5 -->
    <view class="section" v-if="stats.top5 && stats.top5.length > 0">
      <text class="section-title">高频错题 TOP5</text>
      <view class="top5-list">
        <view class="top5-item" v-for="(item, i) in stats.top5" :key="item.id">
          <text class="top5-rank">{{ i + 1 }}</text>
          <text class="top5-expr">{{ formatExprShort(item) }}</text>
          <text class="top5-count">错 {{ item.wrongCount }} 次</text>
        </view>
      </view>
    </view>

    <!-- 视图切换 -->
    <view class="tab-row">
      <text :class="['tab-btn', viewMode === 'due' && 'active']" @click="viewMode = 'due'">
        待复习 {{ stats.dueCount }}
      </text>
      <text :class="['tab-btn', viewMode === 'all' && 'active']" @click="viewMode = 'all'">
        全部 {{ stats.total }}
      </text>
    </view>

    <!-- 错题列表 -->
    <scroll-view scroll-y class="wrong-list">
      <view v-if="displayList.length === 0" class="empty">
        <text class="empty-text">{{ viewMode === 'due' ? '今天没有待复习的题目' : '暂无错题，继续加油！' }}</text>
      </view>

      <view
        v-for="item in displayList"
        :key="item.id"
        :class="['wrong-item', item.mastered && 'mastered']"
      >
        <view class="wrong-main">
          <text class="wrong-expr">{{ formatExprShort(item) }}</text>
          <view class="wrong-meta">
            <text class="wrong-count">错 {{ item.wrongCount }} 次</text>
            <text v-if="item.mastered" class="mastered-badge">已掌握</text>
            <text v-else class="box-badge">Box {{ item.box || 1 }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 重练按钮 -->
    <view class="bottom-bar" v-if="stats.dueCount > 0 || stats.unmasteredCount > 0">
      <view class="practice-btn" @click="goPractice">
        开始重练（{{ viewMode === 'due' ? '今日 ' + stats.dueCount : '全部 ' + stats.unmasteredCount }} 题）
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import { getWrongStats, getAllWrong, getDueList } from '../../utils/math/mathStorage.js'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'

let sessionGrade

const stats = ref({ total: 0, unmasteredCount: 0, masteredCount: 0, dueCount: 0, top5: [] })
const allList = ref([])
const dueList = ref([])
const viewMode = ref('due')

const displayList = computed(() => {
  return viewMode.value === 'due' ? dueList.value : allList.value
})

// 缩短表达式显示
function formatExprShort(item) {
  if (item.type === 'hundredChart') {
    try {
      const data = JSON.parse(item.expr)
      return `百数表(${data.center})`
    } catch { return '百数表' }
  }
  if (item.type === 'triangle') {
    try {
      const data = JSON.parse(item.expr)
      return `三角填数(和=${data.target})`
    } catch { return '三角填数' }
  }
  if (item.type === 'square') {
    try {
      const data = JSON.parse(item.expr)
      return `方形填数(和=${data.target})`
    } catch { return '方形填数' }
  }
  if (item.type === 'fillOp' || item.type === 'fillOp2') {
    return item.expr.replace(/○/g, '?')
  }
  if (item.expr.includes('__')) {
    return item.expr.replace('__', '?')
  }
  if (item.expr.includes('○')) {
    return item.expr.replace('○', '?')
  }
  return `${item.expr} = ${item.answer}`
}

function loadData() {
  stats.value = getWrongStats(sessionGrade)
  allList.value = getAllWrong(sessionGrade)
  dueList.value = getDueList(sessionGrade)
}

function goPractice() {
  uni.navigateTo({
    url: `/pages/math/mistakes-practice?mode=${viewMode.value}`
  })
}

onShow(async () => {
  await awaitLearningSession()
  if (!sessionGrade) sessionGrade = openCourseGradeSession()
  loadData()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #F0F4F9;
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  padding: 20rpx;
  gap: 12rpx;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 8rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.stat-num {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #42A5F5;
}
.stat-num.due-num { color: #FF5722; }
.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* TOP5 */
.section {
  margin: 0 20rpx 16rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}
.top5-list {
  background: #fff;
  border-radius: 16rpx;
  padding: 12rpx 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.top5-item {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.top5-item:last-child { border-bottom: none; }
.top5-rank {
  width: 40rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #FF5722;
  text-align: center;
}
.top5-expr {
  flex: 1;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-left: 12rpx;
  font-family: monospace;
}
.top5-count {
  font-size: 24rpx;
  color: #FF5722;
}

/* Tab */
.tab-row {
  display: flex;
  padding: 0 20rpx 12rpx;
  gap: 16rpx;
}
.tab-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #666;
  background: #fff;
  font-weight: 500;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  transition: all 0.2s cubic-bezier(.4,0,.2,1);
}
.tab-btn.active {
  background: #42A5F5;
  color: #fff;
  font-weight: bold;
}

/* 错题列表 */
.wrong-list {
  flex: 1;
  padding: 0 20rpx;
}
.empty {
  text-align: center;
  padding: 80rpx 0;
}
.empty-text {
  font-size: 28rpx;
  color: #bbb;
}

.wrong-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.wrong-item.mastered {
  opacity: 0.5;
}
.wrong-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.wrong-expr {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  font-family: monospace;
}
.wrong-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.wrong-count {
  font-size: 24rpx;
  color: #FF5722;
}
.mastered-badge {
  font-size: 20rpx;
  color: #4CAF50;
  font-weight: bold;
  padding: 4rpx 12rpx;
  background: #E8F5E9;
  border-radius: 12rpx;
}
.box-badge {
  font-size: 20rpx;
  color: #42A5F5;
  padding: 4rpx 12rpx;
  background: #E3F2FD;
  border-radius: 12rpx;
}

/* 底部重练按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.06);
}
.practice-btn {
  text-align: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
  box-shadow: 0 6rpx 20rpx rgba(66,165,245,0.3);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.practice-btn:active { transform: scale(0.97); }
</style>
