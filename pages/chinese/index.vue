<template>
  <view class="index-page">
    <PageHeader title="语文" theme="chinese" home-on-back />

    <!-- Hero 区：书卷气 -->
    <view class="hero">
      <view class="hero-stamp">語</view>
      <view class="hero-lines">
        <text class="hero-title">一笔一画</text>
        <text class="hero-sub">方块字里的天地</text>
      </view>
    </view>

    <!-- 主入口：生字学习（占位大） -->
    <view class="primary-card" @click="goTo('/pages/chinese/learn')">
      <view class="pc-left">
        <text class="pc-label">主功能</text>
        <text class="pc-name">生字学习</text>
        <text class="pc-desc">看字自测、笔顺动画、拓展认读</text>
      </view>
      <view class="pc-char">学</view>
    </view>

    <!-- 次级入口：2 列 -->
    <view class="sub-grid">
      <view class="sub-card" @click="goTo('/pages/chinese/pinyin')">
        <text class="sub-char">拼</text>
        <text class="sub-name">拼音练习</text>
        <text class="sub-desc">看字选音</text>
      </view>
      <view class="sub-card" @click="goTo('/pages/chinese/hanzi')">
        <text class="sub-char">字</text>
        <text class="sub-name">汉字练习</text>
        <text class="sub-desc">笔顺部首</text>
      </view>
    </view>

    <!-- 错题本：宽卡 -->
    <view class="wide-card" @click="goTo('/pages/chinese/mistakes')">
      <view class="wc-dot"></view>
      <view class="wc-text">
        <text class="wc-name">错题本</text>
        <text class="wc-desc">间隔复习，稳扎稳打</text>
      </view>
      <text class="wc-arrow">›</text>
    </view>

    <!-- 说明：轻量链接 -->
    <view class="footer-link" @click="goTo('/pages/chinese/guide')">
      <text class="fl-text">使用说明 · 更新日志</text>
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
  background: #FAF6EE;
  position: relative;
  padding-bottom: 60rpx;
}

/* ── Hero ─────────────────────────────────────────── */
.hero {
  position: relative;
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.hero-stamp {
  width: 110rpx;
  height: 110rpx;
  border-radius: 12rpx;
  background: #A62D33;
  color: #FAF6EE;
  font-size: 68rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  box-shadow: 0 6rpx 16rpx rgba(166,45,51,0.25);
  transform: rotate(-4deg);
  flex-shrink: 0;
}
.hero-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.hero-title {
  font-size: 52rpx;
  font-weight: 500;
  color: #1F1F1F;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 6rpx;
}
.hero-sub {
  font-size: 26rpx;
  color: #8C8275;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
}
/* ── 主入口 ───────────────────────────────────────── */
.primary-card {
  position: relative;
  margin: 16rpx 32rpx 24rpx;
  padding: 40rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 6rpx 20rpx rgba(31,31,31,0.06);
  border-left: 10rpx solid #A62D33;
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.primary-card:active { transform: scale(0.98); }
.primary-card::after {
  content: '';
  position: absolute;
  right: -40rpx;
  bottom: -40rpx;
  width: 200rpx;
  height: 200rpx;
  background: radial-gradient(circle, rgba(166,45,51,0.05) 0%, transparent 70%);
  pointer-events: none;
}
.pc-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.pc-label {
  font-size: 22rpx;
  color: #A62D33;
  letter-spacing: 4rpx;
  font-weight: bold;
}
.pc-name {
  font-size: 44rpx;
  font-weight: 500;
  color: #1F1F1F;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
}
.pc-desc {
  font-size: 24rpx;
  color: #8C8275;
  margin-top: 4rpx;
}
.pc-char {
  width: 140rpx;
  height: 140rpx;
  background: #FDF1E6;
  border: 2rpx solid #E8D5B7;
  border-radius: 16rpx;
  font-size: 100rpx;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  font-weight: 500;
  color: #A62D33;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
  box-shadow: 0 4rpx 14rpx rgba(31,31,31,0.05);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.sub-card:active { transform: scale(0.97); }
.sub-char {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FDF1E6;
  color: #A62D33;
  font-size: 36rpx;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}
.sub-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #1F1F1F;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
}
.sub-desc {
  font-size: 22rpx;
  color: #A39585;
}

/* ── 错题本宽卡 ───────────────────────────────────── */
.wide-card {
  margin: 0 32rpx 20rpx;
  padding: 28rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(31,31,31,0.05);
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.wide-card:active { transform: scale(0.98); }
.wc-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #A62D33;
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
  font-weight: 500;
  color: #1F1F1F;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
}
.wc-desc { font-size: 22rpx; color: #A39585; }
.wc-arrow { font-size: 40rpx; color: #A62D33; font-weight: bold; }

/* ── 页脚链接 ─────────────────────────────────────── */
.footer-link {
  margin: 40rpx 32rpx 0;
  text-align: center;
  padding: 24rpx;
  border-top: 1rpx dashed #D6CBB8;
}
.fl-text {
  font-size: 24rpx;
  color: #A39585;
  letter-spacing: 2rpx;
  font-family: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', serif;
}
</style>
