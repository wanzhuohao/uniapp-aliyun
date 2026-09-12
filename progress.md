# 云工具箱（uniapp-aliyun）开发进度

> 项目路径: `C:\claude code\uniapp-aliyun`
> 技术栈: UniApp Vue3 + Composition API + uniCloud-aliyun
> 最后更新: 2026-09-12
> 状态: **开发中**

## 待办

## 2026-09-12 收工：数学历史页区分专注/在线/打印类型（P1 修复）

- history.vue：新增专注 tab、badge-focus、isJudged 判定（focus 有 isCorrect 对错）；历史类型独立处理 online/focus/print，打印保持无对错
- 对应飞书文档 P1「专注记录被错误显示为打印练习」
- 验证：direct-capabilities / global-grade 16/16 / storage / speech 等测试全通过

- HBuilderX 编译验证（附件接入后未编译过）
- P1 备份恢复：浏览器级下载事件确认 + 隔离配置导出-校验-导入-回滚-比对全链路验收
- P1 语音真机兼容：Chrome/Android/iOS/微信浏览器实测音频可听、自动播放限制、连续点击抢占、离页停止
- P1 发布记录：每次发行 H5 同步登记公网地址/发布时间/源码基线/HBuilderX版本/主资源名/托管环境

## 2026-09-12 P1 代码修复（语音离页停止 + 备份恢复成功提示 + 发布记录文件）

- speech.js：新增 stopAllSpeech、visibilitychange/pagehide 全局监听（页面切后台自动停止所有语音）、zhVoiceAvailable 无中文语音包时静默跳过，避免部分系统用英文语音读中文
- data-center.vue：confirmRestore/retryRecovery/confirmSafeClear 成功后显示 toast + location.reload()，之前成功路径无反馈
- 新增 docs/release-notes.md：发布元信息模板 + 首次公网冒烟测试记录
- 飞书文档更新备份/语音两个 P1 章节的代码实现状态
- 验证：12/12 测试套件全通过

## 2026-09-11 P1 验收状态同步（公网冒烟测试与剩余验收项）

- 飞书文档 rev 21 更新三个 P1 章节：备份/恢复/下载、语音与真机兼容、发布记录
- P1 备份：dataBackup.js 事务流程完整（owner/generation/fence/transaction/committed/rollback），Node 测试 13/13 通过；浏览器级下载链路待验收
- P1 语音：speak/speakEn 已实现（有道 MP3 + SpeechSynthesis），真机兼容待验收
- P1 发布记录：首次公网冒烟测试 2026-09-11，39 个页面路由均能渲染；发布元信息清单已写入飞书文档
- 验证：12/12 测试套件全通过

## 2026-09-11 接入附件源码（引入全局学习会话门禁+年级上下文+综合卷/数据中心整套架构）

- 新增 29 个文件：pages/learning/{dashboard,paper,data-center}.vue + components/learning/{PaperQuestion,GradeBadge}.vue + utils/common/ 10 个新模块（learningSession/dataBackup/storageRegistry/gradeContext/gradeMigration/paperEngine/paperSources/safeStorage/diagnostics/learningStats）+ tools/ 9 个测试脚本
- 低风险合并 49 个文件：submissionFrozen 输入冻结、随机源抽离、grade 参数兼容等小副改动
- 主架构引入 3 个文件：main.js（installLearningSessionGate）+ mathStorage.js（按年级分桶+合并迁移+buildOnlineSubmissionTarget 等 3 新导出）+ pages/index/index.vue（年级选择面板+learning 三入口）
- 题库数据零改动：questions.json 仍 400 条、twenty-four.json 仍 1362 条
- 保留：CLAUDE.md/progress.md/.gitignore/JQL查询.jql；附件 AGENTS.md 与 progress.md 存档到 docs/temp/
- 验证：leitner 3/3、chinese-lifecycle、sudoku-lifecycle、speech、direct-capabilities 24/24、global-grade 16/16、learning-session、check-storage-registry 全通过

## 2026-05-31 全量代码审查修复

- practiceLog.js: getRecentLogs 除零修复 — day.total === 0 时返回 null 而非 NaN
- questionEngine.js: genTriangle fallback 数据修正 — shown 从 2 项改为 3 项
- questionEngine.js: genSquare fallback 数据修正 — shown 从 3 项改为 4 项
- questionHelper.js: buildStrokeCountOptions 干扰项不足修复 — correct=1/2 时扩展候选池
- order-update 云函数（uniapp）: id 判断增加 null 覆盖

## 2026-05-31 代码审查 Bug 修复

- engine.js: spawnBullet 上限检查移入循环内，粒子上限循环修正，升级队列防止丢失
- engine.js: pushStats 脏检查，数据未变时不触发 Vue 响应式
- plane/index.vue: doSubmit 空指针防护 + 递归 setTimeout 卸载保护
- idiom-chain.vue: onUnmounted 清理 aiTimer
- twenty-four.vue: onUnmounted 清理 shakeTimer
- learn.vue: HanziWriter 实例销毁 + onUnmounted 清理
- QuestionCard.vue: TTS replace 改为全局正则匹配 + emit 字段统一为 isCorrect
- pinyin.vue / mistakes-practice.vue: 解构字段从 correct 改为 isCorrect
- online.vue: JSON.parse 结果缓存到 q._chartData / q._shapeData
- slidingPuzzle.js: shuffle 跟踪 emptyIdx 消除冗余 indexOf
- questionHelper.js: 提取干扰项生成共享函数（hanzi.vue + mistakes-practice.vue）

## 2026-05-31 接收飞机大战迁移

- 从 uniapp（支付宝云）完整迁移到本项目 pages/games/plane/
- 包含 engine.js, index.vue, skills.js, leaderboard.vue, api.js
- CLAUDE.md 目录结构同步更新

## 2026-05-26 成语接龙词库扩充：合并 OCP MongoDB

