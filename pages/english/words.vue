<template>
  <view class="words-page">
    <PageHeader v-if="!started" title="单词练习" theme="english" />
    <view v-if="started" class="practice-bar">
      <view class="back-btn" @click="goBack">←</view>
      <view v-if="totalQuestions > 0" class="progress-dots">
        <view
          v-for="i in totalQuestions"
          :key="i"
          class="dot"
          :class="{ active: i <= currentIndex + 1, done: i < currentIndex + 1 }"
        />
      </view>
      <text v-if="totalQuestions > 0" class="progress-text">{{ currentIndex + 1 }}/{{ totalQuestions }}</text>
    </view>

    <view v-if="!started" class="filter-area">
      <text class="filter-title">选择主题</text>
      <view class="unit-tags">
        <view
          :class="['unit-tag', 'unit-tag-toggle', isAllThemesSelected && 'active']"
          @click="toggleAllThemes"
        >{{ isAllThemesSelected ? '全不选' : '全选' }}</view>
        <view v-for="k in themeKeys" :key="k"
          :class="['unit-tag', selectedThemes.includes(k) && 'active']"
          @click="toggleTheme(k)"
        >{{ themeConfig[k].emoji }} {{ themeConfig[k].label }}</view>
      </view>

      <text class="filter-title" style="margin-top: 24rpx;">选择题型</text>
      <view class="filter-tags">
        <view :class="['filter-tag', filterType === '' && 'active']" @click="setFilterType('')">全部混合</view>
        <view :class="['filter-tag', filterType === 'img2word' && 'active']" @click="setFilterType('img2word')">看图选词</view>
        <view :class="['filter-tag', filterType === 'word2img' && 'active']" @click="setFilterType('word2img')">听词选图</view>
      </view>
      <view :class="['start-btn', !canStart && 'disabled']" @click="startRound">开始练习</view>
    </view>

    <view v-if="started && totalQuestions === 0" class="empty-hint">
      <text>请至少选择一个主题</text>
      <view class="back-btn-lg" @click="started = false">返回</view>
    </view>

    <WordQuestion
      v-if="started && currentQ"
      :key="roundKey + '-' + currentIndex + '-' + answerAttemptKey"
      :question="currentQ.source"
      :options="currentQ.options"
      :qType="currentQ.qType"
      @answer="handleAnswer"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageHeader from '../../components/PageHeader.vue'
import WordQuestion from '../../components/english/WordQuestion.vue'
import { getWordsByTheme, getAllWords } from '../../utils/english/questionLoader.js'
import { recordWrong } from '../../utils/english/mistakes.js'
import { recordPractice } from '../../utils/english/practiceLog.js'
import { THEME_CONFIG, THEME_KEYS } from '../../utils/english/themeConfig.js'
import { shuffle, sampleWithout } from '../../utils/english/questionHelper.js'
import { primeSpeech } from '../../utils/common/speech.js'
import { getEnglishPrefs, setEnglishPrefs } from '../../utils/english/stateStore.js'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'

const PAGE_KEY = 'words'
const themeConfig = THEME_CONFIG
const themeKeys = THEME_KEYS

const selectedThemes = ref([...THEME_KEYS])
const filterType = ref('')
let preferencesHydrated = false
let sessionGrade

function hydratePreferences() {
  const prefs = getEnglishPrefs(sessionGrade, PAGE_KEY)
  if (Array.isArray(prefs?.selectedThemes)) {
    const filtered = prefs.selectedThemes.filter(k => THEME_KEYS.includes(k))
    selectedThemes.value = filtered.length ? filtered : [...THEME_KEYS]
  } else {
    selectedThemes.value = [...THEME_KEYS]
  }
  filterType.value = typeof prefs?.filterType === 'string' ? prefs.filterType : ''
  preferencesHydrated = true
}
const isAllThemesSelected = computed(() => selectedThemes.value.length === themeKeys.length)
const canStart = computed(() => selectedThemes.value.length > 0)
const started = ref(false)
const currentIndex = ref(0)
const correctCount = ref(0)
const roundKey = ref(0)
const answerAttemptKey = ref(0)
const roundFinished = ref(false)
const recordedWrongIds = new Set()

function showStorageFailure() {
  uni.showModal({
    title: '学习记录未保存',
    content: '本机存储空间不足或不可用。请清理空间后重试当前题。',
    showCancel: false,
  })
}

const questions = ref([])
const totalQuestions = computed(() => questions.value.length)
const currentQ = computed(() => questions.value[currentIndex.value] || null)

function persistPrefs() {
  setEnglishPrefs(sessionGrade, PAGE_KEY, {
    selectedThemes: [...selectedThemes.value],
    filterType: filterType.value,
  })
}
function toggleTheme(k) {
  const idx = selectedThemes.value.indexOf(k)
  if (idx >= 0) selectedThemes.value.splice(idx, 1)
  else selectedThemes.value.push(k)
  persistPrefs()
}
function toggleAllThemes() {
  selectedThemes.value = isAllThemesSelected.value ? [] : [...THEME_KEYS]
  persistPrefs()
}
function setFilterType(v) {
  filterType.value = v
  persistPrefs()
}

