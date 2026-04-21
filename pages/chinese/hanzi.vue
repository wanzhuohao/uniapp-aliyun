<template>
  <view class="hanzi-page">
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
        <view :class="['filter-tag', filterType === 'stroke' && 'active']" @click="filterType = 'stroke'">笔顺</view>
        <view :class="['filter-tag', filterType === 'radical' && 'active']" @click="filterType = 'radical'">部首</view>
        <view :class="['filter-tag', filterType === 'structure' && 'active']" @click="filterType = 'structure'">结构</view>
        <view :class="['filter-tag', filterType === 'strokeCount' && 'active']" @click="filterType = 'strokeCount'">笔画数</view>
      </view>
      <view class="start-btn" @click="startRound">开始练习</view>
    </view>

    <view v-if="started && totalQuestions === 0" class="empty-hint">
      <text>本单元暂无汉字题目</text>
      <view class="back-btn" @click="goBack">返回</view>
    </view>

    <HanziQuestion
      v-if="started && currentQ"
      :question="currentQ"
      @answer="handleAnswer"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { sampleWithout, shuffle } from '../../utils/chinese/questionHelper.js'
import { getQuestions } from '../../utils/chinese/questionLoader.js'
import { recordWrong } from '../../utils/chinese/mistakes.js'
import { recordPractice } from '../../utils/chinese/practiceLog.js'
import { getCurrentUnit, setCurrentUnit } from '../../utils/chinese/stateStore.js'
import { UNIT_CONFIG, UNIT_KEYS, getLessonKeys } from '../../utils/chinese/unitConfig.js'
import PracticeBar from '../../components/chinese/PracticeBar.vue'
import HanziQuestion from '../../components/chinese/HanziQuestion.vue'

const unitConfig = UNIT_CONFIG
const unitKeys = UNIT_KEYS

const currentUnit = ref(getCurrentUnit())
const selectedLessons = ref(getLessonKeys(currentUnit.value))
const currentLessons = computed(() => UNIT_CONFIG[currentUnit.value]?.lessons || [])

const filterType = ref('')
const started = ref(false)
const currentIndex = ref(0)
const correctCount = ref(0)
const recordedWrongIds = new Set()
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

const questions = ref([])
const totalQuestions = computed(() => questions.value.length)
const currentQ = computed(() => questions.value[currentIndex.value] || null)

const ALL_STRUCTURES = ['上下', '左右', '独体', '半包围', '全包围']
const ALL_RADICALS = ref([])

function handleAnswer({ isCorrect }) {
  if (isCorrect) {
    correctCount.value++
  } else {
    const q = currentQ.value
    if (q?._id && !recordedWrongIds.has(q._id)) {
      recordedWrongIds.add(q._id)
      recordWrong({
        type: 'hanzi', char: q.char, unit: q.unit,
        question_id: q._id, qType: q.qType
      })
    }
  }
  advanceQuestion()
}

function buildRound(charData, strokeData) {
  const chars = charData.filter(d => d.radical && d.structure)
  ALL_RADICALS.value = [...new Set(charData.map(d => d.radical).filter(Boolean))]

  const types = filterType.value ? [filterType.value] : ['stroke', 'radical', 'structure', 'strokeCount']

  const seen = new Set()
  const allChars = []
  for (const s of strokeData) {
    if (!seen.has(s.char)) { seen.add(s.char); allChars.push(s) }
  }
  for (const c of chars) {
    if (!seen.has(c.char)) { seen.add(c.char); allChars.push(c) }
  }

  // 单课：全量按顺序；多课：随机抽 10
  const selected = selectedLessons.value.length > 1 ? sampleWithout(allChars, 10) : allChars
  const pool = []
  for (const c of selected) {
    const qType = types.length === 1 ? types[0] : types[Math.floor(Math.random() * types.length)]
    const q = buildQuestion(c, qType)
    if (q) pool.push(q)
  }
  return pool
}

function buildQuestion(c, qType) {
  if (qType === 'stroke') {
    return { qType: 'stroke', char: c.char, unit: c.unit, _id: c._id }
  }
  if (qType === 'radical' && c.radical) {
    const correct = c.radical
    const distractors = sampleWithout(ALL_RADICALS.value.filter(r => r !== correct), 3)
    const options = shuffle([
      { label: correct, isCorrect: true },
      ...distractors.map(d => ({ label: d, isCorrect: false }))
    ])
    return { qType: 'radical', char: c.char, options, unit: c.unit, _id: c._id, hint: '这个字的部首是？' }
  }
  if (qType === 'structure' && c.structure) {
    const correct = c.structure
    const distractors = ALL_STRUCTURES.filter(s => s !== correct).slice(0, 3)
    const options = shuffle([
      { label: correct, isCorrect: true },
      ...distractors.map(d => ({ label: d, isCorrect: false }))
    ])
    return { qType: 'structure', char: c.char, options, unit: c.unit, _id: c._id, hint: '这个字是什么结构？' }
  }
  if (qType === 'strokeCount' && c.strokeCount) {
    const correct = c.strokeCount
    const distractors = [correct - 1, correct + 1, correct + 2].filter(n => n > 0 && n !== correct)
    const options = shuffle([
      { label: correct + ' 画', isCorrect: true },
      ...distractors.slice(0, 3).map(d => ({ label: d + ' 画', isCorrect: false }))
    ])
    return { qType: 'strokeCount', char: c.char, options, unit: c.unit, _id: c._id, hint: '这个字有几画？' }
  }
  return { qType: 'stroke', char: c.char, unit: c.unit, _id: c._id }
}

function startRound() {
  const lessons = selectedLessons.value
  const pinyinSource = getQuestions('pinyin', lessons) || []
  const strokeSource = getQuestions('stroke', lessons) || []
  const built = buildRound(pinyinSource, strokeSource)
  questions.value = lessons.length > 1 ? shuffle(built) : built
  currentIndex.value = 0
  correctCount.value = 0
  recordedWrongIds.clear()
  started.value = true
}

function advanceQuestion() {
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
  } else {
    roundFinished.value = true
    recordPractice({ type: 'hanzi', totalCount: totalQuestions.value, correctCount: correctCount.value })
    uni.navigateTo({
      url: `/pages/chinese/result?module=hanzi&correct=${correctCount.value}&total=${totalQuestions.value}`
    })
  }
}

function goBack() {
  uni.navigateBack()
}

onShow(() => {
  if (roundFinished.value) {
    started.value = false
    roundFinished.value = false
  }
})
</script>

<style scoped>
.hanzi-page { min-height: 100vh; background: #FAF6EE; }

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
