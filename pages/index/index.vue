<template>
  <view class="container">
    <view class="header">
      <text class="title">学习小天地</text>
    </view>

    <view class="cards">
      <view class="card card-math" @click="goTo('/pages/math/index')">
        <text class="card-icon">🔢</text>
        <text class="card-title">数学</text>
        <text class="card-desc">在线练习、打印出题</text>
      </view>
      <view class="card card-chinese" @click="goTo('/pages/chinese/index')">
        <text class="card-icon">📖</text>
        <text class="card-title">语文</text>
        <text class="card-desc">生字、拼音、汉字、错题本</text>
      </view>
    </view>
  </view>
</template>

<script setup>
function goTo(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%);
  padding: 40rpx 30rpx;
}
.header {
  padding: 20rpx 10rpx 40rpx;
}
.title {
  font-size: 42rpx;
  font-weight: bold;
  color: #fff;
}
.cards {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  margin-top: 20rpx;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card:active {
  transform: scale(0.98);
  opacity: 0.9;
}
.card-icon { font-size: 56rpx; }
.card-title { font-size: 36rpx; font-weight: bold; color: #333; }
.card-desc { font-size: 26rpx; color: #888; }
.card-math { border-left: 8rpx solid #42A5F5; }
.card-chinese { border-left: 8rpx solid #FFA726; }
</style>
