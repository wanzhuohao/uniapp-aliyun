<template>
  <view class="mock-page">
    <PageHeader title="生字学习" theme="chinese" :back-handler="onHeaderBack">
      <text v-if="started && totalQuestions > 0" class="progress-indicator">{{ currentIndex + 1 }}/{{ totalQuestions }}</text>
    </PageHeader>

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

      <view class="desc-area">
        <text class="desc">· 看字自己说出答案</text>
        <text class="desc">· 点"查看答案"核对</text>
        <text class="desc">· 答错自动进错题本</text>
      </view>

      <view :class="['start-btn', !canStart && 'disabled']" @click="startRound">开始学习</view>
    </view>

    <view v-if="started && totalQuestions === 0" class="empty-hint">
      <text>本单元暂无题目</text>
      <view class="back-inline-btn" @click="started = false">返回</view>
    </view>

    <view v-if="started && currentQ" class="quiz-area">
      <view class="char-outline-wrap">
        <view class="char-fallback" v-show="!outlineReady">{{ currentQ.char }}</view>
        <view :id="outlineId" class="char-outline-target" v-show="outlineReady"></view>
      </view>
      <view class="speak-btn" @click="speakChar">🔊</view>

      <text v-if="!showAnswer" class="hint-text">想一想：拼音、部首、结构、笔画</text>

      <view v-if="showAnswer" class="answer-box">
        <view class="answer-row">
          <text class="answer-label">拼音</text>
          <text class="answer-value pinyin">{{ currentQ.pinyin }}</text>
        </view>
        <view class="answer-row">
          <text class="answer-label">部首</text>
          <text class="answer-value">{{ currentQ.radical }}</text>
        </view>
        <view class="answer-row">
          <text class="answer-label">结构</text>
          <text class="answer-value">{{ currentQ.structure }}</text>
        </view>
        <view class="answer-row">
          <text class="answer-label">笔画</text>
          <text class="answer-value">{{ currentQ.strokeCount }} 画</text>
        </view>
        <view class="answer-btn" @click="replayAnim">▶ 笔顺动画</view>
      </view>

      <view v-if="!showAnswer" class="show-answer-btn" @click="revealAnswer">查看答案</view>

      <view v-if="showAnswer" class="self-judge">
        <view class="judge-btn wrong" @click="judgeSelf(false)">❌ 我不会</view>
        <view class="judge-btn correct" @click="judgeSelf(true)">✅ 我会了</view>
      </view>

      <view v-if="showAnswer" class="extend-area">
        <view class="extend-toggle" @click="showIframe = !showIframe">
          {{ showIframe ? '▲ 收起扩展学习' : '▼ 扩展学习（汉字皮）' }}
        </view>
        <view v-if="showIframe" class="iframe-wrap">
          <iframe
            :src="'https://www.hanzipi.com/' + currentQ.char + '.html'"
            class="extend-iframe"
            frameborder="0"
          ></iframe>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HanziWriter from 'hanzi-writer'
import { speak } from '../../utils/common/speech.js'
import { recordWrong } from '../../utils/chinese/mistakes.js'
import { recordPractice } from '../../utils/chinese/practiceLog.js'
import { getQuestions } from '../../utils/chinese/questionLoader.js'
import { getCurrentUnit, setCurrentUnit, getChinesePrefs, setChinesePrefs } from '../../utils/chinese/stateStore.js'
import { UNIT_CONFIG, UNIT_KEYS, getLessonKeys } from '../../utils/chinese/unitConfig.js'
import PageHeader from '../../components/PageHeader.vue'

const PAGE_KEY = 'learn'
const unitConfig = UNIT_CONFIG
const unitKeys = UNIT_KEYS

