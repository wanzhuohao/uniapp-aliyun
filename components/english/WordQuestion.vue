<template>
  <view class="word-question">
    <view class="type-badge" :class="qType + '-badge'">{{ qTypeLabel }}</view>

    <!-- 看图选词：顶部大 emoji，下面 4 个英文选项 -->
    <template v-if="qType === 'img2word'">
      <view class="big-emoji">{{ question.emoji }}</view>
      <text class="hint-text">这是什么？</text>
      <view
        class="speak-btn"
        :style="{ visibility: (answered && selectedIdx >= 0) ? 'visible' : 'hidden' }"
        @click="speakOption"
      >🔊</view>
      <view class="options-grid">
        <view
          v-for="(opt, i) in options"
          :key="i"
          :class="['option-btn', 'word-btn',
            choiceState === 'correct' && opt.isCorrect && 'correct',
            choiceState === 'wrong' && selectedIdx === i && 'wrong',
            choiceState === 'wrong' && opt.isCorrect && 'correct']"
          @click="pickOption(i)"
        >{{ opt.label }}</view>
      </view>
    </template>

    <!-- 听词选图：🔊 播放英文，4 个 emoji 选项 -->
    <template v-else>
      <view class="hint-text">听一听，选一选</view>
      <view class="speak-btn big" @click="playWord">🔊</view>
      <text
        class="word-text"
        :style="{ visibility: answered ? 'visible' : 'hidden' }"
      >{{ question.word || '—' }}</text>
      <view class="options-grid emoji-grid">
        <view
          v-for="(opt, i) in options"
          :key="i"
          :class="['option-btn', 'emoji-btn',
            choiceState === 'correct' && opt.isCorrect && 'correct',
            choiceState === 'wrong' && selectedIdx === i && 'wrong',
            choiceState === 'wrong' && opt.isCorrect && 'correct']"
          @click="pickOption(i)"
        >{{ opt.emoji }}</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { speakEn, stopEnSpeech } from '../../utils/common/speech.js'

const props = defineProps({
  question: { type: Object, required: true },
  options: { type: Array, required: true },
  qType: { type: String, required: true }, // img2word | word2img
})

const emit = defineEmits(['answer'])

const choiceState = ref('')
const selectedIdx = ref(-1)
const answered = computed(() => !!choiceState.value)
let pendingTimer = null
let bootTimer = null
let answerGeneration = 0

const qTypeLabel = computed(() => props.qType === 'img2word' ? '看图选词' : '听词选图')

function resetState() {
  answerGeneration++
  stopEnSpeech()
  choiceState.value = ''
  selectedIdx.value = -1
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}

function pickOption(i) {
  if (choiceState.value) return
  selectedIdx.value = i
  const opt = props.options[i]
  if (!opt) return
  const isCorrect = !!opt.isCorrect
  const generation = ++answerGeneration
  choiceState.value = isCorrect ? 'correct' : 'wrong'
  // 答题后朗读正确单词，等播完 + 最少展示时长都满足再切下一题
  const minDelay = isCorrect ? 600 : 1200
  const speakPromise = (() => {
    try { return speakEn(props.question.word) || Promise.resolve() } catch (e) { return Promise.resolve() }
  })()
  const delayPromise = new Promise((r) => { pendingTimer = setTimeout(r, minDelay) })
  Promise.all([speakPromise, delayPromise]).then(() => {
    pendingTimer = null
    if (generation === answerGeneration && choiceState.value) emit('answer', { isCorrect, optionIndex: i })
  })
}

function playWord() {
  try { speakEn(props.question.word) } catch (e) {}
}

function speakOption() {
  const opt = props.options[selectedIdx.value]
  if (opt) { try { speakEn(opt.label) } catch (e) {} }
}

function scheduleAutoPlay() {
  if (bootTimer) clearTimeout(bootTimer)
  bootTimer = setTimeout(() => { bootTimer = null; playWord() }, 300)
}

onMounted(() => {
  if (props.qType === 'word2img') scheduleAutoPlay()
})

watch(() => props.question?.word, (nw) => {
  resetState()
  if (props.qType === 'word2img' && nw) scheduleAutoPlay()
})

onUnmounted(() => {
  answerGeneration++
  if (bootTimer) clearTimeout(bootTimer)
  if (pendingTimer) clearTimeout(pendingTimer)
  stopEnSpeech()
})
</script>

<style scoped>
.word-question {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.type-badge {
  font-size: 22rpx;
  font-weight: 900;
  padding: 8rpx 28rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
  letter-spacing: 4rpx;
}
.img2word-badge { background: #E0F2F1; color: #00695C; }
.word2img-badge { background: #FFF4E6; color: #E65100; }

.big-emoji {
  font-size: 200rpx;
  line-height: 1.1;
  margin: 16rpx 0;
  filter: drop-shadow(0 6rpx 12rpx rgba(31,58,58,0.15));
}
.word-text {
  font-size: 60rpx;
  font-weight: 900;
  color: #00695C;
  letter-spacing: 4rpx;
  margin-top: 16rpx;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.hint-text {
  color: #6B8787;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  letter-spacing: 2rpx;
}
.speak-btn {
  margin: 16rpx 0;
  font-size: 44rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E0F2F1;
  border: 2rpx solid #B2DFDB;
  border-radius: 50%;
}
.speak-btn.big {
  width: 200rpx;
  height: 200rpx;
  font-size: 110rpx;
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 12rpx 28rpx rgba(38,166,154,0.35);
  margin: 40rpx 0;
}
.speak-btn:active { transform: scale(0.92); }

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 8rpx;
  width: 100%;
  margin-top: 32rpx;
}
.option-btn {
  background: #fff;
  border: 3rpx solid #B2DFDB;
  border-radius: 24rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(31,58,58,0.05);
  transition: all 0.2s;
}
.option-btn:active { transform: scale(0.96); }
.word-btn {
  padding: 36rpx 16rpx;
  font-size: 40rpx;
  font-weight: 900;
  color: #1F3A3A;
  letter-spacing: 2rpx;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.emoji-btn {
  padding: 36rpx 16rpx;
  font-size: 100rpx;
  line-height: 1;
}
.option-btn.correct {
  border-color: #66BB6A;
  background: #E8F5E9;
  color: #2E7D32;
  box-shadow: 0 0 0 4rpx rgba(102,187,106,0.3);
}
.option-btn.wrong {
  border-color: #EF5350;
  background: #FFEBEE;
  color: #C62828;
  box-shadow: 0 0 0 4rpx rgba(239,83,80,0.3);
}
</style>
