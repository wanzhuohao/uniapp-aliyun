<template>
  <view class="guide-page">
    <PageHeader title="使用说明" />

    <view class="content">
      <!-- 功能介绍 -->
      <view class="section">
        <text class="section-title">功能介绍</text>

        <view class="item">
          <text class="item-title">在线练习</text>
          <text class="item-desc">支持多种题型和难度，答完即时判分，错题自动记录。</text>
          <view class="item-detail">
            <text class="detail-line">题型：加法、减法、比大小、填空、连加连减、填运算符、百数表、图形填数</text>
            <text class="detail-line">难度：20以内 / 加减整十 / 加减一位数</text>
            <text class="detail-line">题量：20/50/100/自定义（最多200题）</text>
            <text class="detail-line">计时：可选 5~20 分钟倒计时</text>
          </view>
        </view>

        <view class="item">
          <text class="item-title">打印出题</text>
          <text class="item-desc">生成 A4 口算试卷，100题4列排版，支持打印和导出答案图片。</text>
        </view>

        <view class="item">
          <text class="item-title">错题本</text>
          <text class="item-desc">自动收集在线练习中的错题，支持错题重练，巩固薄弱环节。</text>
        </view>

        <view class="item">
          <text class="item-title">历史记录</text>
          <text class="item-desc">查看历次练习和打印记录，包括正确率、用时等详情。</text>
        </view>
      </view>

      <!-- 更新日志 -->
      <view class="section">
        <text class="section-title">更新日志</text>

        <view class="log-item">
          <text class="log-version">v1.0.0</text>
          <text class="log-date">2026-04-15</text>
          <view class="log-changes">
            <text class="log-line">首次发布</text>
            <text class="log-line">在线练习：8种题型（加减法、比大小、填空、连加连减、填运算符、百数表、图形填数）</text>
            <text class="log-line">打印出题：A4试卷生成、图片打印、答案导出</text>
            <text class="log-line">错题本：自动收集、错题重练</text>
            <text class="log-line">历史记录：练习和打印记录查看</text>
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
  background: #F5F7FA;
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

<style>
html body.dark-mode .guide-page {
  background: #1a1a2e;
}
html body.dark-mode .section {
  background: #252545;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.3);
}
html body.dark-mode .section-title {
  color: #e0e0e0;
}
html body.dark-mode .item-title {
  color: #ddd;
}
html body.dark-mode .item-desc,
html body.dark-mode .detail-line,
html body.dark-mode .log-line {
  color: #aaa;
}
html body.dark-mode .item-detail {
  background: #1e2d3a;
}
html body.dark-mode .log-item {
  border-bottom-color: #333;
}
</style>
