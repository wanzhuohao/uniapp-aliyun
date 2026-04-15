<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

:root {
  --color-primary: #42A5F5;
  --color-danger: #E53935;
  --color-text: #333;
  --color-text-light: #888;
  --radius-btn: 16rpx;
}
</style>
