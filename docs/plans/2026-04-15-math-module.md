# 数学练习模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增独立的"数学练习"模块（在线练习 / 打印出题 / 历史记录），与碑文、学习平级，纯前端 localStorage 存储。

**Architecture:** 4 个新页面（`pages/math/`）+ 1 个题目生成引擎（`utils/math/`）+ 1 个存储工具（`utils/math/`）。复用现有 `useAuth`、`toast`、`theme` 工具。不新增云函数，不修改现有口算模块。

**Tech Stack:** UniApp Vue3 + Composition API (`<script setup>`) + uni.getStorageSync/setStorageSync + CSS @media print + window.print()

**Spec:** `docs/superpowers/specs/2026-04-15-math-module-design.md`

---

## 文件清单

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| Create | `utils/math/questionEngine.js` | 题目生成引擎：难度配置、6 种题型生成、去重 |
| Create | `utils/math/mathStorage.js` | localStorage 存取：保存记录、读取列表、50 条上限裁剪 |
| Create | `pages/math/index.vue` | 数学首页：3 入口卡片 |
| Create | `pages/math/online.vue` | 在线练习：设置→答题→结果（三阶段状态切换） |
| Create | `pages/math/print.vue` | 打印出题：设置→A4 预览→window.print() |
| Create | `pages/math/history.vue` | 历史记录：tab 切换 + 展开详情 |
| Modify | `pages.json` | 新增 4 条路由 |
| Modify | `pages/index/index.vue` | 新增第 3 张入口卡片 |
| Modify | `App.vue` | 暗色切换按钮在数学首页也显示 |
| Dependency | `html2canvas` (npm) | 答案卡导出为图片（项目已有此依赖，碑文模块使用） |

---

### Task 1: 题目生成引擎（questionEngine.js）

**Files:**
- Create: `utils/math/questionEngine.js`

- [ ] **Step 1: 创建难度配置和加减法生成**

