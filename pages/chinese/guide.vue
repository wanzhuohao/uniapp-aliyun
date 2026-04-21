<template>
  <view class="guide-page">
    <PageHeader title="使用说明" theme="chinese" />

    <view class="content">
      <!-- 功能介绍 -->
      <view class="section">
        <text class="section-title">功能介绍</text>

        <view class="item">
          <text class="item-title">生字学习</text>
          <text class="item-desc">按课文顺序遍历选中课的全部字，看字自测拼音/部首/结构/笔画，点"查看答案"核对。含 HanziWriter 笔顺动画、汉字皮扩展学习、答错进错题本。</text>
        </view>

        <view class="item">
          <text class="item-title">拼音练习</text>
          <text class="item-desc">看汉字选拼音 / 看拼音选汉字。单课按顺序走完全部字；多课随机抽 10 题。</text>
        </view>

        <view class="item">
          <text class="item-title">汉字练习</text>
          <text class="item-desc">笔顺描红（HanziWriter 交互）、部首、结构、笔画数四种题型。单课按顺序走完全部字；多课随机抽 10 题。</text>
        </view>

        <view class="item">
          <text class="item-title">错题本</text>
          <text class="item-desc">基于 Leitner 5 级间隔算法，答错进 box 1，答对升级。</text>
          <view class="item-detail">
            <text class="detail-line">box 1/2/3/4/5 分别间隔 1/1/3/7/15 天</text>
            <text class="detail-line">进入 box 5 即"已掌握"，不再主动出现</text>
            <text class="detail-line">支持两种重练模式：今日待复习 / 练全部未掌握</text>
            <text class="detail-line">近 7 天正确率趋势图 + 高频错字 TOP5</text>
          </view>
        </view>
      </view>

      <!-- 数据说明 -->
      <view class="section">
        <text class="section-title">数据说明</text>
        <view class="item">
          <text class="item-desc">所有数据（错题本、练习日志）都保存在本地浏览器，清除浏览器数据会丢失。当前题库覆盖一年级下第 1~8 全部单元。</text>
        </view>
      </view>

      <!-- 更新日志 -->
      <view class="section">
        <text class="section-title">更新日志</text>

        <view class="log-item">
          <text class="log-version">v1.1</text>
          <text class="log-date">2026-04-17</text>
          <view class="log-changes">
            <text class="log-line">题库覆盖 1~8 全单元</text>
            <text class="log-line">出题规则优化（单课全量按顺序，多课随机抽 10）</text>
          </view>
        </view>

        <view class="log-item">
          <text class="log-version">v1.0</text>
          <text class="log-date">2026-04-17</text>
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
  background: #FAF6EE;
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
  border-left: 8rpx solid #A62D33;
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
  color: #A62D33;
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
  color: #A62D33;
}
</style>
