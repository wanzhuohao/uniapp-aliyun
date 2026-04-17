# uniapp-aliyun — 云工具箱

## 项目概述

阿里云 UniApp H5 工具平台，从 `D:\code\uniapp`（支付宝云）独立出来。当前只有数学练习模块，后续可扩展。

## 技术栈

- **框架**: UniApp Vue3 + Composition API (`<script setup>`)
- **云**: uniCloud-aliyun（暂未使用云函数，纯前端 localStorage）
- **依赖**: html2canvas（打印/导出图片）
- **构建**: HBuilderX

## 目录结构

```
components/PageHeader.vue   — 公共头部组件
pages/index/index.vue       — 总首页（卡片入口）
pages/math/
  index.vue                 — 数学首页
  online.vue                — 在线练习（设置→答题→结果）
  print.vue                 — 打印出题（A4预览+图片打印+答案导出）
  history.vue               — 历史记录（tab+展开详情）
utils/math/
  questionEngine.js         — 题目生成引擎
  mathStorage.js            — localStorage 存储
utils/common/
  toast.js                  — 提示工具
```

## 构建命令

```bash
npm install              # 安装依赖
# HBuilderX → 运行到浏览器 / 发行到前端网页托管
```

## 开发规范

- 所有页面用 PageHeader 组件做头部
- 存储用 `uni.getStorageSync/setStorageSync`，固定 key（不依赖用户名）
- 打印用 html2canvas 转图片方式（不用 window.print 直接打印 DOM）
- 新增页面记得在 pages.json 加路由（需要 `navigationStyle: custom`）

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