```javascript
// utils/math/questionEngine.js

const LEVEL_CONFIG = {
  1: { name: '20以内加减', max: 20 },
  2: { name: '100以内±整十', max: 100, step: 10 },
  3: { name: '100以内±一位数', max: 100 },
}

// 随机整数 [min, max]
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成整十数 (10, 20, ..., max)
function randTens(max) {
  return rand(1, Math.floor(max / 10)) * 10
}

// 生成加法题
function genAdd(level) {
  const cfg = LEVEL_CONFIG[level]
  let a, b
  if (cfg.step === 10) {
    // Lv.2: 两位数 + 整十数，结果 ≤ 100
    a = rand(10, cfg.max - 10) // 两位数 10~90
    b = randTens(Math.min(cfg.max - a, 90)) // 整十数，确保 a+b ≤ 100
    if (b === 0) b = 10
  } else {
    a = rand(1, cfg.max - 1)
    b = rand(1, cfg.max - a)
  }
  return { expr: `${a} + ${b}`, answer: String(a + b) }
}

// 生成减法题
function genSub(level) {
  const cfg = LEVEL_CONFIG[level]
  let a, b
  if (cfg.step === 10) {
    // Lv.2: 两位数 - 整十数，结果 ≥ 0
    b = randTens(90) // 整十数 10~90
    a = rand(Math.max(b, 10), cfg.max) // 两位数，且 a ≥ b
  } else {
    a = rand(2, cfg.max)
    b = rand(1, a - 1)
  }
  return { expr: `${a} - ${b}`, answer: String(a - b) }
}

// 生成比大小题
function genCompare(level) {
  const cfg = LEVEL_CONFIG[level]
  let a, b
  do {
    a = rand(1, cfg.max)
    b = rand(1, cfg.max)
  } while (a === b)
  return { expr: `${a} ○ ${b}`, answer: a > b ? '＞' : '＜', type: 'compare' }
}

// 生成填空题
function genFillBlank(level) {
  const cfg = LEVEL_CONFIG[level]
  const isAdd = Math.random() > 0.5
  let a, b
  if (isAdd) {
    a = rand(1, cfg.max - 1)
    b = rand(1, cfg.max - a)
    // 随机隐藏 a 或 b
    if (Math.random() > 0.5) {
      return { expr: `__ + ${b} = ${a + b}`, answer: String(a), type: 'fill' }
    } else {
      return { expr: `${a} + __ = ${a + b}`, answer: String(b), type: 'fill' }
    }
  } else {
    a = rand(2, cfg.max)
    b = rand(1, a - 1)
    if (Math.random() > 0.5) {
      return { expr: `__ - ${b} = ${a - b}`, answer: String(a), type: 'fill' }
    } else {
      return { expr: `${a} - __ = ${a - b}`, answer: String(b), type: 'fill' }
    }
  }
}

// 生成连加连减题
function genChain(level) {
  const cfg = LEVEL_CONFIG[level]
  const max = cfg.max
  // 尝试生成合法的三个数
  for (let attempt = 0; attempt < 20; attempt++) {
    const isAdd = Math.random() > 0.5
    if (isAdd) {
      // a + b + c, 总和 ≤ max
      const a = rand(1, Math.floor(max / 3))
      const b = rand(1, Math.floor((max - a) / 2))
      const c = rand(1, max - a - b)
      return { expr: `${a} + ${b} + ${c}`, answer: String(a + b + c) }
    } else {
      // a - b - c, 中间和最终均 ≥ 0
      const a = rand(3, max)
      const b = rand(1, a - 1)
      const c = rand(0, a - b)
      if (c > 0) {
        return { expr: `${a} - ${b} - ${c}`, answer: String(a - b - c) }
      }
    }
  }
  // fallback: 简单连加
  const a = rand(1, 5), b = rand(1, 5), c = rand(1, 5)
  return { expr: `${a} + ${b} + ${c}`, answer: String(a + b + c) }
}

// 题型到生成函数的映射
const TYPE_GENERATORS = {
  add: genAdd,
  sub: genSub,
  compare: genCompare,
  fill: genFillBlank,
  chain: genChain,
}

// 混合题型列表（加减为主）
const MIX_TYPES = ['add', 'add', 'sub', 'sub', 'compare', 'fill', 'chain']

// 打印专用混合（不含比大小和填空）
const PRINT_TYPES = ['add', 'add', 'sub', 'sub', 'chain']

/**
 * 生成一批题目
 * @param {Object} options
 * @param {number|string} options.level - 1/2/3/'mix'
 * @param {number} options.count - 题量
 * @param {string} options.questionType - 'add'/'sub'/'compare'/'fill'/'chain'/'mix'/'print'
 * @returns {Array<{expr: string, answer: string, type?: string}>}
 */
export function generateQuestions({ level, count, questionType = 'mix' }) {
  const levels = level === 'mix' ? [1, 2, 3] : [level]
  const seen = new Set()
  const questions = []
  
  // 确定可选题型池
  let typePool
  if (questionType === 'mix') {
    typePool = MIX_TYPES  // 含比大小、填空
  } else if (questionType === 'print') {
    typePool = PRINT_TYPES  // 纯计算，不含比大小和填空
  } else {
    typePool = [questionType]  // 单一题型
  }

  for (let i = 0; i < count; i++) {
    const lv = levels[Math.floor(Math.random() * levels.length)]
    let q = null
    for (let retry = 0; retry < 10; retry++) {
      const type = typePool[Math.floor(Math.random() * typePool.length)]
      const gen = TYPE_GENERATORS[type]
      q = gen(lv)
      if (!q.type) q.type = type
      if (!seen.has(q.expr)) {
        seen.add(q.expr)
        break
      }
    }
    questions.push(q)
  }
  return questions
}

export { LEVEL_CONFIG }
```

- [ ] **Step 2: 自测生成引擎**

在浏览器 console 或临时脚本中验证：
```bash
# 在 uniapp 目录下创建临时测试
node -e "
  // 简单验证逻辑：复制核心函数到这里测试
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
  // ... 测试 genAdd, genSub 等
  console.log('基础测试通过')
"
```

手动验证：
- 加减法结果不为负、不超上限
- 比大小两数不相等
- 填空答案为正整数
- 连加连减中间结果不为负

- [ ] **Step 3: Commit**

```bash
git add utils/math/questionEngine.js
git commit -m "feat(math): 题目生成引擎 — 6 种题型 + 难度配置"
```

---

### Task 2: 存储工具（mathStorage.js）

**Files:**
- Create: `utils/math/mathStorage.js`

- [ ] **Step 1: 创建存储工具**

