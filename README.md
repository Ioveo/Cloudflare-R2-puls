# 🐱 天才猫 R2 智能云端网盘系统 (GeniusCat R2 Drive Showcase)

<p align="center">
  <img src="./assets/favicon.png" width="96" height="96" alt="GeniusCat R2 Logo" />
</p>

<p align="center">
  <strong>基于 Cloudflare Pages / Workers 与 R2 对象存储构建的现代化极速网盘与多媒体展示系统</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Cloudflare%20Pages%20%2F%20Workers-F38020?logo=cloudflare" alt="Cloudflare" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare%20R2-orange?logo=amazon-s3" alt="R2" />
  <img src="https://img.shields.io/badge/Frontend-Vue%203%20SFC-4FC08D?logo=vue.js" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Style-Apple%20VisionOS%20Glass-0071e3" alt="Style" />
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License" />
</p>

---

## 📖 项目简介

**天才猫 R2 智能云端网盘系统** 是一款专为 Cloudflare R2 设计的高颜值、全功能、轻量级私有云盘系统。前端采用 **Apple VisionOS 空间流光毛玻璃美学**，深度结合 Vue 3 响应式架构，零编译步骤（Zero Build Step），无需服务器即可在全球边缘节点极速分发。

无论是作为个人云端相册、影视音乐点播站、在线代码/Markdown 工作台，还是团队资源共享中心，都能提供媲美原生桌面的丝滑交互体验。

---

## ✨ 核心全功能矩阵

### 1. 🎨 极致视觉与主题系统
* **Apple VisionOS 空间流光美学**：全站应用动态蓝紫/极光光晕背景、高斯模糊毛玻璃卡片、微弹性动效与流畅过渡；
* **暗色 / 亮色主题一键切换**：默认采用沉浸式暗黑风格（深空黑画布与柔光卡片），顶栏集成太阳/月亮（☀️/🌙）30° 旋转微动效切换按钮，持久化本地存储，HTML 初始化防白屏闪烁；
* **全平台自适应响应式布局**：针对 iPhone、iPad、Android 等移动端专属优化（横向滑动胶囊分类栏、紧凑双列瀑布流、单手悬浮上传药丸）。

---

### 2. ⚡ 文件管理与秒级索引引擎
* **秒级全盘智能索引 (Instant Global Index)**：自动缓存全盘资源索引，支持在任意层级一键按分类秒级聚合展示，支持全盘极速检索；
* **多视图模式切换**：支持 **网格卡片 (Grid)**、**照片无缝瀑布流 (Masonry)** 与 **紧凑列表 (List)** 视图模式；
* **六大媒体分类导航**：全部资源、照片画廊、4K 高清视频、无损音乐（3D 黑胶黑胶机动效）、ZIP 归档、办公文档；
* **完整的桌面级文件操作**：
  * 面包屑导航与一键返回上一级；
  * 右键上下文菜单与空白处全局菜单；
  * 支持项目**复制 (Copy)**、**剪切 (Cut)** 与 **跨目录粘贴 (Paste)**（支持递归目录深度迁移）；
  * 新建文件夹、重命名、批量/单项移动、安全二次确认删除；
  * 搜索关键词金黄色智能高亮（Search Highlight）。

---

### 3. 🚀 大文件分片上传引擎
* **智能双轨上传**：
  * 小于 32 MiB：浏览器直传极速写入；
  * 大于等于 32 MiB：自动启用 **Cloudflare R2 Multipart Upload** 分片上传；
* **动态并发多路加速**：16 MiB 标准分片，支持最高 4 路并发传输与自动失败重试；
* **客户端本地智能微缩图**：上传图片与 MP4 视频时，由浏览器端硬件解码即时生成高清微缩图，无需消耗服务器计算资源；
* **实时传输状态仪表盘**：浮动胶囊进度条实时展示当前文件、传输速率（如 `18.5 MB/s`）与剩余队列数；
* **拖拽与多文件队列**：全屏拖拽放置、相机拍照直传、多文件并行队列。

---

### 4. 🧰 全能多媒体与在线预览套件

