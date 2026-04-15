# 云工具箱（uniapp-aliyun）开发进度

> 项目路径: `D:\code\uniapp-aliyun`
> 技术栈: UniApp Vue3 + Composition API + uniCloud-aliyun
> 最后更新: 2026-04-15
> 状态: **开发中**

## 项目来源

从 `D:\code\uniapp`（支付宝云）提取数学模块，独立部署到阿里云。两个项目独立维护，后续新功能在本项目开发。

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

### 待做

- [x] 图形填数 — 三角形(6圈)+方形(8圈)随机出现，每边之和相等，给2~3个数填其余
- [ ] **语文按单元/课程出题** — uniapp（支付宝云）项目的学习模块，题库已有 unit 字段，需改出题逻辑支持按单元+课程筛选

## 技术决策

1. **纯前端存储** — localStorage，不用云函数，固定 key 不依赖用户名
2. **打印用图片** — window.print() 在 UniApp H5 排版不可控，改为 html2canvas 转图片再打印
3. **独立于 uniapp 项目** — 数学模块独立部署，不暴露碑文/学习等功能
4. **Vue3 + script setup** — manifest.json 声明 vueVersion: 3
5. **百数表不受难度限制** — 固定1~100范围，因为考的是找规律能力而非计算

## 关键路径

- 设计文档：`D:\code\uniapp\docs\superpowers\specs\2026-04-15-math-module-design.md`
- 实施计划：`D:\code\uniapp\docs\superpowers\plans\2026-04-15-math-module.md`
