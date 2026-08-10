# R2 文件库

一个部署在 Cloudflare Pages/Workers 上的 Cloudflare R2 文件管理器，支持文件夹、拖放上传、预览、搜索、排序、复制、移动、重命名和删除。

## 功能概览

- Cloudflare R2 作为对象存储，文件不落在 Pages 文件系统中
- 游客写入目录和多账号目录权限
- 图片与 MP4 视频自动生成 144 x 144 缩略图
- 大文件分片上传：16 MiB 分片、最高 4 路并发、单片失败自动重试
- 网格/列表视图、面包屑导航、搜索和上传进度动画
- 文件和空白区域的右键菜单，支持上传、新建、预览、下载、复制链接、移动、重命名和删除
- 多个 Cloudflare R2 binding 切换

## 文件大小限制

项目没有按扩展名限制图片、视频或普通文件。实际限制取决于上传方式、Cloudflare 请求限制和 R2 本身的限制。

| 类型 | 当前行为 |
| --- | --- |
| 小于 32 MiB 的文件 | 使用一次普通 `PUT` 上传 |
| 大于等于 32 MiB 的文件 | 自动使用 R2 Multipart Upload |
| 图片 | 没有应用层大小限制；浏览器能读取且 R2 接受即可上传 |
| 视频 | 没有应用层大小限制；只有 `video/mp4` 会生成缩略图，其他视频仍可上传 |
| 普通文件 | 没有扩展名白名单，按原始 MIME 类型上传 |
| R2 单个对象 | 官方上限为 5 TiB，超大对象必须使用 Multipart Upload |

### 分片参数

参数定义在 [`assets/main.mjs`](assets/main.mjs)：

| 参数 | 当前值 | 说明 |
| --- | ---: | --- |
| `MULTIPART_THRESHOLD` | 32 MiB | 从普通上传切换到分片上传的阈值 |
| `DEFAULT_PART_SIZE` | 16 MiB | 默认单片大小 |
| `MIN_PART_SIZE` | 5 MiB | R2 Multipart 的单片最小值 |
| `MAX_MULTIPART_PARTS` | 10,000 | 分片数量上限；超过时会自动增大单片大小 |
| `MAX_RETRIES` | 3 | 网络错误、408、429、5xx 的最大重试次数 |
| 并发数 | 1 / 2 / 4 | 根据网络类型和 `navigator.connection.saveData` 自适应 |

当前 16 MiB 分片意味着：

- 1 GiB 文件约 64 片
- 100 GiB 文件约 6,400 片
- 接近 160 GiB 后，程序会自动增大分片以避免超过 10,000 片

每个分片还必须低于部署环境的单次请求体上限。默认 16 MiB 留出了足够余量；如果你的 Pages/Workers 计划、代理或企业网关有更低限制，应同步调小 `DEFAULT_PART_SIZE`。

## 部署前准备

需要：

- Cloudflare 账号
- 一个 Cloudflare R2 存储桶
- 一个 Cloudflare Pages 项目
- Node.js 18 或更高版本（仅本地开发需要）

## Cloudflare Pages 部署

### 1. 创建 R2 存储桶

在 Cloudflare Dashboard 中进入 **R2 Object Storage**，创建存储桶。项目的 `/raw/*` 公开读取地址依赖公共存储桶 URL，因此需要为该桶配置公开访问并复制公共 URL。

如果不希望文件公开，请不要直接使用这个公开读取方案，需要额外加入鉴权代理或签名 URL。

### 2. 创建 Pages 项目

1. 将仓库 Fork 到自己的 GitHub 账号。
2. 在 **Workers & Pages** 中创建 Pages 项目，连接这个仓库。
3. 构建命令留空，输出目录填写项目根目录（`.`）。
4. 点击部署。

项目是静态 Vue SFC Loader 应用，不需要 Vite、Webpack 或其他构建步骤。

### 3. 配置环境变量

在 Pages 项目中打开 **Settings → Environment variables**。预览环境和生产环境需要分别配置。

| 名称 | 必填 | 示例 | 作用 |
| --- | :---: | --- | --- |
| `PUBURL` | 是 | `https://pub-xxxx.r2.dev` | `/raw/*` 公开读取时使用的 R2 公共 URL |
| `GUEST` | 否 | `public/,incoming/` | 未登录用户允许写入的目录，多个目录用英文逗号分隔 |
| `BUCKET` | 否 | 通过绑定配置 | 默认桶绑定名；Pages 中也可使用 `R2` 绑定名 |
| `账号:密码` | 否 | `admin:CHANGE_ME` | 管理账号变量名；变量值是允许写入的目录列表 |
| `ADMIN` | 推荐 | `ADMIN` | Basic Auth 用户名；与 `PASS` 配合使用 |
| `PASS` | 推荐 | `PASS` | Basic Auth 密码；与 `ADMIN` 配合使用 |
| `AUTH_USERS` | 可选 | JSON | 多账号、密码和目录权限配置 |
| `STORAGES` | 否 | JSON 配置 | 多个 R2 binding 的显示名称、binding 名和公共 URL |

#### `GUEST`

`GUEST` 的值是目录前缀列表：

```text
public/,incoming/
```

这表示游客可以写入 `public/` 和 `incoming/`。设置为 `*` 会允许游客写入所有目录，不建议在公开网盘中使用。

#### 管理员账号

#### 最简单的账号密码设置

在 Cloudflare Pages 的环境变量中添加两项：

```text
变量名：ADMIN    值：ADMIN
变量名：PASS     值：PASS
```

然后在登录框输入：

```text
用户名：ADMIN
密码：PASS
```

这两个变量会直接授予所有写操作权限。修改变量后请重新部署；如果浏览器仍使用旧账号，请用无痕窗口打开。

