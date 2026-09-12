<template>
  <view class="hanzi-page">
    <PageHeader v-if="!started" title="汉字练习" theme="chinese" />
    <PracticeBar v-if="started" :current="currentIndex + 1" :total="totalQuestions" @cancel="onCancel" />

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
          :class="['unit-tag', 'unit-tag-toggle', isAllLessonsSelected && 'active']"
          @click="toggleAllLessons"
        >{{ isAllLessonsSelected ? '全不选' : '全选' }}</view>
        <view v-for="l in currentLessons" :key="l.key"
          :class="['unit-tag', selectedLessons.includes(l.key) && 'active']"
          @click="toggleLesson(l.key)"
        >{{ l.label }}</view>
      </view>

      <text class="filter-title" style="margin-top: 24rpx;">选择题型</text>
      <view class="filter-tags">
        <view :class="['filter-tag', filterType === '' && 'active']" @click="setFilterType('')">全部混合</view>
        <view :class="['filter-tag', filterType === 'stroke' && 'active']" @click="setFilterType('stroke')">笔顺</view>
        <view :class="['filter-tag', filterType === 'radical' && 'active']" @click="setFilterType('radical')">部首</view>
        <view :class="['filter-tag', filterType === 'structure' && 'active']" @click="setFilterType('structure')">结构</view>
        <view :class="['filter-tag', filterType === 'strokeCount' && 'active']" @click="setFilterType('strokeCount')">笔画数</view>
      </view>
      <view :class="['start-btn', !canStart && 'disabled']" @click="startRound">开始练习</view>
    </view>

    <view v-if="started && totalQuestions === 0" class="empty-hint">
      <text>该学期语文题库待补充，数据更新后即可练习</text>
      <view class="back-btn" @click="onCancel">返回</view>
    </view>

    <HanziQuestion
      v-if="started && currentQ"
      :key="answerAttemptKey + '-' + currentIndex"
      :question="currentQ"
      @answer="handleAnswer"
    />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { sampleWithout, shuffle, ALL_STRUCTURES, buildRadicalOptions, buildStructureOptions, buildStrokeCountOptions } from '../../utils/chinese/questionHelper.js'
import { getQuestions } from '../../utils/chinese/questionLoader.js'
import { recordWrong } from '../../utils/chinese/mistakes.js'
import { recordPractice } from '../../utils/chinese/practiceLog.js'
import { getCurrentUnit, setCurrentUnit, getChinesePrefs, setChinesePrefs } from '../../utils/chinese/stateStore.js'
import { getSemesterUnitConfig, getSemesterUnitKeys, getSemesterLessonKeys } from '../../utils/chinese/unitConfig.js'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import { openCourseGradeSession } from '../../utils/common/gradeContext.js'
import PageHeader from '../../components/PageHeader.vue'
import PracticeBar from '../../components/chinese/PracticeBar.vue'
import HanziQuestion from '../../components/chinese/HanziQuestion.vue'

const PAGE_KEY = 'hanzi'
const unitConfig = computed(() => getSemesterUnitConfig(sessionGrade))
const unitKeys = computed(() => getSemesterUnitKeys(sessionGrade))

const currentUnit = ref(getSemesterUnitKeys(null)[0])
const selectedLessons = ref(getSemesterLessonKeys(null, currentUnit.value))
const filterType = ref('')
let preferencesHydrated = false
let sessionGrade

function hydratePreferences() {
  currentUnit.value = getCurrentUnit(sessionGrade)
  const savedPrefs = getChinesePrefs(sessionGrade, PAGE_KEY)
  const all = getSemesterLessonKeys(sessionGrade, currentUnit.value)
  if (Array.isArray(savedPrefs?.selectedLessons)) {
    const filtered = savedPrefs.selectedLessons.filter(k => all.includes(k))
    selectedLessons.value = filtered.length ? filtered : all
  } else {
    selectedLessons.value = all
  }
  filterType.value = typeof savedPrefs?.filterType === 'string' ? savedPrefs.filterType : ''
  preferencesHydrated = true
}
const currentLessons = computed(() => unitConfig.value[currentUnit.value]?.lessons || [])
const isAllLessonsSelected = computed(() =>
  currentLessons.value.length > 0 &&
  selectedLessons.value.length === currentLessons.value.length
)

const canStart = computed(() => selectedLessons.value.length > 0)
const started = ref(false)
const currentIndex = ref(0)
const correctCount = ref(0)
const answerAttemptKey = ref(0)
const recordedWrongIds = new Set()
const roundFinished = ref(false)

