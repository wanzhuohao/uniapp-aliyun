<template>
  <view class="page">
    <PageHeader title="数字华容道 · 规则" theme="game" fallback="/pages/games/sliding-puzzle" />

    <view class="container">
      <view class="section">
        <view class="section-title">怎么玩</view>
        <view class="rule-item">
          <text class="num">1</text>
          <text class="txt">棋盘上有数字方块和 1 个空格,数字被打乱了</text>
        </view>
        <view class="rule-item">
          <text class="num">2</text>
          <text class="txt">点击和空格<b>上下左右相邻</b>的数字,它会滑到空格位置</text>
        </view>
        <view class="rule-item">
          <text class="num">3</text>
          <text class="txt">目标:把数字按 1, 2, 3... 顺序排好,空格放在右下角</text>
        </view>
        <view class="rule-item">
          <text class="num">4</text>
          <text class="txt">用尽可能少的步数和时间完成 —— 每个难度独立记录最佳成绩</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">三个难度</view>
        <view class="diff-row">
          <view class="diff-badge badge-3">3×3</view>
          <view class="diff-main">
            <text class="diff-name">入门</text>
            <text class="diff-desc">8 个数字,易上手,适合刚接触的小朋友</text>
          </view>
        </view>
        <view class="diff-row">
          <view class="diff-badge badge-4">4×4</view>
          <view class="diff-main">
            <text class="diff-name">经典</text>
            <text class="diff-desc">15 个数字,经典版本,需要一点策略</text>
          </view>
        </view>
        <view class="diff-row">
          <view class="diff-badge badge-5">5×5</view>
          <view class="diff-main">
            <text class="diff-name">挑战</text>
            <text class="diff-desc">24 个数字,真正的考验,通关一次很有成就感</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">通关技巧</view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">从上往下、从左往右,一行一行排好 —— 先固定第 1 行,再做第 2 行...</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">最后两行要"一起"排,只调最后一行会卡死</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">想不动了点「查看目标」看一眼目标长啥样,再点「重新打乱」重开</text>
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
  background: #E0F2F1;
}
.container {
  padding: 32rpx;
}
.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 137, 123, 0.08);
}
.section-title {
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 36rpx;
  font-weight: 500;
  color: #00695C;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #26A69A;
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
  background: #26A69A;
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
  color: #004D40;
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
  font-size: 28rpx;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}
.badge-3 { background: #66BB6A; }
.badge-4 { background: #26A69A; }
.badge-5 { background: #5E35B1; }
.diff-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.diff-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #00695C;
}
.diff-desc {
  font-size: 26rpx;
  color: #00796B;
}
</style>
