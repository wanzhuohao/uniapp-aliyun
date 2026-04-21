<template>
  <view class="guide-page">
    <PageHeader title="使用说明" theme="english" />

    <view class="content">
      <!-- 功能介绍 -->
      <view class="section">
        <text class="section-title">功能介绍</text>

        <view class="item">
          <text class="item-title">字母认读</text>
          <text class="item-desc">26 个字母的大小写、发音（phonics）和常用例词。点击字母卡片自动朗读，支持上/下一个切换。</text>
        </view>

        <view class="item">
          <text class="item-title">单词练习</text>
          <text class="item-desc">按主题练习常用单词，支持两种题型，每轮 10 题，答错自动进入错题本。</text>
          <view class="item-detail">
            <text class="detail-line">看图选词：看 emoji 图标选对应英文</text>
            <text class="detail-line">听词选图：听发音选对应 emoji 图标</text>
          </view>
        </view>

        <view class="item">
          <text class="item-title">错题本</text>
          <text class="item-desc">基于 Leitner 5 级间隔算法，答错降级，答对升级，升到 5 级视为掌握。</text>
          <view class="item-detail">
            <text class="detail-line">每天展示当日到期错题，点"开始复习"按期重练</text>
            <text class="detail-line">进入 box 5 即"已掌握"，不再主动出现</text>
          </view>
        </view>

        <view class="item">
          <text class="item-title">提示</text>
          <view class="item-detail">
            <text class="detail-line">发音使用浏览器内置 TTS，不同浏览器音色不同，Chrome 效果较好</text>
            <text class="detail-line">首次点击朗读按钮后才能正常播放（iOS 限制）</text>
          </view>
        </view>
      </view>

      <!-- 更新日志 -->
      <view class="section">
        <text class="section-title">更新日志</text>

        <view class="log-item">
          <text class="log-version">v1.0</text>
          <text class="log-date">2026-04-21</text>
          <view class="log-changes">
            <text class="log-line">上线字母认读 + 单词练习（4 大主题 43 词） + 错题本</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '../../components/PageHeader.vue'
</script>

<style scoped>
.guide-page {
  min-height: 100vh;
  background: #F5FBFB;
  padding-bottom: 60rpx;
}
.content {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}
.section-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #222;
  border-left: 8rpx solid #42A5F5;
  padding-left: 20rpx;
}
.item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.item-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.item-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}
.item-detail {
  margin-top: 8rpx;
  padding: 16rpx 20rpx;
  background: #F0F7FF;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.detail-line {
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}

/* 更新日志 */
.log-item {
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #eee;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.log-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.log-version {
  font-size: 30rpx;
  font-weight: bold;
  color: #42A5F5;
}
.log-date {
  font-size: 24rpx;
  color: #999;
}
.log-changes {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.log-line {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}
.log-line::before {
  content: '· ';
  color: #42A5F5;
}
</style>
