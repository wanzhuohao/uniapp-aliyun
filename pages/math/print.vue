<template>
  <view class="print-page">
    <!-- Phase 1: Setup panel -->
    <PageHeader title="打印出题" theme="math" />
    <view v-if="!questions.length" class="setup-panel">

      <view class="config-card">
        <text class="config-label">难度</text>
        <view class="level-tabs">
          <view
            v-for="opt in levelOptions"
            :key="opt.value"
            class="level-tab"
            :class="{ active: selectedLevel === opt.value }"
            @click="selectedLevel = opt.value"
          >
            {{ opt.label }}
          </view>
        </view>

        <text class="config-label">包含连加减</text>
        <view class="chain-toggle" @click="includeChain = !includeChain">
          <view class="toggle-track" :class="{ on: includeChain }">
            <view class="toggle-thumb" />
          </view>
          <text class="toggle-label">{{ includeChain ? '是（如 3+5+2）' : '否（只出加减法）' }}</text>
        </view>

        <view class="info-row">
          <text class="info-text">固定 100 题，纯计算</text>
        </view>

        <button class="gen-btn" @click="generateSheet">生成试卷</button>
      </view>
    </view>

    <!-- Phase 2: Preview + Actions -->
    <view v-else class="preview-panel">
      <!-- Action bar (no-print) -->
      <view class="action-bar no-print">
        <button class="action-btn btn-print" @click="handlePrint">打印试卷</button>
        <button class="action-btn btn-export" @click="exportAnswerImage">导出答案图片</button>
        <button class="action-btn btn-regen" @click="regenerate">重新生成</button>
        <button class="action-btn btn-back" @click="goBack">返回</button>
      </view>

      <!-- Trial sheet (wrapped for mobile scaling) -->
      <div class="a4-wrapper" :style="a4WrapperStyle">
        <div id="printArea" ref="printAreaRef" class="a4-sheet" :style="a4SheetStyle">
          <div class="sheet-header">
            <div class="sheet-title">口算练习</div>
            <div class="sheet-info-row">
              <span class="sheet-info-item">姓名___________</span>
              <span class="sheet-info-item">班级___________</span>
              <span class="sheet-info-item">分数___________</span>
            </div>
          </div>
          <div class="sheet-body">
            <div
              v-for="(q, i) in questions"
              :key="i"
              class="question-item"
            >
              {{ q.expr }} =
            </div>
          </div>
        </div>
      </div>

      <!-- Answer sheet (hidden by default, shown only for export) -->
      <div
        id="answerArea"
        class="answer-sheet no-print"
        :style="{ display: showAnswerSheet ? 'block' : 'none' }"
      >
        <div class="sheet-header">
          <div class="sheet-title">口算练习 — 答案</div>
          <div class="sheet-info-row">
            <span class="sheet-info-item">日期：{{ todayStr }}</span>
            <span class="sheet-info-item">难度：{{ levelLabel }}</span>
            <span class="sheet-info-item">题数：{{ questions.length }} 题</span>
          </div>
        </div>
        <div class="sheet-body">
          <div
            v-for="(q, i) in questions"
            :key="i"
            class="question-item"
          >
            {{ q.expr }} = <span class="answer-text">{{ q.answer }}</span>
          </div>
        </div>
      </div>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import PageHeader from '../../components/PageHeader.vue'
import { generateQuestions, LEVEL_CONFIG } from '../../utils/math/questionEngine.js'
import { saveRecord } from '../../utils/math/mathStorage.js'
import { toast } from '../../utils/common/toast.js'

// ─── State ────────────────────────────────────────────────────────────────────

const selectedLevel = ref(1)
const includeChain = ref(false)
const questions = ref([])
const showAnswerSheet = ref(false)

// ─── Mobile scaling ───────────────────────────────────────────────────────────
// A4 sheet 固定 210mm ≈ 794px 宽，窄屏上缩放显示，保证预览=打印
const printAreaRef = ref(null)
const sheetScale = ref(1)
const sheetHeight = ref(0)
const SHEET_WIDTH_PX = 794

const a4SheetStyle = computed(() => {
  if (sheetScale.value >= 1) return {}
  return {
    transform: `scale(${sheetScale.value})`,
    transformOrigin: 'top left',
  }
})

const a4WrapperStyle = computed(() => {
  if (sheetScale.value >= 1) return {}
  return {
    width: `${SHEET_WIDTH_PX * sheetScale.value}px`,
    height: sheetHeight.value ? `${sheetHeight.value * sheetScale.value}px` : undefined,
    overflow: 'hidden',
  }
})

function updateSheetScale() {
  if (typeof window === 'undefined') return
  const available = window.innerWidth - 32 // 预留两侧边距
  sheetScale.value = available < SHEET_WIDTH_PX ? available / SHEET_WIDTH_PX : 1
  nextTick(() => {
    if (printAreaRef.value) {
      // offsetHeight 不受 transform 影响，拿到的是原始高度
      sheetHeight.value = printAreaRef.value.offsetHeight
    }
  })
}

