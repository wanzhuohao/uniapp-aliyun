<template>
  <view class="container">
    <!-- Hero -->
    <view class="hero">
      <text class="hero-badge">LEARN · 学</text>
      <text class="hero-title">学习小天地</text>
      <text class="hero-sub">每天一点点，慢慢就会了</text>
    </view>

    <!-- 语文卡 -->
    <view class="card card-chinese" @click="goTo('/pages/chinese/index')">
      <view class="card-deco chinese-deco">
        <text class="deco-stamp">語</text>
      </view>
      <view class="card-main">
        <text class="card-tag">CHINESE</text>
        <text class="card-title">语文</text>
        <text class="card-desc">生字 · 拼音 · 汉字</text>
      </view>
      <text class="card-arrow">›</text>
    </view>

    <!-- 数学卡 -->
    <view class="card card-math" @click="goTo('/pages/math/index')">
      <view class="card-deco math-deco">
        <text class="deco-num">1</text>
        <text class="deco-num">2</text>
        <text class="deco-num">3</text>
        <text class="deco-sign">+</text>
        <text class="deco-sign">=</text>
      </view>
      <view class="card-main">
        <text class="card-tag">MATH</text>
        <text class="card-title">数学</text>
        <text class="card-desc">在线练习 · 打印出题</text>
      </view>
      <text class="card-arrow">›</text>
    </view>

    <!-- 英语卡 -->
    <view class="card card-english" @click="goTo('/pages/english/index')">
      <view class="card-deco english-deco">
        <text class="deco-abc deco-a">A</text>
        <text class="deco-abc deco-b">B</text>
        <text class="deco-abc deco-c">C</text>
      </view>
      <view class="card-main">
        <text class="card-tag">ENGLISH</text>
        <text class="card-title">英语</text>
        <text class="card-desc">字母 · 单词 · 启蒙入门</text>
      </view>
      <text class="card-arrow">›</text>
    </view>

    <!-- 小游戏卡 -->
    <view class="card card-games" @click="goTo('/pages/games/index')">
      <view class="card-deco games-deco">
        <text class="games-logo">GAME</text>
      </view>
      <view class="card-main">
        <text class="card-tag">GAMES</text>
        <text class="card-title">小游戏</text>
        <text class="card-desc">成语接龙 · 边玩边学</text>
      </view>
      <text class="card-arrow">›</text>
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
  background: #F7F5F0;
  padding: 80rpx 32rpx 60rpx;
}

/* Hero */
.hero {
  padding: 0 8rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.hero-badge {
  font-size: 22rpx;
  color: #8B7D65;
  letter-spacing: 8rpx;
  font-weight: bold;
}
.hero-title {
  font-size: 64rpx;
  font-weight: 500;
  color: #2A2520;
  font-family: var(--font-chinese);
  letter-spacing: 4rpx;
  line-height: 1.2;
}
.hero-sub {
  font-size: 26rpx;
  color: #8B7D65;
  letter-spacing: 2rpx;
  margin-top: 8rpx;
}

/* 卡片通用 */
.card {
  position: relative;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(31,31,31,0.06);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
  min-height: 180rpx;
}
.card:active { transform: scale(0.98); }

.card-deco {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}

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
  color: #B5A98F;
}
.card-title {
  font-size: 44rpx;
  font-weight: 500;
  color: #2A2520;
  font-family: var(--font-chinese);
  letter-spacing: 2rpx;
}
.card-desc {
  font-size: 24rpx;
  color: #8B7D65;
  margin-top: 4rpx;
}
.card-arrow {
  font-size: 48rpx;
  color: #B5A98F;
  font-weight: bold;
  flex-shrink: 0;
}

/* 数学：网格 + 数字（渐变色更淡、字号更小，视觉重量与语文/英语齐平） */
.math-deco {
  box-sizing: border-box;
  background: linear-gradient(135deg, #F0F6FB 0%, #D6E8F5 100%);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2rpx;
  padding: 20rpx;
}
.deco-num, .deco-sign {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: #5A8EC3;
  font-size: 22rpx;
}
.deco-sign { color: #2A7AB8; }
.card-math .card-tag { color: #2A7AB8; }

/* 语文：印章 */
.chinese-deco {
  background: #FDF1E6;
  border: 2rpx solid #E8D5B7;
}
.deco-stamp {
  width: 100rpx;
  height: 100rpx;
  background: #A62D33;
  color: #FDF1E6;
  border-radius: 12rpx;
  font-size: 68rpx;
  font-weight: bold;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-4deg);
  box-shadow: 0 4rpx 10rpx rgba(166,45,51,0.2);
}
.card-chinese .card-tag { color: #A62D33; }

/* 英语：ABC */
.english-deco {
  background: linear-gradient(135deg, #E0F2F1 0%, #FFF4E6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}
.deco-abc {
  font-size: 56rpx;
  font-weight: 900;
  font-family: 'Quicksand', 'Comic Sans MS', 'Trebuchet MS', sans-serif;
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.deco-a {
  background: #FF8A65;
  transform: rotate(-6deg);
  margin-right: -8rpx;
  z-index: 3;
}
.deco-b {
  background: #FFD54F;
  color: #7A5B00;
  transform: rotate(4deg);
  margin-right: -8rpx;
  z-index: 2;
}
.deco-c {
  background: #26A69A;
  transform: rotate(-3deg);
  z-index: 1;
}
.card-english .card-tag { color: #00786E; }

/* 小游戏：紫色 GAME 徽标 */
.games-deco {
  background: linear-gradient(135deg, #7C4DFF 0%, #5E35B1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.games-logo {
  font-family: 'Quicksand', 'Comic Sans MS', 'Trebuchet MS', sans-serif;
  font-size: 44rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 4rpx;
  text-shadow: 0 2rpx 6rpx rgba(0,0,0,0.25);
  transform: rotate(-4deg);
}
.card-games .card-tag { color: #7C4DFF; }
</style>
