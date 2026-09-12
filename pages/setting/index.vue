<template>
  <view class="container">
    <PageHeader title="设置" :show-grade="false" />

    <!-- 学期选择 -->
    <view class="section">
      <view class="section-head">
        <text class="section-title">选择学期</text>
        <text class="section-current">{{ selectedLabel }}</text>
      </view>
      <view class="semester-list">
        <view
          v-for="item in options"
          :key="item.value"
          :class="['semester-item', selected === item.value && 'active', item.disabled && 'disabled']"
          @click="choose(item)"
        >
          <text class="semester-label">{{ item.label }}</text>
          <text v-if="item.note" class="semester-note">{{ item.note }}</text>
          <text v-if="!item.disabled && selected === item.value" class="semester-check">✓</text>
        </view>
      </view>
      <view class="hint">题目类型当前两个学期完全一致，后期按数据逐步区分。</view>
    </view>

    <!-- 异常提示 -->
    <view v-if="errorText" class="error-panel">
      <text class="error-text">{{ errorText }}</text>
      <button class="error-btn" @click="repair">重置为一年级下</button>
    </view>

    <view class="tip">学习记录按学期分别保存，切换学期互不影响。</view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { awaitLearningSession } from '../../utils/common/learningSession.js'
import {
  LEARNING_GRADE_OPTIONS,
  getLearningGradeLabel,
  initializeLearningGrade,
  repairLearningGrade,
  saveLearningGrade,
} from '../../utils/common/gradeContext.js'

const options = LEARNING_GRADE_OPTIONS
const selected = ref('')
const errorText = ref('')

const selectedLabel = computed(() =>
  selected.value ? getLearningGradeLabel(selected.value) : '待选择'
)

onMounted(async () => {
  try {
    await awaitLearningSession()
    selected.value = initializeLearningGrade()
  } catch {
    selected.value = ''
    errorText.value = '当前学期信息异常，请重新选择。'
  }
})

function choose(item) {
  if (item.disabled) {
    uni.showToast({ title: '该学期题库待更新', icon: 'none' })
    return
  }
  try {
    selected.value = saveLearningGrade(item.value)
    errorText.value = ''
    uni.showToast({ title: `已切换至${item.label}`, icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败，请刷新后重试', icon: 'none' })
  }
}

function repair() {
  try {
    selected.value = repairLearningGrade()
    errorText.value = ''
    uni.showToast({ title: '已恢复', icon: 'success' })
  } catch {
    uni.showToast({ title: '恢复失败，请刷新后重试', icon: 'none' })
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f7f5f0;
  padding-bottom: 60rpx;
}
.section {
  margin: 24rpx 32rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(31, 31, 31, 0.06);
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2a2520;
}
.section-sub {
  font-size: 24rpx;
  color: #2a7ab8;
}
.semester-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.semester-item {
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
  border-radius: 16rpx;
  background: #f2f1ee;
  color: #766b5c;
}
.semester-item.active {
  background: #e3f2fd;
  color: #1e5a8e;
  box-shadow: inset 0 0 0 2rpx #42a5f5;
}
.semester-item.disabled {
  opacity: 0.55;
}
.semester-label {
  font-size: 28rpx;
  font-weight: 600;
}
.semester-note {
  margin-left: 12rpx;
  font-size: 22rpx;
}
.semester-check {
  margin-left: auto;
  font-size: 30rpx;
  color: #1e8cd5;
  font-weight: bold;
}
.hint {
  margin-top: 20rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #f4f1ea;
  color: #8b7d65;
  font-size: 22rpx;
  line-height: 1.6;
}
.error-panel {
  margin: 24rpx 32rpx 0;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #fff3e0;
}
.error-text {
  font-size: 24rpx;
  color: #8a5a00;
  display: block;
}
.error-btn {
  margin-top: 16rpx;
  font-size: 24rpx;
}
.tip {
  margin: 24rpx 40rpx 0;
  font-size: 22rpx;
  color: #a39a8a;
  line-height: 1.6;
}
</style>