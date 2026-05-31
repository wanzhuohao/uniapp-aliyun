# 数学益智小游戏开发计划

> 日期: 2026-05-22
> 关联设计: `docs/specs/2026-05-22-puzzle-games-design.md`
> 状态: 评审通过（2026-05-22）

## 评审决策

- 24 点 → 方式 B（按钮拼接）
- 华容道 → 3 档全做（3×3 / 4×4 / 5×5）
- 数独 → 不做铅笔模式
- 开发顺序保持：24 点 → 华容道 → 数独
- 阶段 0 一次性放 3 张占位卡

## 目标

在「小游戏」模块新增 24 点、数字华容道、迷你数独三款益智游戏，每款独立可玩，分阶段交付。

## 顺序与里程碑

按工程量与依赖排序：**24 点 → 数字华容道 → 迷你数独**。

理由：
- 24 点的「分数运算 + 表达式求值」是最难的核心算法，先做完后两个就纯前端逻辑
- 华容道无静态数据、逻辑最简单，做完巩固「计时/计步/PB」通用模式
- 数独题目生成最复杂，放最后

每个游戏单独提交、单独验收，做完一个再开下一个。

---

## 阶段 0：通用准备（一次性）

**目标**：小游戏首页改造，留好 3 个卡片位（先用占位，逐个游戏完成后激活跳转）。

### 改动文件

1. `pages/games/index.vue` — 把现有「更多小游戏正在路上…」占位区替换为 3 张卡片（24 点 / 数字华容道 / 迷你数独）
   - 卡片样式复用现有 `.card` 类，每张换不同装饰图（数字/格子/九宫）
   - 未完成的游戏点击提示「即将上线」（不跳转），完成后改为正式路由
2. `pages.json` — 一次性加 6 个路由（避免后续多次改动）

### 验收

- 小游戏首页可见 4 张卡片：成语接龙（可用）+ 3 个占位
- 点击占位卡 toast「即将上线」
- 不影响现有成语接龙

**提交点**：`feat(games): puzzle-games shell — 加 3 卡片占位 + 路由`

---

## 阶段 1：24 点

### 1.1 核心算法（`utils/games/twentyFour.js`）

- 实现 `Fraction` 类（add/sub/mul/div/equals）
- 实现 `evalExpression(expr, nums)` —— tokenizer + Shunting-yard + 分数求值 + 数字使用校验
- 实现 `findAllSolutions(nums)` —— 穷举所有表达式（5 种二叉树 × 4! × 4^3），用分数判等去重
- 实现 `generatePuzzles()` —— 离线脚本，输出按难度分桶的 JSON

**输出**：`tools/build-24-puzzles.mjs` 一次性脚本 + `static/data/games/twenty-four.json`

**单测建议**：写 3-5 个测试用例（手动跑），覆盖 `(3,3,8,8)`（唯一解）、`(1,2,3,4)`（多解）、`(1,1,1,1)`（无解）

### 1.2 题库加载（`utils/games/twentyFour.js` 续）

- `loadPuzzles()` —— dynamic import + 难度随机抽题
- `usePuzzle(difficulty)` —— 返回 `{nums, solutionCount}`

### 1.3 存储（`utils/games/twentyFourStorage.js`）

- `getStats() / addWin(difficulty) / resetStats()`
- `getStreak() / bumpStreak() / breakStreak()`

### 1.4 主页面（`pages/games/twenty-four.vue`）

- 顶部：PageHeader + 难度切换 + 计时 + 当前连胜
- 中部：4 张数字卡（点击插入到表达式条）+ 运算符按钮区
- 表达式条：可编辑（也可点击数字/运算符插入）+ 等号校验 + 清除/退格
- 底部：提示按钮（展示一个解） / 下一题 / 我放弃
- 校验通过：青色 ✓ 动画 + 自动出下一题（1.5s 延时）
- 校验失败：抖动 + toast「不对哦，再试试」

### 1.5 说明页（`pages/games/twenty-four-guide.vue`）

- 规则说明 + 示例 + 难度档位 + 更新日志（首版「新增 24 点」）

### 1.6 接入

- `pages/games/index.vue` 占位卡改为真实跳转
- `progress.md` 加一条更新

### 验收（在浏览器实测）

- [ ] 不同难度都能出题且有解
- [ ] 输入正确表达式 → 通关
- [ ] 输入错误表达式 → 拒绝
- [ ] 输入 `8/(3-8/3)` 这种分数解能通过（精度测试）
- [ ] 点击数字 / 运算符插入表达式条正确
- [ ] 提示按钮显示一个有效解
- [ ] 连胜、累计、PB 持久化
- [ ] 返回 → 重新进入状态干净

**提交点**：`feat(games): 24 点小游戏`

---

## 阶段 2：数字华容道

### 2.1 核心逻辑（`utils/games/slidingPuzzle.js`）

