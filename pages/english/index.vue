<template>
  <view class="index-page">
    <PageHeader title="英语启蒙" />

    <view class="modules">
      <view class="module-card letters-card" @click="goTo('/pages/english/letters')">
        <text class="module-icon">🔤</text>
        <view class="module-info">
          <text class="module-name">字母认读</text>
          <text class="module-desc">26 个字母 + 发音 + 例词</text>
        </view>
      </view>
      <view class="module-card words-card" @click="goTo('/pages/english/words')">
        <text class="module-icon">🖼️</text>
        <view class="module-info">
          <text class="module-name">单词练习</text>
          <text class="module-desc">动物、颜色、数字、水果</text>
        </view>
      </view>
      <view class="module-card mistakes-card" @click="goTo('/pages/english/mistakes')">
        <text class="module-icon">📕</text>
        <view class="module-info">
          <text class="module-name">错题本</text>
          <text class="module-desc">错题回顾与重练</text>
        </view>
      </view>
      <view class="module-card guide-card" @click="goTo('/pages/english/guide')">
        <text class="module-icon">📌</text>
        <view class="module-info">
          <text class="module-name">使用说明</text>
          <text class="module-desc">功能介绍</text>
        </view>
      </view>
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
  background: #F5F7FA;
}
.modules {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  padding: 32rpx;
}
.module-card {
  display: flex;
  align-items: center;
  gap: 28rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
  border-left: 8rpx solid;
  transition: transform 0.2s;
}
.module-card:active { transform: scale(0.97); }
.letters-card { border-left-color: #AB47BC; }
.words-card { border-left-color: #26A69A; }
.mistakes-card { border-left-color: #FF5722; }
.guide-card { border-left-color: #78909C; }
.module-icon { font-size: 56rpx; }
.module-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.module-name { font-size: 36rpx; font-weight: bold; color: #222; }
.module-desc { font-size: 26rpx; color: #888; }
</style>