| 预览套件 | 对应组件 | 支持格式与核心特性 |
|---|---|---|
| 🖼️ **大图幻灯片** | `LightboxModal.vue` | JPG, PNG, GIF, WebP, AVIF, SVG, BMP, HEIC；支持鼠标滚轮无限缩放、拖拽平移、90° 旋转、全屏与幻灯片循环播放。 |
| 🎬 **影院播放器** | `MediaPlayerModal.vue` | MP4, WebM, MKV, MP3, FLAC, WAV, AAC, OGG；支持 0.5x~2.0x 倍速、悬浮进度条预览、画中画（PiP）、全屏影院模式。 |
| 📦 **云端归档解压** | `ArchiveModal.vue` | ZIP, RAR, 7Z, TAR, GZ；**免下载**在线递归解析压缩包目录树、文件大小检视与单文件一键提取下载。 |
| 💻 **云端代码/Markdown IDE** | `TextEditorModal.vue` | MD, TXT, JSON, JS, CSS, HTML, PY, SH, YML, VUE, TS；行号显示、字号缩放、JSON 格式化、Markdown 实时分屏渲染、<kbd>Ctrl+S</kbd> 直接保存至 R2。 |
| 📄 **PDF & Office 文档阅读器** | `DocumentViewerModal.vue` | PDF 高清矢量阅读（页面缩放/打印），Word/Excel/PPT 微软 Office Online + 谷歌在线双引擎免下载安全沙箱预览。 |
| 📋 **文件属性与 EXIF 抽屉** | `FileInspectorModal.vue` | macOS 风格滑出抽屉，解析相机拍摄参数、光圈、ISO、快门、分辨率、百万像素、MIME、ETag MD5 与 CDN 直链。 |
| 🔒 **加密分享与动态二维码** | `ShareModal.vue` | 边缘 CDN 直链复制、真机扫码二维码、4 位提取码 PIN 保护、1h/24h/7d 限时有效期与 HTML 嵌入代码。 |

---

### 5. ⌨️ 全键盘极速操作流 (Hotkeys)

按键盘 <kbd>?</kbd> 可随时呼出快捷键指南浮层：

| 快捷键 | 功能说明 |
|---|---|
| <kbd>Space</kbd> (空格键) | **macOS 风格快速预览 (QuickLook)**，打开或关闭大图/影音/文档预览 |
| <kbd>I</kbd> | **检视文件详细属性与 EXIF 元数据**（滑出抽屉） |
| <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | 打开聚合搜索输入框 |
| <kbd>Ctrl+S</kbd> / <kbd>⌘S</kbd> | 在线代码 / Markdown 编辑器直接保存到 R2 |
| <kbd>Esc</kbd> | 关闭当前打开的所有弹窗、抽屉或退出全屏 |
| <kbd>←</kbd> / <kbd>→</kbd> | 幻灯片大图 / 影音上一项 / 下一项 |
| <kbd>+</kbd> / <kbd>-</kbd> | 大图预览 放大 / 缩小 |
| <kbd>R</kbd> | 大图顺时针 90° 旋转 |

---

## 🛠️ 部署教程

### 方式一：Cloudflare Pages 一键部署（推荐）

#### 1. 创建 Cloudflare R2 存储桶
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)，在左侧导航进入 **R2 Object Storage**；
2. 点击 **Create bucket**（例如命名为 `my-r2-drive`）；
3. 进入桶设置（Settings）中的 **Public Access**，开启 **R2.dev subdomain**（或绑定自定义域名），复制生成的公共访问 URL（如 `https://pub-xxxx.r2.dev`）。

#### 2. 部署到 Cloudflare Pages
1. 将本项目仓库 Fork 到您的 GitHub 账号；
2. 在 Cloudflare 控制台进入 **Workers & Pages** -> **Create application** -> 选择 **Pages** -> **Connect to Git**；
3. 选择您 Fork 的仓库，配置构建设置：
   * **Framework preset**: None
   * **Build command**: *（留空）*
   * **Build output directory**: `.` *（填写一个半角英文句点）*
4. 点击 **Save and Deploy**。

#### 3. 绑定 R2 存储桶
1. 在 Pages 项目中进入 **Settings** -> **Functions** -> **R2 bucket bindings**；
2. 点击 **Add binding**：
   * **Variable name**: `BUCKET`（或 `R2`）
   * **R2 bucket**: 选择步骤 1 中创建的 R2 存储桶；
3. 保存设置。

#### 4. 配置环境变量
在 Pages 项目中进入 **Settings** -> **Environment variables**，添加以下变量：

| 变量名 | 必填 | 推荐值示例 | 作用与说明 |
|---|:---:|---|---|
| `PUBURL` | **是** | `https://pub-xxxx.r2.dev` | R2 公共访问 URL（末尾**不要**加 `/`） |
| `ADMIN` | **推荐** | `admin` | 管理员登录用户名 |
| `PASS` | **推荐** | `你的强密码` | 管理员登录密码 |
| `GUEST` | 否 | `public/,incoming/` | 允许未登录游客公开写入/上传的目录前缀（逗号分隔） |
| `AUTH_USERS` | 否 | `[{"username":"editor","password":"123","paths":["team/"]}]` | 多用户多目录权限 JSON 配置 |
| `STORAGES` | 否 | *JSON 配置* | 多 R2 存储桶切换配置（见下文） |

