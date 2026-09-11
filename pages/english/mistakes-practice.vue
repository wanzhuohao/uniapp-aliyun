<template>
  <view class="mp-page">
    <view v-if="!started || finished" class="top-bar">
      <view class="back-btn" @click="goBack">←</view>
      <text class="page-title">错题重练</text>
      <GradeBadge :label="gradeLabel" />
    </view>
    <view v-else class="practice-bar">
      <view class="back-btn" @click="exitPractice">←</view>
      <view class="progress-dots">
        <view
          v-for="i in queue.length"
          :key="i"
          class="dot"
          :class="{ active: i <= currentIndex + 1, done: i < currentIndex + 1 }"
        />
      </view>
      <text class="progress-text">{{ currentIndex + 1 }}/{{ queue.length }}</text>
      <GradeBadge :label="gradeLabel" />
    </view>

    <view v-if="!started" class="filter-area">
      <view v-if="allCount === 0" class="empty-state">
        <text class="empty-icon">🎉</text>
        <text v-if="!practiceAll" class="empty-text">今天没有待复习的错题</text>
        <text v-else class="empty-text">太棒了！没有错题！</text>
        <view v-if="!practiceAll" class="start-btn" @click="togglePracticeAll">练全部错题</view>
        <view class="start-btn" style="margin-top: 16rpx; background: #888" @click="goBack">返回错题本</view>
      </view>
      <template v-else>
        <text class="filter-title">选择要重练的类型</text>
        <view v-if="!practiceAll" class="practice-mode-hint" @click="togglePracticeAll">
          <text>📚 今日待复习</text>
          <text class="switch-link">切换到练全部 »</text>
        </view>
        <view v-else class="practice-mode-hint" @click="togglePracticeAll">
          <text>📖 练全部错题</text>
          <text class="switch-link">切换到今日待复习 »</text>
        </view>
        <view class="type-cards">
          <view
            v-if="currentCount > 0"
            class="type-card type-word"
            @click="startPractice"
          >
            <text class="type-icon">🖼️</text>
            <text class="type-name">英语单词</text>
            <text class="type-count">{{ practiceAll ? '全部' : '今日' }} {{ currentCount }} 题</text>
          </view>
        </view>
        <view v-if="currentCount === 0" class="empty-state">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">
            {{ practiceAll ? '太棒了，没有错题' : '今天没有待复习的错题' }}
          </text>
        </view>
      </template>
    </view>

    <WordQuestion
      v-if="started && !finished && currentQ"
      :key="currentIndex + '-' + answerAttemptKey"
      :question="currentQ.source"
      :options="currentQ.options"
      :qType="currentQ.qType"
      @answer="handleAnswer"
    />

    <view v-if="finished" class="finished-area">
      <text class="finished-icon">🏆</text>
      <text class="finished-text">本轮完成！</text>
      <text class="finished-stat">答对 {{ correctCount }} / {{ queue.length }}</text>
      <text v-if="masteredThisRound > 0" class="finished-mastered">本轮掌握 {{ masteredThisRound }} 题</text>
      <view class="result-actions">
        <view class="action-btn primary" @click="reset">继续重练</view>
        <view class="action-btn" @click="goBack">返回错题本</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import WordQuestion from '../../components/english/WordQuestion.vue'
import { getAllWrongList, getDueList, recordCorrect, recordWrongAgain } from '../../utils/english/mistakes.js'
import { getAllWords } from '../../utils/english/questionLoader.js'
import { shuffle, sampleWithout } from '../../utils/english/questionHelper.js'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { getLearningGradeLabel, openCourseGradeSession } from '../../utils/common/gradeContext.js'
import GradeBadge from '../../components/learning/GradeBadge.vue'

const practiceAll = ref(false)
const started = ref(false)
const finished = ref(false)

const dueRecords = ref([])
const allRecords = ref([])

const dueCount = computed(() => dueRecords.value.filter(r => r.type === 'word').length)
const allCount = computed(() => allRecords.value.filter(r => r.type === 'word').length)
const currentCount = computed(() => practiceAll.value ? allCount.value : dueCount.value)

const queue = ref([])
const currentIndex = ref(0)
const correctCount = ref(0)
const masteredThisRound = ref(0)
const answerAttemptKey = ref(0)
const gradeLabel = ref('')
let sessionGrade

function showStorageFailure() {
  uni.showModal({
    title: '学习记录未保存',
    content: '本机存储空间不足或不可用。请清理空间后重试当前题。',
    showCancel: false,
  })
}

const currentQ = computed(() => queue.value[currentIndex.value] || null)

function loadRecords() {
  dueRecords.value = getDueList(sessionGrade)
  allRecords.value = getAllWrongList(sessionGrade)
}

function togglePracticeAll() {
  practiceAll.value = !practiceAll.value
}