const currentUnit = ref(getCurrentUnit())
const savedPrefs = getChinesePrefs(PAGE_KEY)
const initLessons = (() => {
  const all = getLessonKeys(currentUnit.value)
  if (Array.isArray(savedPrefs?.selectedLessons)) {
    const filtered = savedPrefs.selectedLessons.filter(k => all.includes(k))
    if (filtered.length) return filtered
  }
  return all
})()
const selectedLessons = ref(initLessons)
const currentLessons = computed(() => UNIT_CONFIG[currentUnit.value]?.lessons || [])
const isAllLessonsSelected = computed(() =>
  currentLessons.value.length > 0 &&
  selectedLessons.value.length === currentLessons.value.length
)
const canStart = computed(() => selectedLessons.value.length > 0)

function persistPrefs() {
  setChinesePrefs(PAGE_KEY, { selectedLessons: [...selectedLessons.value] })
}
function switchUnit(uk) {
  currentUnit.value = uk
  setCurrentUnit(uk)
  selectedLessons.value = getLessonKeys(uk)
  persistPrefs()
}
function toggleLesson(key) {
  const idx = selectedLessons.value.indexOf(key)
  if (idx >= 0) selectedLessons.value.splice(idx, 1)
  else selectedLessons.value.push(key)
  persistPrefs()
}
function toggleAllLessons() {
  const all = getLessonKeys(currentUnit.value)
  selectedLessons.value = isAllLessonsSelected.value ? [] : [...all]
  persistPrefs()
}

const started = ref(false)
const currentIndex = ref(0)
const correctCount = ref(0)
const roundFinished = ref(false)
const showAnswer = ref(false)
const showIframe = ref(false)

const outlineId = ref('mock-' + Date.now())
const outlineReady = ref(false)
let writerInstance = null

const questions = ref([])
const totalQuestions = computed(() => questions.value.length)
const currentQ = computed(() => questions.value[currentIndex.value] || null)

function destroyWriter() {
  if (writerInstance) {
    try { writerInstance.cancelQuiz && writerInstance.cancelQuiz() } catch (e) {}
    try { writerInstance._cancelAnimationFrame && writerInstance._cancelAnimationFrame() } catch (e) {}
    writerInstance = null
  }
}

async function initOutline() {
  destroyWriter()
  outlineReady.value = false
  await nextTick()
  const el = document.getElementById(outlineId.value)
  if (!el || !currentQ.value) return
  el.innerHTML = ''
  try {
    writerInstance = HanziWriter.create(outlineId.value, currentQ.value.char, {
      width: 200, height: 200, padding: 20,
      strokeColor: '#333',
      outlineColor: '#DDD',
      radicalColor: '#168F16',
      strokeAnimationSpeed: 1.5,
      delayBetweenStrokes: 400,
      showCharacter: true, showOutline: true,
      onLoadCharDataSuccess: () => { outlineReady.value = true },
      onLoadCharDataError: () => { outlineReady.value = false }
    })
  } catch (e) { outlineReady.value = false }
}

onUnmounted(() => {
  destroyWriter()
})

function startRound() {
  if (!canStart.value) return
  const source = (getQuestions('pinyin', selectedLessons.value) || [])
    .filter(d => d.radical && d.structure)
  questions.value = source
  currentIndex.value = 0
  correctCount.value = 0
  started.value = true
  resetState()
  nextTick(() => initOutline())
}

function onHeaderBack() {
  if (started.value) {
    uni.showModal({
      title: '确认退出',
      content: '退出本轮学习，回到选择页？',
      success(res) { if (res.confirm) started.value = false },
    })
    return true
  }
  return false
}

function resetState() {
  showAnswer.value = false
  showIframe.value = false
}

function revealAnswer() {
  showAnswer.value = true
  if (writerInstance) {
    try { writerInstance.animateCharacter() } catch (e) {}
  }
}

function replayAnim() {
  if (writerInstance) {
    try { writerInstance.animateCharacter() } catch (e) {}
  }
}

function judgeSelf(isCorrect) {
  if (isCorrect) {
    correctCount.value++
  } else {
    const q = currentQ.value
    if (q._id) {
      recordWrong({ type: 'hanzi', char: q.char, unit: q.unit, question_id: q._id })
    }
  }
  advanceQuestion()
}

