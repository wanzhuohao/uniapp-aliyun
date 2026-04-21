<template>
  <view class="question-card">
    <view class="question-area">
      <view v-if="questionType === 'char'" class="char-display">{{ question }}</view>
      <view v-else-if="questionType === 'pinyin'" class="pinyin-display">{{ question }}</view>
      <view v-else class="question-text">{{ question }}</view>
      <view class="speak-btn" @click.stop="handleSpeak">🔊</view>
    </view>

    <view class="options-grid">
      <view
        v-for="(opt, i) in options"
        :key="i"
        class="option-btn"
        :class="optionClass(opt)"
        @click="handleClick(opt)"
      >
        {{ opt.label }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { speak } from '../../utils/common/speech.js'

const props = defineProps({
  question: String,
  questionType: { type: String, default: 'text' },
  options: Array,
  index: Number,
  total: Number,
})

const emit = defineEmits(['answer'])

const answered = ref(false)
const selectedValue = ref(null)

function optionClass(opt) {
  if (!answered.value) return ''
  if (opt.isCorrect) return 'correct'
  if (opt.value === selectedValue.value && !opt.isCorrect) return 'wrong'
  return ''
}

function handleSpeak() {
  if (props.questionType === 'char') {
    speak(props.question)
  } else if (props.questionType === 'pinyin') {
    const correctOpt = props.options?.find(o => o.isCorrect)
    speak(correctOpt ? correctOpt.label : props.question)
  } else {
    speak(props.question.replace('=', '等于').replace('+', '加').replace('-', '减').replace('?', '几'))
  }
}

function handleClick(opt) {
  if (answered.value) return
  answered.value = true
  selectedValue.value = opt.value

  const isCorrect = opt.isCorrect
  const delay = isCorrect ? 800 : 1500

  setTimeout(() => {
    emit('answer', { correct: isCorrect, selected: opt.value })
    answered.value = false
    selectedValue.value = null
  }, delay)
}
</script>

<style scoped>
.question-card {
  padding: 40rpx 32rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.question-area {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
  background: #fff;
  padding: 48rpx 32rpx 32rpx;
  border-radius: 24rpx;
  border: 2rpx solid #E8D5B7;
  box-shadow: 0 6rpx 20rpx rgba(31,31,31,0.05);
}
.char-display {
  font-size: 140rpx;
  font-weight: bold;
  text-align: center;
  line-height: 1.3;
  color: #1F1F1F;
  min-height: 160rpx;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.pinyin-display {
  font-size: 76rpx;
  /* 用中文字体栈，保证拼音声调符号位置正确（Georgia/Times 等西文字体会错位） */
  font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  text-align: center;
  color: #A62D33;
  letter-spacing: 4rpx;
}
.speak-btn {
  margin-top: 24rpx;
  margin-bottom: 4rpx;
  font-size: 40rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FDF1E6;
  border: 2rpx solid #E8D5B7;
  border-radius: 50%;
  transition: transform 0.2s;
}
.speak-btn:active {
  transform: scale(0.9);
}
.question-text {
  font-size: 64rpx;
  font-weight: bold;
  text-align: center;
  color: #1F1F1F;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 8rpx;
}
.option-btn {
  background: #fff;
  border: 2rpx solid #D6CBB8;
  border-radius: 16rpx;
  padding: 32rpx 16rpx;
  text-align: center;
  font-size: 40rpx;
  font-weight: 500;
  color: #1F1F1F;
  box-shadow: 0 3rpx 10rpx rgba(31,31,31,0.04);
  transition: all 0.2s ease;
  font-family: 'STKaiti', 'KaiTi', '楷体', serif;
}
.option-btn:active {
  transform: scale(0.96);
  box-shadow: 0 2rpx 6rpx rgba(31,31,31,0.08);
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
