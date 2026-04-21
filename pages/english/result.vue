<template>
  <view class="result-page">
    <!-- 装饰气球 -->
    <view class="balloon balloon-1">🎈</view>
    <view class="balloon balloon-2">🎈</view>
    <view class="balloon balloon-3">⭐</view>
    <view class="balloon balloon-4">✨</view>

    <!-- 主表情 -->
    <view class="emoji-wrap">
      <text class="main-emoji">{{ mainEmoji }}</text>
    </view>

    <!-- 分数 -->
    <view class="score-wrap">
      <text class="score-num">{{ correct }}</text>
      <text class="score-divider">/</text>
      <text class="score-total">{{ total }}</text>
    </view>
    <text class="score-label">CORRECT</text>

    <!-- 激励 -->
    <text class="encourage">{{ encourageText }}</text>

    <!-- 按钮 -->
    <view class="actions">
      <view class="action-btn primary" @click="playAgain">
        <text>Play Again</text>
      </view>
      <view class="action-btn" @click="goHome">
        <text>返回主页</text>
      </view>
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
const rate = computed(() => total > 0 ? correct / total : 0)

const mainEmoji = computed(() => {
  if (correct === total && total > 0) return '🏆'
  if (rate.value >= 0.8) return '🌟'
  if (rate.value >= 0.6) return '👍'
  return '💪'
})

const encourageText = computed(() => {
  if (correct === total && total > 0) return 'Excellent! 全部答对！'
  if (rate.value >= 0.8) return 'Great job! 继续保持'
  if (rate.value >= 0.6) return 'Good! 再接再厉'
  return 'Keep going! 多练几次就会啦'
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
  background: linear-gradient(180deg, #F5FBFB 0%, #E0F2F1 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx 60rpx;
  position: relative;
  overflow: hidden;
}

/* 装饰 */
.balloon {
  position: absolute;
  font-size: 48rpx;
  animation: float 4s ease-in-out infinite;
}
.balloon-1 { top: 80rpx; left: 80rpx; animation-delay: 0s; }
.balloon-2 { top: 120rpx; right: 100rpx; animation-delay: 1s; font-size: 60rpx; }
.balloon-3 { top: 200rpx; left: 200rpx; animation-delay: 2s; font-size: 40rpx; }
.balloon-4 { top: 280rpx; right: 60rpx; animation-delay: 0.5s; font-size: 36rpx; }
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16rpx); }
}

/* 主表情 */
.emoji-wrap {
  margin-top: 60rpx;
  margin-bottom: 32rpx;
  width: 240rpx;
  height: 240rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(38,166,154,0.2);
  position: relative;
  z-index: 2;
}
.main-emoji {
  font-size: 140rpx;
  line-height: 1;
}

/* 分数 */
.score-wrap {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-top: 16rpx;
  z-index: 2;
}
.score-num {
  font-size: 160rpx;
  font-weight: 900;
  color: #26A69A;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  line-height: 1;
}
.score-divider {
  font-size: 80rpx;
  color: #8EA5A5;
  font-weight: bold;
}
.score-total {
  font-size: 80rpx;
  color: #6B8787;
  font-weight: bold;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.score-label {
  font-size: 22rpx;
  color: #6B8787;
  letter-spacing: 8rpx;
  font-weight: bold;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  margin-top: 8rpx;
  margin-bottom: 40rpx;
}

/* 激励 */
.encourage {
  font-size: 32rpx;
  color: #1F3A3A;
  font-weight: bold;
  letter-spacing: 2rpx;
  margin-bottom: 48rpx;
  text-align: center;
  z-index: 2;
}

/* 按钮 */
.actions {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  z-index: 2;
}
.action-btn {
  text-align: center;
  padding: 28rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: bold;
  background: #fff;
  color: #26A69A;
  border: 3rpx solid #B2DFDB;
  letter-spacing: 2rpx;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 8rpx 20rpx rgba(38,166,154,0.3);
  font-size: 34rpx;
}
</style>
