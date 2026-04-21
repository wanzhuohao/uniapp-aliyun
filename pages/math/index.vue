<template>
  <view class="index-page">
    <PageHeader title="数学" theme="math" />

    <!-- Hero：数学范 -->
    <view class="hero">
      <view class="hero-grid">
        <text class="hero-cell">1</text>
        <text class="hero-cell">2</text>
        <text class="hero-cell">3</text>
        <text class="hero-cell">+</text>
        <text class="hero-cell">=</text>
        <text class="hero-cell">!</text>
      </view>
      <view class="hero-lines">
        <text class="hero-tag">PRACTICE</text>
        <text class="hero-title">一算到底</text>
      </view>
    </view>

    <!-- 主入口：在线练习 -->
    <view class="primary-card" @click="goTo('/pages/math/online')">
      <view class="pc-main">
        <text class="pc-label">MAIN</text>
        <text class="pc-name">在线练习</text>
        <text class="pc-desc">多题型 · 多难度 · 即时判分</text>
      </view>
      <view class="pc-expr">
        <text class="expr-line">20 + ? = 35</text>
        <text class="expr-line">9 × 8 = ?</text>
      </view>
    </view>

    <!-- 次级 2x2 -->
    <view class="sub-grid">
      <view class="sub-card" @click="goTo('/pages/math/print')">
        <text class="sub-icon">🖨</text>
        <text class="sub-name">打印出题</text>
        <text class="sub-desc">A4 试卷</text>
      </view>
      <view class="sub-card" @click="goTo('/pages/math/mistakes')">
        <text class="sub-icon">✗</text>
        <text class="sub-name">错题本</text>
        <text class="sub-desc">间隔重练</text>
      </view>
    </view>

    <!-- 历史记录宽卡 -->
    <view class="wide-card" @click="goTo('/pages/math/history')">
      <view class="wc-bar"></view>
      <view class="wc-text">
        <text class="wc-name">历史记录</text>
        <text class="wc-desc">回顾历次练习成绩</text>
      </view>
      <text class="wc-arrow">›</text>
    </view>

    <!-- 使用说明 -->
    <view class="footer-link" @click="goTo('/pages/math/guide')">
      <text class="fl-text">∙ Guide · 使用说明 ∙</text>
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
  background: #F0F4F9;
  padding-bottom: 60rpx;
  /* 细网格纹理 */
  background-image:
    linear-gradient(rgba(66,165,245,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66,165,245,0.06) 1px, transparent 1px);
  background-size: 40rpx 40rpx;
}

/* ── Hero ─────────────────────────────────────────── */
.hero {
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.hero-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 4rpx;
  width: 160rpx;
  height: 110rpx;
  background: #1E5A8E;
  padding: 4rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
  box-shadow: 0 6rpx 16rpx rgba(30,90,142,0.25);
}
.hero-cell {
  background: #fff;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  font-weight: bold;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4rpx;
}
.hero-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.hero-tag {
  font-size: 22rpx;
  color: #2A7AB8;
  letter-spacing: 8rpx;
  font-weight: bold;
  font-family: 'Courier New', 'Consolas', monospace;
}
.hero-title {
  font-size: 56rpx;
  font-weight: 900;
  color: #0F2B48;
  letter-spacing: 4rpx;
}

/* ── 主入口：在线练习 ─────────────────────────────── */
.primary-card {
  position: relative;
  margin: 16rpx 32rpx 24rpx;
  padding: 36rpx 32rpx;
  background: linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(66,165,245,0.25);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.primary-card:active { transform: scale(0.98); }
.primary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 32rpx 32rpx;
  pointer-events: none;
}
.pc-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  z-index: 2;
}
.pc-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
  letter-spacing: 8rpx;
  font-weight: bold;
  font-family: 'Courier New', 'Consolas', monospace;
}
.pc-name {
  font-size: 44rpx;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2rpx;
}
.pc-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.9);
  margin-top: 4rpx;
}
.pc-expr {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  z-index: 2;
  padding: 14rpx 18rpx;
  background: rgba(255,255,255,0.15);
  border-radius: 12rpx;
  border: 1rpx solid rgba(255,255,255,0.25);
}
.expr-line {
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
  letter-spacing: 2rpx;
}

/* ── 次级 2 列 ────────────────────────────────────── */
.sub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin: 0 32rpx 24rpx;
}
.sub-card {
  padding: 32rpx 24rpx;
  background: #fff;
  border: 2rpx solid #D8E4F0;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
  box-shadow: 0 4rpx 14rpx rgba(30,90,142,0.04);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.sub-card:active { transform: scale(0.97); }
.sub-icon {
  font-size: 44rpx;
  font-weight: 900;
  color: #1E5A8E;
  font-family: 'Courier New', 'Consolas', monospace;
  width: 64rpx;
  height: 64rpx;
  background: #E3F0FA;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}
.sub-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #0F2B48;
  letter-spacing: 1rpx;
}
.sub-desc {
  font-size: 22rpx;
  color: #6B88A3;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

/* ── 历史记录宽卡 ─────────────────────────────────── */
.wide-card {
  margin: 0 32rpx 20rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border: 2rpx solid #D8E4F0;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(30,90,142,0.04);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.wide-card:active { transform: scale(0.98); }
.wc-bar {
  width: 8rpx;
  height: 60rpx;
  background: linear-gradient(180deg, #42A5F5, #1E88E5);
  border-radius: 4rpx;
  flex-shrink: 0;
}
.wc-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.wc-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #0F2B48;
  letter-spacing: 1rpx;
}
.wc-desc { font-size: 22rpx; color: #6B88A3; }
.wc-arrow { font-size: 40rpx; color: #2A7AB8; font-weight: bold; }

/* ── 页脚 ─────────────────────────────────────────── */
.footer-link {
  margin: 40rpx 32rpx 0;
  text-align: center;
  padding: 24rpx;
  border-top: 1rpx dashed #B8CFE3;
}
.fl-text {
  font-size: 22rpx;
  color: #6B88A3;
  letter-spacing: 4rpx;
  font-family: 'Courier New', 'Consolas', monospace;
}
</style>
