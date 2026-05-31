<template>
  <view class="page">
    <PageHeader title="成语接龙" theme="game" fallback="/pages/games/index">
      <text class="header-btn" @click="goGuide">规则</text>
    </PageHeader>

    <!-- 接龙字图例 -->
    <view class="legend">
      <text class="legend-item">
        <text class="legend-dot legend-first"></text>
        <text>接上句</text>
      </text>
      <text class="legend-item">
        <text class="legend-dot legend-last"></text>
        <text>下句接此字</text>
      </text>
    </view>

    <!-- 计分条 -->
    <view class="score-bar">
      <view class="score-block">
        <text class="score-label">本局得分</text>
        <text class="score-value">{{ score }}</text>
      </view>
      <view class="score-block">
        <text class="score-label">历史最高</text>
        <text class="score-value muted">{{ best }}</text>
      </view>
      <view class="score-block">
        <text class="score-label">接龙数</text>
        <text class="score-value muted">{{ steps.length }}</text>
      </view>
    </view>

    <!-- 接龙记录 -->
    <scroll-view class="chain-list" scroll-y :scroll-top="scrollTopVal" :scroll-with-animation="false">
      <view v-if="loading" class="loading">
        <text>词库加载中…</text>
      </view>
      <view v-for="(s, i) in steps" :key="i" :id="'step-' + i" :class="['step', s.by === 'ai' ? 'step-ai' : 'step-me']">
        <view class="step-tag">{{ s.by === 'ai' ? 'AI' : '我' }}</view>
        <view class="step-main">
          <!-- 占位行（认输 / AI 接不上） -->
          <text v-if="s.w === '——'" class="step-word placeholder">——</text>
          <!-- 正常成语：首字 / 中间 / 末字 三段高亮 -->
          <text v-else class="step-word">
            <text :class="['char', i > 0 ? 'hl-first' : '']">{{ s.w[0] }}</text>
            <text class="char">{{ s.w.slice(1, -1) }}</text>
            <text :class="['char', (i < steps.length - 1 || !gameOver) ? 'hl-last' : '']">{{ s.w[s.w.length - 1] }}</text>
          </text>
          <text v-if="s.w !== '——'" class="step-pinyin">
            <text :class="['pinyin', i > 0 ? 'hl-first' : '']">{{ pyParts(s.p)[0] }}</text>
            <text class="pinyin">{{ pyParts(s.p)[1] }}</text>
            <text :class="['pinyin', (i < steps.length - 1 || !gameOver) ? 'hl-last' : '']">{{ pyParts(s.p)[2] }}</text>
          </text>
        </view>
        <view v-if="s.score !== undefined && s.score !== 0" class="step-score" :class="{ negative: s.score < 0 }">
          {{ s.score > 0 ? '+' : '' }}{{ s.score }}
        </view>
        <view v-if="s.reason" class="step-reason">{{ s.reason }}</view>
      </view>
      <view v-if="aiThinking" class="thinking">
        <view class="thinking-tag">AI</view>
        <view class="thinking-dots">
          <view class="dot d1"></view>
          <view class="dot d2"></view>
          <view class="dot d3"></view>
        </view>
      </view>
    </scroll-view>

    <!-- 错误提示 -->
    <view v-if="warn" class="warn-bar">
      <text>{{ warn }}</text>
    </view>

    <!-- 输入区 -->
    <view class="input-area" v-if="!gameOver">
      <view class="input-row">
        <input
          class="input"
          v-model="inputText"
          :focus="inputFocus"
          placeholder="请输入成语..."
          :disabled="loading || aiThinking"
          confirm-type="send"
          :confirm-hold="true"
          :adjust-position="true"
          @confirm="submit"
        />
        <view class="btn btn-primary" :class="{ disabled: !canSubmit }" @click="submit">接龙</view>
      </view>
      <view class="input-row">
        <view class="btn btn-ghost" @click="useHint" :class="{ disabled: loading || aiThinking }">
          提示 <text class="btn-sub">-{{ HINT_COST }}</text>
        </view>
        <view class="btn btn-warn" @click="giveUp" :class="{ disabled: loading || aiThinking }">
          我接不上
        </view>
      </view>
    </view>

    <view v-else class="end-area">
      <view class="end-title">{{ endTitle }}</view>
      <view class="end-sub">本局得分 {{ score }} · 历史最高 {{ best }}</view>
      <view class="end-actions">
        <view class="btn btn-primary big" @click="restart">再来一局</view>
        <view class="btn btn-ghost big" @click="goGames">回到小游戏</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { loadIdioms, pickOpening, judge, aiPick, hint, SCORE, REASON } from '@/utils/games/idiomChain.js'
