<template>
  <view class="page-header">
    <view v-if="showBack" class="ph-back" @click="onBack">←</view>
    <text class="ph-title">{{ title }}</text>
    <slot />
  </view>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
  fallback: { type: String, default: '/pages/index/index' },
})

function onBack() {
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
}
.ph-back:active { transform: scale(0.9); }
.ph-title {
  font-size: 32rpx;
  font-weight: bold;
  flex: 1;
}
</style>