function advanceQuestion() {
  if (currentIndex.value < totalQuestions.value - 1) {
    currentIndex.value++
    resetState()
    nextTick(() => initOutline())
  } else {
    roundFinished.value = true
    recordPractice({
      type: 'hanzi',
      totalCount: totalQuestions.value,
      correctCount: correctCount.value
    })
    uni.navigateTo({
      url: `/pages/chinese/result?module=learn&correct=${correctCount.value}&total=${totalQuestions.value}`
    })
  }
}

function speakChar() {
  if (currentQ.value) speak(currentQ.value.char)
}

onShow(() => {
  if (roundFinished.value) {
    started.value = false
    roundFinished.value = false
  }
})
</script>

<style scoped>
.mock-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAF6EE;
}
.progress-indicator {
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
}

.filter-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx;
}
.filter-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  align-self: center;
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
.desc-area {
  margin: 40rpx 0;
  text-align: center;
  background: #fff;
  padding: 24rpx 32rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}
.start-btn {
  padding: 28rpx 120rpx;
  background: linear-gradient(135deg, #A62D33, #7F1F25);
  color: #fff;
  border-radius: 40rpx;
  font-size: 36rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(166,45,51,0.3);
  margin-top: 24rpx;
}
.start-btn:active { transform: scale(0.97); }
.start-btn.disabled {
  background: #C8B9A8;
  box-shadow: none;
  pointer-events: none;
  opacity: 0.7;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
  color: #888;
  font-size: 32rpx;
}
.back-inline-btn {
  margin-top: 32rpx;
  padding: 20rpx 48rpx;
  background: #A62D33;
  color: #fff;
  border-radius: 20rpx;
  font-size: 28rpx;
}

.quiz-area {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.char-outline-wrap {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 16rpx;
  background: #fff;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
  overflow: hidden;
}
.char-outline-target { width: 200px; height: 200px; line-height: 0; }
.char-outline-target :deep(svg) { display: block; }
.char-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 150px;
  font-weight: bold;
  color: #DDD;
  line-height: 1;
  font-family: "KaiTi", "楷体", "STKaiti", serif;
}
.speak-btn {
  margin: 12rpx 0;
  font-size: 44rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FDF1E6;
  border-radius: 50%;
}
.speak-btn:active { transform: scale(0.9); }
.hint-text {
  color: #888;
  font-size: 28rpx;
  margin: 24rpx 0;
}

.answer-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin: 24rpx 0;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
}
.answer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
  border-radius: 8rpx;
}
.answer-row:last-of-type { border-bottom: none; }
.answer-label { font-size: 28rpx; color: #888; }
.answer-value {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}
.answer-value.pinyin {
  color: #A62D33;
  font-family: serif;
}
.answer-btn {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #FDF1E6;
  color: #A62D33;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
}
.answer-btn:active { transform: scale(0.97); }

.show-answer-btn {
  margin-top: 32rpx;
  padding: 24rpx 80rpx;
  background: linear-gradient(135deg, #A62D33, #7F1F25);
  color: #fff;
  border-radius: 40rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 8rpx 24rpx rgba(166,45,51,0.3);
}
.show-answer-btn:active { transform: scale(0.97); }

.self-judge {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  width: 100%;
  max-width: 600rpx;
}
.judge-btn {
  flex: 1;
  padding: 16rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
}
.judge-btn:active { transform: scale(0.97); }
.judge-btn.correct { background: #E8F5E9; color: #2E7D32; }
.judge-btn.wrong { background: #FFEBEE; color: #C62828; }

.extend-area {
  width: 100%;
  margin-top: 32rpx;
}
.extend-toggle {
  text-align: center;
  padding: 16rpx;
  color: #A62D33;
  font-size: 28rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 2rpx dashed #A62D33;
}
.extend-toggle:active { transform: scale(0.98); }
.iframe-wrap {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  height: 800rpx;
}
.extend-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
