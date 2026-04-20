<template>
  <view class="guide-page">
    <PageHeader title="使用说明" />

    <view class="content">
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

      <view class="section">
        <text class="section-title">数据说明</text>
        <view class="item">
          <text class="item-desc">所有数据（错题本、练习日志）都保存在本地浏览器，清除浏览器数据会丢失。当前题库覆盖一年级下第 1~8 全部单元。</text>
        </view>
      </view>

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
  background: #F5F7FA;
}
.content {
  padding: 24rpx;
}
.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #222;
  margin-bottom: 24rpx;
  display: block;
}
.item {
  margin-bottom: 32rpx;
}
.item:last-child { margin-bottom: 0; }
.item-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #42A5F5;
  margin-bottom: 12rpx;
  display: block;
}
.item-desc {
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
  display: block;
}
.item-detail {
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  background: #F5F7FA;
  border-radius: 12rpx;
  border-left: 4rpx solid #42A5F5;
}
.detail-line {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.8;
}
.log-item {
  padding: 16rpx;
  background: #F5F7FA;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.log-item:last-child { margin-bottom: 0; }
.log-version {
  font-size: 28rpx;
  font-weight: bold;
  color: #42A5F5;
  margin-right: 16rpx;
}
.log-date {
  font-size: 22rpx;
  color: #888;
}
.log-changes {
  margin-top: 12rpx;
}
.log-line {
  display: block;
  font-size: 24rpx;
  color: #555;
  line-height: 1.8;
  padding-left: 12rpx;
  position: relative;
}
.log-line::before {
  content: '·';
  position: absolute;
  left: 0;
}
</style>
