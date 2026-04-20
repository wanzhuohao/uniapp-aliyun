<template>
  <view class="index-page">
    <PageHeader title="语文" />

    <view class="modules">
      <view class="module-card mock-card" @click="goTo('/pages/chinese/learn')">
        <text class="module-icon">📚</text>
        <view class="module-info">
          <text class="module-name">生字学习</text>
          <text class="module-desc">看答案自判，拓展学习</text>
        </view>
      </view>
      <view class="module-card pinyin-card" @click="goTo('/pages/chinese/pinyin')">
        <text class="module-icon">📖</text>
        <view class="module-info">
          <text class="module-name">拼音练习</text>
          <text class="module-desc">看字选拼音</text>
        </view>
      </view>
      <view class="module-card hanzi-card" @click="goTo('/pages/chinese/hanzi')">
        <text class="module-icon">✏️</text>
        <view class="module-info">
          <text class="module-name">汉字练习</text>
          <text class="module-desc">笔顺、部首、结构、笔画</text>
        </view>
      </view>
      <view class="module-card mistakes-card" @click="goTo('/pages/chinese/mistakes')">
        <text class="module-icon">📕</text>
        <view class="module-info">
          <text class="module-name">错题本</text>
          <text class="module-desc">错题回顾与重练</text>
        </view>
      </view>
      <view class="module-card guide-card" @click="goTo('/pages/chinese/guide')">
        <text class="module-icon">📌</text>
        <view class="module-info">
          <text class="module-name">使用说明</text>
          <text class="module-desc">功能介绍与更新日志</text>
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
.pinyin-card { border-left-color: #FFA726; }
.hanzi-card { border-left-color: #42A5F5; }
.mock-card { border-left-color: #00897B; }
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