```javascript
// utils/math/mathStorage.js
import { useAuth } from '../../composables/common/useAuth.js'
import { toast } from '../common/toast.js'

const MAX_RECORDS = 50

function getKey() {
  const { getUsername } = useAuth()
  return `math_history_${getUsername()}`
}

/**
 * 读取所有记录
 * @returns {Array}
 */
export function getHistory() {
  try {
    return JSON.parse(uni.getStorageSync(getKey()) || '[]')
  } catch {
    return []
  }
}

/**
 * 保存一条记录（自动裁剪到 MAX_RECORDS）
 * @param {Object} record
 */
export function saveRecord(record) {
  try {
    const list = getHistory()
    // 生成 id
    record.id = Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    record.createdAt = new Date().toISOString()
    list.unshift(record) // 最新在前
    if (list.length > MAX_RECORDS) list.length = MAX_RECORDS
    uni.setStorageSync(getKey(), JSON.stringify(list))
  } catch (e) {
    console.error('保存数学记录失败', e)
    toast.error('保存记录失败')
  }
}

/**
 * 按类型筛选记录
 * @param {'online'|'print'|'all'} type
 * @returns {Array}
 */
export function getHistoryByType(type = 'all') {
  const list = getHistory()
  if (type === 'all') return list
  return list.filter(r => r.type === type)
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/math/mathStorage.js
git commit -m "feat(math): localStorage 存储工具 — 保存/读取/筛选记录"
```

---

### Task 3: 路由 + 首页入口

**Files:**
- Modify: `pages.json`
- Modify: `pages/index/index.vue`

- [ ] **Step 1: pages.json 新增 4 条路由**

在 `pages` 数组中，interview 路由之前插入：

```json
{ "path": "pages/math/index", "style": { "navigationStyle": "custom", "navigationBarTitleText": "数学练习" } },
{ "path": "pages/math/online", "style": { "navigationStyle": "custom", "navigationBarTitleText": "在线练习" } },
{ "path": "pages/math/print", "style": { "navigationStyle": "custom", "navigationBarTitleText": "打印出题" } },
{ "path": "pages/math/history", "style": { "navigationStyle": "custom", "navigationBarTitleText": "历史记录" } },
```

- [ ] **Step 2: 首页新增数学卡片**

在 `pages/index/index.vue` 的 `<view class="cards">` 内，学习卡片后面添加：

```html
<view class="card card-math" @click="goTo('/pages/math/index')">
  <text class="card-icon">🔢</text>
  <text class="card-title">数学练习</text>
  <text class="card-desc">在线练习、打印出题</text>
</view>
```

在 `<style scoped>` 中添加：

```css
.card-math { border-left: 8rpx solid #42A5F5; }
```

- [ ] **Step 3: Commit**

```bash
git add pages.json pages/index/index.vue
git commit -m "feat(math): 路由注册 + 首页数学入口卡片"
```

---

### Task 4: 数学首页（math/index.vue）

**Files:**
- Create: `pages/math/index.vue`

- [ ] **Step 1: 创建数学首页**

3 个入口卡片（在线练习、打印出题、历史记录），风格参考 `pages/study/index.vue`。

```html
<template>
  <view class="math-index">
    <view class="header">
      <view class="back-btn" @click="goBack">←</view>
      <text class="title">数学练习</text>
    </view>

    <view class="modules">
      <view class="module-card online-card" @click="goTo('/pages/math/online')">
        <text class="module-icon">📝</text>
        <text class="module-name">在线练习</text>
        <text class="module-desc">选题型、定时间、在线答题</text>
      </view>
      <view class="module-card print-card" @click="goTo('/pages/math/print')">
        <text class="module-icon">🖨️</text>
        <text class="module-name">打印出题</text>
        <text class="module-desc">生成练习卷，A4 纸打印</text>
      </view>
      <view class="module-card history-card" @click="goTo('/pages/math/history')">
        <text class="module-icon">📋</text>
        <text class="module-name">历史记录</text>
        <text class="module-desc">查看练习记录、核对答案</text>
      </view>
    </view>
  </view>
</template>

<script setup>
function goTo(url) {
  uni.navigateTo({ url })
}
function goBack() {
  uni.navigateBack()
}
</script>
```

样式参考学习首页的 `.module-card` 风格，用蓝色系主题色（#42A5F5）。

- [ ] **Step 2: 添加暗色模式 CSS**

在 `<style scoped>` 中添加 `:global(body.dark-mode)` 覆盖规则，参考学习模块其他页面的暗色写法。

- [ ] **Step 3: Commit**

```bash
git add pages/math/index.vue
git commit -m "feat(math): 数学首页 — 3 入口卡片"
```

---

### Task 5: 在线练习页（math/online.vue）

**Files:**
- Create: `pages/math/online.vue`

