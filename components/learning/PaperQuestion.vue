<template>
  <view class="paper-question">
    <text class="subject">{{ subjectLabel }} · {{ index + 1 }}</text>

    <template v-if="question.kind === 'math-special'">
      <text class="prompt special-prompt">{{ question.prompt }}</text>

      <view v-if="question.mathType === 'fillOp'" class="equation">
        <text>{{ question.renderData.a }}</text>
        <view class="operator-group">
          <button v-for="operator in operators" :key="operator" :class="['operator', modelValue === operator && 'selected']" @click="emit('update:modelValue', operator)">{{ operator }}</button>
        </view>
        <text>{{ question.renderData.b }} = {{ question.renderData.c }}</text>
      </view>

      <view v-else-if="question.mathType === 'fillOp2'" class="equation">
        <text>{{ question.renderData.a }}</text>
        <view class="operator-group">
          <button v-for="operator in operators" :key="`left-${operator}`" :class="['operator', operatorValue(0) === operator && 'selected']" @click="updateOperator(0, operator)">{{ operator }}</button>
        </view>
        <text>{{ question.renderData.b }} = {{ question.renderData.c }}</text>
        <view class="operator-group">
          <button v-for="operator in operators" :key="`right-${operator}`" :class="['operator', operatorValue(1) === operator && 'selected']" @click="updateOperator(1, operator)">{{ operator }}</button>
        </view>
        <text>{{ question.renderData.d }}</text>
      </view>

      <view v-else-if="question.mathType === 'hundredChart'" class="hundred-chart" :style="{ gridTemplateColumns: `repeat(${question.renderData.cols}, 1fr)` }">
        <view v-for="cell in hundredCells" :key="cell.key" :class="['chart-cell', cell.kind]">
          <text v-if="cell.kind === 'known'">{{ cell.value }}</text>
          <input v-else-if="cell.kind === 'hidden'" type="text" inputmode="numeric" :value="numericValue(cell.slot, question.renderData.hiddenKeys.length)" @input="updateNumeric(cell.slot, question.renderData.hiddenKeys.length, $event.detail.value)" />
        </view>
      </view>

      <template v-else>
        <view class="shape-meta">
          <text>每边和：{{ question.renderData.target }}</text>
          <text v-if="question.mathType === 'triangle-free'">可选数字：{{ question.renderData.numbers.join('、') }}</text>
        </view>
        <view :class="['shape-canvas', question.mathType === 'square' ? 'square-canvas' : 'triangle-canvas']">
          <view v-for="node in shapeNodes" :key="node.key" :class="['shape-node', `node-${node.key}`]">
            <text v-if="node.slot < 0">{{ node.value }}</text>
            <input v-else type="text" inputmode="numeric" :value="numericValue(node.slot, shapeSlotCount)" @input="updateNumeric(node.slot, shapeSlotCount, $event.detail.value)" />
          </view>
        </view>
      </template>
    </template>

    <template v-else>
      <text class="prompt">{{ question.prompt }}</text>
      <view v-if="question.kind === 'choice'" class="options">
        <view v-for="option in question.options" :key="option.value" :class="['option', modelValue === option.value && 'selected']" @click="emit('update:modelValue', option.value)">{{ option.label }}</view>
      </view>
      <input v-else class="answer-input" :value="modelValue" placeholder="请输入答案" @input="emit('update:modelValue', $event.detail.value)" />
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const operators = Object.freeze(['+', '-'])
const subjectLabel = computed(() => ({ math: '数学', chinese: '语文', english: '英语' }[props.question.subject] || '综合'))

function decodeSlots(length) {
  try {
    const value = JSON.parse(props.modelValue)
    if (Array.isArray(value) && value.length === length && value.every(item => typeof item === 'string')) return [...value]
  } catch {}
  return Array.from({ length }, () => '')
}

function operatorValue(index) {
  return decodeSlots(2)[index]
}

function updateOperator(index, value) {
  const values = decodeSlots(2)
  values[index] = value
  emit('update:modelValue', JSON.stringify(values))
}

function numericValue(index, length) {
  return decodeSlots(length)[index]
}

function updateNumeric(index, length, value) {
  const values = decodeSlots(length)
  values[index] = String(value)
  emit('update:modelValue', JSON.stringify(values))
}

const hundredCells = computed(() => {
  const data = props.question.renderData
  const hiddenSlots = new Map(data.hiddenKeys.map((key, index) => [key, index]))
  return Array.from({ length: data.rows * data.cols }, (_, index) => {
    const key = `${Math.floor(index / data.cols)},${index % data.cols}`
    if (hiddenSlots.has(key)) return { key, kind: 'hidden', slot: hiddenSlots.get(key) }
    if (Object.prototype.hasOwnProperty.call(data.cellMap, key)) return { key, kind: 'known', value: data.cellMap[key] }
    return { key, kind: 'empty' }
  })
})