function buildQuiz(records) {
  const allWords = getAllWords(sessionGrade)
  const byId = {}
  for (const w of allWords) byId[w._id] = w
  const out = []
  for (const r of records) {
    const source = byId[r.question_id]
    if (!source) continue
    const distractorPool = allWords.filter(w => w.word !== source.word && w.emoji !== source.emoji)
    const distractors = sampleWithout(distractorPool, 3)
    const options = shuffle([
      { label: source.word, emoji: source.emoji, isCorrect: true },
      ...distractors.map(d => ({ label: d.word, emoji: d.emoji, isCorrect: false }))
    ])
    const qType = r.qType === 'word2img' || r.qType === 'img2word'
      ? r.qType
      : (Math.random() > 0.5 ? 'img2word' : 'word2img')
    out.push({ qType, source, options, _wrong: r })
  }
  return out
}

function startPractice() {
  const records = (practiceAll.value ? allRecords.value : dueRecords.value).filter(r => r.type === 'word')
  queue.value = shuffle(buildQuiz(records))
  currentIndex.value = 0
  correctCount.value = 0
  masteredThisRound.value = 0
  answerAttemptKey.value = 0
  finished.value = false
  started.value = queue.value.length > 0
  if (!started.value) finished.value = true
}

function handleAnswer({ isCorrect }) {
  const q = currentQ.value
  if (!q) return
  const w = q._wrong
  if (isCorrect) {
    const r = recordCorrect(sessionGrade, w._id, w.box, w.correctCount || 0)
    if (!r?.saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return
    }
    correctCount.value++
    if (r.mastered) masteredThisRound.value++
  } else {
    const saved = recordWrongAgain(sessionGrade, w._id, w.box, w.wrongCount || 0)
    if (!saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return
    }
  }
  if (currentIndex.value < queue.value.length - 1) {
    currentIndex.value++
  } else {
    finished.value = true
  }
}

function exitPractice() {
  uni.showModal({
    title: '确认退出',
    content: '本轮还没做完，确定要退出吗？',
    success(res) {
      if (res.confirm) {
        started.value = false
        answerAttemptKey.value = 0
        loadRecords()
      }
    },
  })
}

function reset() {
  loadRecords()
  started.value = false
  finished.value = false
  answerAttemptKey.value = 0
}

function goBack() {
  uni.navigateBack()
}

onMounted(async () => {
  await awaitLearningSession()
  sessionGrade = openCourseGradeSession()
  gradeLabel.value = getLearningGradeLabel(sessionGrade)
  loadRecords()
})
</script>

<style scoped>
.mp-page { min-height: 100vh; background: #F5FBFB; }

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.back-btn {
  font-size: 36rpx;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0f0f0;
}
.back-btn:active { transform: scale(0.9); }
.page-title { font-size: 32rpx; font-weight: bold; color: #333; }
.placeholder { width: 56rpx; }

.practice-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.progress-dots { display: flex; gap: 12rpx; flex: 1; justify-content: center; }
.dot {
  width: 20rpx; height: 20rpx; border-radius: 50%;
  background: #E0E0E0; transition: all 0.3s;
}
.dot.active { background: #26A69A; transform: scale(1.2); }
.dot.done { background: #26A69A; }
.progress-text { font-size: 26rpx; color: #666; min-width: 72rpx; text-align: right; }

.filter-area {
  display: flex; flex-direction: column; align-items: center;
  padding: 48rpx 32rpx;
}
.practice-mode-hint {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16rpx 24rpx;
  background: #FFF3E0;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
  font-size: 26rpx; color: #666;
  width: 100%; max-width: 600rpx;
}
.switch-link { color: #26A69A; font-weight: bold; }

.filter-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #1F3A3A;
  margin-bottom: 16rpx;
  align-self: flex-start;
}

.type-cards {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  width: 100%;
  max-width: 600rpx;
}
.type-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 6rpx 20rpx rgba(31,58,58,0.06);
  border-left: 8rpx solid #26A69A;
  transition: transform 0.2s;
}
.type-card:active { transform: scale(0.98); opacity: 0.9; }
.type-icon { font-size: 56rpx; flex-shrink: 0; }
.type-name {
  flex: 1;
  font-size: 34rpx;
  font-weight: bold;
  color: #1F3A3A;
}
.type-count {
  font-size: 26rpx;
  color: #6B8787;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 80rpx 32rpx;
}
.empty-icon { font-size: 100rpx; margin-bottom: 24rpx; }
.empty-text {
  font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 32rpx;
}
.start-btn {
  padding: 24rpx 80rpx;
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff; border-radius: 40rpx;
  font-size: 32rpx; font-weight: bold;
}
.start-btn:active { transform: scale(0.97); }

.finished-area {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx;
}
.finished-icon { font-size: 120rpx; margin-bottom: 32rpx; }
.finished-text { font-size: 44rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; }
.finished-stat { font-size: 32rpx; color: #666; margin-bottom: 12rpx; }
.finished-mastered { font-size: 28rpx; color: #66BB6A; font-weight: bold; }
.result-actions {
  display: flex; flex-direction: column; gap: 20rpx;
  width: 100%; max-width: 500rpx; margin-top: 48rpx;
}
.action-btn {
  text-align: center; padding: 24rpx;
  border-radius: 16rpx; font-size: 32rpx; font-weight: bold;
  background: #fff; border: 4rpx solid #E0E0E0;
}
.action-btn:active { transform: scale(0.97); }
.action-btn.primary {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff; border-color: #26A69A;
}
</style>
