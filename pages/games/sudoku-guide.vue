<template>
  <view class="page">
    <PageHeader title="迷你数独 · 规则" theme="game" fallback="/pages/games/sudoku" />

    <view class="container">
      <view class="section">
        <view class="section-title">怎么玩</view>
        <view class="rule-item">
          <text class="num">1</text>
          <text class="txt">棋盘上有些格子已经填好数字,有些空着</text>
        </view>
        <view class="rule-item">
          <text class="num">2</text>
          <text class="txt">点空格,再点下方数字键,把空格填满</text>
        </view>
        <view class="rule-item">
          <text class="num">3</text>
          <text class="txt">规则:每<b>行</b>、每<b>列</b>、每个<b>粗线宫格</b>内,1 到 N 各出现一次,不能重复</text>
        </view>
        <view class="rule-item">
          <text class="num">4</text>
          <text class="txt">填错了不要紧 —— 冲突的格子会变成红色,改掉就好</text>
        </view>
        <view class="rule-item">
          <text class="num">5</text>
          <text class="txt">全部填对就过关,记录最短用时</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">四个难度</view>
        <view class="diff-row">
          <view class="diff-badge badge-starter">4×4</view>
          <view class="diff-main">
            <text class="diff-name">入门 · +10 分</text>
            <text class="diff-desc">2×2 宫格,1~4 数字,适合刚学数独的小朋友</text>
          </view>
        </view>
        <view class="diff-row">
          <view class="diff-badge badge-easy">6×6</view>
          <view class="diff-main">
            <text class="diff-name">简单 · +30 分</text>
            <text class="diff-desc">2×3 宫格,1~6 数字,空白较少</text>
          </view>
        </view>
        <view class="diff-row">
          <view class="diff-badge badge-medium">6×6</view>
          <view class="diff-main">
            <text class="diff-name">中等 · +60 分</text>
            <text class="diff-desc">2×3 宫格,1~6 数字,空白多,需要更多推理</text>
          </view>
        </view>
        <view class="diff-row">
          <view class="diff-badge badge-hard">9×9</view>
          <view class="diff-main">
            <text class="diff-name">困难 · +120 分</text>
            <text class="diff-desc">3×3 宫格,1~9 数字,真正的数独</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">推理技巧</view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt"><b>排除法</b>:一行/一列/一个宫看缺哪些数字,再看哪个格只能填某个数</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt"><b>唯一格</b>:一个数字在某行/列/宫只能填一个位置,直接填</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">遇到难局,先把所有<b>确定能填</b>的填了,再看新的提示</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">实在卡住,选中一个空格点「提示」,系统会帮你填一个正确数字(后续不可改)</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #FCE4EC;
}
.container {
  padding: 32rpx;
}
.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(194, 24, 91, 0.08);
}
.section-title {
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 36rpx;
  font-weight: 500;
  color: #880E4F;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #EC407A;
  padding-left: 16rpx;
}
.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  margin-bottom: 14rpx;
}
.rule-item .num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #EC407A;
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: bold;
}
.rule-item .txt {
  font-size: 28rpx;
  color: #4A0E2C;
  line-height: 1.6;
  flex: 1;
}
.diff-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 22rpx;
}
.diff-row:last-child { margin-bottom: 0; }
.diff-badge {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26rpx;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}
.badge-starter { background: #66BB6A; }
.badge-easy    { background: #29B6F6; }
.badge-medium  { background: #FFA726; }
.badge-hard    { background: #EF5350; }
.diff-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.diff-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #880E4F;
}
.diff-desc {
  font-size: 26rpx;
  color: #AD1457;
}
</style>