这是最复杂的页面，三阶段状态切换。参考现有 `mental-math.vue` 的结构。

- [ ] **Step 1: 设置阶段 UI**

```html
<template>
  <view class="online-page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="back-btn" @click="goBack">←</view>
      <view v-if="phase === 'quiz'" class="timer" :class="{ warn: timerWarn }">
        {{ enableTimer ? formatTime(elapsed) : '' }}
      </view>
      <view v-if="phase === 'quiz'" class="progress-text">
        {{ answeredCount }}/{{ questions.length }}
      </view>
      <view v-else class="page-title">在线练习</view>
    </view>

    <!-- 阶段 1: 设置 -->
    <view v-if="phase === 'setup'" class="setup-area">
      <!-- 难度 -->
      <text class="filter-title">难度</text>
      <view class="filter-tags">
        <view v-for="opt in levelOptions" :key="opt.value"
          :class="['filter-tag', selectedLevel === opt.value && 'active']"
          @click="selectedLevel = opt.value"
        >{{ opt.label }}</view>
      </view>

      <!-- 题型 -->
      <text class="filter-title">题型</text>
      <view class="filter-tags">
        <view v-for="opt in typeOptions" :key="opt.value"
          :class="['filter-tag', selectedType === opt.value && 'active']"
          @click="selectedType = opt.value"
        >{{ opt.label }}</view>
      </view>

      <!-- 题量 -->
      <text class="filter-title">题量</text>
      <view class="count-row">
        <view v-for="n in [20, 50, 100]" :key="n"
          :class="['filter-tag', questionCount === n && 'active']"
          @click="questionCount = n"
        >{{ n }}题</view>
        <input class="count-input" type="number" v-model="customCount"
          placeholder="自定义" @blur="onCustomCount" />
      </view>

      <!-- 计时 -->
      <view class="timer-toggle" @click="enableTimer = !enableTimer">
        <text>计时：{{ enableTimer ? '开启' : '关闭' }}</text>
      </view>

      <view class="start-btn" @click="startQuiz">开始练习</view>
    </view>

    <!-- 阶段 2: 答题 -->
    <!-- 阶段 3: 结果 -->
  </view>
</template>
```

- [ ] **Step 2: 答题阶段**

滚动列表，参考 `mental-math.vue` 的 `<scroll-view>`。关键差异：
- 比大小题：显示两个按钮（＞ ＜），不是输入框
- 填空题：一个输入框，和普通计算题一样
- 其他题型：输入框填答案

```html
<!-- 阶段 2: 答题 -->
<scroll-view v-if="phase === 'quiz'" scroll-y class="question-list"
  :scroll-into-view="scrollTarget">
  <view v-for="(q, i) in questions" :key="i" :id="'q-' + i"
    class="q-row" :class="{ current: i === currentFocus, done: q.userAnswer !== '' }">
    <text class="q-index">{{ i + 1 }}.</text>
    <text class="q-expr">{{ q.expr }} {{ q.type !== 'compare' ? '=' : '' }}</text>
    
    <!-- 比大小：两个按钮 -->
    <view v-if="q.type === 'compare'" class="compare-btns">
      <view :class="['cmp-btn', q.userAnswer === '＞' && 'selected']"
        @click="setAnswer(i, '＞')">＞</view>
      <view :class="['cmp-btn', q.userAnswer === '＜' && 'selected']"
        @click="setAnswer(i, '＜')">＜</view>
    </view>
    
    <!-- 其他题型：输入框 -->
    <input v-else class="q-input" type="number" :value="q.userAnswer"
      :focus="i === currentFocus && q.type !== 'compare'"
      placeholder="?" @input="onInput(i, $event)" @confirm="onConfirm(i)" />
    
    <!-- 交卷后显示对错 -->
    <text v-if="q.checked" class="q-result"
      :class="q.userAnswer === q.answer ? 'correct' : 'wrong'">
      {{ q.userAnswer === q.answer ? '✓' : '✗ ' + q.answer }}
    </text>
  </view>
</scroll-view>

<view v-if="phase === 'quiz'" class="submit-bar">
  <view class="submit-btn" @click="submitAll">交卷</view>
</view>
```

- [ ] **Step 3: 结果阶段**

