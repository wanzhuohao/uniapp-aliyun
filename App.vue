<script>
export default {
  onLaunch() {}
}
</script>

<style>
html, body, #app, uni-app, uni-page, uni-page-body, uni-page-head {
  margin: 0 !important;
  padding: 0 !important;
}
uni-page-head {
  display: none !important;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

:root {
  /* 基础 */
  --color-primary: #42A5F5;
  --color-danger: #E53935;
  --color-text: #333;
  --color-text-light: #888;
  --color-star: #FFB300;
  --color-stroke: #42A5F5;

  /* 学科主色 — 下次调色只改这里 */
  --color-chinese: #A62D33;      /* 胭脂 */
  --color-chinese-deep: #7F1F25;
  --color-chinese-bg: #FAF6EE;   /* 宣纸 */

  --color-math: #42A5F5;         /* 蓝 */
  --color-math-deep: #1E88E5;
  --color-math-ink: #1E5A8E;
  --color-math-bg: #F0F4F9;

  --color-english: #26A69A;      /* 青绿 */
  --color-english-deep: #1E8E82;
  --color-english-bg: #F5FBFB;

  /* 阴影层级 */
  --shadow-sm: 0 2rpx 8rpx rgba(0,0,0,0.04);
  --shadow-md: 0 4rpx 14rpx rgba(0,0,0,0.05);
  --shadow-lg: 0 6rpx 20rpx rgba(0,0,0,0.06);

  /* 圆角 scale */
  --radius-btn: 16rpx;
  --radius-card: 20rpx;
  --radius-pill: 40rpx;
  --radius-chip: 12rpx;

  /* 间距 scale */
  --space-1: 4rpx;
  --space-2: 8rpx;
  --space-3: 16rpx;
  --space-4: 24rpx;
  --space-5: 32rpx;
  --space-6: 48rpx;

  /* 字体栈 */
  --font-chinese: 'LXGW WenKai Screen', 'LXGW WenKai', 'STKaiti', 'KaiTi', '楷体', 'DFKai-SB', 'BiauKai', serif;
  --font-english: 'Quicksand', 'Trebuchet MS', sans-serif;
  --font-math: 'Courier New', 'Consolas', monospace;
}
</style>
