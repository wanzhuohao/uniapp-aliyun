<template>
  <view class="page">
    <PageHeader title="24 点 · 规则" theme="game" fallback="/pages/games/twenty-four" />

    <view class="container">
      <view class="section">
        <view class="section-title">怎么玩</view>
        <view class="rule-item">
          <text class="num">1</text>
          <text class="txt">系统出 4 个 1~13 的数字</text>
        </view>
        <view class="rule-item">
          <text class="num">2</text>
          <text class="txt">用 <b>+ - × ÷</b> 和括号,把 4 个数算成 24</text>
        </view>
        <view class="rule-item">
          <text class="num">3</text>
          <text class="txt">每个数字必须用一次,不能多用也不能少用</text>
        </view>
        <view class="rule-item">
          <text class="num">4</text>
          <text class="txt">中间结果允许是分数(如 8÷3 这种)</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">难度怎么分</view>
        <view class="score-row">
          <view class="badge badge-easy">+10</view>
          <view class="score-main">
            <text class="score-name">简单</text>
            <text class="score-desc">有很多种解法,任选一个</text>
            <text class="score-example">例:3 6 8 4 → (3+6)+8-4? 不对,试试 8×3=24 还剩 6 4...</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-medium">+20</view>
          <view class="score-main">
            <text class="score-name">中等</text>
            <text class="score-desc">解法不多,需要多想想</text>
            <text class="score-example">例:3 3 4 4 → (3×4)+(3×4)</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-hard">+30</view>
          <view class="score-main">
            <text class="score-name">困难</text>
            <text class="score-desc">只有 1~2 种解,经常要用到分数</text>
            <text class="score-example">例:3 3 8 8 → 8÷(3-8÷3)</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">提示和换题</view>
        <text class="paragraph">实在想不出来,可以点「提示」看一个参考解。<b>用了提示后这题不计分</b>,但连胜不断。</text>
        <text class="paragraph">不想做了就点「换一题」,直接换下一题 —— 连胜会清零。</text>
      </view>

      <view class="section">
        <view class="section-title">小技巧</view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">看到 8 或 12,先想能不能凑出 3 或 2(8×3=24, 12×2=24)</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">看到 6,试试能不能凑出 4(6×4=24)</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">出现两个相同数字,可以试试 a-a=0 或 a÷a=1</text>
        </view>
        <view class="rule-item">
          <text class="num">·</text>
          <text class="txt">困难题想不到时,试试除法产生分数,再相乘消掉</text>
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
  background: #FFF8E7;
}
.container {
  padding: 32rpx;
}
.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(229, 81, 0, 0.08);
}
.section-title {
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 36rpx;
  font-weight: 500;
  color: #BF360C;
  margin-bottom: 20rpx;
  border-left: 6rpx solid #FF9800;
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
  background: #FF9800;
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
  color: #5D2E00;
  line-height: 1.6;
  flex: 1;
}
.score-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 22rpx;
  padding-bottom: 22rpx;
  border-bottom: 1rpx solid #FFF1D6;
}
.score-row:last-child {
  border-bottom: 0;
  margin-bottom: 0;
  padding-bottom: 0;
}
.badge {
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
  min-width: 64rpx;
  text-align: center;
}
.badge-easy   { background: #66BB6A; }
.badge-medium { background: #FFA726; }
.badge-hard   { background: #EF5350; }
.score-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.score-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #BF360C;
}
.score-desc {
  font-size: 26rpx;
  color: #6D4C00;
}
.score-example {
  font-size: 24rpx;
  color: #8B5A00;
  font-style: italic;
  background: #FFF1D6;
  padding: 8rpx 12rpx;
  border-radius: 8rpx;
  margin-top: 4rpx;
}
.paragraph {
  font-size: 28rpx;
  color: #5D2E00;
  line-height: 1.7;
  display: block;
  margin-bottom: 10rpx;
}
</style>