### 数据扩充

- 词库从 chinese-xinhua 30294 条扩到 **40985 条**（+10691），数据来源：OCP 准上线 MongoDB `auto_ocp_platform_pre.idiom`（39790 条）
- 字段映射：`idiom` → `w`，`alphabet`（带声调空格分隔）→ `p`（stripTone 去声调）
- 按 `w` 去重，现有词条优先保留；跳过 37 条脏数据（1 条非汉字 + 36 条拼音音节数≠字数）

### 工具

- `tools/merge-ocp-idioms.py` — 参数化可复用脚本，支持 `--dry-run` / `--env` / `--collection` / `--output`
- 复用 `D:\code\tools\mongo_query.py` 的 ocp_media env 连接配置
- 后续 OCP mongo 有新增可直接重跑做增量合并（按 w 去重）

### 文档

- 更新 CLAUDE.md：词库条数说明 + 新工具说明

## 2026-05-25 数字华容道新增「提示」功能

### 算法层

- `utils/games/slidingPuzzle.js` 加 `solve(board, size)` 和 `nextHint(board, size)`
- 策略:分块逐行/列锁定 + 行/列末两格三元状态 BFS + 最后 2×2 BFS
  - 普通格子用 BFS 路径推进的 `moveValueTo`(不是贪心列/行优先,避免被 locked 区域切割)
  - 行末/列末两格用 `solveCornerBFS`:state=(空格 pos, v1 pos, v2 pos),状态空间 ≤ N⁶ ≤ 15625,瞬间出最优
    - 替代了脆弱的 corner-trick(总是被 buffer 选择和棋盘切割问题困扰)
  - 最后 2×2 用普通 BFS 求解,N≤2 状态 24 个
- 性能:3×3 avg 6ms / 4×4 avg 32ms / 5×5 avg 143ms(20-8 次随机测试)
- 关键性能修复:BFS queue 用 head pointer 替代 `queue.shift()` (O(n)→O(1))
- 回归测试:`tools/test-sliding-puzzle.mjs` 加 solve 求解器 + nextHint 用例,30 case 全过

### UI 层

- `pages/games/sliding-puzzle.vue`:操作行加「提示」按钮(橙色)
  - 点击调 `nextHint(board, size)`,把下一步该移的格子 idx 存到 `hintIdx`
  - 棋盘 tile 加 `.hint` class:橙色背景 + 1.2s 脉冲动画 + 外发光
  - 用户实际移动 / 重新打乱 / 查看目标 时自动清除高亮
- `pages/games/sliding-puzzle-guide.vue`:通关技巧段加一行「实在卡住点提示」

## 2026-05-22 小游戏新增:迷你数独(阶段 3)

接续华容道,数学小游戏第三款完成。三个数学游戏(24 点 / 华容道 / 数独)全部上线。

### 实现

- **核心算法**:`utils/games/sudoku.js`
  - 4 个难度配置:入门 4×4(2×2 宫)6-8 空 / 简单 6×6(2×3 宫)12-16 空 / 中等 6×6 20-24 空 / 困难 9×9(3×3 宫)35-45 空
  - `generateFullBoard` DFS + 候选数字打乱,生成随机完整解
  - `generatePuzzle` 从满解出发,随机位置挖洞,每次挖后用 `countSolutions(limit=2)` 验证唯一解,失败回滚
  - `findConflicts` 实时校验:行/列/宫扫描,返回当前格的冲突坐标
  - `isComplete` 全部填且无冲突
- **性能**(回归测试实测):
  - 4×4 / 6×6: 各 1ms
  - 9×9 困难: ~4ms
  - 远低于设计文档要求(< 500ms)
