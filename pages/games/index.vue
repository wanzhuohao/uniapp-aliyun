<template>
  <view class="page">
    <PageHeader title="小游戏" theme="game" :homeOnBack="true" fallback="/pages/index/index" />

    <view class="container">
      <view class="hero">
        <text class="hero-badge">GAMES · 玩</text>
        <text class="hero-title">小游戏</text>
        <text class="hero-sub">边玩边学，词字句话样样有</text>
      </view>

      <view class="card card-idiom" @click="goTo('/pages/games/idiom-chain')">
        <view class="card-deco">
          <text class="deco-char c1">成</text>
          <text class="deco-char c2">语</text>
          <text class="deco-char c3">接</text>
          <text class="deco-char c4">龙</text>
        </view>
        <view class="card-main">
          <text class="card-tag">IDIOM CHAIN</text>
          <text class="card-title">成语接龙</text>
          <text class="card-desc">AI 陪你接,3 万条成语库</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <!-- 24 点 -->
      <view class="card card-24" @click="goGame('twentyFour')">
        <view class="card-deco deco-24">
          <text class="num n1">3</text>
          <text class="num n2">8</text>
          <text class="num n3">8</text>
          <text class="num n4">3</text>
          <text class="eq">=24</text>
        </view>
        <view class="card-main">
          <text class="card-tag">24 POINTS</text>
          <text class="card-title">24 点</text>
          <text class="card-desc">+-×÷ 凑数字,锻炼心算</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <!-- 数字华容道 -->
      <view class="card card-slide" @click="goGame('slidingPuzzle')">
        <view class="card-deco deco-slide">
          <text class="tile t1">1</text>
          <text class="tile t2">2</text>
          <text class="tile t3">3</text>
          <text class="tile t4">4</text>
          <text class="tile t5">5</text>
          <text class="tile t6">6</text>
          <text class="tile t7">7</text>
          <text class="tile t8">8</text>
          <view class="tile blank"></view>
        </view>
        <view class="card-main">
          <text class="card-tag">SLIDING PUZZLE</text>
          <text class="card-title">数字华容道</text>
          <text class="card-desc">滑块排序,空间规划</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <!-- 迷你数独 -->
      <view class="card card-sudoku" @click="goGame('sudoku')">
        <view class="card-deco deco-sudoku">
          <text class="cell s1">5</text>
          <text class="cell cell-empty s2"></text>
          <text class="cell s3">2</text>
          <text class="cell cell-empty s4"></text>
          <text class="cell s5">9</text>
          <text class="cell cell-empty s6"></text>
          <text class="cell s7">1</text>
          <text class="cell cell-empty s8"></text>
          <text class="cell s9">6</text>
        </view>
        <view class="card-main">
          <text class="card-tag">SUDOKU</text>
          <text class="card-title">迷你数独</text>
          <text class="card-desc">填数字,逻辑推理</text>
        </view>
        <text class="card-arrow">›</text>
      </view>

      <!-- 飞机大战 -->
      <view class="card card-plane" @click="goGame('plane')">
        <view class="card-deco deco-plane">
          <view class="plane-icon">
            <view class="plane-body"></view>
            <view class="plane-wing"></view>
          </view>
        </view>
        <view class="card-main">
          <text class="card-tag">PLANE WAR</text>
          <text class="card-title">飞机大战</text>
          <text class="card-desc">升级强化,击败敌机</text>
        </view>
        <text class="card-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'

// 已上线游戏路由表;未上线的 key 不在表里,点击 toast「即将上线」
const ROUTES = {
  twentyFour: '/pages/games/twenty-four',
  slidingPuzzle: '/pages/games/sliding-puzzle',
  sudoku: '/pages/games/sudoku',
  plane: '/pages/games/plane/index',
}

function goTo(url) {
  uni.navigateTo({ url })
}