function buildQuestion(item, qType, allWords) {
  // 按 word 和 emoji 双重去重，避免 orange(色)/orange(果) 歧义
  const distractorPool = allWords.filter(w => w.word !== item.word && w.emoji !== item.emoji)
  const distractors = sampleWithout(distractorPool, 3)
  const options = shuffle([
    { label: item.word, emoji: item.emoji, isCorrect: true },
    ...distractors.map(d => ({ label: d.word, emoji: d.emoji, isCorrect: false }))
  ])
  return { qType, source: item, options }
}

function startRound() {
  if (!canStart.value) return
  primeSpeech()
  const words = sampleWithout(getWordsByTheme(sessionGrade, selectedThemes.value), 10)
  const allWords = getAllWords(sessionGrade)
  const types = filterType.value ? [filterType.value] : ['img2word', 'word2img']
  const built = words.map((item, i) => {
    const t = types.length === 1 ? types[0] : types[i % types.length]
    return buildQuestion(item, t, allWords)
  })
  questions.value = built
  currentIndex.value = 0
  correctCount.value = 0
  answerAttemptKey.value = 0
  recordedWrongIds.clear()
  started.value = true
}

function handleAnswer({ isCorrect }) {
  const nextCorrectCount = correctCount.value + (isCorrect ? 1 : 0)
  const item = currentQ.value?.source
  if (!isCorrect && item?._id && !recordedWrongIds.has(item._id)) {
    const saved = recordWrong({
        grade: sessionGrade,
        type: 'word',
        word: item.word,
        theme: item.theme,
        emoji: item.emoji,
        zh: item.zh,
        question_id: item._id,
        qType: currentQ.value.qType,
      })
    if (!saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return
    }
    recordedWrongIds.add(item._id)
  }
  if (currentIndex.value < totalQuestions.value - 1) {
    correctCount.value = nextCorrectCount
    currentIndex.value++
  } else {
    const saved = recordPractice({ grade: sessionGrade, type: 'word', totalCount: totalQuestions.value, correctCount: nextCorrectCount })
    if (!saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return
    }
    correctCount.value = nextCorrectCount
    roundFinished.value = true
    uni.navigateTo({
      url: `/pages/english/result?module=word&correct=${nextCorrectCount}&total=${totalQuestions.value}`
    })
  }
}

function goBack() {
  uni.showModal({
    title: '确认退出',
    content: '退出本轮练习，回到选择页？',
    success(res) { if (res.confirm) started.value = false },
  })
}

onShow(async () => {
  await awaitLearningSession()
  if (!sessionGrade) sessionGrade = openCourseGradeSession()
  if (!preferencesHydrated) hydratePreferences()
  if (roundFinished.value) {
    started.value = false
    roundFinished.value = false
    roundKey.value++
  }
})
</script>

<style scoped>
.words-page {
  min-height: 100vh;
  background: #F5FBFB;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}

.practice-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
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
  flex-shrink: 0;
}
.back-btn:active { transform: scale(0.9); background: #e0e0e0; }
.progress-dots {
  display: flex;
  gap: 12rpx;
  flex: 1;
  justify-content: center;
}
.dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #E0E0E0;
  transition: all 0.3s;
}
.dot.active { background: #26A69A; transform: scale(1.2); }
.dot.done { background: #26A69A; }
.progress-text { font-size: 26rpx; color: #666; min-width: 72rpx; text-align: right; }

.filter-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
}
.filter-title {
  font-size: 34rpx;
  font-weight: 900;
  color: #1F3A3A;
  margin-bottom: 24rpx;
  letter-spacing: 2rpx;
}
.unit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  justify-content: center;
  margin-bottom: 8rpx;
}
.unit-tag {
  padding: 16rpx 28rpx;
  border-radius: 28rpx;
  font-size: 28rpx;
  background: #fff;
  color: #1F3A3A;
  border: 2rpx solid #B2DFDB;
  box-shadow: 0 2rpx 6rpx rgba(31,58,58,0.04);
  transition: all 0.2s;
}
.unit-tag:active { transform: scale(0.95); }
.unit-tag.active {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff;
  border-color: #1E8E82;
  font-weight: bold;
  box-shadow: 0 4rpx 10rpx rgba(38,166,154,0.25);
}
.unit-tag-toggle {
  min-width: 134rpx;
  text-align: center;
  box-sizing: border-box;
}
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
  margin-bottom: 48rpx;
}
.filter-tag {
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  background: #fff;
  color: #666;
  border: 3rpx solid #BDBDBD;
}
.filter-tag:active { transform: scale(0.95); }
.filter-tag.active {
  background: #26A69A;
  color: #fff;
  border-color: #26A69A;
  font-weight: bold;
}
.start-btn {
  padding: 24rpx 100rpx;
  background: linear-gradient(135deg, #26A69A, #00796B);
  color: #fff;
  border-radius: 40rpx;
  font-size: 34rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(38,166,154,0.3);
}
.start-btn:active { transform: scale(0.97); }
.start-btn.disabled {
  background: #B0BEC5;
  box-shadow: none;
  pointer-events: none;
  opacity: 0.7;
}

.empty-hint {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx; color: #888; font-size: 32rpx; gap: 32rpx;
}
.back-btn-lg {
  padding: 20rpx 48rpx;
  background: #26A69A; color: #fff; border-radius: 20rpx; font-size: 28rpx;
}
</style>
