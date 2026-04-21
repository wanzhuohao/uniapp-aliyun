# 云工具箱（uniapp-aliyun）开发进度

> 项目路径: `D:\code\uniapp-aliyun`
> 技术栈: UniApp Vue3 + Composition API + uniCloud-aliyun
> 最后更新: 2026-04-21
> 状态: **开发中**

## 2026-04-21 英语启蒙模块 MVP 上线

一年级英语启蒙模块首版，纯前端 + TTS + emoji。

### 新增
- **字母认读**（`pages/english/letters.vue`）：26 字母大小写 + phonics 发音 + 例词，网格选择 + 大字展示 + 自动朗读
- **单词练习**（`pages/english/words.vue` + `components/english/WordQuestion.vue`）：
  - 主题：动物 15 / 颜色 8 / 数字 10 / 水果 10 = 43 词
  - 题型：看图选词 + 听词选图（多选一，4 个选项）
  - 每轮 10 题，答错进错题本
- **错题本**（`pages/english/mistakes.vue` + `mistakes-practice.vue`）：复用 Leitner 5 级算法，独立 key `english_mistakes`
- **引导页**（`pages/english/guide.vue`）
- 总首页加"英语启蒚"入口卡片（青绿色）

### 技术细节
- `utils/common/speech.js` 扩展 `speakEn(text)`，`lang: 'en-US'`，`rate: 0.75`
- 图片纯 emoji，无真人音频、无图片资源
- 题库：`static/data/english/letters.json` + `words.json`
- 工具层：`utils/english/{questionLoader, mistakes, practiceLog, themeConfig, questionHelper}.js`
- 路由已在 `pages.json` 注册 7 个新页面

### 后续可扩展（未做）
- 自然拼读 phonics（CVC 词拼读）
- 句型练习（Hello / Thank you 等）
- 儿歌（需要音频资源）
- 更多主题（身体、家庭、学校、食物）

## 2026-04-21 英文 TTS 屏蔽男声

- **现象**：手机端（电脑正常）英文单词会出现两种声音，一种是有道女声、一种是男声
- **根因**：`speakEn` 切换单词时 `enAudio.src = ''` 会触发旧 Audio 的 `onerror`，误把 `SpeechSynthesis` 回退启动，手机系统默认英文 voice 多为男声
- **方案**：`utils/common/speech.js` 直接去掉 SpeechSynthesis 回退，`speakEn` 只走有道 mp3（type=2 美式女声），mp3 失败静音
- 另外切换 Audio 时先清 `onended/onerror` 再 `removeAttribute('src') + load()`，用 `currentAudio` 闭包防止旧回调污染新请求的 speaking 状态
- 有道 `type` 参数只决定口音（1 英式 / 2 美式），不影响男女声——男女声由服务端按词固定，切不掉

## 项目来源

从 `D:\code\uniapp`（支付宝云）提取数学和语文模块，独立部署到阿里云。两个项目独立维护，后续新功能在本项目开发。

## 2026-04-20 代码审查清理（对照 CLAUDE.md 约定）

三次独立 commit：

| Commit | 内容 | 净变化 |
|---|---|---|
| `d3007b2` | 删 `utils/math/mathStorage.js` 的 `migrateData` + `DATA_VERSION_KEY`/`CURRENT_VERSION` 常量 + `App.vue` 相关 import/调用 | -21 行 |
| `f795470` | 删 `utils/chinese/mistakes.js` 的 `effectiveBox` / `effectiveNextReviewAt` fallback；顺带清 `stroke` 死分支、`strokeCount` 冗余字段、`getUnmasteredList` 死代码；同步更新 `pages/chinese/mistakes.vue` | -26 行 |
| `aa511a7` | 删 4 个零调用导出：`getAllQuestions` / `generateStrokeDistractors` / `resetAll` / `getHistoryByType` | -55 行 |

**遵守的约定**：
- "不做数据兼容"：schema 变更清缓存即可，不要迁移函数
- "不做无用防御"：不加 `effectiveXxx` 这种兜底读字段函数，直接 `r.box` / `r.nextReviewAt`

**升级影响**：使用过 v1 旧百数表格式的 localStorage 不会再自动清理，家人设备上需手动清一次缓存（按约定"清缓存是可接受的代价"）。

