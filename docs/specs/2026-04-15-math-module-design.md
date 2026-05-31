# 数学练习模块设计文档

> 日期: 2026-04-15
> 状态: 审查通过
> 平台: 仅 H5（非小程序/APP）
> 位置: 首页第 3 个入口卡片，与碑文、学习平级

## 概述

新增独立的"数学练习"模块，对齐人教版一年级下册课纲，提供在线练习、打印出题、历史记录三个功能。纯前端实现，不新增云函数，记录存 localStorage。

现有口算模块（`pages/study/mental-math.vue`）保留不动，两者独立互不影响。

## 课纲范围（人教版一年级下册）

可出计算题的单元：
- 第 2 单元：20 以内退位减法
- 第 4 单元：100 以内数的认识（比大小）
- 第 6 单元：100 以内加减法（两位数±整十数、两位数±一位数）

## 页面结构

```
首页 index/index.vue — 3 卡片（碑文 / 学习 / 数学）
  └─ math/index.vue — 数学首页（3 入口卡片）
       ├─ math/online.vue — 在线练习
       │    阶段 1: 设置（难度 / 题量 / 题型 / 计时）
       │    阶段 2: 答题（滚动列表）
       │    阶段 3: 结果（正确率 + 错题回顾）
       ├─ math/print.vue — 打印出题
       │    阶段 1: 设置（仅难度）
       │    阶段 2: A4 预览 + 打印按钮
       └─ math/history.vue — 历史记录
            tab 切换: 在线 / 打印
            点击展开详情（不跳页）
            在线: 查看对错明细
            打印: 查看正确答案（核对用）
```

### 路由（pages.json 新增）

```json
{
  "path": "pages/math/index",
  "style": { "navigationStyle": "custom", "navigationBarTitleText": "数学练习" }
},
{
  "path": "pages/math/online",
  "style": { "navigationStyle": "custom", "navigationBarTitleText": "在线练习" }
},
{
  "path": "pages/math/print",
  "style": { "navigationStyle": "custom", "navigationBarTitleText": "打印出题" }
},
{
  "path": "pages/math/history",
  "style": { "navigationStyle": "custom", "navigationBarTitleText": "历史记录" }
}
```

## 功能详细设计

### 1. 在线练习（math/online.vue）

**设置阶段：**

| 设置项 | 选项 | 默认值 |
|--------|------|--------|
| 难度 | Lv.1 20以内加减 / Lv.2 100以内加减整十 / Lv.3 100以内加减一位数 / 混合 | Lv.1 |
| 题量 | 自定义输入（建议 20/50/100） | 100 |
| 题型 | 加法 / 减法 / 比大小 / 填空 / 连加连减 / 混合 | 混合 |
| 计时 | 开启/关闭 | 开启 |

**答题阶段：**
- 滚动列表，每行一题，输入框填答案
- 顶部栏：返回按钮、计时器（可选）、进度（已答/总题数）
- 比大小题：显示两个数，选择 ＞ ＜ ＝
- 填空题：显示算式含 __，填入缺失的数
- 底部交卷按钮

**结果阶段：**
- 正确数 / 总题数、正确率、用时
- 错题回顾列表：显示算式、正确答案、用户答案（红色标记错误）
- 操作：再来一次 / 回到首页
- 自动存记录到 localStorage

### 2. 打印出题（math/print.vue）

**设置阶段：**
- 仅选择难度（Lv.1 / Lv.2 / Lv.3 / 混合）
- 固定 100 题，纯计算题（加减法、连加连减），不含比大小和填空
- 无计时、无题型筛选

**预览阶段：**
- A4 竖版排版预览
- 页头：居中标题"数学练习" + 一行三栏（姓名___  班级___  分数___）
- 100 题排 4 列 x 25 行
- 每题格式：`序号. 算式 = ____`
- 打印按钮调用 `window.print()`
- 打印时自动存一条记录到 localStorage（含正确答���，不含用户答案）
- **导出答案图片**按钮：生成 A4 排版的答案卡（题目 + 红色答案），用 html2canvas 截图保存为 PNG。历史记录只保留 50 条，导出图片可永久保存答案
- 答案卡排版：同试卷 4 列 x 25 行，页头"数学练习 — 答案"，答案用红色（#E53935���显示

**打印 CSS：**
```css
@media print {
  /* 隐藏页面 UI（导航栏、按钮等），只显示 A4 内容 */
  /* A4: 210mm x 297mm */
  /* 页边距、字号、行高适配打印 */
}
```

