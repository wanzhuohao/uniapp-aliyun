<template>
  <view class="page">
    <PageHeader title="塔防肉鸽" theme="game" fallback="/pages/games/index" />

    <view class="container">
      <!-- 状态条 -->
      <view class="statusbar">
        <view class="stat"><text class="sl">金币</text><text class="sv gold">{{ cur.gold }}</text></view>
        <view class="stat"><text class="sl">生命</text><text class="sv lives">{{ cur.lives }}</text></view>
        <view class="stat"><text class="sl">波次</text><text class="sv wave">{{ cur.wave }}/12</text></view>
        <view class="stat"><text class="sl">最高</text><text class="sv best">{{ record.bestWave }}</text></view>
      </view>

      <!-- 画布 -->
      <view class="canvas-wrap">
        <canvas id="td" class="td-canvas" />
      </view>

      <!-- 塔选择 -->
      <view class="palette">
        <view v-for="t in towerList" :key="t.key"
          class="tower-option" :class="{ active: selectedType === t.key }"
          @click="selectedType = t.key">
          <text class="to-dot" :style="{ background: t.color }"></text>
          <view class="to-info">
            <text class="to-name">{{ t.name }}</text>
            <text class="to-meta">攻{{ t.dmg }} 速{{ t.rate }}x · {{ t.cost }}💰</text>
          </view>
        </view>
      </view>
      <view class="play-hint">点空地建炮塔 · 点已有炮塔升级</view>

      <view class="actions">
        <view class="action" :class="{ disabled: !canStart }" @click="onNextWave">
          {{ cur.wave === 0 ? '开始防守' : '下一波' }}
        </view>
        <view class="action ghost" @click="restart">重开</view>
      </view>
    </view>

    <!-- 肉鸽强化三选一 -->
    <view v-if="buffChoices.length" class="overlay">
      <view class="panel">
        <text class="panel-emoji">🎲</text>
        <text class="panel-title">防守升级</text>
        <text class="panel-sub">每 5 波一次 · 三选一</text>
        <view class="buff-list">
          <view v-for="b in buffChoices" :key="b.key" class="buff-item" @click="applyBuff(b)">
            <text class="buff-label">{{ b.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结算 -->
    <view v-if="cur.over" class="overlay">
      <view class="panel">
        <text class="panel-emoji">{{ cur.win ? '🏆' : '💀' }}</text>
        <text class="panel-title">{{ cur.win ? '防守胜利!' : '防线被突破' }}</text>
        <text class="panel-sub">打到第 {{ cur.wave }} 波</text>
        <view class="end-btn" @click="restart">再来一局</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onMounted, onUnmounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  COLS, ROWS, TOWER_TYPES, PATH,
  createGame, startWave, update, addTower, upgradeTower, getTower,
  canStartNextWave, rollBuffs,
} from '@/utils/games/towerDefense.js'
import { getStats, recordResult } from '@/utils/games/towerDefenseStorage.js'

const cur = ref(createGame())
const record = ref(getStats())
const selectedType = ref('basic')
const buffChoices = ref([])
const towerList = Object.values(TOWER_TYPES)
const canStart = ref(true)

const CELL = 54
const W = COLS * CELL
const H = ROWS * CELL
let ctx = null
let raf = null
let last = 0

function startFirstWave() {
  canStart.value = false
}

function onNextWave() {
  if (!canStart.value || cur.value.over) return
  // 每 5 波触发一次肉鸽强化
  if (cur.value.wave > 0 && cur.value.wave % 5 === 0) {
    buffChoices.value = rollBuffs(3)
    return
  }
  doStartWave()
}

function doStartWave() {
  startWave(cur.value)
  canStart.value = false
  // 等敌人清空后可点下一波
  checkNextReady()
}

// 定期检查敌人是否清空、能否进入下一波
const nextTimer = setInterval(() => {
  canStart.value = canStartNextWave(cur.value)
}, 200)

function checkNextReady() {
  canStart.value = canStartNextWave(cur.value)
}

function applyBuff(b) {
  b.apply(cur.value)
  buffChoices.value = []
  doStartWave()
}

function restart() {
  cur.value = createGame()
  buffChoices.value = []
  canStart.value = true
}

// 结算（仅真正结束时记录一次）
function settleIfNeeded() {
  if (cur.value.over && !cur.value._settled) {
    cur.value._settled = true
    record.value = recordResult({ win: cur.value.win, wave: cur.value.wave })
  }
}

// ===== Canvas =====
function setupCanvas() {
  const canvas = document.getElementById('td')
  if (!canvas) return
  canvas.width = W
  canvas.height = H
  ctx = canvas.getContext('2d')
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect()
    const gx = (e.clientX - rect.left) / rect.width * W
    const gy = (e.clientY - rect.top) / rect.height * H
    const c = Math.floor(gx / CELL)
    const r = Math.floor(gy / CELL)
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return
    if (getTower(cur.value, c, r)) upgradeTower(cur.value, c, r)
    else addTower(cur.value, selectedType.value, c, r)
  })
}

