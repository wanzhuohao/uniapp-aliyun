<template>
  <view class="guide-page">
    <PageHeader title="使用说明" theme="math" />

    <view class="content">
      <!-- 功能介绍 -->
      <view class="section">
        <text class="section-title">功能介绍</text>

        <view class="item">
          <text class="item-title">在线练习</text>
          <text class="item-desc">支持多种题型和难度，答完即时判分，错题自动记录。</text>
          <view class="item-detail">
            <text class="detail-line">题型：加法、减法、比大小、填空、连加连减、填运算符、百数表、图形填数</text>
            <text class="detail-line">难度：20以内 / 100以内(整十) / 100以内</text>
            <text class="detail-line">题量：20/50/100/自定义（最多200题）</text>
            <text class="detail-line">计时：可选 5~20 分钟倒计时</text>
          </view>
        </view>

        <view class="item">
          <text class="item-title">特殊题型（与普通题型互斥）</text>
          <text class="item-desc">思考性更强的开放题，没有唯一解。</text>
          <view class="item-detail">
            <text class="detail-line">三角自由填：给 6 个数字，自己摆到三角 6 个位置（3 顶点 + 3 中点），使三条边之和相等。交卷时校验"数字用尽 + 三边之和都等于目标值"；错题里会展示一种推荐填法。</text>
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

      <!-- 数据说明 -->
      <view class="section">
        <text class="section-title">数据说明</text>
        <view class="item">
          <text class="item-desc">所有数据（历史记录、错题本）都保存在本地浏览器 localStorage，清除浏览器数据会丢失。单设备单用户。</text>
        </view>
      </view>

      <!-- 更新日志 -->
      <view class="section">
        <text class="section-title">更新日志</text>

        <view class="log-item">
          <text class="log-version">v1.1</text>
          <text class="log-date">2026-04-17</text>
          <view class="log-changes">
            <text class="log-line">新增特殊题型 · 三角自由填</text>
          </view>
        </view>

        <view class="log-item">
          <text class="log-version">v1.0</text>
          <text class="log-date">2026-04-15</text>
          <view class="log-changes">
            <text class="log-line">首次发布</text>
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
  background: #F0F4F9;
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