```html
<!-- 阶段 3: 结果 -->
<view v-if="phase === 'result'" class="result-area">
  <text class="result-title">完成！</text>
  <text v-if="enableTimer" class="result-time">用时：{{ formatTime(finalTime) }}</text>
  <text class="result-score">{{ correctCount }}/{{ questions.length }} 正确</text>
  <text class="result-accuracy">正确率：{{ accuracy }}%</text>

  <view class="result-actions">
    <view class="action-btn primary" @click="restart">再来一次</view>
    <view class="action-btn" @click="goBack">回到首页</view>
  </view>

  <!-- 错题回顾 -->
  <view v-if="wrongList.length > 0" class="wrong-section">
    <text class="wrong-title">错题回顾（{{ wrongList.length }} 题）</text>
    <view v-for="w in wrongList" :key="w.index" class="wrong-item">
      <text class="wrong-expr">{{ w.index + 1 }}. {{ w.expr }} = {{ w.answer }}</text>
      <text class="wrong-answer">你的答案：{{ w.userAnswer || '未填' }}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: script 逻辑**

```javascript
<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { generateQuestions, LEVEL_CONFIG } from '../../utils/math/questionEngine.js'
import { saveRecord } from '../../utils/math/mathStorage.js'
import { toast } from '../../utils/common/toast.js'

const phase = ref('setup') // 'setup' | 'quiz' | 'result'

// 设置
const levelOptions = [
  { label: 'Lv.1 20以内', value: 1 },
  { label: 'Lv.2 ±整十', value: 2 },
  { label: 'Lv.3 ±一位数', value: 3 },
  { label: '混合', value: 'mix' },
]
const typeOptions = [
  { label: '混合', value: 'mix' },
  { label: '加法', value: 'add' },
  { label: '减法', value: 'sub' },
  { label: '比大小', value: 'compare' },
  { label: '填空', value: 'fill' },
  { label: '连加连减', value: 'chain' },
]
const selectedLevel = ref(1)
const selectedType = ref('mix')
const questionCount = ref(100)
const customCount = ref('')
const enableTimer = ref(true)

function onCustomCount() {
  const n = parseInt(customCount.value)
  if (n > 0 && n <= 200) questionCount.value = n
}

// 答题
const questions = ref([])
const currentFocus = ref(0)
const scrollTarget = ref('')
const elapsed = ref(0)
const finalTime = ref(0)
const timerWarn = ref(false)
let timer = null

const answeredCount = computed(() => questions.value.filter(q => q.userAnswer !== '').length)
const correctCount = computed(() => questions.value.filter(q => q.checked && q.userAnswer === q.answer).length)
const wrongList = computed(() =>
  questions.value.map((q, i) => ({ ...q, index: i })).filter(q => q.checked && q.userAnswer !== q.answer)
)
const accuracy = computed(() =>
  questions.value.length ? Math.round(correctCount.value / questions.value.length * 100) : 0
)

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function startQuiz() {
  const raw = generateQuestions({
    level: selectedLevel.value,
    count: questionCount.value,
    questionType: selectedType.value,
  })
  questions.value = raw.map(q => ({ ...q, userAnswer: '', checked: false }))
  currentFocus.value = 0
  elapsed.value = 0
  timerWarn.value = false
  phase.value = 'quiz'

  if (enableTimer.value) {
    timer = setInterval(() => {
      elapsed.value++
      if (elapsed.value === 480) timerWarn.value = true
    }, 1000)
  }
}

function setAnswer(i, val) {
  questions.value[i].userAnswer = val
  if (i < questions.value.length - 1) {
    currentFocus.value = i + 1
    scrollTarget.value = 'q-' + (i + 1)
  }
}

function onInput(i, e) {
  questions.value[i].userAnswer = e.detail.value
}

function onConfirm(i) {
  if (i < questions.value.length - 1) {
    currentFocus.value = i + 1
    scrollTarget.value = 'q-' + (i + 1)
  }
}

function submitAll() {
  uni.showModal({
    title: '确认交卷',
    content: `已答 ${answeredCount.value}/${questions.value.length} 题，确定交卷？`,
    success(res) {
      if (res.confirm) doSubmit()
    }
  })
}

function doSubmit() {
  if (timer) { clearInterval(timer); timer = null }
  finalTime.value = elapsed.value
  questions.value.forEach(q => { q.checked = true })
  phase.value = 'result'

  // 保存记录
  saveRecord({
    type: 'online',
    level: selectedLevel.value,
    questionType: selectedType.value,
    total: questions.value.length,
    correct: correctCount.value,
    elapsed: finalTime.value,
    questions: questions.value.map(q => ({
      expr: q.expr, answer: q.answer, userAnswer: q.userAnswer,
      isCorrect: q.userAnswer === q.answer,
    })),
  })
}

