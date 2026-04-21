<template>
  <view class="pinyin-page">
    <PracticeBar :current="currentIndex + 1" :total="totalQuestions" />

    <view v-if="!started" class="filter-area">
      <text class="filter-title">选择单元</text>
      <view class="unit-tags">
        <view v-for="uk in unitKeys" :key="uk"
          :class="['unit-tag', currentUnit === uk && 'active']"
          @click="switchUnit(uk)"
        >{{ unitConfig[uk].label }}</view>
      </view>

      <text class="filter-title" style="margin-top: 24rpx;">选择课程</text>
      <view class="unit-tags">
        <view
          :class="['unit-tag', selectedLessons.length === currentLessons.length && 'active']"
          @click="toggleAllLessons"
        >全选</view>
        <view v-for="l in currentLessons" :key="l.key"
          :class="['unit-tag', selectedLessons.includes(l.key) && 'active']"
          @click="toggleLesson(l.key)"
        >{{ l.label }}</view>
      </view>

      <text class="filter-title" style="margin-top: 24rpx;">选择题型</text>
      <view class="filter-tags">
        <view :class="['filter-tag', filterType === '' && 'active']" @click="filterType = ''">全部混合</view>
        <view :class="['filter-tag', filterType === 'char2pinyin' && 'active']" @click="filterType = 'char2pinyin'">看汉字选拼音</view>
        <view :class="['filter-tag', filterType === 'pinyin2char' && 'active']" @click="filterType = 'pinyin2char'">看拼音选汉字</view>
      </view>
      <view class="start-btn" @click="startRound">开始练习</view>
    </view>

    <view v-if="started && totalQuestions === 0" class="empty-hint">
      <text>本单元暂无拼音题目</text>
      <view class="back-btn" @click="goBack">返回</view>
    </view>

    <QuestionCard
      v-if="started && currentQuestion"
      :key="roundKey + '-' + currentIndex"
      :question="currentQuestion.question"
      :questionType="currentQuestion.questionType"
      :options="currentQuestion.options"
      :index="currentIndex + 1"
      :total="totalQuestions"
      @answer="handleAnswer"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { sampleWithout, shuffle } from '../../utils/chinese/questionHelper.js'
import PracticeBar from '../../components/chinese/PracticeBar.vue'
import QuestionCard from '../../components/chinese/QuestionCard.vue'
import { getQuestions } from '../../utils/chinese/questionLoader.js'
import { recordWrong } from '../../utils/chinese/mistakes.js'
import { recordPractice } from '../../utils/chinese/practiceLog.js'
import { getCurrentUnit, setCurrentUnit } from '../../utils/chinese/stateStore.js'
import { UNIT_CONFIG, UNIT_KEYS, getLessonKeys } from '../../utils/chinese/unitConfig.js'

const unitConfig = UNIT_CONFIG
const unitKeys = UNIT_KEYS

const currentUnit = ref(getCurrentUnit())
const selectedLessons = ref(getLessonKeys(currentUnit.value))
const currentLessons = computed(() => UNIT_CONFIG[currentUnit.value]?.lessons || [])

const filterType = ref('')
const started = ref(false)
const currentIndex = ref(0)
const correctCount = ref(0)
const roundKey = ref(0)
const roundFinished = ref(false)

function switchUnit(uk) {
  currentUnit.value = uk
  setCurrentUnit(uk)
  selectedLessons.value = getLessonKeys(uk)
}
function toggleLesson(key) {
  const idx = selectedLessons.value.indexOf(key)
  if (idx >= 0) {
    if (selectedLessons.value.length > 1) selectedLessons.value.splice(idx, 1)
  } else {
    selectedLessons.value.push(key)
  }
}
function toggleAllLessons() {
  const all = getLessonKeys(currentUnit.value)
  selectedLessons.value = selectedLessons.value.length === all.length ? [all[0]] : [...all]
}

function buildRound(source) {
  // 单课：按顺序全量出题；多课：随机抽 10
  const sampled = selectedLessons.value.length > 1 ? sampleWithout(source, 10) : source
  return sampled.map((item, i) => {
    let isTypeA
    if (filterType.value === 'char2pinyin') isTypeA = true
    else if (filterType.value === 'pinyin2char') isTypeA = false
    else isTypeA = i < Math.ceil(sampled.length / 2)

    if (isTypeA) {
      const options = shuffle([
        { label: item.pinyin, value: item.pinyin, isCorrect: true },
        ...item.distractors.map(d => ({ label: d, value: d, isCorrect: false })),
      ])
      return { question: item.char, questionType: 'char', options, _source: item }
    } else {
      const options = shuffle([
        { label: item.char, value: item.char, isCorrect: true },
        ...item.char_distractors.map(d => ({ label: d, value: d, isCorrect: false })),
      ])
      return { question: item.pinyin, questionType: 'pinyin', options, _source: item }
    }
  })
}

const questions = ref([])
const totalQuestions = computed(() => questions.value.length)
const currentQuestion = computed(() => questions.value[currentIndex.value] || null)

function startRound() {
  const source = getQuestions('pinyin', selectedLessons.value) || []
  const built = buildRound(source)
  questions.value = selectedLessons.value.length > 1 ? shuffle(built) : built
  currentIndex.value = 0
  correctCount.value = 0
  started.value = true
}

function goBack() {
  uni.navigateBack()
}

function handleAnswer({ correct }) {
  if (correct) {
    correctCount.value++
  } else {
    const item = currentQuestion.value?._source
    if (item?._id) {
      recordWrong({ type: 'pinyin', char: item.char, unit: item.unit, question_id: item._id })
    }
  }

  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
  } else {
    roundFinished.value = true
    recordPractice({ type: 'pinyin', totalCount: totalQuestions.value, correctCount: correctCount.value })
    uni.navigateTo({
      url: `/pages/chinese/result?module=pinyin&correct=${correctCount.value}&total=${totalQuestions.value}`
    })
  }
}

onShow(() => {
  if (roundFinished.value) {
    started.value = false
    roundFinished.value = false
    roundKey.value++
  }
})
</script>

<style scoped>
.pinyin-page { min-height: 100vh; background: #FAF6EE; }

.filter-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
}
.unit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: center;
  margin-bottom: 16rpx;
}
.unit-tag {
  padding: 14rpx 28rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  background: #fff;
  color: #666;
  border: 3rpx solid #E0E0E0;
}
.unit-tag:active { transform: scale(0.95); }
.unit-tag.active {
  background: #A62D33;
  color: #fff;
  border-color: #A62D33;
  font-weight: bold;
}
.filter-title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 32rpx;
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
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
}
.filter-tag:active { transform: scale(0.95); }
.filter-tag.active {
  background: #A62D33;
  color: #fff;
  border-color: #A62D33;
  font-weight: bold;
}
.start-btn {
  padding: 24rpx 100rpx;
  background: linear-gradient(135deg, #A62D33, #7F1F25);
  color: #fff;
  border-radius: 40rpx;
  font-size: 34rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(166,45,51,0.3);
}
.start-btn:active { transform: scale(0.97); }

.empty-hint {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx; color: #888; font-size: 32rpx;
}
.back-btn {
  margin-top: 32rpx; padding: 20rpx 48rpx;
  background: #A62D33; color: #fff; border-radius: 20rpx; font-size: 28rpx;
}
</style>