> 💡 **提示**：修改环境变量或 R2 绑定后，请在 **Deployments** 中点击 **Retry deployment**（重新部署）使其生效。

---

### 方式二：多存储桶切换配置（可选）

如果您有多个 R2 存储桶（例如分为“主存储”和“归档冷备桶”），可以在 Pages 中绑定多个 R2（如 `BUCKET` 和 `ARCHIVE_BUCKET`），然后添加环境变量 `STORAGES`（JSON 格式）：

```json
[
  {
    "id": "default",
    "label": "主存储库",
    "binding": "BUCKET",
    "publicUrl": "https://pub-main.r2.dev"
  },
  {
    "id": "archive",
    "label": "影视归档桶",
    "binding": "ARCHIVE_BUCKET",
    "publicUrl": "https://pub-archive.r2.dev"
  }
]
```

系统顶栏将自动渲染存储桶切换下拉框，实现跨桶自由切换。

---

### 方式三：本地开发与调试

```bash
# 1. 克隆代码
git clone https://github.com/Ioveo/Cloudflare-R2-puls.git
cd Cloudflare-R2-puls

# 2. 安装依赖
npm install

# 3. 启动本地模拟服务（需要安装 Wrangler 并绑定本地/远程 R2）
npm run dev
# 或手动运行：
npx wrangler pages dev . --r2 BUCKET
```

---

## 🔐 权限与安全机制

1. **公开只读与写保护**：
   * 文件的浏览、搜索、预览、下载依赖 `PUBURL`，默认对访客公开；
   * 上传、新建目录、重命名、剪切/复制粘贴、删除均受后端身份鉴权保护；
2. **多账号权限格式兼容**：
   * 后端鉴权引擎（`utils/auth.ts`）全面兼容 `ADMIN` & `PASS`、`USER` & `PASSWORD`、`AUTH_USER` & `AUTH_PASS` 以及 `AUTH_USERS` 多用户 JSON；
3. **游客写入目录 (`GUEST`)**：
   * 如需允许公开投稿或游客匿名上传，可设置 `GUEST=incoming/,public/`，访客即可无需密码直接向指定目录上传文件。

---

## 🏗️ 目录结构与技术栈

```text
├── assets/
│   ├── App.vue                 # 核心应用主界面与全套交互逻辑
│   ├── main.css                # Apple VisionOS 空间流光全局样式系统
│   ├── main.mjs                # 客户端分片上传引擎、缩略图生成与哈希计算
│   ├── LightboxModal.vue       # 幻灯片大图高清预览组件
│   ├── MediaPlayerModal.vue    # 影院级音频/视频播放器组件
│   ├── DocumentViewerModal.vue # PDF 矢量阅读器与 Office 在线文档预览组件
│   ├── FileInspectorModal.vue  # 文件属性与 EXIF 元数据检视抽屉
│   ├── TextEditorModal.vue     # 云端代码与 Markdown 在线 IDE 编辑器
│   ├── ArchiveModal.vue        # 云端 ZIP 压缩包免下载在线解压组件
│   ├── ShareModal.vue          # 加密与限时分享组件（带动态二维码）
│   ├── UploadPopup.vue         # 上传模式选择弹窗
│   ├── UploadProgress.vue      # 浮动上传进度与速率指示器
│   ├── ContextMenu.vue         # 桌面级右键菜单组件
│   ├── PromptDialog.vue        # 苹果风格输入/确认/登录对话框
│   ├── HotkeysModal.vue        # 键盘快捷键指南组件
│   ├── MimeIcon.vue            # 智能文件图标生成器
│   ├── Menu.vue                # 右上角全局操作菜单
│   └── CatLogo.vue             # 天才猫动态 SVG 矢量 Logo
├── functions/                  # Cloudflare Pages Functions API 路由
│   ├── api/
│   │   ├── files.ts            # 文件列表与搜索接口
│   │   ├── storages.ts         # 存储桶配置与切换接口
│   │   └── write/              # 写操作、分片上传与删除接口
│   └── raw/                    # 公开直链与缩略图代理
├── utils/
│   └── auth.ts                 # 权限校验与多环境变量兼容引擎
├── index.html                  # 页面入口（Vue 3 SFC 动态装载器）
├── wrangler.toml               # Wrangler 配置文件
└── package.json
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源。欢迎提交 Pull Request 与 Issue！
