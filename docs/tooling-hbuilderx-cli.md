# HBuilderX CLI：构建 / 发行 H5（本项目）

> HBuilderX 安装：`C:\Program Files\HBuilderX`，命令行工具为 `cli.exe`。
> 命令行重新构建，避免每次改源码都要去 GUI 点“发行”。

## 1. 导入项目（首次）

```powershell
& "C:\Program Files\HBuilderX\cli.exe" project open --path "C:\claude code\uniapp-aliyun"
```

## 2. 构建 H5 本地产物（用于自测 / 预览，不上传）

```powershell
& "C:\Program Files\HBuilderX\cli.exe" publish web `
    --project "C:\claude code\uniapp-aliyun" `
    --ssr false `
    --webHosting false
```

- `--webHosting false`：只在本地生成产物，**不上传**。
- 产物输出到 `unpackage\dist\build\web`（hash 路由）。

## 3. 本地预览

用任意静态服务器指向 `unpackage\dist\build\web`，然后打开：

```
http://127.0.0.1:8313/#/pages/chinese/learn
```

（哈希路由，无需服务器端 fallback。）

## 4. 部署到 uniCloud 前端网页托管

真正发布到线上才带 `--webHosting true` 并指定云空间：

```powershell
& "C:\Program Files\HBuilderX\cli.exe" publish web `
    --project "C:\claude code\uniapp-aliyun" `
    --ssr false `
    --webHosting true `
    --provider aliyun `
    --spaceId <云空间ID>
```

## 注意

- 排查“本地好了、部署后没好”时：先确认线上跑的是**最新构建产物**（第 2 步刚生成的 `unpackage\dist\build\web`）。若线上还是旧包，改动当然不生效。
- 本项目本地没有 `@dcloudio` 依赖，不能用 `npm run build`；重新构建必须走上面的 `cli.exe publish web`。