import { getBest, setBest, saveLast } from '@/utils/games/idiomStorage.js'

const HINT_COST = SCORE.HINT_COST

const loading = ref(true)
const aiThinking = ref(false)
let aiTimer = null
const inputText = ref('')
const warn = ref('')
const score = ref(0)
const best = ref(0)
const steps = ref([])           // {by:'ai'|'player', w, p, score, reason}
const used = new Set()
const prev = ref(null)
const gameOver = ref(false)
const endTitle = ref('')
const canSubmit = computed(() => !loading.value && !aiThinking.value && !gameOver.value && inputText.value.trim().length >= 2)
const scrollTopVal = ref(0)
const inputFocus = ref(false)

// 提交后重新聚焦：先 false 再 true 才会触发 focus 事件
async function refocusInput() {
  inputFocus.value = false
  await nextTick()
  inputFocus.value = true
}

// 每次新增 step 后调一下：递增 scrollTopVal，让 scroll-view 滚到底
// （scroll-top 超过实际 scroll-height 时会被钳到底部，简单可靠）
async function scrollToBottom() {
  await nextTick()
  scrollTopVal.value = scrollTopVal.value + 99999
}

onMounted(async () => {
  best.value = getBest()
  try {
    await loadIdioms()
    loading.value = false
    aiOpen()
    refocusInput()
  } catch (e) {
    loading.value = false
    warn.value = '词库加载失败: ' + (e && e.message ? e.message : e)
  }
})

onUnmounted(() => {
  if (aiTimer) clearTimeout(aiTimer)
})

function aiOpen() {
  const opening = pickOpening(used)
  if (!opening) return
  used.add(opening.w)
  prev.value = opening
  steps.value.push({ by: 'ai', w: opening.w, p: opening.p, score: 0, reason: '开局' })
  scrollToBottom()
}

function clearWarn() { warn.value = '' }

function submit() {
  if (!canSubmit.value) return
  clearWarn()
  const raw = inputText.value.trim()
  const result = judge(prev.value, raw, used)
  if (!result.ok) {
    warn.value = result.reason
    return
  }
  // 玩家接上
  used.add(result.idiom.w)
  prev.value = result.idiom
  score.value += result.score
  steps.value.push({ by: 'player', w: result.idiom.w, p: result.idiom.p, score: result.score, reason: result.reason })
  inputText.value = ''
  scrollToBottom()
  // AI 0.5s 后接 —— 模拟思考节奏，期间显示"AI 思考中"
  aiThinking.value = true
  scrollToBottom()
  aiTimer = setTimeout(() => {
    aiThinking.value = false
    aiTurn()
    if (!gameOver.value) refocusInput()
  }, 500)
}

function aiTurn() {
  const picked = aiPick(prev.value, used)
  if (!picked) {
    // AI 认输，玩家 +10，游戏结束
    score.value += SCORE.OPPONENT_GIVEUP
    steps.value.push({ by: 'ai', w: '——', p: '', score: SCORE.OPPONENT_GIVEUP, reason: 'AI 接不上，你赢了' })
    scrollToBottom()
    endGame(true)
    return
  }
  used.add(picked.w)
  prev.value = picked
  steps.value.push({ by: 'ai', w: picked.w, p: picked.p, score: 0, reason: '' })
  scrollToBottom()
}

function useHint() {
  if (loading.value || aiThinking.value || gameOver.value) return
  const h = hint(prev.value, used)
  if (!h) {
    warn.value = '这一关连提示也想不出来了'
    return
  }
  // 直接把答案填进输入框，玩家按 enter 即可提交
  inputText.value = h.w
  score.value -= HINT_COST
  clearWarn()
  refocusInput()
}

