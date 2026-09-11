# AGENTS.md

本文件适用于当前 `uniapp-aliyun` 仓库。上级工作区规则仍然生效；进入仓库后，还应先阅读 `CLAUDE.md`、`progress.md`，并按任务读取 `docs/specs/` 或 `docs/plans/` 中对应模块材料。

## 项目定位

这是“学习小天地”UniApp H5 项目，使用 Vue 3，包含数学、语文、英语启蒙和小游戏。当前业务数据、偏好、错题和成绩均保存在浏览器本地，不依赖云函数或远端数据库。

主要依赖：

- UniApp + Vue 3 Composition API
- `hanzi-writer`：汉字笔顺动画
- `html2canvas`：数学题打印导出
- Web Speech API：中英文语音播放

`uniCloud-aliyun/` 当前没有业务云函数。不要因为目录存在就假设页面依赖云端服务，也不要擅自把本地数据迁移到云端。

## 模块结构

```text
pages/index/                   总首页
pages/math/                    在线练习、打印、历史、错题和说明
pages/chinese/                 生字、拼音、汉字、结果和错题复习
pages/english/                 字母、自然拼读、单词和错题复习
pages/games/                   成语接龙、24 点、华容道、数独
pages/games/plane/             飞机大战及本地排行榜
components/PageHeader.vue      通用自定义页头
components/chinese/            语文题目、练习条、趋势图组件
components/english/            英语单词题组件
utils/common/                  随机、偏好、练习日志、Leitner、语音、Toast
utils/math/                    数学出题和历史/错题存储
utils/chinese/                 题库加载、单元、偏好、错题和练习记录
utils/english/                 字母/单词加载、主题、偏好、错题和练习记录
utils/games/                   各小游戏算法与统计存储
static/data/                   运行时题库和词库
tools/                         题库生成、修复、校验和算法测试脚本
```

`pages.json` 是页面注册的唯一入口，现有页面全部使用 `navigationStyle: custom`。业务页应复用 `PageHeader.vue`；答题过程页按现有模式使用 `PracticeBar` 处理返回确认和进度。

## 数据与状态边界

- 数学历史和错题：`utils/math/mathStorage.js`
- 语文/英语错题：由 `utils/common/leitner.js` 工厂生成领域实例
- 语文/英语练习记录：由 `utils/common/practiceLog.js` 工厂生成领域实例
- 页面偏好：由 `utils/common/prefsStore.js` 管理，数学在线练习另使用 `math_online_prefs`
- 小游戏统计：各自的 `*Storage.js`
- 飞机排行榜：`pages/games/plane/api.js`，仅保存本机前 50 条

这是家用、单用户、本地存储项目。数据结构或 key 变更时按项目约定直接调整，不增加迁移函数、旧 key fallback 或跨版本兼容层；需要时明确提示用户清理本地缓存。

## 题库维护

大体积 JSON 是运行时数据，不要在不理解生成链的情况下直接批量手改：

- `static/data/questions.json`：通过 `tools/extract-questions.mjs` 从源题库提取。
- `static/data/games/idioms.json`：由成语抓取/精简脚本生成，并可通过 `merge-ocp-idioms.py` 补充。
- `static/data/games/common-phrases.json`：由 `build-common-phrases.mjs` 维护并与成语库去重。
- `static/data/games/twenty-four.json`：由 `build-24-puzzles.mjs` 离线生成。
- `static/data/english/`：字母、自然拼读和主题单词数据，修改时同步核对 loader、主题配置和题目组件。

成语库在 `utils/games/idiomChain.js` 中使用动态 `import()` 延迟加载，避免拖慢首页。不要改回静态导入。

生成或修复题库时，先读对应脚本参数和输入来源；脚本可能覆盖 JSON 文件，执行前必须展示目标文件和预期变化。用户已明确要求生成/修复且目标、输入和覆盖范围与展示内容一致时，由主 Agent 判断为有效授权；多个目标可组成不可变批次一次批准，逐项回查，发生范围漂移或异常覆盖时立即停止并重新确认。

## 开发约定

- 项目是 Vue 3，使用 Composition API 和 `<script setup>`；不要写成 Vue 2 响应式模式。
- 通用算法优先放 `utils/`，页面负责交互和状态编排，避免把可测试逻辑埋进大段模板事件代码。
- 语文和英语共同行为优先复用 `utils/common/` 工厂，不复制 Leitner、练习日志或偏好存储实现。
- 汉字数据缺字段时优先修复源数据或运行 `tools/fix-incomplete.mjs`，不要在页面叠加无止境的 fallback。
- 语音统一使用 `utils/common/speech.js`；播放前置解锁、自动播放和卸载清理要沿用现有实现。
- `setTimeout`、`setInterval`、动画帧、事件监听和语音播放必须在页面/组件卸载时清理。
- 游戏算法修改必须补跑对应 Node 测试；不要只在页面点几次就判断算法正确。
- 用户可见的 `guide.vue` 更新日志保持“一行一个大标题”；实现细节写入 `progress.md`。
- 不直接修改 `node_modules/`、`unpackage/`、`ngrok.zip` 或第三方 `uni_modules/` 内容，除非任务明确要求。

## 构建与运行

`package.json` 当前没有 `scripts`。Node/npm 已在 PowerShell PATH，依赖安装使用：

```powershell
npm install
```

页面开发和发行使用 HBuilderX，主要目标是 H5 浏览器。没有实际通过 HBuilderX 启动或构建时，不得声称页面功能正常。

## 自动化测试

在 PowerShell 中直接使用 PATH 中的 Node 运行现有脚本，不硬编码安装目录：

```powershell
node tools/test-24.mjs
node tools/test-sliding-puzzle.mjs
node tools/test-sudoku.mjs
node tools/validate-shape-fill.mjs
```

按变更范围选择测试：

- 数学出题或判题：至少运行 `validate-shape-fill.mjs`，并验证相关题型页面。
- 24 点：运行 `test-24.mjs`。
- 数字华容道：运行 `test-sliding-puzzle.mjs`。
- 数独：运行 `test-sudoku.mjs`。
- 语文/英语：当前无独立自动化脚本，需在浏览器验证选题、答题、错题进入/晋级、练习记录和偏好恢复。
- 公共存储工厂变更：同时回归语文和英语，避免只验证一个领域实例。

浏览器验证遵循工作区统一优先级：Codex Desktop 先用内置 Browser；必须复用现有 Chrome 状态时再用 Chrome；两者能力不足时才用 Playwright MCP。自动化访问 uniCloud 托管站点可能触发防刷封禁，启用前先告知用户，使用可见持久化浏览器、保留登录态并降低操作频率；不得用高频 headless 测试轰击线上地址。

## 验证与仓库卫生

- 页面新增或改名后核对 `pages.json`、首页入口和返回路径。
- 涉及本地存储时记录实际 key，并验证首次进入、已有数据、清缓存后三种状态。
- 涉及定时器或游戏循环时验证重复进入/退出页面，不得残留后台任务或幽灵音频。
- 提交前排除 `node_modules/`、`unpackage/`、本地日志、临时截图、下载包和无关生成数据。
- 当前进度维护在根目录 `progress.md`；设计和计划分别位于 `docs/specs/`、`docs/plans/`。
- `CLAUDE.md` 与本文件描述冲突时，以实际代码和用户当前指令为准，并在任务中指出差异。
