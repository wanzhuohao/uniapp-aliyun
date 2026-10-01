<template>
  <view :class="['page-header', 'theme-' + theme]">
    <view v-if="showBack" class="ph-back" @click="onBack">←</view>
    <text class="ph-title">{{ title }}</text>
    <GradeBadge v-if="showGrade && theme !== 'game'" :label="gradeLabel" />
    <slot />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import GradeBadge from './learning/GradeBadge.vue'
import { awaitLearningSession } from '../utils/common/learningSession.js'
import { getLearningGradeLabel, openCourseGradeSession } from '../utils/common/gradeContext.js'

const gradeLabel = ref('')
const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
  fallback: { type: String, default: '/pages/index/index' },
  // 二级首页（学科 index）传 true，返回键无条件 reLaunch 到根首页；
  // 其余页面默认 navigateBack（带 fail 兜底 reLaunch）。
  homeOnBack: { type: Boolean, default: false },
  // 自定义返回处理：返回 true 表示已被父页面消费，组件不再做 navigateBack
  backHandler: { type: Function, default: null },
  showGrade: { type: Boolean, default: true },
  theme: {
    type: String,
    default: 'default',
    validator: v => ['default', 'chinese', 'math', 'english', 'game'].includes(v),
  },
})

onShow(async () => {
  if (!props.showGrade || props.theme === 'game') return
  try {
    await awaitLearningSession()
    gradeLabel.value = getLearningGradeLabel(openCourseGradeSession())
  } catch {
    // 学期读取失败/加载未完成时，不能渲染 GradeBadge 的全屏遮罩把整页锁死
    // （此前置空 gradeLabel 会触发 position:fixed 的 course-gate-overlay，
    //   页面所有按钮点不了且无恢复入口）。给一个可点击的兜底徽标，仍可进设置页重新选择学期。
    gradeLabel.value = '选择学期'
  }
})

function onBack() {
  if (typeof props.backHandler === 'function') {
    if (props.backHandler() === true) return
  }
  if (props.homeOnBack) {
    uni.reLaunch({ url: props.fallback })
    return
  }
  uni.navigateBack({ fail: () => uni.reLaunch({ url: props.fallback }) })
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  background: #42A5F5;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.page-header.theme-chinese {
  background: #A62D33;
}
.page-header.theme-math {
  background: #42A5F5;
}
.page-header.theme-english {
  background: #26A69A;
}
.page-header.theme-game {
  background: #7C4DFF;
}
.ph-back {
  font-size: 36rpx;
  font-weight: bold;
  width: 50rpx;
  height: 50rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transition: transform 0.2s;
}
.ph-back:active { transform: scale(0.9); }
.ph-title {
  font-size: 32rpx;
  font-weight: bold;
  flex: 1;
  font-family: 'STKaiti', 'KaiTi', '楷体', 'DFKai-SB', 'BiauKai', serif;
  letter-spacing: 2rpx;
}
</style>