function showStorageFailure() {
  uni.showModal({
    title: '学习记录未保存',
    content: '本机存储空间不足或不可用。请清理空间后重试当前题。',
    showCancel: false,
  })
}

function persistPrefs() {
  setChinesePrefs(sessionGrade, PAGE_KEY, {
    selectedLessons: [...selectedLessons.value],
    filterType: filterType.value,
  })
}
function switchUnit(uk) {
  currentUnit.value = uk
  setCurrentUnit(sessionGrade, uk)
  selectedLessons.value = getSemesterLessonKeys(sessionGrade, uk)
  persistPrefs()
}
function toggleLesson(key) {
  const idx = selectedLessons.value.indexOf(key)
  if (idx >= 0) selectedLessons.value.splice(idx, 1)
  else selectedLessons.value.push(key)
  persistPrefs()
}
function toggleAllLessons() {
  const all = getSemesterLessonKeys(sessionGrade, currentUnit.value)
  selectedLessons.value = isAllLessonsSelected.value ? [] : [...all]
  persistPrefs()
}
function setFilterType(v) {
  filterType.value = v
  persistPrefs()
}
function onCancel() {
  started.value = false
}

const questions = ref([])
const totalQuestions = computed(() => questions.value.length)
const currentQ = computed(() => questions.value[currentIndex.value] || null)

const ALL_RADICALS = ref([])

function handleAnswer({ isCorrect }) {
  const nextCorrectCount = correctCount.value + (isCorrect ? 1 : 0)
  const q = currentQ.value
  if (!isCorrect && q?._id && !recordedWrongIds.has(q._id)) {
    const saved = recordWrong({
        grade: sessionGrade, type: 'hanzi', char: q.char, unit: q.unit,
        question_id: q._id, qType: q.qType
      })
    if (!saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return
    }
    recordedWrongIds.add(q._id)
  }
  if (!advanceQuestion(nextCorrectCount)) return
  correctCount.value = nextCorrectCount
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

  // 全量按原顺序（不抽样）
  const selected = allChars
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
    return { qType: 'radical', char: c.char, options: buildRadicalOptions(c.radical, ALL_RADICALS.value), unit: c.unit, _id: c._id, hint: '这个字的部首是？' }
  }
  if (qType === 'structure' && c.structure) {
    return { qType: 'structure', char: c.char, options: buildStructureOptions(c.structure), unit: c.unit, _id: c._id, hint: '这个字是什么结构？' }
  }
  if (qType === 'strokeCount' && c.strokeCount) {
    return { qType: 'strokeCount', char: c.char, options: buildStrokeCountOptions(c.strokeCount), unit: c.unit, _id: c._id, hint: '这个字有几画？' }
  }
  return { qType: 'stroke', char: c.char, unit: c.unit, _id: c._id }
}

function startRound() {
  if (!canStart.value) return
  const lessons = selectedLessons.value
  const pinyinSource = getQuestions(sessionGrade, 'pinyin', lessons) || []
  const strokeSource = getQuestions(sessionGrade, 'stroke', lessons) || []
  const built = buildRound(pinyinSource, strokeSource)
  questions.value = built
  currentIndex.value = 0
  correctCount.value = 0
  answerAttemptKey.value = 0
  recordedWrongIds.clear()
  started.value = true
}

function advanceQuestion(resultCorrectCount) {
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
    return true
  } else {
    const saved = recordPractice({ grade: sessionGrade, type: 'hanzi', totalCount: totalQuestions.value, correctCount: resultCorrectCount })
    if (!saved) {
      answerAttemptKey.value++
      showStorageFailure()
      return false
    }
    roundFinished.value = true
    uni.navigateTo({
      url: `/pages/chinese/result?module=hanzi&correct=${resultCorrectCount}&total=${totalQuestions.value}`
    })
    return true
  }
}

onShow(async () => {
  await awaitLearningSession()
  if (!sessionGrade) sessionGrade = openCourseGradeSession()
  if (!preferencesHydrated) hydratePreferences()
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
.unit-tag-toggle {
  min-width: 134rpx;
  text-align: center;
  box-sizing: border-box;
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
.start-btn.disabled {
  background: #C8B9A8;
  box-shadow: none;
  pointer-events: none;
  opacity: 0.7;
}

.empty-hint {
  display: flex; flex-direction: column; align-items: center;
  padding: 120rpx 48rpx; color: #888; font-size: 32rpx;
}
.back-btn {
  margin-top: 32rpx; padding: 20rpx 48rpx;
  background: #A62D33; color: #fff; border-radius: 20rpx; font-size: 28rpx;
}
</style>
