# uniapp-aliyun — 学习小天地

## 项目概述

阿里云 UniApp H5 工具平台，从 `D:\code\uniapp`（支付宝云）独立出来。包含数学练习、语文练习、英语启蒙三大模块。

## 技术栈

- **框架**: UniApp Vue3 + Composition API (`<script setup>`)
- **云**: uniCloud-aliyun（暂未使用云函数，纯前端 localStorage）
- **依赖**: html2canvas（数学打印）、hanzi-writer（语文笔顺动画）、SpeechSynthesis（中/英 TTS）
- **构建**: HBuilderX

## 目录结构

```
components/PageHeader.vue   — 公共头部组件（支持 fallback prop 兜底跳转）
components/chinese/         — 语文模块专用组件
  PracticeBar / QuestionCard / HanziQuestion / StrokeAnim / TrendChart

pages/index/index.vue       — 总首页（卡片入口：数学 + 语文）

pages/math/                 — 数学练习模块
  index / online / print / history / mistakes / mistakes-practice / guide

pages/chinese/              — 语文练习模块
  index / learn / pinyin / hanzi / result / mistakes / mistakes-practice / guide

pages/english/              — 英语启蒙模块
  index / letters / words / result / mistakes / mistakes-practice / guide

utils/math/                 — 数学工具
  questionEngine.js / mathStorage.js

utils/chinese/              — 语文工具（全纯前端 localStorage）
  questionLoader.js         — 读 static/data/questions.json（按 type+unit 过滤）
  mistakes.js               — Leitner 5 级错题算法，key: chinese_mistakes
  practiceLog.js            — 练习日志，key: chinese_practice_logs
  stateStore.js             — 当前单元，key: chinese_state
  unitConfig.js / questionHelper.js

utils/english/              — 英语工具（全纯前端 localStorage）
  questionLoader.js         — 读 static/data/english/*.json
  mistakes.js               — Leitner 5 级错题算法，key: english_mistakes
  practiceLog.js            — 练习日志，key: english_practice_logs
  themeConfig.js / questionHelper.js

utils/common/
  toast.js / speech.js (speak 中 / speakEn 英) / theme.js

static/data/
  questions.json            — 语文题库 400 条（pinyin 200 + stroke 200）
  pinyin.json / strokes.json — 字典数据
  english/letters.json      — 26 字母 + phonics + 例词
  english/words.json        — 英语单词（4 主题 43 词）

tools/
  extract-questions.mjs     — 从 uniapp 的 seed-questions.js 抽题库 JSON（参数化可复用）
```

## 构建命令

```bash
npm install              # 安装依赖
# HBuilderX → 运行到浏览器 / 发行到前端网页托管
```

## 开发规范

- 所有页面用 PageHeader 组件做头部（语文答题页用 PracticeBar 显示"返回键 + 进度点 + 当前题/总数"；答题中点返回会弹确认）
- 存储用 `uni.getStorageSync/setStorageSync`，固定 key（不依赖用户名）
- 打印用 html2canvas 转图片方式（不用 window.print 直接打印 DOM）
- 新增页面记得在 pages.json 加路由（需要 `navigationStyle: custom`）
- 语文题库的稳定 id：`${type}_${char}_${unit}`，questionLoader 加载时自动生成 `_id` 字段
- 题库数据格式变更时，重跑 `node tools/extract-questions.mjs` 重新抽取 JSON

## 项目约定（本项目专属偏好）

- **更新日志简洁**：用户可见的 `guide.vue` 更新日志只写大标题，一行一条（如"新增特殊题型"、"题库覆盖 1~8 全单元"）。实现细节、文件路径、数据量等写到 `docs/progress.md`，不写进 guide。
- **不做数据兼容**：这是家用小项目、单用户、本地存储。schema / 枚举值 / localStorage key 变更时，直接改，不加迁移函数、不加 fallback 回退、不搬迁老 key。清缓存是可接受的代价。（op/ocp 等生产项目不适用）
- **不做无用防御**：数据缺字段时优先补齐源数据（`tools/fix-incomplete.mjs`），而不是在前端加兼容判断。

## 测试注意事项

### Playwright 自动化测试 uniCloud 站点有防刷风险

headless Chromium 的 bot 特征（`navigator.webdriver`、UA、无鼠标轨迹）可能触发 uniCloud 防刷限流，即使 QPS 远低于上限也会返回 `[DCloud-clientDB]: 防刷限流异常-触发禁止访问规则`，IP 被临时封禁 360 秒。

**使用前先告知用户风险**。启用时：
- 操作间隔放到 2~3 秒
- 多用 `browser_evaluate` 读 DOM，减少频繁 snapshot
- 触发封禁时建议用户：换 4G 网络立即恢复 / 等 6 分钟 / 到 uniCloud 控制台直接看数据表证明数据未丢

（2026-04-10 uniapp 父项目发布验证时踩过坑）

## 进度文档

`docs/progress.md`