- `createBoard(size)` —— 生成 1..n² 排好序的 board
- `shuffle(board, moves=200)` —— 从已解状态随机合法移动 N 步打乱（保证可解）
- `canMove(board, idx, size)` —— 校验 idx 是否与空格相邻
- `move(board, idx, size)` —— 返回新 board（不修改原数组）
- `isSolved(board)` —— 校验是否已排好

### 2.2 存储（`utils/games/slidingPuzzleStorage.js`）

- `getPB(size) / updatePB(size, {steps, time})`

### 2.3 主页面（`pages/games/sliding-puzzle.vue`）

- 顶部：PageHeader + 难度 tab（3×3 / 4×4 / 5×5）+ 计时 + 步数
- 中部：N×N 棋盘（用 CSS grid），每格点击移动
- 底部：重开 / 一键打乱 / 返回
- 完成：弹通关层，显示用时 + 步数 + 是否破纪录

### 2.4 说明页（`pages/games/sliding-puzzle-guide.vue`）

- 规则 + 玩法图示 + 历史最佳战绩

### 2.5 接入

- 首页占位卡 → 正式跳转
- progress.md 更新

### 验收（在浏览器实测）

- [ ] 3×3 / 4×4 / 5×5 三档都能进入并可玩
- [ ] 点击相邻格能正确移动，不相邻不动
- [ ] 计时和步数正确累加
- [ ] 排好顺序后弹通关层
- [ ] PB 持久化 + 破纪录提示
- [ ] 重开 / 一键打乱状态干净
- [ ] 触摸操作流畅

**提交点**：`feat(games): 数字华容道小游戏`

---

## 阶段 3：迷你数独

### 3.1 核心算法（`utils/games/sudoku.js`）

- `solveBoard(board, size, boxR, boxC)` —— DFS 回溯求解（也用于唯一解校验）
- `countSolutions(board, ...)` —— 数解数（提前剪枝，>= 2 直接返回 2）
- `generateFullBoard(size, ...)` —— 随机生成完整解（DFS 随机化）
- `generatePuzzle(difficulty)` —— 从完整解挖洞，每次挖后校验仍唯一解
- `validateCell(current, row, col)` —— 校验某格当前是否冲突（行/列/宫）

### 3.2 存储（`utils/games/sudokuStorage.js`）

- `getStats() / addWin(difficulty)` 累计通关数
- `getPB(difficulty) / updatePB(difficulty, time)` 最短用时

### 3.3 主页面（`pages/games/sudoku.vue`）

- 顶部：PageHeader + 难度 tab（入门/简单/中等/困难）+ 计时 + 错误数
- 中部：N×N 棋盘
  - 预填灰底
  - 空白格点击高亮
  - 当前选中格弹出 1-N 数字按钮 + 清除
  - 冲突格红字显示
- 底部：提示（填一个正确）/ 重开 / 返回
- 通关：动画 + 用时 + PB 提示

### 3.4 说明页（`pages/games/sudoku-guide.vue`）

- 数独规则（行/列/宫）+ 4×4 宫格示意图 + 难度档位

### 3.5 接入

- 首页占位卡 → 正式跳转
- progress.md 更新

### 验收（在浏览器实测）

- [ ] 4 个难度都能生成题目且都唯一解
- [ ] 9×9 生成时间 < 1s（实测，超时则改预生成）
- [ ] 点击空白格弹数字按钮
- [ ] 填入冲突数字 → 红字标识
- [ ] 全部填对 → 通关动画
- [ ] 提示按钮填一个正确数字
- [ ] PB 持久化
- [ ] 累计通关数累加

**提交点**：`feat(games): 迷你数独小游戏`

---

## 阶段 4：收尾（可选）

完成 3 款后做最后一次回归 + 文档：

- [ ] 4 款游戏都进入一遍，确认互不影响
- [ ] localStorage 各 key 独立
- [ ] CLAUDE.md 的 `pages/games/` 和 `utils/games/` 目录说明更新
- [ ] `progress.md` 写一条总结

---

## 时间预估

| 阶段 | 估时 |
|------|------|
| 阶段 0 通用准备 | 0.5h |
| 阶段 1 24 点 | 4-6h（核心算法占大头） |
| 阶段 2 数字华容道 | 2-3h |
| 阶段 3 迷你数独 | 3-4h |
| 阶段 4 收尾 | 0.5h |
| **总计** | **10-14h** |

## 风险

1. **24 点表达式输入交互** — 方式 B 按钮拼接需要小心括号匹配，建议提供「退格」「清除」「自动加括号」
2. **数独 9×9 生成性能** — 实测要 > 1s 就改预生成离线题库
3. **测试覆盖** — HBuilderX 无 CLI 自检，依赖浏览器手测，每个阶段单独验收，不一次性堆积

## 检查清单（贯穿全程）

按 CLAUDE.md 通用规则：
- [ ] 每次开发前 git 同步 master
- [ ] 修一个游戏跑一遍涉及范围的手测
- [ ] 不重构现有代码（成语接龙）
- [ ] docs/ 下文档不进 git
- [ ] 每款游戏完成单独提交