function giveUp() {
  if (loading.value || aiThinking.value || gameOver.value) return
  uni.showModal({
    title: '认输',
    content: '确定本局认输吗？',
    success: ({ confirm }) => {
      if (!confirm) return
      steps.value.push({ by: 'player', w: '——', p: '', score: 0, reason: '认输' })
      scrollToBottom()
      endGame(false)
    }
  })
}

function endGame(playerWin) {
  gameOver.value = true
  endTitle.value = playerWin ? '🎉 你赢了' : '本局结束'
  if (score.value > best.value) {
    best.value = score.value
    setBest(score.value)
  }
  saveLast({
    score: score.value,
    steps: steps.value.slice(),
    endedAt: Date.now(),
    endReason: playerWin ? 'ai-giveup' : 'player-giveup'
  })
}

function restart() {
  used.clear()
  prev.value = null
  steps.value = []
  score.value = 0
  inputText.value = ''
  warn.value = ''
  gameOver.value = false
  endTitle.value = ''
  aiOpen()
  refocusInput()
}

function goGuide() {
  uni.navigateTo({ url: '/pages/games/idiom-chain-guide' })
}
function goGames() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/games/index' }) })
}

// 把拼音串按音节拆成 [首, 中间(空格分隔), 末]
function pyParts(p) {
  const arr = (p || '').split(' ').filter(Boolean)
  if (!arr.length) return ['', '', '']
  if (arr.length === 1) return [arr[0], '', '']
  if (arr.length === 2) return [arr[0], '', arr[1]]
  return [arr[0], ' ' + arr.slice(1, -1).join(' ') + ' ', arr[arr.length - 1]]
}
</script>

<style scoped>
.page {
  /* 定高 + overflow:hidden, 让 chain-list 成为唯一可滚区，input-area 始终在底部可见 */
  height: 100vh;
  overflow: hidden;
  background: #F5F2FA;
  display: flex;
  flex-direction: column;
}

