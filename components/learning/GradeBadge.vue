<template>
  <view v-if="!label" class="course-gate-overlay">
    <text class="course-gate-title">正在验证当前年级…</text>
    <text class="course-gate-hint">若长时间未恢复，请返回学习首页修复年级</text>
  </view>
  <text v-else class="grade-badge" @click="openSetting">{{ label }}</text>
</template>

<script setup>
defineProps({ label: { type: String, default: '' } })

function openSetting() {
  uni.navigateTo({ url: '/pages/setting/index' })
}
</script>

<style scoped>
.grade-badge {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255,255,255,.22);
  color: #fff;
  font-size: 21rpx;
  white-space: nowrap;
  transition: transform .15s, background .15s;
}
.grade-badge:active { transform: scale(.92); background: rgba(255,255,255,.34); }
.course-gate-overlay { position: fixed; inset: 0; z-index: 2147483646; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18rpx; padding: 48rpx; background: #f7f5f0; color: #2a2520; text-align: center; }
.course-gate-title { font-size: 32rpx; font-weight: 700; }
.course-gate-hint { max-width: 560rpx; color: #7b6f64; font-size: 24rpx; line-height: 1.6; }
</style>
