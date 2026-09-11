<template>
  <view v-if="courseReady" class="result-page">
    <GradeBadge class="result-grade" :label="gradeLabel" />
    <!-- 顶部小字 -->
    <text class="top-note">{{ topNote }}</text>

    <!-- 印章 + 分数 -->
    <view class="stamp-wrap">
      <view class="stamp-shadow"></view>
      <view class="stamp">
        <text class="stamp-mini">批</text>
        <text class="stamp-score">{{ correct }}</text>
        <text class="stamp-slash">／</text>
        <text class="stamp-total">{{ total }}</text>
        <text class="stamp-mini stamp-mini-br">阅</text>
      </view>
      <view class="ink-dot ink-dot-1"></view>
      <view class="ink-dot ink-dot-2"></view>
      <view class="ink-dot ink-dot-3"></view>
    </view>

    <!-- 激励文字 -->
    <text class="encourage">{{ encourageText }}</text>

    <!-- 按钮 -->
    <view class="actions">
      <view class="action-btn primary" @click="playAgain">
        <text>再来一轮</text>
      </view>
      <view class="action-btn" @click="goHome">
        <text>回到主页</text>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="footer-deco">
      <text>· 學 而 時 習 之 ·</text>
    </view>
  </view>
  <GradeBadge v-else :label="gradeLabel" />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import GradeBadge from '../../components/learning/GradeBadge.vue'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { getLearningGradeLabel, openCourseGradeSession } from '../../utils/common/gradeContext.js'

const gradeLabel = ref('')
const courseReady = ref(false)

const query = (() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$page?.options || page?.options || {}
})()

const correct = Number(query.correct) || 0
const total = Number(query.total) || 10

const rate = computed(() => total > 0 ? correct / total : 0)

const topNote = computed(() => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}年 ${mm}月${dd}日 · 今日练习`
})

const encourageText = computed(() => {
  if (correct === total && total > 0) return '全对！下次还要这样哦'
  if (rate.value >= 0.8) return '很棒，再接再厉'
  if (rate.value >= 0.6) return '有进步，继续加油'
  return '没关系，多练几次就会了'
})

function playAgain() {
  uni.navigateBack()
}
function goHome() {
  uni.navigateBack({ delta: 2 })
}

onMounted(async () => {
  try {
    await awaitLearningSession()
    gradeLabel.value = getLearningGradeLabel(openCourseGradeSession())
    courseReady.value = true
  } catch {
    gradeLabel.value = ''
  }
})
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #FAF6EE;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 48rpx 60rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  position: relative;
}
.result-grade { position: absolute; top: 24rpx; right: 28rpx; background: #a62d33; }

.top-note {
  font-size: 24rpx;
  color: #A39585;
  letter-spacing: 3rpx;
  margin-bottom: 60rpx;
}

/* ── 印章 ─────────────────────────────────────────── */
.stamp-wrap {
  position: relative;
  width: 360rpx;
  height: 360rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
}
.stamp-shadow {
  position: absolute;
  width: 320rpx;
  height: 320rpx;
  border-radius: 20rpx;
  background: rgba(166,45,51,0.15);
  transform: translate(14rpx, 14rpx) rotate(-3deg);
  filter: blur(6rpx);
}
.stamp {
  position: relative;
  width: 320rpx;
  height: 320rpx;
  background: #A62D33;
  border-radius: 20rpx;
  border: 6rpx solid #7F1F25;
  display: grid;
  grid-template-columns: auto auto auto auto auto;
  grid-template-rows: 1fr 1fr;
  align-items: center;
  justify-items: center;
  color: #FAF6EE;
  transform: rotate(-3deg);
  box-shadow: 0 8rpx 24rpx rgba(166,45,51,0.35);
  padding: 20rpx;
  gap: 6rpx;
  /* 印章不规则边缘用 inset shadow 模拟 */
  box-shadow:
    inset 0 0 0 4rpx #FAF6EE,
    inset 0 0 0 10rpx #A62D33,
    0 8rpx 24rpx rgba(166,45,51,0.35);
}
.stamp-mini {
  grid-row: 1;
  font-size: 30rpx;
  font-weight: bold;
  letter-spacing: 0;
  align-self: start;
  margin-top: 12rpx;
}
.stamp-mini-br {
  grid-row: 2;
  align-self: end;
  margin-bottom: 12rpx;
  grid-column: 5;
}
.stamp-mini:first-child {
  grid-column: 1;
}
.stamp-score {
  grid-row: 1 / span 2;
  grid-column: 2;
  font-size: 140rpx;
  font-weight: bold;
  line-height: 1;
}
.stamp-slash {
  grid-row: 1 / span 2;
  grid-column: 3;
  font-size: 60rpx;
  opacity: 0.6;
}
.stamp-total {
  grid-row: 1 / span 2;
  grid-column: 4;
  font-size: 80rpx;
  font-weight: bold;
  align-self: end;
  margin-bottom: 20rpx;
  opacity: 0.85;
}

/* ── 墨点装饰 ─────────────────────────────────────── */
.ink-dot {
  position: absolute;
  border-radius: 50%;
  background: #1F1F1F;
  opacity: 0.55;
}
.ink-dot-1 {
  width: 10rpx; height: 10rpx;
  top: 20rpx; right: 40rpx;
}
.ink-dot-2 {
  width: 6rpx; height: 6rpx;
  bottom: 30rpx; left: 20rpx;
  opacity: 0.35;
}
.ink-dot-3 {
  width: 14rpx; height: 14rpx;
  top: 140rpx; left: -10rpx;
  opacity: 0.25;
  background: #A62D33;
}

/* ── 激励文字 ─────────────────────────────────────── */
.encourage {
  font-size: 36rpx;
  color: #2C2C2C;
  letter-spacing: 6rpx;
  margin-bottom: 48rpx;
  font-weight: bold;
}

/* ── 按钮 ─────────────────────────────────────────── */
.actions {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.action-btn {
  text-align: center;
  padding: 28rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: bold;
  background: #fff;
  color: #A62D33;
  border: 2rpx solid #E8D5B7;
  letter-spacing: 6rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1);
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: #A62D33;
  color: #FAF6EE;
  border-color: #7F1F25;
  box-shadow: 0 6rpx 18rpx rgba(166,45,51,0.3);
}

/* ── 底部装饰 ─────────────────────────────────────── */
.footer-deco {
  margin-top: auto;
  padding-top: 60rpx;
  font-size: 22rpx;
  color: #A62D33;
  opacity: 0.5;
  letter-spacing: 10rpx;
}
</style>