function goGame(key) {
  const url = ROUTES[key]
  if (url) {
    uni.navigateTo({ url })
  } else {
    uni.showToast({ title: '即将上线', icon: 'none', duration: 1500 })
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #F5F2FA;
}
.container {
  padding: 40rpx 32rpx 60rpx;
}

.hero {
  padding: 0 8rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.hero-badge {
  font-size: 22rpx;
  color: #6B5B95;
  letter-spacing: 8rpx;
  font-weight: bold;
}
.hero-title {
  font-size: 64rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 4rpx;
  line-height: 1.2;
}
.hero-sub {
  font-size: 26rpx;
  color: #6B5B95;
  letter-spacing: 2rpx;
  margin-top: 8rpx;
}

.card {
  position: relative;
  background: #fff;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(124,77,255,0.10);
  overflow: hidden;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
  min-height: 180rpx;
}
.card:active { transform: scale(0.98); }

.card-deco {
  width: 160rpx;
  height: 160rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: linear-gradient(135deg, #EDE4FB 0%, #C9B5FF 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  padding: 16rpx;
  gap: 4rpx;
}
.deco-char {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 40rpx;
  font-weight: 500;
  color: #fff;
  background: #7C4DFF;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 4rpx rgba(124,77,255,0.3);
}
.c1 { transform: rotate(-3deg); }
.c2 { transform: rotate(2deg); background: #5E35B1; }
.c3 { transform: rotate(3deg); background: #5E35B1; }
.c4 { transform: rotate(-2deg); }

.card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.card-tag {
  font-size: 20rpx;
  letter-spacing: 6rpx;
  font-weight: bold;
  color: #7C4DFF;
}
.card-title {
  font-size: 44rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
}
.card-desc {
  font-size: 24rpx;
  color: #6B5B95;
  margin-top: 4rpx;
}
.card-arrow {
  font-size: 48rpx;
  color: #B5A5D9;
  font-weight: bold;
  flex-shrink: 0;
}

/* ===== 24 点装饰 ===== */
.deco-24 {
  position: relative;
  background: linear-gradient(135deg, #FFE0B2 0%, #FFA726 100%);
}
.deco-24 .num {
  position: absolute;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 38rpx;
  font-weight: 500;
  color: #5D2E00;
  text-shadow: 0 1rpx 2rpx rgba(255,255,255,0.6);
}
.deco-24 .n1 { top: 14rpx; left: 18rpx; transform: rotate(-6deg); }
.deco-24 .n2 { top: 14rpx; right: 18rpx; transform: rotate(4deg); }
.deco-24 .n3 { bottom: 36rpx; left: 18rpx; transform: rotate(3deg); }
.deco-24 .n4 { bottom: 36rpx; right: 18rpx; transform: rotate(-5deg); }
.deco-24 .eq {
  position: absolute;
  left: 0; right: 0; bottom: 6rpx;
  text-align: center;
  font-size: 22rpx;
  font-weight: bold;
  color: #BF360C;
  letter-spacing: 2rpx;
}
.card-24 .card-tag { color: #E65100; }

/* ===== 数字华容道装饰 ===== */
.deco-slide {
  background: linear-gradient(135deg, #B2DFDB 0%, #26A69A 100%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 12rpx;
  gap: 4rpx;
}
.deco-slide .tile {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 6rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #00695C;
  box-shadow: 0 1rpx 2rpx rgba(0,0,0,0.15);
}
.deco-slide .blank {
  background: transparent;
  box-shadow: none;
}
.card-slide .card-tag { color: #00897B; }

/* ===== 迷你数独装饰 ===== */
.deco-sudoku {
  background: linear-gradient(135deg, #F8BBD0 0%, #EC407A 100%);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 12rpx;
  gap: 3rpx;
}
.deco-sudoku .cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.92);
  border-radius: 4rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  font-size: 30rpx;
  font-weight: 500;
  color: #880E4F;
}
.deco-sudoku .cell-empty {
  background: rgba(255,255,255,0.4);
}
.card-sudoku .card-tag { color: #C2185B; }

/* ===== 飞机大战装饰 ===== */
.deco-plane {
  background: linear-gradient(135deg, #1A0E3D 0%, #0B1840 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.deco-plane::before {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255,255,255,0.6);
  border-radius: 50%;
  top: 20%;
  left: 25%;
  box-shadow:
    20px 15px 0 rgba(255,255,255,0.4),
    45px 8px 0 rgba(255,255,255,0.5),
    10px 40px 0 rgba(255,255,255,0.3),
    55px 35px 0 rgba(255,255,255,0.6),
    35px 50px 0 rgba(255,255,255,0.4);
}
.plane-icon {
  position: relative;
  width: 60rpx;
  height: 80rpx;
}
.plane-body {
  position: absolute;
  left: 50%;
  top: 0;
  width: 24rpx;
  height: 60rpx;
  margin-left: -12rpx;
  background: linear-gradient(180deg, #7FE7FF 0%, #1689B8 100%);
  clip-path: polygon(50% 0%, 100% 70%, 50% 90%, 0% 70%);
}
.plane-wing {
  position: absolute;
  top: 40%;
  left: 0;
  width: 100%;
  height: 20rpx;
  background: #2A5C8A;
  clip-path: polygon(0% 50%, 30% 0%, 70% 0%, 100% 50%, 70% 80%, 30% 80%);
}
.card-plane .card-tag { color: #7C4DFF; }
</style>
