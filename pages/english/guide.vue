<template>
  <view class="guide-page">
    <PageHeader title="使用说明" />

    <view class="section">
      <text class="section-title">🔤 字母认读</text>
      <text class="section-text">26 个字母的大小写、发音（phonics）和常用例词。点击字母卡片会自动朗读，支持上/下一个切换。</text>
    </view>

    <view class="section">
      <text class="section-title">🖼️ 单词练习</text>
      <text class="section-text">按主题练习常用单词，支持两种题型：</text>
      <text class="section-text">• 看图选词：看 emoji 图标选对应英文</text>
      <text class="section-text">• 听词选图：听发音选对应 emoji 图标</text>
      <text class="section-text">每轮 10 题，答错的词自动进入错题本。</text>
    </view>

    <view class="section">
      <text class="section-title">📕 错题本</text>
      <text class="section-text">采用 5 级间隔复习：答对升级，答错降级；5 级视为掌握。</text>
      <text class="section-text">每天有当日到期的错题提醒，点"开始复习"按期重练。</text>
    </view>

    <view class="section">
      <text class="section-title">⚙️ 提示</text>
      <text class="section-text">• 发音使用浏览器内置 TTS，不同浏览器音色不同，Chrome 效果较好</text>
      <text class="section-text">• 首次点击朗读按钮后才能正常播放（iOS 限制）</text>
    </view>

    <view class="section">
      <text class="section-title">📌 更新日志</text>
      <text class="log-item">v1.0 — 上线字母认读 + 单词练习（4 大主题 43 词） + 错题本</text>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'
</script>

<style scoped>
.guide-page { min-height: 100vh; background: #F5F7FA; }
.section {
  background: #fff;
  margin: 24rpx 32rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.section-title {
  display: block;
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}
.section-text {
  display: block;
  font-size: 28rpx;
  color: #555;
  line-height: 1.8;
}
.log-item {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}
</style>