function restart() {
  phase.value = 'setup'
  questions.value = []
  elapsed.value = 0
  timerWarn.value = false
}

function goBack() {
  if (timer) clearInterval(timer)
  uni.navigateBack()
}

onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
```

- [ ] **Step 5: 添加样式**

复用 `mental-math.vue` 的样式模式：`.top-bar`、`.filter-area`、`.q-row`、`.result-area` 等。主题色用蓝色系（#42A5F5 替代紫色 #9C27B0）。加上暗色模式覆盖。

额外新增样式：
- `.compare-btns` — 比大小的两个按钮横排
- `.cmp-btn` / `.cmp-btn.selected` — 按钮选中态
- `.count-row` — 题量选择行（预设按钮 + 自定义输入框）
- `.timer-toggle` — 计时开关

- [ ] **Step 6: Commit**

```bash
git add pages/math/online.vue
git commit -m "feat(math): 在线练习 — 设置/答题/结果三阶段"
```

---

### Task 6: 打印出题页（math/print.vue）

**Files:**
- Create: `pages/math/print.vue`

- [ ] **Step 1: 创建打印页面**

两阶段：设置（选难度）→ A4 预览 + 打印按钮。

```html
<template>
  <view class="print-page">
    <!-- 顶部栏（打印时隐藏） -->
    <view class="top-bar no-print">
      <view class="back-btn" @click="goBack">←</view>
      <text class="page-title">打印出题</text>
    </view>

    <!-- 设置 -->
    <view v-if="!generated" class="setup-area no-print">
      <text class="filter-title">选择难度</text>
      <view class="filter-tags">
        <view v-for="opt in levelOptions" :key="opt.value"
          :class="['filter-tag', selectedLevel === opt.value && 'active']"
          @click="selectedLevel = opt.value"
        >{{ opt.label }}</view>
      </view>
      <view class="start-btn" @click="generate">生成试卷</view>
    </view>

    <!-- A4 预览 -->
    <view v-if="generated" class="a4-sheet" id="printArea">
      <view class="sheet-header">
        <text class="sheet-title">数学练习</text>
        <view class="sheet-info">
          <text>姓名：__________</text>
          <text>班级：__________</text>
          <text>分数：__________</text>
        </view>
      </view>
      <view class="sheet-body">
        <view v-for="(q, i) in questions" :key="i" class="sheet-item">
          <text>{{ i + 1 }}. {{ q.expr }} = ______</text>
        </view>
      </view>
    </view>

    <!-- 答案卡预览（导出用，默认隐藏） -->
    <view v-if="generated && showAnswerSheet" class="a4-sheet answer-sheet no-print" id="answerArea">
      <view class="sheet-header">
        <text class="sheet-title">数学练习 — 答案</text>
        <view class="sheet-info">
          <text>{{ formatDate(new Date()) }}</text>
          <text>{{ levelName(selectedLevel) }}</text>
          <text>共 {{ questions.length }} 题</text>
        </view>
      </view>
      <view class="sheet-body">
        <view v-for="(q, i) in questions" :key="i" class="sheet-item">
          <text>{{ i + 1 }}. {{ q.expr }} = </text>
          <text class="answer-text">{{ q.answer }}</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮（打印时隐藏） -->
    <view v-if="generated" class="action-bar no-print">
      <view class="action-btn" @click="doPrint">打印试卷</view>
      <view class="action-btn" @click="exportAnswerImage">导出答案图片</view>
      <view class="action-btn secondary" @click="regenerate">重新生成</view>
      <view class="action-btn secondary" @click="goBack">返回</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { generateQuestions, LEVEL_CONFIG } from '../../utils/math/questionEngine.js'
import { saveRecord } from '../../utils/math/mathStorage.js'
import { toast } from '../../utils/common/toast.js'

const levelOptions = [
  { label: 'Lv.1 20以内', value: 1 },
  { label: 'Lv.2 ±整十', value: 2 },
  { label: 'Lv.3 ±一位数', value: 3 },
  { label: '混合', value: 'mix' },
]
const selectedLevel = ref(1)
const generated = ref(false)
const showAnswerSheet = ref(false)
const questions = ref([])

function levelName(lv) {
  if (lv === 'mix') return '混合'
  return LEVEL_CONFIG[lv]?.name || `Lv.${lv}`
}