下面的 `AUTH_USERS` 适合需要多个账号或目录权限的场景。

#### 多账号配置（可选：`AUTH_USERS`）

需要多个账号或限制不同目录时，可将账号统一放在一个 `AUTH_USERS` JSON 变量中：

```json
{
  "lvtuang": {
    "password": "lvtuang",
    "paths": ["*"]
  },
  "editor": {
    "password": "CHANGE_ME",
    "paths": ["team/", "shared/"]
  }
}
```

设置后，在浏览器的登录框中输入：

```text
用户名：lvtuang
密码：lvtuang
```

`paths: ["*"]` 代表允许写入所有目录；也可以填写目录前缀数组。修改 Pages 环境变量后，需要重新部署，并在浏览器无痕窗口中重新登录以清除旧的 Basic Auth 缓存。

#### 旧版账号格式

账号使用 `账号:密码` 作为变量名，变量值填写允许写入的目录：

```text
变量名：admin:CHANGE_ME
变量值：*
```

只授权指定目录时：

```text
变量名：editor:CHANGE_ME
变量值：team/,shared/
```

注意：旧格式仍然兼容，但目录值是前缀匹配，建议始终以 `/` 结尾；不要在列表开头或结尾添加逗号。密码会出现在变量名中，若控制台拒绝该变量名，请改用 `AUTH_USERS`。

### 4. 绑定 R2 存储桶

在 Pages 项目打开 **Settings → Functions → R2 bucket bindings**，添加：

| Binding name | R2 bucket |
| --- | --- |
| `R2` 或 `BUCKET` | 你创建的 R2 存储桶 |

保存后重新部署一次 Pages 项目。

### 5. 配置多个 Cloudflare R2

为每个桶创建一个 Pages R2 binding，例如 `BUCKET`、`ARCHIVE_BUCKET`，然后添加 `STORAGES` 环境变量。值必须是 JSON 数组：

```json
[
  {
    "id": "default",
    "label": "主存储",
    "binding": "BUCKET",
    "publicUrl": "https://pub-main.r2.dev"
  },
  {
    "id": "archive",
    "label": "归档桶",
    "binding": "ARCHIVE_BUCKET",
    "publicUrl": "https://pub-archive.r2.dev"
  }
]
```

字段说明：

- `id`：前端切换用的唯一 ID，只能使用字母、数字、下划线和短横线。
- `label`：界面显示名称。
- `binding`：Pages Functions 中实际的 R2 binding 名称，必须与绑定名称完全一致。
- `publicUrl`：该桶的公共读取 URL，末尾不要加 `/`。

不设置 `STORAGES` 时，程序自动使用 `BUCKET` 和 `PUBURL` 作为 `default` 主存储。每个请求都会携带当前存储 ID，列表、上传、分片、删除、移动和原始文件读取会保持在同一个桶内。

## 第三方 S3/R2 兼容存储

当前版本的多存储切换针对 Cloudflare Pages 已绑定的 R2 bucket。任意第三方 S3/R2 服务还需要服务端适配以下信息：

- S3 Endpoint
- Region（部分服务使用 `auto`）
- Access Key ID
- Secret Access Key
- 可选的公共 URL 或自定义域名

单独把“授权码”放在浏览器里不能安全完成这类接入，也无法替代 S3 签名请求。不要在前端、`localStorage` 或公开环境变量中保存 Secret Access Key。接入第三方服务时，应在 Pages Functions 中加入 SigV4 客户端，并把密钥放入加密环境变量或专用 Secret；当前 UI 已预留存储切换位置，但不会伪装成已经支持第三方读写。

## 本地开发

安装依赖：

```bash
npm install
```

启动 Pages 本地模拟：

```bash
npm run dev
```

默认命令等价于：

```bash
npx wrangler pages dev . --r2 BUCKET
```

本地环境需要通过 Wrangler 提供 `BUCKET` R2 绑定。没有绑定时，页面仍可打开，但文件列表和写入 API 无法正常工作。

## 公开访问与权限说明

- `PUBURL` 只负责公开读取原始文件，不负责写入权限。
- 写入、删除、移动和重命名由 `GUEST` 或 Basic Auth 账号权限控制。
- `*` 代表所有目录，权限范围很大，只适合私有测试桶。
- 缩略图保存在 `_$flaredrive$/thumbnails/`，该目录对上传用户默认放行。
- 生产环境建议使用 HTTPS、强密码，并限制 `GUEST` 到专用上传目录。

## 调整上传策略

如果需要调整上传策略，修改 [`assets/main.mjs`](assets/main.mjs)：

```js
export const MULTIPART_THRESHOLD = 32 * MEBIBYTE;
const DEFAULT_PART_SIZE = 16 * MEBIBYTE;
const MAX_RETRIES = 3;
```

建议：

- 网络稳定、客户端性能较好：可以将默认分片调到 `32 * MEBIBYTE`
- 移动网络或代理限制严格：调到 `8 * MEBIBYTE`
- 不要低于 R2 Multipart 要求的 `5 MiB`
- 调高并发数会增加带宽占用和浏览器内存，通常 `4` 路已经足够

## 已知行为

- 图片缩略图由浏览器生成，不会改变原始文件。
- MP4 缩略图生成依赖浏览器视频解码能力；生成失败不会阻止原文件上传。
- 文件预览由浏览器和 `PUBURL` 的响应头决定，浏览器不支持的格式会直接下载。
- 普通上传和 Multipart 上传都使用当前目录路径，不会自动重命名同名文件。

## 技术栈

- Vue 3 + `vue3-sfc-loader`
- Cloudflare Pages Functions
- Cloudflare R2 S3-compatible API
- Axios
- Phosphor Icons Web
