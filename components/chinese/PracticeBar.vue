<template>
  <view class="practice-bar">
    <view class="back-btn" @click="goBack">←</view>
    <view v-if="total > 0" class="progress-dots">
      <view
        v-for="i in total"
        :key="i"
        class="dot"
        :class="{ active: i <= current, done: i < current }"
      />
    </view>
    <text v-if="total > 0" class="progress-text">{{ current }}/{{ total }}</text>
  </view>
</template>

<script setup>
const props = defineProps({
  current: { type: Number, default: 0 },
  total: { type: Number, default: 10 },
})

function doBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/chinese/index' })
  }
}

function goBack() {
  // 答题中（total > 0）弹确认，避免误触丢失进度
  if (props.total > 0) {
    uni.showModal({
      title: '确认退出',
      content: '本轮练习还没做完，确定要退出吗？',
      success(res) { if (res.confirm) doBack() },
    })
  } else {
    doBack()
  }
}
</script>

<style scoped>
.back-btn {
  font-size: 36rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0f0f0;
  flex-shrink: 0;
}
.back-btn:active { transform: scale(0.9); background: #e0e0e0; }
.practice-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.progress-dots {
  display: flex;
  gap: 12rpx;
}
.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #E0E0E0;
  transition: all 0.3s;
}
.dot.active {
  background: #42A5F5;
  transform: scale(1.2);
}
.dot.done {
  background: #42A5F5;
}
.progress-text {
  font-size: 26rpx;
  color: #666;
  min-width: 72rpx;
  text-align: right;
}
</style>
