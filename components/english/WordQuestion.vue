<template>
  <view class="word-question">
    <view class="type-badge" :class="qType + '-badge'">{{ qTypeLabel }}</view>

    <!-- 看图选词：顶部大 emoji，下面 4 个英文选项 -->
    <template v-if="qType === 'img2word'">
      <view class="big-emoji">{{ question.emoji }}</view>
      <text class="hint-text">这是什么？</text>
      <view class="speak-btn" v-if="answered && selectedIdx >= 0" @click="speakOption">🔊</view>
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
      <text class="word-text" v-if="answered">{{ question.word }}</text>
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
import { ref, computed, watch, onMounted } from 'vue'
import { speakEn } from '../../utils/common/speech.js'

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

const qTypeLabel = computed(() => props.qType === 'img2word' ? '看图选词' : '听词选图')

function resetState() {
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
  choiceState.value = isCorrect ? 'correct' : 'wrong'
  // 答题后朗读正确单词，等播完 + 最少展示时长都满足再切下一题
  const minDelay = isCorrect ? 600 : 1200
  const speakPromise = (() => {
    try { return speakEn(props.question.word) || Promise.resolve() } catch (e) { return Promise.resolve() }
  })()
  const delayPromise = new Promise((r) => { pendingTimer = setTimeout(r, minDelay) })
  Promise.all([speakPromise, delayPromise]).then(() => {
    pendingTimer = null
    if (choiceState.value) emit('answer', { isCorrect, optionIndex: i })
  })
}

function playWord() {
  try { speakEn(props.question.word) } catch (e) {}
}

function speakOption() {
  const opt = props.options[selectedIdx.value]
  if (opt) { try { speakEn(opt.label) } catch (e) {} }
}

onMounted(() => {
  // 听词选图：挂载后自动播一次
  if (props.qType === 'word2img') {
    setTimeout(() => playWord(), 300)
  }
})

watch(() => props.question?.word, (nw) => {
  resetState()
  if (props.qType === 'word2img' && nw) {
    setTimeout(() => playWord(), 300)
  }
})
</script>

<style scoped>
.word-question {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx;
}
.type-badge {
  font-size: 24rpx;
  font-weight: bold;
  padding: 6rpx 24rpx;
  border-radius: 20rpx;
  margin-bottom: 24rpx;
}
.img2word-badge { background: #E3F2FD; color: #1565C0; }
.word2img-badge { background: #FFF3E0; color: #E65100; }

.big-emoji {
  font-size: 200rpx;
  line-height: 1.1;
  margin: 16rpx 0;
}
.word-text {
  font-size: 56rpx;
  font-weight: bold;
  color: #1565C0;
  letter-spacing: 4rpx;
  margin-top: 16rpx;
}
.hint-text {
  color: #666;
  font-size: 28rpx;
  margin-bottom: 16rpx;
}
.speak-btn {
  margin: 16rpx 0;
  font-size: 44rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E3F2FD;
  border-radius: 50%;
}
.speak-btn.big {
  width: 180rpx;
  height: 180rpx;
  font-size: 100rpx;
  box-shadow: 0 8rpx 24rpx rgba(66,165,245,0.3);
  margin: 40rpx 0;
}
.speak-btn:active { transform: scale(0.92); }

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  padding: 0 24rpx;
  width: 100%;
  margin-top: 32rpx;
}
.option-btn {
  background: #fff;
  border: 3rpx solid #BDBDBD;
  border-radius: 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
  transition: all 0.2s;
}
.option-btn:active { transform: scale(0.96); }
.word-btn {
  padding: 36rpx 16rpx;
  font-size: 40rpx;
  font-weight: 500;
  color: #333;
  letter-spacing: 2rpx;
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