### 3. 历史记录（math/history.vue）

**列表页：**
- 顶部 tab：全部 / 在线 / 打印
- 每条记录卡片显示：
  - 类型标签（在线🟢 / 打印🖨️）
  - 难度、题量
  - 在线：正确率、用时
  - 打印：无成绩
  - 时间
- 点击展开/收起详情

**展开详情：**
- 在线记录：逐题显示算���、正确答案（红色 #E53935 醒目显示）、用户答案，错题整行红色高亮
- 打印记录：逐题显示算式和正确答案（红色 #E53935 醒目显示，供核对批改）

## 题目生成引擎

> 独立文件 `utils/math/questionEngine.js`，不复用也不修改现有 `utils/study/mathGen.js`。

### 难度配置

```javascript
const LEVEL_CONFIG = {
  1: { name: '20以内加减', max: 20, ops: ['+', '-'] },
  2: { name: '100以内±整十', max: 100, step: 10, ops: ['+', '-'] },
  3: { name: '100以内±一位数', max: 100, ops: ['+', '-'] },
  mix: { name: '混合', levels: [1, 2, 3] }
}
```

### 题型生成规则

| 题型 | 格式 | 规则 |
|------|------|------|
| 加法 | a + b = __ | a + b ≤ max |
| 减法 | a - b = __ | a ≥ b（结果不为负） |
| 比大小 | a ○ b | 生成两个不等的数，答案为 ＞ 或 ＜（不出相等的情况，选项只有两个按钮） |
| 填空 | a + __ = c 或 __ - b = c | 缺失数为正整数 |
| 连加连减 | a + b + c = 或 a - b - c = | 中间结果和最终结果均不为负，总和不超 max |

### 防重复

同一轮练习内对算式去重（Set 检查），重复则重新生成，最多重试 10 次。

## 数据存储

### 存储 API

使用 `uni.getStorageSync` / `uni.setStorageSync`（UniApp 跨平台抽象），写入时 try/catch 防存储满异常，失败 toast 提示。

### localStorage key

```
math_history_{username}
```

与现有命名规范一致（如 `kids_learn_data_{username}`）。

### 数据结构

```javascript
// math_history_{username} -> JSON 数组
[{
  id: "1713168000000_a1b2",     // 时间戳_4位随机
  type: "online",                // "online" | "print"
  level: 1,                      // 难度 1/2/3/"mix"
  questionType: "mix",           // 题型（仅在线）
  total: 100,                    // 题量
  correct: 85,                   // 正确数（仅在线）
  elapsed: 480,                  // 用时秒（仅在线）
  questions: [
    // 在线
    { expr: "15 - 8", answer: "7", userAnswer: "6", isCorrect: false },
    { expr: "12 + 5", answer: "17", userAnswer: "17", isCorrect: true },
    // 比大小
    { expr: "45 ○ 38", answer: "＞", userAnswer: "＜", isCorrect: false },
    // 填空
    { expr: "8 + __ = 15", answer: "7", userAnswer: "7", isCorrect: true },
    // 打印（无 userAnswer / isCorrect）
    { expr: "45 + 30", answer: "75" }
  ],
  createdAt: "2026-04-15T10:00:00.000Z"
}]
```

### 存储上限

保留最近 50 条记录，超出时删除最早的。避免 localStorage 膨胀。

## 首页改动

`pages/index/index.vue` 新增第 3 张卡片：

```html
<view class="card card-math" @click="goTo('/pages/math/index')">
  <text class="card-icon">🔢</text>
  <text class="card-title">数学练习</text>
  <text class="card-desc">在线练习、打印出题</text>
</view>
```

配色参考：蓝色系（如 #42A5F5），与碑文棕、学习绿形成区分。

## 暗色模式

复用 `utils/common/theme.js`，新页面中的颜色使用 CSS 变量 + `.dark-mode` 覆盖，和学习模块一致。数学首页也加浮动暗色切换按钮。

## 不做的事

- 不新增云函数
- 不碰现有口算模块
- 不做乘除法（超出一年级下册课纲）
- 不做拍照批改
- 不做成绩云端同步
- 打印记录不录入成绩
- 不与现有错题本/练习日志系统集成（数学模块完全独立存储）
- 混合难度时三个等级均匀分配（各约 1/3）
- 比大小选项只有 ＞ ＜ 两个按钮（不出相等情况）
- `window.print()` 仅 H5 可用，本项目仅部署 H5，无需兼容小程序/APP