function draw() {
  const s = cur.value
  if (!ctx) return
  // 背景
  ctx.fillStyle = '#161a24'
  ctx.fillRect(0, 0, W, H)
  // 路径
  ctx.strokeStyle = '#333c50'
  ctx.lineWidth = CELL * 0.72
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  PATH.forEach(([c, r], i) => {
    const x = (c + 0.5) * CELL
    const y = (r + 0.5) * CELL
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  // 出入口
  ctx.fillStyle = '#0e3d2f'
  ctx.beginPath(); ctx.arc((PATH[0][0] + 0.5) * CELL, (PATH[0][1] + 0.5) * CELL, CELL * 0.36, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#5b0f0f'
  const end = PATH[PATH.length - 1]
  ctx.beginPath(); ctx.arc((end[0] + 0.5) * CELL, (end[1] + 0.5) * CELL, CELL * 0.36, 0, Math.PI * 2); ctx.fill()

  // 炮塔
  for (const t of s.towers) {
    const type = TOWER_TYPES[t.type]
    const x = (t.col + 0.5) * CELL
    const y = (t.row + 0.5) * CELL
    ctx.fillStyle = type.color
    ctx.fillRect(x - CELL * 0.38, y - CELL * 0.38, CELL * 0.76, CELL * 0.76)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.strokeRect(x - CELL * 0.38, y - CELL * 0.38, CELL * 0.76, CELL * 0.76)
    // 等级点
    ctx.fillStyle = '#fff'
    for (let i = 0; i < t.level; i++) {
      ctx.beginPath()
      ctx.arc(x - CELL * 0.2 + i * 8, y + CELL * 0.24, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // 敌人
  for (const e of s.enemies) {
    if (!e.active || !e.alive) continue
    const x = (e.pos[0] + 0.5) * CELL
    const y = (e.pos[1] + 0.5) * CELL
    ctx.fillStyle = '#ef5350'
    ctx.beginPath(); ctx.arc(x, y, CELL * 0.28, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
    // 血条
    const bw = CELL * 0.5
    const ratio = e.hp / e.maxHp
    ctx.fillStyle = '#222'
    ctx.fillRect(x - bw / 2, y - CELL * 0.42, bw, 4)
    ctx.fillStyle = ratio > 0.5 ? '#66bb6a' : '#ffca28'
    ctx.fillRect(x - bw / 2, y - CELL * 0.42, bw * ratio, 4)
  }

  // 子弹
  ctx.fillStyle = '#ffe082'
  for (const p of s.projectiles) {
    ctx.beginPath()
    ctx.arc((p.pos[0] + 0.5) * CELL, (p.pos[1] + 0.5) * CELL, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function loop(ts) {
  const dt = Math.min((ts - last || 16) / 1000, 0.05)
  last = ts
  if (!cur.value.over) update(cur.value, dt)
  settleIfNeeded()
  draw()
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  setupCanvas()
  last = performance.now()
  raf = requestAnimationFrame(loop)
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  clearInterval(nextTimer)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #12141c;
}
.container { padding: 24rpx 24rpx 60rpx; }

.statusbar {
  display: flex;
  justify-content: space-around;
  background: #1d2230;
  border-radius: 20rpx;
  padding: 20rpx 12rpx;
  margin-bottom: 20rpx;
}
.stat { display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.sl { font-size: 22rpx; color: #7d87a1; }
.sv { font-size: 34rpx; font-weight: bold; }
.sv.gold { color: #ffd54f; }
.sv.lives { color: #ef5350; }
.sv.wave { color: #64b5f6; }
.sv.best { color: #ce93d8; }

.canvas-wrap {
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.4);
  margin-bottom: 24rpx;
  background: #161a24;
}
.td-canvas {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 10 / 12;
}

.palette { display: flex; gap: 14rpx; margin-bottom: 12rpx; }
.tower-option {
  flex: 1;
  background: #1d2230;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  padding: 16rpx 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  transition: all 0.2s;
}
.tower-option.active {
  border-color: #ffd54f;
  background: #262c3d;
}
.to-dot { width: 22rpx; height: 22rpx; border-radius: 50%; flex-shrink: 0; }
.to-info { display: flex; flex-direction: column; gap: 2rpx; }
.to-name { font-size: 26rpx; font-weight: bold; color: #e8ecf6; }
.to-meta { font-size: 20rpx; color: #8a94ad; }

.play-hint {
  text-align: center;
  color: #5c667e;
  font-size: 22rpx;
  margin-bottom: 20rpx;
}

.actions { display: flex; gap: 16rpx; }
.action {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #5b4be0 0%, #3d3566 100%);
  color: #fff;
  font-size: 32rpx;
  font-family: 'STKaiti','KaiTi','楷体',serif;
  letter-spacing: 4rpx;
}
.action.disabled { opacity: 0.4; pointer-events: none; }
.action.ghost { background: #20242f; color: #aab; border: 1rpx solid #333; }
.action:active { transform: scale(0.97); }

/* 弹层 */
.overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  animation: fadein 0.25s;
}
@keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
.panel {
  background: #1d2230;
  border-radius: 28rpx;
  padding: 48rpx 44rpx;
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
  width: 78%;
  animation: pop 0.3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes pop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.panel-emoji { font-size: 88rpx; }
.panel-title { font-size: 40rpx; font-weight: bold; color: #ffd54f; font-family: 'STKaiti','KaiTi','楷体',serif; letter-spacing: 2rpx; }
.panel-sub { font-size: 24rpx; color: #8a94ad; }
.buff-list { display: flex; flex-direction: column; gap: 16rpx; width: 100%; margin-top: 8rpx; }
.buff-item {
  background: #262c3d;
  border: 2rpx solid #3d3566;
  border-radius: 16rpx;
  padding: 26rpx;
  text-align: center;
}
.buff-item:active { transform: scale(0.97); background: #2e3651; }
.buff-label { font-size: 30rpx; font-weight: 600; color: #e8ecf6; }
.end-btn {
  margin-top: 16rpx;
  padding: 20rpx 60rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #5b4be0 0%, #3d3566 100%);
  color: #fff;
  font-size: 30rpx;
}
</style>