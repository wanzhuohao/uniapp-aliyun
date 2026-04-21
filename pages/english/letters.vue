<template>
  <view class="letters-page">
    <PageHeader title="字母认读" />

    <view class="letter-grid">
      <view
        v-for="(l, i) in letters"
        :key="l.upper"
        :class="['letter-cell', activeIdx === i && 'active']"
        @click="selectLetter(i)"
      >
        <text class="letter-upper">{{ l.upper }}</text>
        <text class="letter-lower">{{ l.lower }}</text>
      </view>
    </view>

    <view v-if="current" class="letter-detail">
      <view class="detail-big">
        <text class="big-upper">{{ current.upper }}</text>
        <text class="big-lower">{{ current.lower }}</text>
      </view>
      <text class="phonics">发音 {{ current.phonics }}</text>
      <view class="detail-actions">
        <view class="act-btn" @click="playLetter">🔊 读字母</view>
        <view class="act-btn" @click="playExample">🔊 读例词</view>
      </view>
      <view class="example">
        <text class="example-emoji">{{ current.emoji }}</text>
        <text class="example-word">{{ current.example }}</text>
        <text class="example-zh">{{ current.exampleZh }}</text>
      </view>
      <view class="nav-actions">
        <view class="nav-btn" @click="prev" :class="{ disabled: activeIdx === 0 }">← 上一个</view>
        <view class="nav-btn" @click="next" :class="{ disabled: activeIdx === letters.length - 1 }">下一个 →</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { getLetters } from '../../utils/english/questionLoader.js'
import { speakEn, primeSpeech } from '../../utils/common/speech.js'

const letters = ref(getLetters())
const activeIdx = ref(0)
const current = computed(() => letters.value[activeIdx.value] || null)

function selectLetter(i) {
  primeSpeech()
  activeIdx.value = i
  playLetter()
}

function playLetter() {
  if (current.value) speakEn(current.value.upper)
}
function playExample() {
  if (current.value) speakEn(current.value.example)
}
function prev() {
  if (activeIdx.value > 0) {
    activeIdx.value--
    playLetter()
  }
}
function next() {
  if (activeIdx.value < letters.value.length - 1) {
    activeIdx.value++
    playLetter()
  }
}

onMounted(() => {
  // 首次挂载不自动朗读，避免 iOS 拦截
})
</script>

<style scoped>
.letters-page { min-height: 100vh; background: #F5F7FA; }

.letter-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12rpx;
  padding: 24rpx;
}
.letter-cell {
  background: #fff;
  border-radius: 14rpx;
  padding: 16rpx 0;
  text-align: center;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
  border: 3rpx solid transparent;
}
.letter-cell.active {
  background: #AB47BC;
  border-color: #7B1FA2;
}
.letter-cell.active .letter-upper,
.letter-cell.active .letter-lower { color: #fff; }
.letter-upper {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
}
.letter-lower {
  display: block;
  font-size: 28rpx;
  color: #888;
}

.letter-detail {
  margin: 16rpx 24rpx 48rpx;
  padding: 40rpx 32rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.detail-big {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}
.big-upper {
  font-size: 180rpx;
  font-weight: bold;
  color: #AB47BC;
  line-height: 1;
}
.big-lower {
  font-size: 120rpx;
  font-weight: bold;
  color: #7B1FA2;
  line-height: 1;
}
.phonics {
  font-size: 34rpx;
  color: #555;
  font-family: monospace;
}
.detail-actions {
  display: flex;
  gap: 20rpx;
}
.act-btn {
  padding: 16rpx 36rpx;
  background: #F3E5F5;
  color: #6A1B9A;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
}
.act-btn:active { transform: scale(0.95); }

.example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 24rpx;
  background: #FAFAFA;
  border-radius: 16rpx;
  width: 100%;
}
.example-emoji { font-size: 120rpx; line-height: 1; }
.example-word {
  font-size: 42rpx;
  font-weight: bold;
  color: #333;
}
.example-zh { font-size: 28rpx; color: #888; }

.nav-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}
.nav-btn {
  padding: 20rpx 40rpx;
  background: #AB47BC;
  color: #fff;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 500;
}
.nav-btn.disabled {
  background: #D1C4E9;
  color: #fff;
}
.nav-btn:active { transform: scale(0.96); }
</style>