- **回归测试**:`tools/test-sudoku.mjs` 31 case 全过
- **存储**:`utils/games/sudokuStorage.js`(累计得分 + 按难度通关数 + 按难度最短用时 PB + 提示次数)
- **页面**:`pages/games/sudoku.vue`
  - 粉色主题(背景 #FCE4EC,主色 #C2185B)
  - 4 个难度 tab + 顶部三个 stat(用时 / 通关数 / 最佳)
  - CSS grid 棋盘,粗线宫格边框用 .box-r / .box-b 类
  - 预填格灰底深色,选中黄底,冲突红字红底
  - 数字键盘按 size 自适应布局(4: pad-4, 6: pad-6, 9: pad-9)+ 清除键
  - 提示按钮:必须先选空格,填入正解后该格变预填不可改
  - 通关弹层 + 破纪录徽标
- **说明页**:`pages/games/sudoku-guide.vue`(玩法 + 4 档难度 + 推理技巧)

### 改动文件

- 新增 5 个:`utils/games/sudoku.js` / `utils/games/sudokuStorage.js` / `pages/games/sudoku.vue` / `pages/games/sudoku-guide.vue` / `tools/test-sudoku.mjs`
- 修改 4 个:`pages/games/index.vue`(数独卡激活)/ `pages.json`(2 个新路由)/ `CLAUDE.md`(目录说明)/ `docs/progress.md`(本条)

### 测试说明

`tools/test-sudoku.mjs` 31/31 通过(满解生成 / 唯一解校验 / 4 个难度挖洞性能 / 冲突检出 / 完成判定)。浏览器验证通过:
- [x] 4 档难度切换正常出题
- [x] 点空格 → 弹键盘 → 填数,响应正常
- [x] 预填格不可点(不能改原题)
- [x] 填入冲突数字 → 红色高亮
- [x] 全填对 → 通关弹层
- [x] 提示按钮填正解后变预填
- [x] PB 持久化 + 破纪录徽标
- [x] 9×9 生成 loading 态短暂可见(< 100ms)

## 2026-05-22 小游戏新增:数字华容道(阶段 2)

接续 24 点,继续在小游戏模块加华容道。

### 实现

- **核心算法**:`utils/games/slidingPuzzle.js`
  - 棋盘用一维数组 + 0 标记空格
  - `shuffle` 从目标状态随机走步打乱(不用逆序数算法,可解性天然保证),加防回头剪枝避免原地打转
  - `canMove` / `move` / `isSolved` / `neighborsOf` 一组短工具函数
- **回归测试**:`tools/test-sliding-puzzle.mjs` 23 case 全过
- **存储**:`utils/games/slidingPuzzleStorage.js` 按难度独立 PB(最少步数 + 最短用时,各自独立比较)
- **页面**:`pages/games/sliding-puzzle.vue`
  - 青色主题(背景 #E0F2F1,主色 #00897B)
  - 3 档难度切换(3×3 入门 / 4×4 经典 / 5×5 挑战),打乱次数 80/200/400
  - 顶部三个 stat:步数 / 用时 / 最佳(显示当前难度 PB)
  - 棋盘用 CSS grid,空格透明嵌入阴影区分
  - 通关弹层显示步数 + 用时,各自独立判定"破纪录"红色徽标
- **说明页**:`pages/games/sliding-puzzle-guide.vue`(玩法 + 三档难度介绍 + 通关技巧)

### 改动文件

- 新增 5 个:`utils/games/slidingPuzzle.js` / `utils/games/slidingPuzzleStorage.js` / `pages/games/sliding-puzzle.vue` / `pages/games/sliding-puzzle-guide.vue` / `tools/test-sliding-puzzle.mjs`
- 修改 4 个:`pages/games/index.vue`(华容道卡激活)/ `pages.json`(2 个新路由)/ `CLAUDE.md`(目录说明)/ `docs/progress.md`(本条)

### 测试说明

`tools/test-sliding-puzzle.mjs` 23/23 通过。浏览器验证通过:
- [x] 3 档难度切换,每次出新打乱棋盘
- [x] 点相邻数字格能交换,非相邻点击无反应
- [x] 步数 / 用时正常累加
- [x] 排到目标态弹通关层
- [x] 步数 / 用时双重 PB 持久化,破纪录显示徽标
- [x] 「查看目标」展示已排好的棋盘
- [x] 「重新打乱」重置计时计步

## 2026-05-22 小游戏新增:24 点(阶段 1)

接续上一轮成语接龙,在小游戏模块加 3 张占位卡(24 点/数字华容道/迷你数独),并完成 24 点首版。

### 24 点

- **题库**:`tools/build-24-puzzles.mjs` 离线穷举 (1..13)^4 多重集 1820 组,扣掉 458 个无解,按解数量分桶 → easy 744 / medium 486 / hard 132,输出 `static/data/games/twenty-four.json` (87KB)
- **核心算法**:`utils/games/twentyFour.js`
  - `Frac` 分数类:gcd 化简 + 加减乘除 + 严格判等(避开 float 精度问题,8/(3-8/3)=24 这类经典题靠它撑住)
  - `findSolutions` DFS 枚举所有二叉树表达式,带交换律剪枝
  - `checkExpression` shunting-yard 转 RPN 求值,校验数字 multiset、括号、运算符
- **回归测试**:`tools/test-24.mjs`(node 直接跑,17 个 case 全过)
- **存储**:`utils/games/twentyFourStorage.js`(累计得分 / 按难度通关数 / 当前&最高连胜 / 提示次数)
- **页面**:`pages/games/twenty-four.vue`
  - 4 张橙色数字卡(用过灰显)+ 表达式条 + 6 个运算符按钮(+ - × ÷ ( ))
  - 添加 token 前做合法性预检(数字不能挨数字、) 必须有未闭合 (、运算符前必须是数字或 ))
  - 通关弹层 + 错误抖动 + 提示后展示参考解
- **说明页**:`pages/games/twenty-four-guide.vue`(玩法 + 难度档位 + 小技巧)

### 小游戏首页

`pages/games/index.vue` 占位区改成 3 张新卡:24 点(橙)/ 华容道(青)/ 数独(粉),后两者点击 toast「即将上线」。

### 改动文件

- 新增 5 个:`utils/games/twentyFour.js` / `utils/games/twentyFourStorage.js` / `pages/games/twenty-four.vue` / `pages/games/twenty-four-guide.vue` / `tools/build-24-puzzles.mjs` / `tools/test-24.mjs` / `static/data/games/twenty-four.json`
- 修改 3 个:`pages/games/index.vue`(3 张占位卡 + 路由表)/ `pages.json`(2 个新路由)/ `CLAUDE.md`(目录说明)

### 测试说明

`tools/test-24.mjs` 已 17/17 通过(Frac 精度、findSolutions 经典题、checkExpression 全角运算符&边界拒绝)。浏览器验证通过:
- [x] 难度切换正常出题
- [x] 数字卡点击拼接到表达式条,用过灰显
- [x] +/-/×/÷/(/) 按预检规则插入
- [x] 退格 / 清空 / 答对弹层 / 答错抖动
- [x] 提示按钮展示参考解
- [x] 连胜、累计得分持久化
- [x] 经典刁钻题 (3,3,8,8) 输入 `8÷(3-8÷3)` 能通过



## 2026-05-21 成语接龙体验优化（同日，第二轮）

提交后的对话感 + 布局修复：
- **页面布局修复**：原 `.page { min-height: 100vh }` 导致内容多时整页滚动、输入框被推出可视区。改成 `height: 100vh + overflow: hidden`，`.chain-list` 加 `min-height: 0`（flex 子项可滚必需），`.input-area / .end-area` 加 `flex-shrink: 0`。现在 chain-list 是唯一可滚区，输入框始终贴底
- **AI 0.5s 延时 + 思考中动画**：玩家提交后立即看到自己的接龙词，AI 等 500ms 再回应；期间 chain-list 底显示带三点跳动动画的"AI" 气泡，做出对话节奏感
- **保持输入框焦点**：`<input :focus="inputFocus" :confirm-hold="true">` + `refocusInput()`（先 false 再 nextTick 设 true），enter 提交 → AI 回应 → 焦点自动回到 input，玩家可连续接龙；进入页面 / restart 时也会自动聚焦
- **关闭滚动动画**：`scroll-with-animation="false"`，提交后瞬间滚到底，比平滑动画更"响应"
- **常见 4 字词语 +142 条**：见上一段；与成语库合并加载

## 2026-05-21 成语接龙体验优化（同日，第一轮）

接前一条用户反馈连续打磨：
- **接龙字高亮**：每个 step 的首字（接上一句，紫底）和末字（下一句要接，橙底）的汉字+拼音都标色，顶部加小图例
- **AI 回答后自动滚到底**：原 `scroll-into-view` 在连续 push 多个 step 时不可靠，改 `:scroll-top="scrollTopVal"` + `nextTick` 递增触发，aiOpen / submit / aiTurn / useHint / giveUp 5 处都加 scrollToBottom
- **新增常见四字词语库 142 条**：`tools/build-common-phrases.mjs` 维护 AABB 叠词（红红火火/快快乐乐）+ 节日祝福（新年快乐/恭喜发财）+ 季节物候 + 学习场景 + 颜色形容 + 称呼词，build-time 与 idioms.json 去重（57 条重复剔除）→ `static/data/games/common-phrases.json`，`loadIdioms` 用 Promise.all 同时拉两份合并到统一索引
- **首页小游戏卡图标改通用 GAME 徽标**：原"成语接龙"四字格子换成紫色渐变背景 + 倾斜 "GAME" 字样，避免后续加新游戏冲突

## 2026-05-21 新增「小游戏」模块 + 成语接龙

首页加第 4 张紫色卡，独立小游戏入口，首版包含成语接龙一款。

### 规则
- AI 先手出 4 字开局成语；玩家用末字接龙
- 同字同音 +2 / 同音不同字 +1 / 同字不同音 +1 / 接不上不结束（提示后可重试）
- 让 AI 接不上 +10，本局结束
- 提示按钮 -5，给出一个可接成语（不自动填）
- 我接不上 → 认输结束
- 本局内同一成语不可复用，每局最高分存 localStorage

### 实现
- 词库：`static/data/games/idioms.json` (1.3MB / 30294 条)，从 chinese-xinhua 抽取
- 加载：`utils/games/idiomChain.js` 用 `dynamic import` 让 Vite 分独立 chunk，不进首屏 bundle
- 评分 / AI 选词 / 提示统一在 `idiomChain.js`；AI 策略：优先同字同音 → 再 union(同字, 同音) → 都无则认输
- 存储：`utils/games/idiomStorage.js`（最高分 + 最近一局）
- 页面：`pages/games/{index,idiom-chain,idiom-chain-guide}.vue` + PageHeader 加 `theme="game"` 紫色
- 工具：`tools/fetch-idioms.mjs` 参数化抽取脚本；`tools/.idiom-raw.json` 加入 .gitignore

### 改动文件
- 新增 7 个：`tools/fetch-idioms.mjs` / `utils/games/{idiomChain,idiomStorage}.js` / `pages/games/{index,idiom-chain,idiom-chain-guide}.vue` / `static/data/games/idioms.json`
- 修改 4 个：`pages/index/index.vue`（加紫色卡）/ `pages.json`（3 个路由）/ `components/PageHeader.vue`（theme 加 game）/ `.gitignore`

### 测试说明
HBuilderX 项目无 CLI 自检，本次代码改动**未在浏览器实测**。需要在 HBuilderX 跑到浏览器后手动验证：
- 首页 → 小游戏卡 → 成语接龙能否进入
- 词库异步加载（首次进游戏页有 loading 提示）
- AI 开局出 4 字成语 + 玩家接龙 +2/+1 分计算正确
- 提示扣 5 分 / AI 认输 +10 / 我认输的 3 个结束路径
- 历史最高分跨刷新保留

## 2026-05-06 英语 words 恢复每轮抽 10 题

4-30 改成全量出题后实际跑下来题量偏多（动物 15 + 颜色 8 + 数字 10 + 水果 10 = 43 词），孩子一轮做完累。改回 `sampleWithout(words, 10)`，保留主题筛选和题型逻辑，词不足 10 时自动出全部。

- `pages/english/words.vue` `startRound`：先 sample 10 词再 build，去掉外层 shuffle（sample 本身乱序）

## 2026-05-06 数学 print 按钮文案对齐 4 字

`pages/math/print.vue` "导出答案图片"（6 字）→ "导出答案"，与"打印试卷/重新生成"对齐。

## 2026-05-06 首页学科卡描述去掉"错题本"

根首页 `pages/index/index.vue` 两张卡的 card-desc：
- 语文："生字 · 拼音 · 汉字 · 错题本" → "生字 · 拼音 · 汉字"
- 数学："在线练习 · 打印出题 · 错题本" → "在线练习 · 打印出题"

（英语原本就是"字母 · 单词 · 启蒙入门"无"错题本"字样，未动；三学科子页内的错题本入口卡是真跳转，不算文案。）

## 2026-05-06 修横向滑动 + 整体 code review 修复

### 横向滑动根因
4 个 `<scroll-view>`（math online setup-scroll/question-list、mistakes wrong-list、history record-list、mistakes-practice question-list）都设了 padding 但缺 `box-sizing: border-box`，375 viewport 下被 padding 撑出 ~17px 横滑。
**修复**：`App.vue` 全局 `uni-scroll-view, scroll-view { box-sizing: border-box }` + `html, body { overflow-x: hidden }` 兜底。Playwright 实测 13 个核心页面 docW=winW=375 无溢出。

### Code review 同步修复（commit `c5ab17d`）
- **M1** `WordQuestion.vue` 自动播音 setTimeout 加 `onUnmounted` 清理 + `bootTimer` 句柄管理（避免快速退出幽灵音）
- **M3** 删 `components/chinese/StrokeAnim.vue` 死代码（全仓无引用），同步 CLAUDE.md 组件清单
- **M4** 删 `utils/english/practiceLog.js#getRecentLogs`（无引用，english 侧无 TrendChart）
- **M5** 删 `utils/common/speech.js#isSpeaking` + 内部 `speaking` 状态变量
- **m2** `pages/english/mistakes-practice.vue` qType 对称：原 `r.qType==='word2img'` 才尊重，`'img2word'` 错题反而 50/50 随机；改为两边都尊重原 qType
- **m4** `pages/math/online.vue` watch 删 `{ deep: true }`（对 Set 冗余）

### 大重构：抽 utils/common（commit `2452485`）
chinese/english 的 `mistakes/practiceLog/stateStore/questionHelper` 高度重复（Leitner 算法/practiceLog 聚合/prefs 读写一字不差），抽成工厂模式：

- 新增：`utils/common/{random, leitner, practiceLog, prefsStore}.js`
- chinese/english 各自的 4 个文件改成 wrapper（API 不变，pages/components 一行 import 都不用改）
- `getWrongStats` 因学科特异字段（pinyinCount vs letterCount）保留各学科 wrapper
- 净减约 120 行重复代码

**Playwright 实测 12 项接口**：去重 / 升降 box / mastered / stats / due / recordCorrect 链条 / chinese 字段 / prefs 跨学科隔离 / currentUnit / practiceLog accuracy / random shuffle 全过。

### PracticeBar 行为收窄（commit `2452485` + `84879aa`）
- PracticeBar 删 `doBack`（uni.navigateBack 死分支），`goBack` 永远 `emit('cancel')`，单一职责
- `pages/chinese/mistakes-practice.vue` 补 `@cancel="exitMode"` 监听（之前是潜在 bug：做题中点返回弹确认后无任何动作）
- **回归修复**（`84879aa`）：pinyin/hanzi 过滤页（未做题）原本 PracticeBar 也渲染，total=0 走 emit cancel 但父页 onCancel 把已经是 false 的 started 再设 false，看起来"返回没用"。改为：过滤页用 PageHeader（自带 navigateBack），做题中才用 PracticeBar，与英语 words.vue 对齐。

### 5-06 留下的踩坑（已沉淀）
- 全局 CSS reset 的 box-sizing 范围：只针对 `uni-scroll-view, scroll-view` 加，避免影响其他元素布局；body 加 `overflow-x: hidden` 是兜底而不是修因。
- `total === 0` 的 PracticeBar 渲染是没意义的——组件单一职责"做题中显示进度+返回"，过滤页/空状态应该用 PageHeader。下次新增带筛选+做题流程的页面遵循这条。
- 全局 `getCurrentPages().length > 1` 判断 `navigateBack` vs `reLaunch` 的逻辑可以集中在 PageHeader（已经有），不要在每个组件复制。

## 待办（合并去重）
（详见文末"待办（TODO）"区，不重复）

## 2026-04-30 三模块 选项区交互统一改造

需求驱动：之前 10 道题一轮太碎、再点全选会变只剩首项不直觉、关闭页面后选择丢失、做题中点返回直接退出整页过陡。

### 改动

- **全选 ↔ 全不选 toggle**（按钮文案随状态切换）
  - 数学 `pages/math/online.vue` 题型区
  - 语文 `pages/chinese/{learn,pinyin,hanzi}.vue` 课程区
  - 英语 `pages/english/words.vue` 主题区
  - 题型保持单选（语文/英语 filterType 字符串），不动
- **全部出题（去 sample 限 10）**
  - 语文 pinyin/hanzi：全量按原顺序，不抽样不打乱（选项内 shuffle 保留）
  - 英语 words：保持每轮随机抽 10 题（2026-05-06 用户反馈全量太多，恢复 sample 10）
- **持久化（下次进入自动恢复）**
  - 语文：扩展 `utils/chinese/stateStore.js` 加 `getChinesePrefs(pageKey)/setChinesePrefs`，存 `selectedLessons + filterType`
  - 英语：新增 `utils/english/stateStore.js` 同结构
  - 数学：本地 key `math_online_prefs`，存 level/types/special/count/timer，watch + 200ms debounce + onUnmounted flush
- **做题中返回回到选择页（不退出整页）**
  - `components/PageHeader.vue` 增加 `back-handler` prop（返回 true 即拦截默认）
  - `components/chinese/PracticeBar.vue` 做题中 `doBack` 改 `emit('cancel')`
  - learn 用 PageHeader + onHeaderBack；pinyin/hanzi 监听 PracticeBar @cancel；english/words 自绘 back-btn 改 started=false；math/online 已用 confirmBack 切回 setup phase
- **空选禁用「开始」按钮**：`canStart` computed + `.disabled` 样式

### 提交
- `938ab51` feat 本次需求（9 文件）
- `9fa485c` chore 杂项（首页卡片顺序 + phonics 资源清理 + 旧字典删除）
- `9438fe6` fix 全选/全不选按钮 min-width（用户实测发现"全选"2字比 3 字课程标签窄，切到"全不选"又变宽）

### 下次注意
- selectedTypes（数学）必须整体 `new Set(...)` 替换才能触发 watch，禁止 `.add/.delete`，已在声明上方注释
- 旧 `chinese_state` 只有 currentUnit，本次新增 `prefs` 字段属兼容追加（按 CLAUDE.md "不做数据兼容"，老用户清缓存即可）
- HBuilderX 浏览器自测未跑（CLI 无 npm script），需用户手动验证

## 2026-04-24 phonics 最终放弃 IPA 音素方案，改走"只读单词"

昨天遗留问题（wikimedia IPA 录音爆破音/鼻音孩子听不出、多个 mp3 损坏）今天评估并尝试了多条路：

| 尝试路径 | 结果 |
|---------|------|
| 讯飞 TTS + SSML phoneme | 控制台默认只给中文发音人，英文需申请 |
| eSpeak NG 离线 | 机械音，且需装 espeak-ng + ffmpeg |
| 找现成 42 音 mp3（archive.org / 百度云 / 夸克） | archive.org 连不上；百度/夸克只有整段音频合集，没有切好的 42 个单音 |
| edge-tts（微软免费）+ 拟音文本（"shhh...shhh...shhh"） | 能生成，但实测音色/启蒙感仍不对，放弃 |

最终结论：**不播音素**，仅保留示例词 TTS（已有 `speakEn` 走有道 dictvoice，真人女声，可靠）。

### 改动
- `pages/english/phonics.vue`
  - 删 `playPhonemeFile` / `playSound` 本地音素播放逻辑
  - 详情卡中央大音标去掉 `@click` 和"🔊 点这里读音"提示，纯展示
  - `selectSound` / `prev` / `next` 切换时不再自动播音素
  - 示例词 chip 和"🔊 全部例词"按钮保留（走 `speakEn`）
- `static/data/english/phonics.json` 每条删除 `audioFiles` 字段
- 删 `static/audio/phonics/` 整个目录（含 wikimedia 残留 + 损坏 1964B 文件）
- 删 `docs/phonics/download-ipa-audio.mjs` 一次性资料脚本

### 放弃 IPA 音素的原因
讯飞控制台默认只给中文发音人，英文发音人需单独申请或付费；eSpeak 机械音对启蒙不友好；本地跑 eSpeak + ffmpeg 需额外装环境。综合权衡：孩子启蒙阶段听真人说完整单词（sun / snake / cat）比单独听 /s/ 音素更有意义，而真人单词 TTS 现成可用（有道 dictvoice 免费）。

### 后续如果回到音素方案
- 讯飞英文发音人申请下来后，用 SSML `<phoneme alphabet="ipa" ph="ʃ">` 预生成 42 个 mp3
- 或让家长自己用录音机录 42 段（最贴孩子，可控启蒙化读法）
- 或找到切好的 Jolly Phonics 官方 42 音 mp3 包
- edge-tts 的脚本保留在 `docs/phonics/generate-edge-tts.py`，参数化可复用（需要时 `pip install edge-tts` 后直接跑）

## 2026-04-22 (3) 首页数学色块最终方案 + HanziQuestion 文案对齐

上一轮尝试"缩小数学色块 + 白边框/margin 错位 + 三学科 120 统一"反复来回数次都不对。最终方案：

- **三学科 card-deco 统一 160×160 不动**（完全恢复原尺寸），只降低数学视觉重量：
  - 渐变 #E3F0FA→#B8D9F0 → 更浅的 #F0F6FB→#D6E8F5
  - 数字字号 32→22rpx、颜色 #1E5A8E→#5A8EC3、padding 加到 20rpx
  - **关键坑**：给 `.math-deco` 加 padding 时必须同时设 `box-sizing: border-box`，否则 padding 会把 160×160 撑成 220×220，色块比语文/英语明显大一圈。已沉淀到 memory。
- **HanziQuestion 按钮文案/顺序**对齐 learn.vue：`✓ 我掌握了 / ✗ 没掌握` → `❌ 我不会 / ✅ 我会了`（wrong 左、correct 右，与 learn.vue 一致）

## 2026-04-22 (2) 截图复查：数学色块再缩 + HanziQuestion 判断按钮

首轮改动落地后截图复查发现：
- **首页数学色块视觉权重仍重**：根因是数学 deco 撑满 160×160 + 深蓝渐变，语文/英语则是 160 容器内嵌 100×100 / 64 小元素。改：math-deco 直接设 120×120 + `margin: 20rpx`，让它与容器边有留白；字号 26→24rpx、padding 28→14rpx。
- **学习的"掌握"指的是 HanziQuestion 组件（汉字练习笔顺题），不是 learn.vue**：之前只改了 learn.vue 的"我会了/我不会"，漏改了 `components/chinese/HanziQuestion.vue` 的"我掌握了/没掌握"。改：该组件的 `.answer-btn`（▶ 播放笔顺动画）和 `.judge-btn` 同步改成条形浅底无描边风格（带宽度约束 600rpx、flex 平分、圆角 12rpx、font 28rpx）。

## 2026-04-22 字体接入 + 首页/学习页细节修正

### 引入霞鹜文楷 Web Font（参考碑文项目方案）
手机端（Android）没有系统楷体时，语文相关文本 fallback 成默认字体，没有楷体质感。参考 `D:\code\uniapp` 碑文项目做法，通过 npmmirror CDN 加载霞鹜文楷 Screen：

- `index.html` 加 `<link rel="preconnect">` + `<link rel="stylesheet">` 指向 `registry.npmmirror.com/lxgw-wenkai-screen-webfont/latest/files/style.css`
- `App.vue` 的 `--font-chinese` 字体栈前置 `'LXGW WenKai Screen', 'LXGW WenKai'`
- 语文首页（hero-title / hero-sub / pc-name / pc-char / sub-char / sub-name / wc-name / fl-text）字体栈同步前置
- **配套**：所有用楷体栈的地方 `font-weight` 从 `bold / 900` 降到 `500`，避免合成粗体破坏笔锋（`.hero-stamp` 朱砂印章保持 bold 不变，红底白字印章效果需要）

### 根首页数学磁贴视觉重量校正
`math-deco` 里 5 个数字+符号撑满 160×160 容器，相比语文印章（100×100 居中）、英语 ABC（64×64 叠加）视觉偏重：

- padding 16rpx → 28rpx
- 数字/符号字号 32rpx → 26rpx

### 生字学习页判断按钮改成"笔顺动画"样式
`pages/chinese/learn.vue` 里 `.judge-btn`（我会了/我不会）原本是大号描边按钮（3rpx border、24rpx 圆角、32rpx 字号、28×56 padding），与同页 `.answer-btn`（▶ 笔顺动画）的条形浅底风格脱节。

- `.judge-btn` 改为与 `.answer-btn` 一致：flex 平分、padding 16rpx、圆角 12rpx、font 28rpx、无描边
- 红/绿仅靠文字色 + 浅色背景区分

## 2026-04-21 三学科视觉统一重构 + 设计 token

一次彻底的 UI 重构，把原本"白底 + 圆角卡片 + 浅阴影 + 学科色边框" 的 AI 通用风格拆分为三个有独立视觉性格的学科模块。

### 三学科视觉 DNA

| 学科 | 主色 | 背景 | 字体 | 主装饰元素 |
|---|---|---|---|---|
| 语文 | 胭脂红 `#A62D33` | 宣纸 `#FAF6EE` | 楷体栈 | 倾斜朱印、墨点、宣纸暖边框 |
| 英语 | 青绿 `#26A69A` | 淡青 `#F5FBFB` | Quicksand 栈 | 彩色 ABC 堆叠、圆润气泡、emoji 色块 |
| 数学 | 深蓝 `#42A5F5 / #1E5A8E` | 淡蓝灰 `#F0F4F9` | Courier 等宽 | 数字方阵、网格纹理、竖条装饰 |

### 页面级重构

- **根首页** `pages/index/index.vue`：Hero + 3 张学科差异化磁贴（不再是等高等宽 5 张 emoji 卡片）
- **语文 index**：印章 Hero + 不对称磁贴（主入口生字学习大卡 + 拼音/汉字小卡 + 错题本宽卡）
- **语文 result**：红印批阅（双层 inset shadow 模拟印章边 + `批 X/Y 阅` 布局 + 墨点 + "學而時習之" 文脚）
- **英语 index**：ABC 三字母倾斜堆叠 Hero + 青绿主卡（内含 🦁🍎🌈）
- **英语 result**：浮动气球动画 + 圆白底大 emoji + CORRECT 大分数
- **数学 index**：Courier 数字方阵 Hero + 在线练习渐变主卡（内含 `20+?=35` 表达式）
- **数学 online result**：大勾号 + 虚线装饰圈 + DONE 小标签 + 分数 140rpx Courier
- **数学 history**：蓝色网格纹理背景 + 左侧蓝色竖条 record-card + 全部 meta 改 Courier

### PageHeader 主题化

- 加 `theme` prop（`default / chinese / math / english`），语文子页加 `theme="chinese"` → 头部统一胭脂红
- title 字体统一楷体（各学科视觉有层次，不只是换色）

### 组件层统一

- `components/chinese/QuestionCard.vue`：宣纸卡片 + 楷体选项 + 胭脂系 speak-btn
- `components/chinese/HanziQuestion.vue`：题型 badge 4 色（蓝/橙/绿/紫）改胭脂+宣纸暖+绿+赭
- `components/chinese/PracticeBar.vue / TrendChart.vue / StrokeAnim.vue`：蓝 / 紫 / 青绿残留色全部 → 胭脂
- `components/english/WordQuestion.vue`：蓝色 TTS 按钮 → 青绿；Quicksand 字体；.big speak-btn 改青色渐变

### 技术坑 / 可复用经验

1. **拼音声调字符错位**：`.pinyin-display` 如果用 `Georgia/Times New Roman/serif` 栈，`ǎ ě ǐ ǒ ǔ`（第三声 háček）字形缺失，降级成 `o + 独立 ˇ` 占空格，视觉上变成 `do ˇ u`。修复：改用中文字体栈 `'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`，中文字体原生支持全套拼音声调。**规则：拼音文本永远用中文字体栈，不要用西文衬线字体。**
2. **英语 TTS 卡住导致跳不到下一题**：`speakEn` 原实现只在 audio 的 `onended/onerror/play().catch` 时 resolve。但网络慢 / 浏览器静默阻止自动播放 / 旧 listener 被清等场景下 Promise 可能永不 resolve，`Promise.all([speakPromise, delayPromise])` 永远挂起。**修复：加 4 秒超时兜底 + `settled` 标记防重复 resolve。** 调用方依赖外部异步 Promise 时必须设置超时保险。
3. **条件渲染导致布局抖动**：`v-if="answered"` 的元素在未渲染时不占位，渲染后会把下方内容挤下去。**修复：改用 `:style="{ visibility: answered ? 'visible' : 'hidden' }"` + 占位字符**，保留盒子高度，不抖动。
4. **暗色模式彻底移除**：单用户家用项目不需要，之前接入的 `utils/common/theme.js` + 各页 `body.dark-mode` 样式块全部清理。`HanziWriter` 的 `dark` 分支颜色也直接写死浅色。

### 设计 token（App.vue CSS 变量）

`App.vue` 的 `:root` 里建立了设计 token 作为**下次新改动的入口**（未做全局 sed 替换，现有文件仍用硬编码色）：

- 学科三色：`--color-chinese/math/english` + `-deep` + `-bg`
- 阴影层级：`--shadow-sm/md/lg`
- 圆角 scale：`--radius-btn/card/pill/chip`
- 间距 scale：`--space-1..6`
- 字体栈：`--font-chinese/english/math`

> 下次调学科色只改 App.vue 里 1 个值 + 再 sed 替换旧值。不要一次性迁移现有文件（工作量大、调试困难）。

### 产品决策

- **完成学习的 toast 改为跳转 result 页**：语文 `learn.vue` 原来练习完用 `toast.info('完成！答对 X/Y')` + setTimeout reset，改成跳 `/pages/chinese/result`，复用已设计好的红印批阅页。仪式感 > 静默关闭。
- **首页 "英语启蒙" → "英语"**：跟 "数学" / "语文" 对称，两字。
- **不引 web font**：霞鹜文楷 subset 10MB+ 太重，Quicksand web font 国内加载慢。坚持走系统字体栈，Android 降级可接受。

### 本次 5 个 commit

| Commit | 范围 |
|---|---|
| `2c6d4e8` | 三学科 index/result/guide/mistakes 重构 + dark-mode 彻底清理 + PageHeader theme + 拼音字体/TTS/占位等修复 |
| `e205a2a` | math history + online setup 对齐 + App.vue 建立 CSS token |
| `794da9a` | math online quiz 阶段打磨（Courier + 冷色边框 + 蓝渐变） |
| `de1bea7` | math print setup + action bar 对齐数学视觉语言 |
| `0a29ff3` | chinese HanziQuestion badge 蓝/橙/紫 → 胭脂+宣纸系 |

### 后续可做（优先级已评估为低，暂不推进）

- CSS 变量全局替换（现有 20+ 文件 sed 改 `var(--color-xxx)`）
- Web font 引入（霞鹜文楷 / Quicksand）
- 独立 `math/result.vue`（现在嵌在 online.vue phase='result'，已仪式化，拆出来纯工程改动）
- 跨学科统计页 / 家长报表（新需求，不是视觉）
- 数学错题重练改成"逐题式"对齐语文/英语（架构改写，成本高收益低）

### 本轮额外修复（2 个交互 bug）

1. **学科 index 返回键不回根首页**：浏览器直开 `/#/pages/chinese/index` 时，`uni.navigateBack` 会走 history.back() 而不是 fail 分支，回不到根首页。`PageHeader` 加 `homeOnBack` prop，传 `true` 时无条件 `reLaunch(fallback)`；3 个学科 index 都加 `home-on-back`。
2. **3 个错题重练交互不一致**：
   - `math/mistakes-practice` 空状态对齐语文（加 🎉 + "练全部未掌握"切换按钮，内部 `switchToAll` 本地切换不跳 URL）
   - `english/mistakes-practice` 模板重写：`start-card` 改 `type-cards/type-card` 结构跟语文对齐；practice-mode-hint 文案统一 `切换到练全部 » / 切换到今日待复习 »`；顶层 + 内部双层空状态也对齐
   - 数学 "一次列表交卷" vs 语文/英语 "逐题式"的答题架构差异**保留**（数据流不同，重写成本高）

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

## 2026-04-21 单词选择题等 TTS 播完再切题

- **现象**：选完答案后固定 900ms / 1600ms 就切下一题，有道 mp3 还没念完就被下一题打断
- **方案**：
  - `speakEn` 改成返回 Promise（播完 / 失败 / 打断都 resolve，不 reject）
  - `components/english/WordQuestion.vue` `pickOption` 用 `Promise.all([speakPromise, minDelay])` 等两者都完成再 `emit('answer')`
  - 最少展示时长：对 600ms / 错 1200ms（保证看到颜色反馈），单词长的话播完时间自然更长
  - emit 前再次判断 `choiceState.value` 防止组件已 reset 时误触发

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

## 2026-04-23 新增「自然拼读」模块（英语）

按 Jolly Phonics 体系做 42 音 7 组教学。
- 数据：`static/data/english/phonics.json`（42 音 × {letters/ipa/tip/examples/audioFiles}）
- 页面：`pages/english/phonics.vue`（组别 tab + 9 宫格选音 + 详情卡）
- 路由：`pages/english/phonics`
- 入口：英语首页次级卡 2 列 → 3 列（字母认读 / 自然拼读 / 错题本）
- 音频：`static/audio/phonics/` 本地 mp3，从 Wikimedia Commons IPA 标准录音批量下载（CC 协议）
- 工具：`docs/phonics/download-ipa-audio.mjs`（一次性资料脚本，不属于 build 流程，本项目专用）

**音频策略**：dictvoice 念字母组合不准（"sh" 会被当词拼），改用 IPA 单音素 mp3。双元音/复合音用顺序播多个单音素拼出（/eɪ/ → e + ɪ）。本地播放，零外部依赖、零运营压力。

### 已知问题（待明天处理）

Wikimedia Commons 的 IPA 标准录音对英语启蒙不够友好：
- `t.mp3` / `sh.mp3` 的 transcoded mp3 在 wikimedia 损坏（仅 1964 字节空文件）。已删 t.mp3，sh 改用 ogg 原文件（iOS Safari 可能不兼容）
- 爆破音 /p/ /t/ 录音是纯音素（短促"啪"声），孩子很难听出像 p / t
- 鼻音 /n/ 没元音托底，听感像"嗯..."而不是 n

**用户当前听感：p / n 不像、t 没声**。当前方案不可用。

### 明天接续：换发音方案（已与用户对齐 3 选 1）

| 方案 | 优点 | 缺点 | 用户需补充 |
|------|------|------|------------|
| **A. 讯飞在线 TTS + SSML phoneme**（推荐） | 真人腔、最准 | 要 API key | 讯飞开放平台 appid/api_key/api_secret |
| B. eSpeak NG WASM 离线 | 零成本零依赖 | 机械音、孩子启蒙不友好 | 无 |
| C. 腾讯/阿里云 TTS | 国内访问稳 | 要 key | 腾讯/阿里云 SecretId/SecretKey |

走方案 A 时：用 SSML `<phoneme alphabet="ipa" ph="ʃ">` 调讯飞 TTS **预生成 42 个 mp3** 放本地，运行时不再调云端（省调用量、零延迟）。

明天接续动作：
1. 等用户给方案选择 + key
2. 写 `docs/phonics/generate-tts-audio.mjs`（替代 download-ipa-audio.mjs）
3. 删除当前 wikimedia 拉的 `static/audio/phonics/*.mp3`，重新生成
4. phonics.json 的 audioFiles 字段格式可能要改（如果是单文件就不用拼播了）