const shapeSlotCount = computed(() => props.question.renderData.hidden.length)
const shapeNodes = computed(() => {
  const data = props.question.renderData
  const order = props.question.mathType === 'square' ? ['A', 'AB', 'B', 'BC', 'C', 'CD', 'D', 'DA'] : ['A', 'AB', 'B', 'BC', 'C', 'AC']
  const slots = new Map(data.hidden.map((key, index) => [key, index]))
  return order.map(key => ({ key, slot: slots.has(key) ? slots.get(key) : -1, value: data.cellMap?.[key] || '' }))
})
</script>

<style scoped>
.paper-question{background:#fff;border-radius:24rpx;padding:32rpx;box-shadow:0 6rpx 20rpx rgba(0,0,0,.06)}
.subject{display:block;color:#7c6f5a;font-size:22rpx;letter-spacing:4rpx;margin-bottom:20rpx}
.prompt{display:block;color:#24211d;font-size:38rpx;font-weight:700;line-height:1.5;margin-bottom:28rpx}
.special-prompt{font-size:30rpx;text-align:center}
.options{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}
.option{padding:22rpx;text-align:center;border:2rpx solid #ddd2bf;border-radius:16rpx;background:#faf8f3}
.option.selected,.operator.selected{color:#fff;background:#3b82c4;border-color:#3b82c4}
.answer-input{height:88rpx;border:3rpx solid #c5d9ea;border-radius:16rpx;text-align:center;font-size:34rpx;background:#fff}
.equation{display:flex;align-items:center;justify-content:center;gap:14rpx;font-size:38rpx;font-weight:700;flex-wrap:wrap}
.operator-group{display:flex;gap:8rpx}
.operator{width:64rpx;height:64rpx;line-height:58rpx;padding:0;margin:0;border:2rpx solid #b9cfe2;border-radius:12rpx;background:#f3f8fc;color:#245e8d;font-size:34rpx}
.hundred-chart{display:grid;gap:8rpx;max-width:560rpx;margin:0 auto}
.chart-cell{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:10rpx;font-size:28rpx}
.chart-cell.known{background:#e7f1f9;color:#245e8d;font-weight:700}.chart-cell.hidden{border:2rpx solid #8fb7d8;background:#fff}.chart-cell.empty{visibility:hidden}
.chart-cell input,.shape-node input{width:100%;height:100%;padding:0;text-align:center;font-size:28rpx}
.shape-meta{display:flex;flex-direction:column;align-items:center;gap:10rpx;color:#326fa3;font-weight:700;margin-bottom:18rpx}
.shape-canvas{position:relative;width:520rpx;height:360rpx;max-width:100%;margin:0 auto}
.triangle-canvas::before{content:'';position:absolute;left:13%;right:13%;bottom:34rpx;height:260rpx;border-left:4rpx solid #aac5da;border-right:4rpx solid #aac5da;border-bottom:4rpx solid #aac5da;transform:perspective(400rpx) rotateX(18deg)}
.square-canvas::before{content:'';position:absolute;inset:42rpx 60rpx;border:4rpx solid #aac5da}
.shape-node{position:absolute;z-index:1;width:76rpx;height:76rpx;display:flex;align-items:center;justify-content:center;border:3rpx solid #76a6ca;border-radius:50%;background:#fff;font-size:28rpx;font-weight:700;box-sizing:border-box}
.node-A{left:50%;top:0;transform:translateX(-50%)}.node-B{left:34rpx;bottom:0}.node-C{right:34rpx;bottom:0}.node-AB{left:22%;top:43%}.node-AC{right:22%;top:43%}.node-BC{left:50%;bottom:0;transform:translateX(-50%)}
.square-canvas .node-A{left:22rpx;top:0;transform:none}.square-canvas .node-AB{left:50%;top:0;transform:translateX(-50%)}.square-canvas .node-B{right:22rpx;left:auto;top:0;bottom:auto}
.square-canvas .node-BC{right:22rpx;left:auto;top:50%;bottom:auto;transform:translateY(-50%)}.square-canvas .node-C{right:22rpx;bottom:0}.square-canvas .node-CD{left:50%;bottom:0;transform:translateX(-50%)}
.square-canvas .node-D{left:22rpx;bottom:0}.square-canvas .node-DA{left:22rpx;top:50%;transform:translateY(-50%)}
</style>