function formatDate(d) {
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function generate() {
  questions.value = generateQuestions({
    level: selectedLevel.value,
    count: 100,
    questionType: 'print', // 纯计算，不含比大小和填空
  })
  generated.value = true
  showAnswerSheet.value = false
}

function regenerate() {
  generate()
}

function doPrint() {
  // 保存记录（含正确答案，供历史核对）
  saveRecord({
    type: 'print',
    level: selectedLevel.value,
    total: questions.value.length,
    questions: questions.value.map(q => ({ expr: q.expr, answer: q.answer })),
  })
  showAnswerSheet.value = false // 打印时不显示答案卡
  window.print()
}

async function exportAnswerImage() {
  // 显示答案卡 DOM → html2canvas 截图 → 下载
  showAnswerSheet.value = true
  toast.loading('正在生成图片...')
  await new Promise(r => setTimeout(r, 300)) // 等待 DOM ���染
  try {
    const { default: html2canvas } = await import('html2canvas')
    const el = document.getElementById('answerArea')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const link = document.createElement('a')
    link.download = `数学练习答案_${formatDate(new Date())}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.hideLoading()
    toast.success('图片已保存')
  } catch (e) {
    toast.hideLoading()
    toast.error('导出失败')
    console.error('导出答案图片失败', e)
  }
  showAnswerSheet.value = false
}

function goBack() {
  uni.navigateBack()
}
</script>
```

- [ ] **Step 2: A4 打印样式**

```css
<style scoped>
/* 屏幕样式 */
.a4-sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 20rpx auto;
  padding: 15mm 20mm;
  background: #fff;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}
.sheet-header { text-align: center; margin-bottom: 8mm; }
.sheet-title { font-size: 24pt; font-weight: bold; display: block; margin-bottom: 4mm; }
.sheet-info {
  display: flex; justify-content: space-around;
  font-size: 12pt; padding-top: 3mm;
  border-top: 1px solid #333;
}
.sheet-body {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2mm 4mm;
  font-size: 14pt;
  line-height: 2;
}
.sheet-item { white-space: nowrap; }

/* 答案卡红色文字 */
.answer-text { color: #E53935; font-weight: bold; }
.answer-sheet { border: 2px dashed #E53935; }

/* 打印样式 */
@media print {
  .no-print { display: none !important; }
  .print-page {
    margin: 0; padding: 0; background: #fff;
    min-height: auto;
  }
  .a4-sheet {
    width: 100%; margin: 0; padding: 10mm 15mm;
    box-shadow: none; min-height: auto;
  }
  .sheet-body {
    font-size: 12pt;
    line-height: 1.8;
  }
}
</style>
```

- [ ] **Step 3: 暗色模式**

`.a4-sheet` 在暗色下保持白底黑字（因为是打印预览），外层背景用暗色。

- [ ] **Step 4: Commit**

```bash
git add pages/math/print.vue
git commit -m "feat(math): 打印出题 — A4 排版 + window.print()"
```

---

### Task 7: 历史记录页（math/history.vue）

**Files:**
- Create: `pages/math/history.vue`

- [ ] **Step 1: 创建历史记录页面**

```html
<template>
  <view class="history-page">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">←</view>
      <text class="page-title">历史记录</text>
    </view>

    <!-- Tab -->
    <view class="tab-bar">
      <view v-for="t in tabs" :key="t.value"
        :class="['tab-item', activeTab === t.value && 'active']"
        @click="activeTab = t.value; expandedIndex = -1"
      >{{ t.label }}</view>
    </view>

    <!-- 列表 -->
    <view v-if="filteredList.length === 0" class="empty-tip">暂无记录</view>

    <view v-for="(record, i) in filteredList" :key="record.id" class="record-card">
      <view class="record-header" @click="toggleExpand(i)">
        <view class="record-type" :class="record.type">
          {{ record.type === 'online' ? '在线' : '打印' }}
        </view>
        <view class="record-info">
          <text class="record-level">{{ levelName(record.level) }}</text>
          <text class="record-count">{{ record.total }}题</text>
          <text v-if="record.type === 'online'" class="record-score">
            正确率 {{ Math.round((record.correct / record.total) * 100) }}%
          </text>
          <text v-if="record.type === 'online' && record.elapsed" class="record-time">
            {{ formatTime(record.elapsed) }}
          </text>
        </view>
        <text class="record-date">{{ formatDate(record.createdAt) }}</text>
        <text class="expand-icon">{{ expandedIndex === i ? '▼' : '▶' }}</text>
      </view>

      <!-- 展开详情 -->
      <view v-if="expandedIndex === i" class="record-detail">
        <view v-for="(q, qi) in record.questions" :key="qi"
          class="detail-item" :class="{ wrong: q.isCorrect === false }">
          <text class="detail-index">{{ qi + 1 }}.</text>
          <text class="detail-expr">{{ q.expr }} = <text class="answer-red">{{ q.answer }}</text></text>
          <text v-if="record.type === 'online' && q.userAnswer !== undefined"
            class="detail-user" :class="{ 'is-wrong': !q.isCorrect }">
            {{ q.isCorrect ? '✓' : '你答：' + (q.userAnswer || '未填') }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getHistory } from '../../utils/math/mathStorage.js'
import { LEVEL_CONFIG } from '../../utils/math/questionEngine.js'

const tabs = [
  { label: '全部', value: 'all' },
  { label: '在线', value: 'online' },
  { label: '打印', value: 'print' },
]
const activeTab = ref('all')
const records = ref([])
const expandedIndex = ref(-1)

onShow(() => { records.value = getHistory() })

const filteredList = computed(() => {
  if (activeTab.value === 'all') return records.value
  return records.value.filter(r => r.type === activeTab.value)
})

function levelName(level) {
  if (level === 'mix') return '混合'
  return LEVEL_CONFIG[level]?.name || `Lv.${level}`
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toggleExpand(i) {
  expandedIndex.value = expandedIndex.value === i ? -1 : i
}

function goBack() { uni.navigateBack() }
</script>
```

- [ ] **Step 2: 样式**

卡片列表风格，在线记录绿色标签，打印记录灰色标签。展开详情区域 100 题紧凑排列（grid 4 列或列表）。错题红色高亮。加暗色模式覆盖。

- [ ] **Step 3: Commit**

```bash
git add pages/math/history.vue
git commit -m "feat(math): 历史记录 — tab 筛选 + 展开详情核对答案"
```

---

### Task 8: App.vue 暗色按钮路由更新

**Files:**
- Modify: `App.vue`

- [ ] **Step 1: 更新暗色切换按钮显示路由**

在 `App.vue` 的 `updateBtnVisible` 函数中，将按钮显示条件从只在学习首页显示，扩展到数学首页也显示：

当前代码（约第 27 行）：
```javascript
themeBtnEl.style.display = path === 'pages/study/index' ? 'flex' : 'none'
```

改为：
```javascript
const showPaths = ['pages/study/index', 'pages/math/index']
themeBtnEl.style.display = showPaths.includes(path) ? 'flex' : 'none'
```

- [ ] **Step 2: Commit**

```bash
git add App.vue
git commit -m "feat(math): 暗色切换按钮在数学首页也显示"
```

---

### Task 9: 手动验证 + 修复

- [ ] **Step 1: 启动开发服务器**

HBuilderX 运行到浏览器，或 `npm run dev:h5`。

- [ ] **Step 2: 验证核心流程**

手动测试检查清单：
1. 首页 → 看到 3 张卡片（碑文、学习、数学）
2. 数学首页 → 3 个入口卡片
3. 在线练习 → 设置（切换难度/题型/题量/计时）→ 开始 → 答几题 → 交卷 → 看结果+错题回顾
4. 打印出题 → 选难度 → 生成 → A4 预览排版正常 → 打印（检查打印预览只显示试卷）
5. 历史记录 → 看到刚才的在线和打印记录 → tab 切换 → 展开看详情
6. 打印详情 → 能看到正确答案
7. 在线详情 → 能看到对错
8. 暗色模式 → 所有页面正常
9. 返回导航 → 各页面返回正常

- [ ] **Step 3: 修复发现的问题**

根据测试发现的问题修复，每个修复单独 commit。

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "fix(math): 手动验证修复"
```

---

## 执行顺序总结

| Task | 内容 | 依赖 |
|------|------|------|
| 1 | questionEngine.js | 无 |
| 2 | mathStorage.js | 无 |
| 3 | 路由 + 首页入口 | 无 |
| 4 | math/index.vue | Task 3 |
| 5 | math/online.vue | Task 1, 2 |
| 6 | math/print.vue（含答案图片导出） | Task 1, 2 |
| 7 | math/history.vue | Task 2 |
| 8 | App.vue 暗色按钮 | 无 |
| 9 | 手动验证 | Task 1-8 |

Task 1、2、3、8 可并行。Task 4-7 在 1-3 完成后可并行。Task 9 最后。
