<template>
  <view class="index-page">
    <PageHeader title="英语" theme="english" home-on-back />

    <!-- Hero：ABC 游乐场 -->
    <view class="hero">
      <view class="abc">
        <text class="abc-a">A</text>
        <text class="abc-b">B</text>
        <text class="abc-c">C</text>
      </view>
      <view class="hero-lines">
        <text class="hero-title">Have Fun!</text>
        <text class="hero-sub">玩着玩着就会啦</text>
      </view>
    </view>

    <!-- 主入口：单词练习 -->
    <view class="primary-card" @click="goTo('/pages/english/words')">
      <view class="pc-left">
        <text class="pc-label">FEATURED</text>
        <text class="pc-name">单词练习</text>
        <text class="pc-desc">动物 · 颜色 · 数字 · 水果</text>
      </view>
      <view class="pc-emojis">
        <text class="emoji-big">🦁</text>
        <text class="emoji-big">🍎</text>
        <text class="emoji-big">🌈</text>
      </view>
    </view>

    <!-- 次级入口：3 列 -->
    <view class="sub-grid">
      <view class="sub-card letters" @click="goTo('/pages/english/letters')">
        <view class="sub-bubble">Aa</view>
        <text class="sub-name">字母认读</text>
        <text class="sub-desc">26 letters</text>
      </view>
      <view class="sub-card phonics" @click="goTo('/pages/english/phonics')">
        <view class="sub-bubble phonics-bubble">sh</view>
        <text class="sub-name">自然拼读</text>
        <text class="sub-desc">42 sounds</text>
      </view>
      <view class="sub-card mistakes" @click="goTo('/pages/english/mistakes')">
        <view class="sub-bubble mistakes-bubble">📕</view>
        <text class="sub-name">错题本</text>
        <text class="sub-desc">review</text>
      </view>
    </view>

    <!-- 说明链接 -->
    <view class="footer-link" @click="goTo('/pages/english/guide')">
      <text class="fl-text">Guide · 使用说明</text>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'

function goTo(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: #F5FBFB;
  padding-bottom: 60rpx;
}

/* ── Hero ─────────────────────────────────────────── */
.hero {
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.abc {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}
.abc-a, .abc-b, .abc-c {
  font-size: 80rpx;
  font-weight: 900;
  font-family: 'Quicksand', 'Comic Sans MS', 'Trebuchet MS', sans-serif;
  width: 92rpx;
  height: 92rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 6rpx 16rpx rgba(0,0,0,0.1);
}
.abc-a {
  background: #FF8A65;
  transform: rotate(-6deg);
  margin-right: -12rpx;
  z-index: 3;
}
.abc-b {
  background: #FFD54F;
  transform: rotate(4deg);
  color: #7A5B00;
  margin-right: -12rpx;
  z-index: 2;
}
.abc-c {
  background: #26A69A;
  transform: rotate(-3deg);
  z-index: 1;
}
.hero-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.hero-title {
  font-size: 60rpx;
  font-weight: 900;
  color: #1F3A3A;
  font-family: 'Quicksand', 'Comic Sans MS', 'Trebuchet MS', sans-serif;
  letter-spacing: 2rpx;
}
.hero-sub {
  font-size: 26rpx;
  color: #6B8787;
  letter-spacing: 2rpx;
}

/* ── 主入口：单词练习 ─────────────────────────────── */
.primary-card {
  position: relative;
  margin: 16rpx 32rpx 24rpx;
  padding: 36rpx 32rpx;
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(38,166,154,0.25);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.primary-card:active { transform: scale(0.98); }
.primary-card::before {
  content: '';
  position: absolute;
  right: -60rpx;
  top: -60rpx;
  width: 240rpx;
  height: 240rpx;
  background: rgba(255,255,255,0.12);
  border-radius: 50%;
}
.primary-card::after {
  content: '';
  position: absolute;
  right: 40rpx;
  bottom: -80rpx;
  width: 180rpx;
  height: 180rpx;
  background: rgba(255,213,79,0.25);
  border-radius: 50%;
}
.pc-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  position: relative;
  z-index: 2;
}
.pc-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
  letter-spacing: 6rpx;
  font-weight: bold;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.pc-name {
  font-size: 44rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2rpx;
}
.pc-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.85);
  margin-top: 4rpx;
}
.pc-emojis {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  position: relative;
  z-index: 2;
  align-items: center;
}
.emoji-big { font-size: 56rpx; line-height: 1.1; }

/* ── 次级 2 列 ────────────────────────────────────── */
.sub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16rpx;
  margin: 0 32rpx 24rpx;
}
.sub-card {
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
  box-shadow: 0 4rpx 14rpx rgba(31,58,58,0.06);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.sub-card:active { transform: scale(0.97); }
.sub-bubble {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #FFF4E6;
  color: #FF8A65;
  font-size: 36rpx;
  font-family: 'Quicksand', 'Comic Sans MS', sans-serif;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6rpx;
  transform: rotate(-4deg);
}
.sub-card.phonics .sub-bubble {
  background: #E0F2F1;
  color: #1E8E82;
  transform: rotate(2deg);
  font-size: 32rpx;
  font-style: italic;
}
.sub-card.mistakes .sub-bubble {
  background: #FFEDE7;
  color: #FF5722;
  transform: rotate(3deg);
  font-size: 38rpx;
}
.sub-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #1F3A3A;
  letter-spacing: 1rpx;
}
.sub-desc {
  font-size: 22rpx;
  color: #8EA5A5;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  letter-spacing: 1rpx;
}

/* ── 页脚链接 ─────────────────────────────────────── */
.footer-link {
  margin: 40rpx 32rpx 0;
  text-align: center;
  padding: 24rpx;
  border-top: 1rpx dashed #C6DEDE;
}
.fl-text {
  font-size: 24rpx;
  color: #8EA5A5;
  letter-spacing: 2rpx;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
</style>
