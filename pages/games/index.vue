<template>
  <view class="page">
    <PageHeader title="小游戏" theme="game" :homeOnBack="true" fallback="/pages/index/index" />

    <view class="container">
      <view class="hero">
        <text class="hero-badge">GAMES · 玩</text>
        <text class="hero-title">小游戏</text>
        <text class="hero-sub">边玩边学，词字句话样样有</text>
      </view>

      <view class="card card-idiom" @click="goTo('/pages/games/idiom-chain')">
        <view class="card-deco">
          <text class="deco-char c1">成</text>
          <text class="deco-char c2">语</text>
          <text class="deco-char c3">接</text>
          <text class="deco-char c4">龙</text>
        </view>
        <view class="card-main">
          <text class="card-tag">IDIOM CHAIN</text>
          <text class="card-title">成语接龙</text>
          <text class="card-desc">AI 陪你接，3 万条成语库</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <view class="placeholder">
        <text class="ph-text">更多小游戏正在路上…</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'

function goTo(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F2FA;
}
.container {
  padding: 40rpx 32rpx 60rpx;
}

.hero {
  padding: 0 8rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.hero-badge {
  font-size: 22rpx;
  color: #6B5B95;
  letter-spacing: 8rpx;
  font-weight: bold;
}
.hero-title {
  font-size: 64rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
  line-height: 1.2;
}
.hero-sub {
  font-size: 26rpx;
  color: #6B5B95;
  letter-spacing: 2rpx;
  margin-top: 8rpx;
}

.card {
  position: relative;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(124,77,255,0.10);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
  min-height: 180rpx;
}
.card:active { transform: scale(0.98); }

.card-deco {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: linear-gradient(135deg, #EDE4FB 0%, #C9B5FF 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  padding: 16rpx;
  gap: 4rpx;
}
.deco-char {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 40rpx;
  font-weight: 500;
  color: #fff;
  background: #7C4DFF;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 4rpx rgba(124,77,255,0.3);
}
.c1 { transform: rotate(-3deg); }
.c2 { transform: rotate(2deg); background: #5E35B1; }
.c3 { transform: rotate(3deg); background: #5E35B1; }
.c4 { transform: rotate(-2deg); }

.card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.card-tag {
  font-size: 20rpx;
  letter-spacing: 6rpx;
  font-weight: bold;
  color: #7C4DFF;
}
.card-title {
  font-size: 44rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
}
.card-desc {
  font-size: 24rpx;
  color: #6B5B95;
  margin-top: 4rpx;
}
.card-arrow {
  font-size: 48rpx;
  color: #B5A5D9;
  font-weight: bold;
  flex-shrink: 0;
}

.placeholder {
  margin-top: 48rpx;
  padding: 48rpx;
  text-align: center;
  background: rgba(255,255,255,0.5);
  border: 2rpx dashed #D6CBF0;
  border-radius: 24rpx;
}
.ph-text {
  font-size: 24rpx;
  color: #8B7DAA;
  letter-spacing: 2rpx;
}
</style>
