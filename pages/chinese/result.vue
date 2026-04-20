<template>
  <view class="result-page">
    <view class="result-card">
      <text class="score">{{ correct }}/{{ total }}</text>
      <text class="score-label">答对题数</text>

      <text class="encourage">{{ encourageText }}</text>
    </view>

    <view class="actions">
      <view class="action-btn primary" @click="playAgain">再来一轮</view>
      <view class="action-btn" @click="goHome">回到主页</view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const query = (() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$page?.options || page?.options || {}
})()

const correct = Number(query.correct) || 0
const total = Number(query.total) || 10

const encourageText = computed(() => {
  const rate = total > 0 ? correct / total : 0
  if (correct === total && total > 0) return '太棒了！全部答对！'
  if (rate >= 0.8) return '真厉害！继续保持！'
  if (rate >= 0.6) return '不错哦，继续加油！'
  return '没关系，多练几次就会了！'
})

function playAgain() {
  uni.navigateBack()
}

function goHome() {
  uni.navigateBack({ delta: 2 })
}
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.result-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 64rpx 48rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
  width: 100%;
  max-width: 600rpx;
}
.score {
  font-size: 96rpx;
  font-weight: bold;
  color: #42A5F5;
}
.score-label {
  display: block;
  font-size: 28rpx;
  color: #888;
  margin-bottom: 32rpx;
}
.encourage {
  font-size: 32rpx;
  color: #333;
  margin-top: 16rpx;
}
.actions {
  margin-top: 48rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
  max-width: 600rpx;
}
.action-btn {
  text-align: center;
  padding: 28rpx;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  border: 4rpx solid #E0E0E0;
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: #42A5F5;
  color: #fff;
  border-color: #42A5F5;
}
</style>