onMounted(() => {
  updateSheetScale()
  window.addEventListener('resize', updateSheetScale)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateSheetScale)
})

// ─── Config ───────────────────────────────────────────────────────────────────

const levelOptions = [
  { value: 1,     label: '20以内' },
  { value: 2,     label: '100以内(整十)' },
  { value: 3,     label: '100以内' },
]

const levelLabel = computed(() => {
  if (selectedLevel.value === 'mix') return '混合 (Lv.1-3)'
  return LEVEL_CONFIG[selectedLevel.value]?.name ?? `Lv.${selectedLevel.value}`
})

const todayStr = computed(() => formatDate(new Date()))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function generateSheet() {
  questions.value = generateQuestions({
    level: selectedLevel.value,
    count: 100,
    questionType: includeChain.value ? 'print' : 'print-no-chain',
  })
  nextTick(updateSheetScale)
}

function regenerate() {
  generateSheet()
}

function goBack() {
  if (questions.value.length) {
    questions.value = []
  } else {
    uni.navigateBack()
  }
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

async function handlePrint() {
  saveRecord({
    type: 'print',
    level: selectedLevel.value,
    total: questions.value.length,
    questions: questions.value.map(q => ({ expr: q.expr, answer: q.answer })),
  })
  showAnswerSheet.value = false
  toast.loading('生成图片...')
  try {
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('printArea')
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      // 克隆节点上去掉预览用的 scale，保证打印图保持 210mm 原始尺寸
      onclone: (clonedDoc) => {
        const clonedSheet = clonedDoc.getElementById('printArea')
        if (clonedSheet) clonedSheet.style.transform = ''
      },
    })
    const dataUrl = canvas.toDataURL('image/png')
    toast.hideLoading()

    if (isMobile()) {
      // 手机：下载图片，用户从相册打印
      const link = document.createElement('a')
      link.download = `${Date.now()}.png`
      link.href = dataUrl
      link.click()
      toast.success('图片已保存，请从相册打印')
    } else {
      // 电脑：新窗口打印
      const win = window.open('', '_blank')
      win.document.write(`
        <html><head><title>打印</title>
        <style>
          @page { margin: 0; }
          body { margin: 0; display: flex; justify-content: center; }
          img { width: 100%; height: auto; }
        </style>
        </head><body>
        <img src="${dataUrl}" onload="window.print();window.close();" />
        </body></html>
      `)
      win.document.close()
    }
  } catch (e) {
    toast.hideLoading()
    toast.error('打印失败')
    console.error(e)
  }
}

