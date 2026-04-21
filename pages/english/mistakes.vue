<template>
  <view class="container">
    <PageHeader title="英语错题本" theme="english" />

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
    <view class="wrong-list">
      <view v-if="displayList.length === 0" class="empty">
        <text class="empty-text">{{ viewMode === 'due' ? '今天没有待复习的题目' : '暂无错题，继续加油！' }}</text>
      </view>

      <view
        v-for="r in displayList"
        :key="r._id"
        :class="['wrong-item', r.mastered && 'mastered']"
      >
        <text class="item-emoji">{{ r.emoji || '🔤' }}</text>
        <view class="item-info">
          <text class="item-word">{{ r.word }}</text>
          <text class="item-zh">{{ r.zh || '' }}</text>
        </view>
        <view class="item-meta">
          <text class="wrong-count">错 {{ r.wrongCount }} 次</text>
          <text v-if="r.mastered" class="mastered-badge">已掌握</text>
          <text v-else class="box-badge">Box {{ r.box || 1 }}</text>
        </view>
      </view>
    </view>

    <!-- 底部重练按钮 -->
    <view class="bottom-bar" v-if="stats.dueCount > 0 || stats.unmasteredCount > 0">
      <view class="practice-btn" @click="startPractice">
        开始重练（{{ viewMode === 'due' ? '今日 ' + stats.dueCount : '全部 ' + stats.unmasteredCount }} 题）
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import { getAllWrongList, getDueList, getWrongStats } from '../../utils/english/mistakes.js'

const stats = ref({ total: 0, unmasteredCount: 0, masteredCount: 0, dueCount: 0 })
const allList = ref([])
const dueList = ref([])
const viewMode = ref('due')

const displayList = computed(() => {
  return viewMode.value === 'due' ? dueList.value : allList.value
})

function refresh() {
  stats.value = getWrongStats()
  allList.value = getAllWrongList()
  dueList.value = getDueList()
}

function startPractice() {
  uni.navigateTo({ url: '/pages/english/mistakes-practice' })
}

onShow(() => { refresh() })
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #F5FBFB;
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx;
}

/* 统计卡 */
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
  color: #26A69A;
}
.stat-num.due-num { color: #FF5722; }
.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
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
  background: #26A69A;
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
  gap: 20rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.wrong-item.mastered { opacity: 0.5; }

.item-emoji { font-size: 56rpx; }
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.item-word { font-size: 34rpx; font-weight: bold; color: #333; }
.item-zh { font-size: 24rpx; color: #888; }

.item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  flex-shrink: 0;
}
.wrong-count { font-size: 24rpx; color: #FF5722; }

.box-badge {
  font-size: 20rpx;
  color: #26A69A;
  padding: 4rpx 12rpx;
  background: #E0F2F1;
  border-radius: 12rpx;
}
.mastered-badge {
  font-size: 20rpx;
  color: #4CAF50;
  font-weight: bold;
  padding: 4rpx 12rpx;
  background: #E8F5E9;
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
  background: linear-gradient(135deg, #26A69A, #00897B);
  color: #fff;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
  box-shadow: 0 6rpx 20rpx rgba(38,166,154,0.3);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.practice-btn:active { transform: scale(0.97); }
</style>
