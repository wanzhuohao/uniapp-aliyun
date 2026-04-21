<template>
  <view class="letters-page">
    <PageHeader title="字母认读" theme="english" />

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
.letters-page {
  min-height: 100vh;
  background: #F5FBFB;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}

.letter-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12rpx;
  padding: 24rpx;
}
.letter-cell {
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 0;
  text-align: center;
  box-shadow: 0 2rpx 6rpx rgba(31,58,58,0.05);
  border: 3rpx solid transparent;
  transition: all 0.2s;
}
.letter-cell.active {
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  border-color: #00796B;
  transform: translateY(-2rpx);
  box-shadow: 0 6rpx 16rpx rgba(38,166,154,0.35);
}
.letter-cell.active .letter-upper,
.letter-cell.active .letter-lower { color: #fff; }
.letter-upper {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: #1F3A3A;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  line-height: 1.1;
}
.letter-lower {
  display: block;
  font-size: 30rpx;
  color: #6B8787;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}

.letter-detail {
  margin: 16rpx 24rpx 48rpx;
  padding: 40rpx 32rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 6rpx 20rpx rgba(31,58,58,0.06);
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
  font-size: 200rpx;
  font-weight: 900;
  color: #26A69A;
  line-height: 1;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.big-lower {
  font-size: 130rpx;
  font-weight: 900;
  color: #FF8A65;
  line-height: 1;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.phonics {
  font-size: 34rpx;
  color: #00695C;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-style: italic;
  letter-spacing: 2rpx;
}
.detail-actions {
  display: flex;
  gap: 20rpx;
}
.act-btn {
  padding: 18rpx 36rpx;
  background: #E0F2F1;
  color: #00695C;
  border: 2rpx solid #B2DFDB;
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: bold;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
}
.act-btn:active { transform: scale(0.95); }

.example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 32rpx 24rpx;
  background: linear-gradient(135deg, #FFF4E6 0%, #E0F2F1 100%);
  border-radius: 20rpx;
  width: 100%;
}
.example-emoji { font-size: 140rpx; line-height: 1; }
.example-word {
  font-size: 48rpx;
  font-weight: 900;
  color: #1F3A3A;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  letter-spacing: 2rpx;
}
.example-zh {
  font-size: 26rpx;
  color: #6B8787;
  letter-spacing: 2rpx;
}

.nav-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 16rpx;
}
.nav-btn {
  padding: 20rpx 44rpx;
  background: linear-gradient(135deg, #26A69A, #1E8E82);
  color: #fff;
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: bold;
  font-family: 'Quicksand', 'Trebuchet MS', sans-serif;
  letter-spacing: 1rpx;
  box-shadow: 0 4rpx 12rpx rgba(38,166,154,0.25);
}
.nav-btn.disabled {
  background: #B2DFDB;
  box-shadow: none;
}
.nav-btn:active { transform: scale(0.96); }
</style>