async function exportAnswerImage() {
  showAnswerSheet.value = true
  toast.loading('正在生成图片...')
  await new Promise(r => setTimeout(r, 300)) // wait for DOM render
  try {
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('answerArea')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const link = document.createElement('a')
    link.download = `${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.hideLoading()
    toast.success('图片已保存')
  } catch (e) {
    toast.hideLoading()
    toast.error('导出失败')
    console.error(e)
  }
  showAnswerSheet.value = false
}
</script>

<style scoped>
/* ── Page wrapper ─────────────────────────────────────────────── */
.print-page {
  min-height: 100vh;
  background: #F0F4F9;
  padding-bottom: 40rpx;
}

/* ── Setup panel ──────────────────────────────────────────────── */
.setup-panel {
  padding: 32rpx 28rpx;
}

.config-card {
  position: relative;
  background: #fff;
  border: 2rpx solid #D8E4F0;
  border-radius: 20rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 6rpx 18rpx rgba(30,90,142,0.05);
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.config-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 28rpx;
  bottom: 28rpx;
  width: 4rpx;
  background: linear-gradient(180deg, #42A5F5, #1E88E5);
  border-radius: 0 4rpx 4rpx 0;
}

.config-label {
  font-size: 28rpx;
  font-weight: 900;
  color: #0F2B48;
  letter-spacing: 2rpx;
}

.level-tabs {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.level-tab {
  flex: 1;
  min-width: 120rpx;
  text-align: center;
  padding: 18rpx 12rpx;
  border-radius: 12rpx;
  border: 2rpx solid #D8E4F0;
  font-size: 26rpx;
  color: #6B88A3;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(30,90,142,0.03);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(.4,0,.2,1);
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

.level-tab.active {
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  border-color: transparent;
  color: #fff;
  font-weight: bold;
  box-shadow: 0 4rpx 12rpx rgba(66,165,245,0.25);
}

.chain-toggle {
  display: flex;
  align-items: center;
  gap: 16rpx;
  cursor: pointer;
}
.toggle-track {
  width: 80rpx;
  height: 40rpx;
  border-radius: 20rpx;
  background: #D8E4F0;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.toggle-track.on { background: linear-gradient(135deg, #42A5F5, #1E88E5); }
.toggle-thumb {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: left 0.2s;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
}
.toggle-track.on .toggle-thumb { left: 44rpx; }
.toggle-label {
  font-size: 26rpx;
  color: #6B88A3;
}

.info-row {
  padding: 16rpx 20rpx;
  background: #E3F0FA;
  border-radius: 10rpx;
  border-left: 4rpx solid #42A5F5;
}

.info-text {
  font-size: 24rpx;
  color: #1E5A8E;
  line-height: 1.6;
  font-family: 'Courier New', 'Consolas', monospace;
  letter-spacing: 1rpx;
}

.gen-btn {
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  border: none;
  border-radius: 40rpx;
  padding: 28rpx 0;
  width: 100%;
  letter-spacing: 6rpx;
  cursor: pointer;
  box-shadow: 0 6rpx 18rpx rgba(66,165,245,0.3);
  transition: transform 0.2s;
}

.gen-btn:active {
  transform: scale(0.97);
}

/* ── Preview panel ────────────────────────────────────────────── */
.preview-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 16rpx;
  gap: 24rpx;
}

/* ── Action bar ───────────────────────────────────────────────── */
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  justify-content: center;
  width: 100%;
  max-width: 230mm;
}

.action-btn {
  flex: 1;
  min-width: 180rpx;
  padding: 22rpx 28rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 900;
  cursor: pointer;
  letter-spacing: 2rpx;
  transition: transform 0.2s, opacity 0.2s;
}

.action-btn:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.btn-print  {
  background: linear-gradient(135deg, #42A5F5, #1E88E5);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(66,165,245,0.3);
}
.btn-export { background: #E53935; color: #fff; }
.btn-regen  { background: #66BB6A; color: #fff; }
.btn-back   { background: #8EA8BF; color: #fff; }

/* ── A4 sheet wrapper (handles mobile scaling) ────────────────── */
.a4-wrapper {
  margin: 20rpx auto;
  max-width: 100%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

/* ── A4 sheet (screen) ────────────────────────────────────────── */
.a4-sheet {
  width: 210mm;
  padding: 8mm 12mm;
  background: #fff !important;
  box-sizing: border-box;
  font-family: 'Arial', 'SimSun', sans-serif;
}

/* ── Sheet info bar (no title, just name/class/score) ─────────── */
.sheet-info-bar {
  display: flex;
  justify-content: space-between;
  font-size: 12pt;
  color: #333;
  border-bottom: 1px solid #ccc;
  padding-bottom: 3mm;
  margin-bottom: 4mm;
}

.sheet-info-item {
  white-space: nowrap;
}

/* ── Answer sheet header ─────────────────────────────────────── */
.sheet-header {
  text-align: center;
  margin-bottom: 3mm;
}
.sheet-title {
  font-size: 14pt;
  font-weight: bold;
  color: #111;
  margin-bottom: 2mm;
}
.sheet-info-row {
  display: flex;
  justify-content: center;
  gap: 8mm;
  font-size: 11pt;
  color: #333;
  border-bottom: 1px solid #ccc;
  padding-bottom: 2mm;
  margin-bottom: 3mm;
}

/* ── Sheet body: 4-column grid ────────────────────────────────── */
.sheet-body {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  font-size: 14pt;
  line-height: 1.75;
}

.question-item {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #111;
}

/* ── Answer text ──────────────────────────────────────────────── */
.answer-text {
  color: #E53935;
  font-weight: bold;
}

/* ── Answer sheet decoration ──────────────────────────────────── */
.answer-sheet {
  width: auto;
  min-width: 600px;
  max-width: 900px;
  margin: 20rpx auto;
  padding: 8px 12px;
  background: #fff;
  box-sizing: border-box;
  font-family: 'Arial', 'SimSun', sans-serif;
}
</style>

<!-- Global styles (print) -->
<style>
/* ── Print media ──────────────────────────────────────────────── */
@media print {
  @page {
    margin: 3mm;
  }

  .no-print {
    display: none !important;
  }

  /* Reset everything */
  html, body, #app, uni-app, uni-page, uni-page-body,
  .uni-page-head, .uni-page-head-hd {
    margin: 0 !important;
    padding: 0 !important;
    min-height: auto !important;
    background: #fff !important;
    overflow: visible !important;
  }

  /* Hide uni navigation bar */
  .uni-page-head, uni-page-head {
    display: none !important;
  }

  .print-page,
  .preview-panel {
    margin: 0;
    padding: 0;
    background: #fff;
    min-height: auto;
  }

  .a4-sheet {
    width: 100%;
    margin: 0;
    padding: 0 5mm;
    box-shadow: none;
    min-height: auto;
    background: #fff !important;
  }

  .sheet-body {
    font-size: 14pt;
    line-height: 1.75;
    gap: 0;
  }
}
</style>