## 2026-04-20 数学两处体验优化

### 打印页手机端显示
- **问题**：A4 试卷固定 210mm 宽，手机预览溢出 / 被压缩失真，且原先"预览 DOM + 打印时 html2canvas"是两次不同内容渲染
- **方案**：B 方案，CSS 缩放而非预生成图片
  - `pages/math/print.vue` 把 `#printArea` 包进 `.a4-wrapper` 容器
  - 监听 `window.resize`，按 `innerWidth / 794px` 算 scale，窄屏 transform: scale 等比缩小
  - 容器用实际显示尺寸（`SHEET_WIDTH_PX * scale`）避免 layout 留白
  - `html2canvas` 加 `onclone` 把克隆节点的 transform 清掉，打印图保持 210mm 原始尺寸
- 打印流程没变（桌面开新窗口打印 / 手机下载图）

### 三角自由填题 6 数字不重复 + 升序显示
- `utils/math/questionEngine.js` → `genTriangleFree`
- 原 numbers 池用 `shuffleArr`，且 6 个位置可能出现重复值
- 改：加 `new Set(all).size !== 6` 校验，不满足就 continue 重抽；attempts 从 30 提到 100
- numbers 改 `sort((x,y)=>x-y)` 升序展示
- fallback 的数字池同步改成 `[1,2,3,5,6,7]`

## 2026-04-17 补齐 seed 历史缺字段

- 册 / 支 / 电 / 衣 的 pinyin 条目补 `char_distractors`，stroke 条目补 `strokes` 数组
- 新增"入"的 stroke 条目（原来只有 pinyin）
- 新增工具 `tools/fix-incomplete.mjs`，幂等；以后再发现缺字段在里面加 patch 重跑
- 题库最终 400 条，所有 pinyin / stroke 条目字段完整

## 2026-04-17 三页面出题策略统一

- **学习**（`learn.vue`）：始终按课文顺序全量出题（原来随机抽 10）
- **拼音 / 汉字**：单课按顺序全量出题；多课 `sampleWithout(source, 10)` + `shuffle`
- 理由：单课练习要把该课字吃透，多课混合练时题量可控

## 2026-04-17 移除"未分类"分类

- 删除 `questions.json` 中 `unit=2-0-0` 的 38 条条目（25 个字）
- `unitConfig.js` 去掉 `2-0` 单元
- 新增可复用工具 `tools/remove-unit.mjs`（参数化，按 unit 清理）
- 题库最终 399 条

## 2026-04-17 语文题库补齐 1~8 单元 (v1.1)

- 按教材截图整理 1-3 / 7-8 单元的「单元-课-字」归属（4-6 单元原已归好）
- 写一次性迁移脚本 `tools/assign-units.mjs`（参数化可复用）：
  - 237 条从 `2-0-0` 迁到正确 unit
  - 删除 seed 原始数据的错字 `已(yǐ)` 2 条，新增正确的 `己(jǐ)`（2-3-4 "自己"）
  - 新增漏收的 7 个字：苗(2-1-3) / 党(2-2-1) / 告(2-2-3) / 己(2-3-4) / 丁(2-3-0) / 着(2-7-17) / 交(2-8-0)，每字生成 pinyin + stroke 两份条目
- `utils/chinese/unitConfig.js` 扩展到 8 个单元 + "未分类" 兜底
- `pages/chinese/guide.vue` 数据说明 + 更新日志同步
- 最终条数 437（相比 v1.0 的 425：删 2 + 加 14）；2-0-0 剩 38 条（19 字未整理）
- 已知数据缺口：13 个字只有 pinyin 没有 stroke 条目（含"入"等），笔顺题出不到，不影响拼音题

## 2026-04-17 语文 / 数学一致性三项小整理

- **答题中退出确认**：`PracticeBar.goBack()` 改造，`total > 0` 时弹 `uni.showModal` 确认（与数学 online.vue 的退出确认对齐）
- **错题本命名统一**：语文侧改名跟齐数学
  - `utils/chinese/wrongBook.js` → `utils/chinese/mistakes.js`
  - `pages/chinese/wrong-book.vue` → `pages/chinese/mistakes.vue`
  - `pages/chinese/wrong-book-practice.vue` → `pages/chinese/mistakes-practice.vue`
  - localStorage key `chinese_wrong_records` → `chinese_mistakes`（不兼容旧数据）
  - 所有引用、`pages.json` 路由、首页卡片 class 同步更新
