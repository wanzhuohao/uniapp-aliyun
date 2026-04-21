<template>
  <view class="container">
    <PageHeader title="错题本" theme="chinese" />

    <view class="stats-row">
      <view class="stat-card">
        <text class="stat-num">{{ stats.pinyinCount }}</text>
        <text class="stat-label">拼音</text>
      </view>
      <view class="stat-card">
        <text class="stat-num">{{ stats.hanziCount }}</text>
        <text class="stat-label">汉字</text>
      </view>
      <view class="stat-card">
        <text class="stat-num due-num">{{ stats.dueCount }}</text>
        <text class="stat-label">今日待复习</text>
      </view>
    </view>

    <view class="tab-row">
      <text :class="['tab-btn', viewMode === 'due' && 'active']" @click="viewMode = 'due'">
        待复习 {{ stats.dueCount }}
      </text>
      <text :class="['tab-btn', viewMode === 'all' && 'active']" @click="viewMode = 'all'">
        全部 {{ stats.total }}
      </text>
    </view>

    <view class="section" v-if="trendData.length > 0">
      <TrendChart :data="trendData" title="近 7 天正确率" />
    </view>

    <view class="section" v-if="stats.top5 && stats.top5.length > 0">
      <text class="section-title">高频错字 TOP5</text>
      <view class="top5-list">
        <view class="top5-item" v-for="(item, i) in stats.top5" :key="item._id">
          <text class="top5-rank">{{ i + 1 }}</text>
          <text class="top5-char">{{ item.char }}</text>
          <text class="top5-type">{{ ({ pinyin: '拼音', hanzi: '汉字' })[item.type] || item.type }}</text>
          <text class="top5-count">错 {{ item.wrongCount }} 次</text>
        </view>
      </view>
    </view>

    <view class="filter-row">
      <text :class="['filter-btn', filter === '' && 'active']" @click="filter = ''">全部</text>
      <text :class="['filter-btn', filter === 'pinyin' && 'active']" @click="filter = 'pinyin'">拼音</text>
      <text :class="['filter-btn', filter === 'hanzi' && 'active']" @click="filter = 'hanzi'">汉字</text>
    </view>

    <view class="wrong-list">
      <view
        v-for="item in filteredList"
        :key="item._id"
        :class="['wrong-item', item.mastered && 'mastered']"
      >
        <view class="wrong-char">{{ item.char }}</view>
        <view class="wrong-info">
          <text class="wrong-type">{{ ({ pinyin: '拼音', hanzi: '汉字' })[item.type] || item.type }}</text>
          <text class="wrong-unit">{{ item.unit }}</text>
        </view>
        <view class="wrong-meta">
          <text class="wrong-count">错 {{ item.wrongCount }} 次</text>
          <text v-if="item.mastered" class="mastered-badge">已掌握</text>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty">
        <text>暂无错题记录</text>
      </view>
    </view>

    <view class="bottom-bar" v-if="stats.dueCount > 0 || stats.unmasteredCount > 0">
      <button class="practice-btn" @click="goPractice">
        开始重练（今日 {{ stats.dueCount }} 题待复习）
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import { getAllWrongList, getWrongStats } from '../../utils/chinese/mistakes.js'
import { getRecentLogs } from '../../utils/chinese/practiceLog.js'
import TrendChart from '../../components/chinese/TrendChart.vue'

const stats = ref({
  total: 0,
  pinyinCount: 0,
  hanziCount: 0,
  unmasteredCount: 0,
  masteredCount: 0,
  top5: [],
  dueCount: 0,
  pinyinDue: 0,
  hanziDue: 0,
})
const wrongList = ref([])
const trendData = ref([])
const filter = ref('')
const viewMode = ref('due')

const filteredList = computed(() => {
  const now = Date.now()
  let list = viewMode.value === 'due'
    ? wrongList.value.filter(r => r.nextReviewAt <= now)
    : wrongList.value

  if (!filter.value) return list
  return list.filter(item => item.type === filter.value)
})

function loadData() {
  stats.value = getWrongStats()
  wrongList.value = getAllWrongList()
  trendData.value = getRecentLogs(7).map(d => ({
    label: d.label,
    rate: d.accuracy != null ? d.accuracy : null,
  }))
}

onShow(() => {
  loadData()
})

function goPractice() {
  uni.navigateTo({ url: '/pages/chinese/mistakes-practice' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #FAF6EE;
  padding-bottom: 120rpx;
}

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
  color: #A62D33;
}

.stat-num.due-num { color: #FF5722; }

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

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
  background: #A62D33;
  color: #fff;
  font-weight: bold;
}

.section {
  margin: 0 20rpx 16rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
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

.top5-char {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-left: 12rpx;
}

.top5-type {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}

.top5-count {
  margin-left: auto;
  font-size: 24rpx;
  color: #FF5722;
}

.filter-row {
  display: flex;
  padding: 0 20rpx 12rpx;
  gap: 16rpx;
}

.filter-btn {
  padding: 12rpx 32rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
  color: #666;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
  transition: all 0.2s cubic-bezier(.4,0,.2,1);
}

.filter-btn.active {
  background: #A62D33;
  color: #fff;
}

.wrong-list {
  flex: 1;
  padding: 0 20rpx;
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

.wrong-item.mastered { opacity: 0.5; }

.wrong-char {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  width: 80rpx;
  text-align: center;
  flex-shrink: 0;
}

.wrong-info {
  flex: 1;
  margin-left: 20rpx;
}

.wrong-type { font-size: 26rpx; color: #666; }
.wrong-unit {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
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

.empty {
  text-align: center;
  padding: 80rpx 0;
}

.empty-text,
.empty text {
  font-size: 28rpx;
  color: #bbb;
}

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
  background: linear-gradient(135deg, #A62D33, #7F1F25);
  color: #fff;
  border: none;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
  box-shadow: 0 6rpx 20rpx rgba(166,45,51,0.3);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.practice-btn:active { transform: scale(0.97); }
</style>
