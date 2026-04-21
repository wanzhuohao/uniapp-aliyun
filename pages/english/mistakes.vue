<template>
  <view class="mistakes-page">
    <PageHeader title="英语错题本" />

    <view class="stats-card">
      <view class="stat">
        <text class="stat-num">{{ stats.total }}</text>
        <text class="stat-label">总错题</text>
      </view>
      <view class="stat">
        <text class="stat-num" style="color:#FF5722">{{ stats.dueCount }}</text>
        <text class="stat-label">待复习</text>
      </view>
      <view class="stat">
        <text class="stat-num" style="color:#66BB6A">{{ stats.masteredCount }}</text>
        <text class="stat-label">已掌握</text>
      </view>
    </view>

    <view class="actions">
      <view class="action-btn primary" @click="startPractice" v-if="stats.dueCount > 0">
        开始复习（{{ stats.dueCount }} 题）
      </view>
      <view class="action-btn" v-else>暂无待复习题目</view>
    </view>

    <view class="list-title" v-if="list.length > 0">错题列表</view>
    <view class="word-list">
      <view v-for="r in list" :key="r._id" class="word-item">
        <text class="item-emoji">{{ r.emoji || '🔤' }}</text>
        <view class="item-info">
          <text class="item-word">{{ r.word }}</text>
          <text class="item-zh">{{ r.zh || '' }}</text>
        </view>
        <view class="item-meta">
          <text class="box-badge" :class="'box-' + r.box">L{{ r.box }}</text>
          <text class="wrong-count">错 {{ r.wrongCount }} 次</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import { getAllWrongList, getWrongStats } from '../../utils/english/mistakes.js'

const list = ref([])
const stats = ref({ total: 0, dueCount: 0, masteredCount: 0 })

function refresh() {
  list.value = getAllWrongList()
  stats.value = getWrongStats()
}

function startPractice() {
  uni.navigateTo({ url: '/pages/english/mistakes-practice' })
}

onShow(() => { refresh() })
</script>

<style scoped>
.mistakes-page { min-height: 100vh; background: #F5F7FA; }

.stats-card {
  display: flex;
  justify-content: space-around;
  margin: 32rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-num { font-size: 52rpx; font-weight: bold; color: #26A69A; }
.stat-label { font-size: 24rpx; color: #888; margin-top: 8rpx; }

.actions {
  padding: 0 32rpx 24rpx;
}
.action-btn {
  padding: 28rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 30rpx;
  background: #fff;
  color: #888;
  border: 3rpx solid #E0E0E0;
}
.action-btn.primary {
  background: linear-gradient(135deg, #FF5722, #E64A19);
  color: #fff;
  border-color: #FF5722;
  font-weight: bold;
}
.action-btn.primary:active { transform: scale(0.97); }

.list-title {
  padding: 24rpx 32rpx 16rpx;
  font-size: 28rpx;
  color: #666;
  font-weight: bold;
}
.word-list { padding: 0 32rpx 48rpx; }
.word-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  padding: 24rpx;
  border-radius: 14rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.item-emoji { font-size: 56rpx; }
.item-info { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.item-word { font-size: 34rpx; font-weight: bold; color: #333; }
.item-zh { font-size: 24rpx; color: #888; }
.item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6rpx; }
.box-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 10rpx;
  color: #fff;
  background: #BDBDBD;
}
.box-1 { background: #EF5350; }
.box-2 { background: #FFA726; }
.box-3 { background: #42A5F5; }
.box-4 { background: #26A69A; }
.box-5 { background: #66BB6A; }
.wrong-count { font-size: 22rpx; color: #999; }
</style>