- **StarBar → PracticeBar**：语文星星功能去掉后组件名已不匹配内容，改名 `components/chinese/PracticeBar.vue`，3 处 import 跟改，内部 CSS class `star-bar → practice-bar`

## 2026-04-17 新增特殊题型 / 三角自由填 (v1.1)

- 在线练习设置页「题型」区块下新增「特殊题型」区块，与普通题型互斥单选
- 新增 `triangle-free` 题型（`questionEngine.js: genTriangleFree`）：
  - 生成 6 个合法数字（A/B/C/AB/BC/AC），target 已确定
  - expr 里存 `{ target, vals, numbers, shown: [], hidden: [...6] }`，`numbers` 为打乱的数字池
  - answer 字段留空，交卷时动态判题
- 抽出 `checkAnswer(q)` 统一判题入口；`triangle-free` 校验"数字池用尽 + 三边之和都等于 target"
- `online.vue` correctCount / wrongList / doSubmit 全部切换到 `checkAnswer`
- 答题 UI 复用三角布局，顶部加「可选数字：…」提示
- 错题回看展示推荐答案（生成时的 vals）+ 数字池 + "答案不唯一"说明
- 更新日志版本号去掉第 3 位（v1.0.0 → v1.0）
- 打印模块不加入新题型

## 2026-04-17 两处微调

- **数学三角形填数**：`genTriangle` validShown 加回 `['AB', 'BC', 'AC']`（全中点），恢复 3 个已知数都在边中点、顶点全空的出题形式
- **语文去掉星星**：`stateStore.js` 删 totalStars 相关；StarBar 星星位置改为 "current/total" 进度文字；pinyin/hanzi/learn/wrong-book-practice 和 result 页、guide 页的星星 UI 和 earned 参数全部移除

## 2026-04-17 语文模块迁移（支付宝云 → 纯前端）

从 `D:\code\uniapp` 的 `pages/study/` 迁移到本项目 `pages/chinese/`，全部去云化。

### 改动范围

- **题库**：`seed-questions/index.js` 抽出 425 条题目 → `static/data/questions.json`（pinyin 219 条 + stroke 206 条）
  - 抽取脚本：`tools/extract-questions.mjs`（可复用，参数化 input/output）
  - 稳定 _id 规则：`${type}_${char}_${unit}`
- **工具层**（`utils/chinese/`）：
  - `questionLoader.js` — 静态 JSON 过滤，替代原云数据库查询 + 24h 缓存
  - `wrongBook.js` — localStorage（key `chinese_wrong_records`）版 Leitner 5 级算法
  - `practiceLog.js` — localStorage（key `chinese_practice_logs`）版练习日志，上限 1000 条
  - `stateStore.js` — localStorage（key `chinese_state`）星星 + currentUnit，替代原 Pinia + user_stats
  - `unitConfig.js / questionHelper.js` — 原样搬
- **组件**（`components/chinese/`）：StarBar / QuestionCard / HanziQuestion / StrokeAnim / TrendChart
- **通用工具**（`utils/common/`）：新增 speech.js / theme.js（App.vue 加 applyTheme）
- **页面**（`pages/chinese/`）：index / learn / pinyin / hanzi / result / wrong-book / wrong-book-practice / guide
- **总首页** `pages/index/index.vue` 追加"语文练习"卡片
- **路由** `pages.json` 注册 8 个 chinese 路由
- **依赖** `package.json` 加 `hanzi-writer@^3.7.3`
- **样式** App.vue 补充 --color-star / --color-stroke / --radius-card 变量
- **PageHeader** 增加 `fallback` prop，默认 `/pages/index/index`，便于跨模块复用

### 去除的功能

- 多用户切换（原 UserSwitcher、useAuth、username 参数全部去掉，单设备单用户）
- 数据维护页（原 data-admin.vue 依赖云数据库 CRUD，不再迁移）

### 已知差异

- 学习中点顶部返回键直接退出到 chinese/index，不再先回到筛选页（原 learn.vue 有两级返回）
- 清除浏览器数据会丢失所有错题本和星星，无云备份

## 2026-04-15 初始化 + 数学练习模块