.legend {
  display: flex;
  gap: 24rpx;
  padding: 16rpx 32rpx 0;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  font-size: 22rpx;
  color: #8B7DAA;
  letter-spacing: 1rpx;
}
.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
  margin-right: 8rpx;
  display: inline-block;
}
.legend-first { background: #EDE4FB; border: 2rpx solid #5E35B1; }
.legend-last { background: #FF8A65; }

.header-btn {
  font-size: 26rpx;
  color: #fff;
  padding: 6rpx 18rpx;
  background: rgba(255,255,255,0.2);
  border-radius: 24rpx;
  letter-spacing: 2rpx;
}

/* 计分条 */
.score-bar {
  display: flex;
  background: #fff;
  margin: 24rpx 24rpx 0;
  border-radius: 20rpx;
  padding: 24rpx 0;
  box-shadow: 0 4rpx 16rpx rgba(124,77,255,0.08);
}
.score-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.score-label {
  font-size: 22rpx;
  color: #8B7DAA;
  letter-spacing: 2rpx;
}
.score-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #7C4DFF;
  font-family: 'Courier New', monospace;
}
.score-value.muted { color: #B5A5D9; font-size: 36rpx; }

/* 接龙记录 */
.chain-list {
  flex: 1;
  min-height: 0; /* flex 子项 overflow 必须 + 不然撑破容器 */
  margin: 24rpx 24rpx 0;
  padding: 8rpx 4rpx 16rpx;
  box-sizing: border-box;
}
.loading {
  text-align: center;
  color: #8B7DAA;
  padding: 60rpx 0;
  font-size: 26rpx;
}
.step {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 12rpx;
  border-radius: 20rpx;
  position: relative;
  flex-wrap: wrap;
}
.step-ai {
  background: #fff;
  border-left: 6rpx solid #7C4DFF;
}
.step-me {
  background: #EDE4FB;
  border-left: 6rpx solid #5E35B1;
}
.step-tag {
  font-size: 22rpx;
  font-weight: bold;
  color: #fff;
  background: #7C4DFF;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.step-me .step-tag { background: #5E35B1; }
.step-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.step-word {
  font-size: 36rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
  line-height: 1.6;
}
.step-word .char {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
.step-word .char.hl-first {
  color: #5E35B1;
  background: #EDE4FB;
  border-radius: 6rpx;
  padding: 0 6rpx;
  margin-right: 2rpx;
}
.step-word .char.hl-last {
  color: #fff;
  background: #FF8A65;
  border-radius: 6rpx;
  padding: 0 6rpx;
  margin-left: 2rpx;
  font-weight: bold;
}
.step-word.placeholder {
  color: #B5A5D9;
  font-size: 30rpx;
}
.step-pinyin {
  font-size: 22rpx;
  color: #8B7DAA;
  letter-spacing: 2rpx;
  font-family: 'Courier New', monospace;
  line-height: 1.6;
}
.step-pinyin .pinyin { font-family: inherit; font-size: inherit; color: inherit; }
.step-pinyin .pinyin.hl-first { color: #5E35B1; font-weight: bold; }
.step-pinyin .pinyin.hl-last { color: #E64A19; font-weight: bold; }
.step-score {
  font-size: 32rpx;
  font-weight: bold;
  color: #4CAF50;
  font-family: 'Courier New', monospace;
}
.step-score.negative { color: #E57373; }
.step-reason {
  width: 100%;
  font-size: 22rpx;
  color: #8B7DAA;
  margin-top: 4rpx;
  padding-left: 64rpx;
  letter-spacing: 1rpx;
}

/* AI 思考中：与 step-ai 同款外观 + 三点动画 */
.thinking {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 12rpx;
  border-radius: 20rpx;
  background: #fff;
  border-left: 6rpx solid #7C4DFF;
}
.thinking-tag {
  font-size: 22rpx;
  font-weight: bold;
  color: #fff;
  background: #7C4DFF;
  padding: 4rpx 16rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}
.thinking-dots {
  display: flex;
  gap: 8rpx;
  align-items: center;
}
.thinking-dots .dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #7C4DFF;
  animation: thinking-bounce 1.2s infinite ease-in-out;
}
.thinking-dots .d2 { animation-delay: 0.2s; }
.thinking-dots .d3 { animation-delay: 0.4s; }
@keyframes thinking-bounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-6rpx); }
}

/* 警告条 */
.warn-bar {
  margin: 0 24rpx;
  background: #FCE4EC;
  color: #C62828;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  font-size: 26rpx;
  text-align: center;
  letter-spacing: 1rpx;
  margin-top: 12rpx;
}

/* 输入区 */
.input-area {
  flex-shrink: 0; /* 不被 chain-list 撑出可视区 */
  background: #fff;
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -4rpx 16rpx rgba(124,77,255,0.08);
  margin-top: 16rpx;
}
.input-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.input-row:last-child { margin-bottom: 0; }
.input {
  flex: 1;
  background: #F5F2FA;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 32rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  letter-spacing: 2rpx;
  color: #2A1F3D;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 28rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  letter-spacing: 2rpx;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.btn:active { transform: scale(0.96); }
.btn.disabled { opacity: 0.5; }
.btn-primary { background: #7C4DFF; color: #fff; }
.btn-ghost {
  flex: 1;
  background: #EDE4FB;
  color: #5E35B1;
}
.btn-warn {
  flex: 1;
  background: #FFEBEE;
  color: #C62828;
}
.btn-sub { font-size: 22rpx; margin-left: 6rpx; opacity: 0.8; }

/* 结束区 */
.end-area {
  flex-shrink: 0;
  background: #fff;
  padding: 48rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -4rpx 16rpx rgba(124,77,255,0.08);
  margin-top: 16rpx;
  text-align: center;
}
.end-title {
  font-size: 48rpx;
  font-weight: 500;
  color: #2A1F3D;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  margin-bottom: 12rpx;
}
.end-sub {
  font-size: 26rpx;
  color: #8B7DAA;
  margin-bottom: 36rpx;
  letter-spacing: 2rpx;
}
.end-actions {
  display: flex;
  gap: 16rpx;
}
.btn.big {
  flex: 1;
  padding: 28rpx;
  font-size: 30rpx;
}
</style>
