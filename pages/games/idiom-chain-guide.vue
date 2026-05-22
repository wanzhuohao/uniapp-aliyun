<template>
  <view class="page">
    <PageHeader title="成语接龙 · 规则" theme="game" fallback="/pages/games/idiom-chain" />

    <view class="container">
      <view class="section">
        <view class="section-title">怎么玩</view>
        <view class="rule-item">
          <text class="num">1</text>
          <text class="txt">AI 先出一个 4 字成语开局</text>
        </view>
        <view class="rule-item">
          <text class="num">2</text>
          <text class="txt">用上一个成语的<b>末字</b>开头，接一个新成语</text>
        </view>
        <view class="rule-item">
          <text class="num">3</text>
          <text class="txt">同一个成语本局只能用一次</text>
        </view>
        <view class="rule-item">
          <text class="num">4</text>
          <text class="txt">让 AI 接不上 → 你赢，加 10 分</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">怎么得分</view>
        <view class="score-row">
          <view class="badge badge-2">+2</view>
          <view class="score-main">
            <text class="score-name">同字同音</text>
            <text class="score-desc">前一成语末字 = 你新成语首字（字一样，读音也一样）</text>
            <text class="score-example">例：一帆风<b>顺</b> → <b>顺</b>水推舟</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-1">+1</view>
          <view class="score-main">
            <text class="score-name">同音不同字</text>
            <text class="score-desc">字不同，但读音一样（谐音也算接）</text>
            <text class="score-example">例：藏龙卧<b>虎</b> (hǔ) → <b>互</b>通有无 (hù)</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-1">+1</view>
          <view class="score-main">
            <text class="score-name">同字不同音</text>
            <text class="score-desc">字相同但读音不同（多音字）</text>
            <text class="score-example">例：长篇大<b>论</b> (lùn) → <b>论</b>资排辈 (lùn) ← 一般还是同音</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-10">+10</view>
          <view class="score-main">
            <text class="score-name">让对手接不上</text>
            <text class="score-desc">AI 在词库里找不到能接的成语，本局结束</text>
          </view>
        </view>
        <view class="score-row">
          <view class="badge badge-neg">-5</view>
          <view class="score-main">
            <text class="score-name">用一次提示</text>
            <text class="score-desc">把一个可接的成语直接填进输入框，按 enter 提交即可</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">词库</view>
        <text class="paragraph">收录约 3 万条常见成语（来自 chinese-xinhua 开源词典）。如果你输入的成语不在库里，会提示「词库里没有这个成语」——可以换一个再试。</text>
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
  background: #F5F2FA;
}
.container {
  padding: 32rpx 32rpx 80rpx;
}

.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(124,77,255,0.08);
}
.section-title {
  font-size: 32rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
  margin-bottom: 24rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #7C4DFF;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 12rpx 0;
}
.num {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #EDE4FB;
  color: #7C4DFF;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  flex-shrink: 0;
}
.txt {
  font-size: 28rpx;
  color: #2A1F3D;
  line-height: 1.6;
  letter-spacing: 1rpx;
}

.score-row {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed #E5DEF5;
}
.score-row:last-child { border-bottom: none; }
.badge {
  width: 80rpx;
  height: 60rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 30rpx;
  color: #fff;
  font-family: 'Courier New', monospace;
  flex-shrink: 0;
}
.badge-2 { background: #7C4DFF; }
.badge-1 { background: #B39DDB; }
.badge-10 { background: #4CAF50; }
.badge-neg { background: #E57373; }

.score-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.score-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #2A1F3D;
  letter-spacing: 1rpx;
}
.score-desc {
  font-size: 24rpx;
  color: #6B5B95;
  line-height: 1.5;
}
.score-example {
  font-size: 22rpx;
  color: #8B7DAA;
  margin-top: 4rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}

.paragraph {
  font-size: 26rpx;
  color: #6B5B95;
  line-height: 1.7;
  letter-spacing: 1rpx;
}
</style>