### 已完成功能

**在线练习（online.vue）**
- 难度多选：20以内 / ±整十 / ±一位数
- 题型多选：加法 / 减法 / 比大小 / 填空 / 连加连减 / 填运算符 / 百数表
- 题量：预设 20/50/100 + 自定义（最大200）
- 计时：可选 5/8/10/15/20 分钟，到时弹窗提醒
- 比大小：支持 ＞＝＜ 三选，两边可出算式（如 3+5 ○ 2+7）
- 填空题：输入框嵌入算式中 `__` 的位置
- 填运算符：单边 `a ○ b = c`（点+/-按钮）+ 双边 `a ○ b = c ○ d`（40%概率，两组按钮）
- 百数表：不规则形状（十字/L/T/Z形等随机生成5~8格），只给中间数，其余全填，规律：左右±1，上下±10
- 结果页：正确率 + 错题回顾（百数表显示mini网格，双边运算符正确展示）
- 记录自动存 localStorage（含每题type字段，便于错题本渲染）

**打印出题（print.vue）**
- 难度选择 + 是否含连加减开关（默认关）
- A4 预览（4列，含标题+姓名/班级/分数栏）
- 打印：html2canvas 转图片 → 新窗口打印（解决 CSS 打印 2 页问题）
- 导出答案图片：红色答案，自适应内容高度，无外框
- 记录自动存 localStorage

**错题本（mistakes.vue）** — 新增
- 从所有在线练习记录中提取错题
- 按练习次数分组，显示日期+难度+正确率
- 百数表错题渲染为mini网格（蓝色=已知，橙色=答案）
- 双边运算符错题正确展示
- 普通题显示完整算式+正确答案+用户错误答案

**历史记录（history.vue）** — 首页入口已隐藏，页面保留
- Tab：全部 / 在线 / 打印
- 展开详情：4列 grid 布局

**基础设施**
- PageHeader 公共头部组件（统一蓝色顶栏）
- questionEngine.js：8种题型生成器（含fillOp2/hundredChart不规则形状），支持数组形式 level/questionType
- mathStorage.js：固定 key `math_history`，50条上限
- toast.js：uni.showToast 封装
- 总首页入口（pages/index/index.vue）

## 2026-04-17 图形填数难度调整

- 三角形填数剔除"全给中点"的出题模式（`['AB', 'BC', 'AC']`），避免三条边都只剩 1 个数、需要列方程组的情况
- 保证至少一条边"已知 2 个数"，一年级学生能直接找到突破口
- 方形 9 种出题模式均已满足该条件，不改
- 影响文件：`utils/math/questionEngine.js` `genTriangle`

## 2026-04-16 UI间距优化

- 在线练习：缩小题目行内水平间距（去掉 `.q-expr` 的 min-width: 220rpx、缩小序号列/输入框/行内 gap）
- 比大小按钮：尺寸和间距缩小，与填运算符按钮风格统一
- 图形填数：整体靠左对齐（`.shape-wrap` align-items: flex-start），内部保持居中结构
- 三角形布局：修正第2行 gap（60rpx → 16rpx），使腰成直线
- 方形布局：`.shape-circle` 加 box-sizing: border-box，中间行空位对齐

### 待做

- [x] 图形填数 — 三角形(6圈)+方形(8圈)随机出现，每边之和相等，给2~3个数填其余
- [ ] **发布微信小程序** — 需注册AppID、配置manifest.json mp-weixin、处理兼容性（html2canvas/window.print不可用，打印功能需改用canvas方案或暂时去掉）
- [x] **语文按单元/课程出题** — uniapp（支付宝云）项目的学习模块已完成

## 技术决策

1. **纯前端存储** — localStorage，不用云函数，固定 key 不依赖用户名
2. **打印用图片** — window.print() 在 UniApp H5 排版不可控，改为 html2canvas 转图片再打印
3. **独立于 uniapp 项目** — 数学模块独立部署，不暴露碑文/学习等功能
4. **Vue3 + script setup** — manifest.json 声明 vueVersion: 3
5. **百数表不受难度限制** — 固定1~100范围，因为考的是找规律能力而非计算

## 关键路径

- 设计文档：`docs/specs/2026-04-15-math-module-design.md`
- 实施计划：`docs/plans/2026-04-15-math-module.md`
