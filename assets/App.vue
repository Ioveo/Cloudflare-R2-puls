<template>
<div class="studio-app" @click="closeContext" @contextmenu.prevent="openContext(null, $event)" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
  <!-- Left Glassmorphism Sidebar -->
  <aside class="studio-sidebar">
    <div class="sidebar-brand">
      <CatLogo />
      <div class="brand-text">
        <strong>天才猫 R2 网盘</strong>
        <span class="status-dot"><i class="dot"></i> 智能直连中</span>
      </div>
    </div>

    <!-- Category Navigation Menu -->
    <nav class="sidebar-nav">
      <div class="nav-section-title">媒体 Showcase 库</div>
      
      <button class="nav-item nav-all" :class="{ active: filterCategory === 'all' }" @click="selectCategory('all')">
        <i class="ph ph-squares-four"></i>
        <span>概览大厅</span>
        <span class="count-pill">{{ totalItemCount }}</span>
      </button>

      <button class="nav-item nav-image" :class="{ active: filterCategory === 'image' }" @click="selectCategory('image')">
        <i class="ph ph-image"></i>
        <span>照片图库</span>
        <span class="count-pill highlight-blue">{{ categoryCounts.image }}</span>
      </button>

      <button class="nav-item nav-video" :class="{ active: filterCategory === 'video' }" @click="selectCategory('video')">
        <i class="ph ph-film-strip"></i>
        <span>高清影音</span>
        <span class="count-pill highlight-purple">{{ categoryCounts.video }}</span>
      </button>

      <button class="nav-item nav-audio" :class="{ active: filterCategory === 'audio' }" @click="selectCategory('audio')">
        <i class="ph ph-music-notes"></i>
        <span>音乐曲库</span>
        <span class="count-pill highlight-green">{{ categoryCounts.audio }}</span>
      </button>

      <button class="nav-item nav-archive" :class="{ active: filterCategory === 'archive' }" @click="selectCategory('archive')">
        <i class="ph ph-package"></i>
        <span>压缩归档</span>
        <span class="count-pill highlight-amber">{{ categoryCounts.archive }}</span>
      </button>

      <button class="nav-item nav-document" :class="{ active: filterCategory === 'document' }" @click="selectCategory('document')">
        <i class="ph ph-file-text"></i>
        <span>文档资料</span>
        <span class="count-pill">{{ categoryCounts.document }}</span>
      </button>

      <div class="nav-divider"></div>

      <!-- Scope Switcher Toggle -->
      <div class="scope-toggle-card" title="开启后，在任意子文件夹点击分类均可智能汇总全盘对应文件">
        <div class="scope-title">
          <i class="ph ph-globe-hemisphere-east"></i>
          <span>跨目录全盘自动归类</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="autoGlobalScan" @change="onToggleGlobalScan" />
          <span class="slider"></span>
        </label>
      </div>
    </nav>

    <!-- Bottom User / Logout Bar -->
    <footer class="sidebar-footer">
      <div class="user-pill" title="存储桶绑定与凭证">
        <i class="ph ph-shield-check"></i>
        <span>已验证连接</span>
      </div>
      <button class="logout-icon-btn" type="button" title="退出登录" @click="logout">
        <i class="ph ph-sign-out"></i>
      </button>
    </footer>
  </aside>

  <!-- Main Content Body -->
  <main class="studio-main">
    <header class="topbar">
      <!-- Minimal Apple Spotlight Icon Search Button / Expandable Search Pill -->
      <div class="search-wrapper">
        <button v-if="!showSearchInput && !search" class="icon-button search-icon-btn" type="button" title="搜索资源 (⌘K)" @click="showSearchInput = true; $nextTick(() => $refs.searchInputRef?.focus())">
          <i class="ph ph-magnifying-glass"></i>
        </button>
        <label v-else class="search-box search-box-expanded">
          <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input ref="searchInputRef" v-model.trim="search" type="search" placeholder="搜索资源..." aria-label="搜索当前目录资源" @blur="onSearchBlur" />
          <button class="icon-button small" type="button" title="关闭搜索" @click="search = ''; showSearchInput = false">×</button>
        </label>
      </div>

      <div class="topbar-actions">
        <label class="storage-switcher" title="切换存储桶"><i class="ph ph-database"></i><select v-model="storageId" aria-label="选择存储桶"><option v-for="storage in storageOptions" :key="storage.id" :value="storage.id">{{ storage.label }}</option></select></label>
        <button class="icon-button" type="button" title="快捷键指南 (?)" @click="showHotkeysModal = true"><i class="ph ph-keyboard"></i></button>
        <button class="icon-button" type="button" title="刷新目录" @click="fetchFiles(true)"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i></button>
        <div class="menu-button"><button class="icon-button" type="button" title="显示选项" @click="showMenu = true"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></button><Menu v-model="showMenu" :items="menuItems" @click="onMenuClick" /></div>
      </div>
    </header>

    <section class="workspace" :class="{ 'pure-gallery-workspace': filterCategory !== 'all' }">
      <!-- Portal Hero Banner & R2 Storage Animated Widget (ONLY shown in General Overview Hall) -->
      <div v-if="filterCategory === 'all'" class="portal-hero">
        <div class="hero-content">
          <div class="hero-header-row">
            <span class="hero-tag"><i class="ph ph-sparkle-fill"></i> 天才猫 AI 云端引擎</span>
            <span v-if="autoGlobalScan" class="scan-tag"><i class="ph ph-lightning-fill"></i> 全盘秒级索引就绪</span>
          </div>
          <h1>天才猫 R2 智能云端展厅</h1>
          <p>直连 Cloudflare R2 全球边缘存储 · 在线影音播放 · 归档解压预览 · 全速传输</p>
          
          <!-- Category Quick Badges -->
          <div class="hero-stat-pills">
            <span class="hero-pill" @click="selectCategory('image')"><i class="ph ph-image-fill"></i> {{ categoryCounts.image }} 照片</span>
            <span class="hero-pill" @click="selectCategory('video')"><i class="ph ph-film-strip-fill"></i> {{ categoryCounts.video }} 视频</span>
            <span class="hero-pill" @click="selectCategory('audio')"><i class="ph ph-music-notes-fill"></i> {{ categoryCounts.audio }} 音乐</span>
            <span class="hero-pill" @click="selectCategory('archive')"><i class="ph ph-package-fill"></i> {{ categoryCounts.archive }} 归档</span>
          </div>
        </div>

        <!-- Rebuilt R2 Storage Usage Animated Card -->
        <div class="r2-storage-widget" :title="`R2 存储桶已用 ${formatSize(totalStorageBytes)} · 基于 10GB 免费容量`">
          <div class="storage-widget-header">
            <div class="storage-title">
              <div class="cloud-icon-box">
                <i class="ph ph-cloud-arrow-up-fill"></i>
                <div class="icon-pulse-ring"></div>
              </div>
              <div class="storage-text-group">
                <span class="title-main">R2 存储容量占用</span>
                <span class="title-sub">Cloudflare R2 Storage</span>
              </div>
            </div>
            <div class="storage-value-badge">
              <span class="usage-percent">{{ storagePercent.toFixed(1) }}%</span>
              <span class="usage-raw">{{ formatSize(totalStorageBytes) }} <sub>/ 10 GB</sub></span>
            </div>
          </div>

          <!-- Multi-Color Segmented Animated Progress Bar -->
          <div class="storage-bar-track">
            <div class="bar-shimmer"></div>
            <div class="storage-bar-seg seg-image" :style="{ width: (totalStorageBytes ? (categoryBytes.image / totalStorageBytes) * storagePercent : 0) + '%' }" title="照片"></div>
            <div class="storage-bar-seg seg-video" :style="{ width: (totalStorageBytes ? (categoryBytes.video / totalStorageBytes) * storagePercent : 0) + '%' }" title="视频"></div>
            <div class="storage-bar-seg seg-audio" :style="{ width: (totalStorageBytes ? (categoryBytes.audio / totalStorageBytes) * storagePercent : 0) + '%' }" title="音频"></div>
            <div class="storage-bar-seg seg-archive" :style="{ width: (totalStorageBytes ? (categoryBytes.archive / totalStorageBytes) * storagePercent : 0) + '%' }" title="归档"></div>
            <div class="storage-bar-seg seg-document" :style="{ width: (totalStorageBytes ? (categoryBytes.document / totalStorageBytes) * storagePercent : 0) + '%' }" title="文档"></div>
          </div>

          <!-- Legend Breakdown Badges -->
          <div class="storage-legend">
            <span class="legend-badge badge-image" @click="selectCategory('image')"><i class="ph ph-image-fill"></i> 照片 <strong>{{ formatSize(categoryBytes.image) }}</strong></span>
            <span class="legend-badge badge-video" @click="selectCategory('video')"><i class="ph ph-film-strip-fill"></i> 视频 <strong>{{ formatSize(categoryBytes.video) }}</strong></span>
            <span class="legend-badge badge-audio" @click="selectCategory('audio')"><i class="ph ph-music-notes-fill"></i> 音频 <strong>{{ formatSize(categoryBytes.audio) }}</strong></span>
            <span class="legend-badge badge-archive" @click="selectCategory('archive')"><i class="ph ph-package-fill"></i> 归档 <strong>{{ formatSize(categoryBytes.archive) }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Workspace Heading / Breadcrumbs (ONLY shown in General Overview Hall) -->
      <div v-if="filterCategory === 'all'" class="workspace-heading">
        <div>
          <nav class="breadcrumbs" aria-label="当前位置"><button type="button" @click="goToFolder('')">首页</button><template v-for="(part, index) in pathParts" :key="`${part}-${index}`"><span aria-hidden="true">/</span><button type="button" @click="goToFolder(pathUntil(index))">{{ part }}</button></template></nav>
          <h2>{{ currentFolderName }}</h2>
          <p>{{ itemCountText }}</p>
        </div>
        <div class="view-controls" aria-label="视图设置"><button class="view-button" :class="{ active: viewMode === 'grid' }" type="button" title="网格视图" @click="viewMode = 'grid'"><i class="ph ph-squares-four" aria-hidden="true"></i></button><button class="view-button" :class="{ active: viewMode === 'list' }" type="button" title="列表视图" @click="viewMode = 'list'"><i class="ph ph-list-bullets" aria-hidden="true"></i></button></div>
      </div>

      <!-- Loading skeleton -->
      <section v-if="loading" class="file-grid loading-grid" :class="viewMode"><div v-for="item in 8" :key="item" class="file-skeleton"></div></section>

      <!-- Empty state -->
      <section v-else-if="!filteredFiles.length && !filteredFolders.length" class="empty-state">
        <div class="empty-icon"><i class="ph ph-folder-open"></i></div>
        <h2>{{ search ? '没有匹配的资源' : '当前分类暂无文件' }}</h2>
        <p>{{ search ? '尝试更换关键词重试。' : '拖放文件至此区域，或点击右下角上传。' }}</p>
        <button v-if="!search" class="primary-button" type="button" @click="openUploadWithAuth"><i class="ph ph-upload-simple"></i> 上传文件</button>
      </section>

      <!-- File Grid (Supports Masonry Waterfall, Video Cinema Gallery, and Music Vinyl Studio Layouts) -->
      <section v-else class="file-grid" :class="[viewMode, { 'waterfall-mode': filterCategory === 'image' && viewMode === 'grid', 'video-studio-mode': filterCategory === 'video' && viewMode === 'grid', 'music-studio-mode': filterCategory === 'audio' && viewMode === 'grid' }]">
        
        <article v-if="cwd && filterCategory === 'all'" class="file-card parent-card" tabindex="0" @click="goToFolder(parentPath)" @keydown.enter="goToFolder(parentPath)">
          <div class="file-symbol folder-symbol"><i class="ph ph-arrow-bend-up-left"></i></div>
          <div class="file-main"><strong>上一级目录</strong><span>返回父文件夹</span></div>
        </article>

        <article v-for="folder in filteredFolders" :key="folder" class="file-card folder-card" tabindex="0" @click="goToFolder(folder)" @keydown.enter="goToFolder(folder)" @contextmenu.stop.prevent="openContext(folder, $event)">
          <div class="file-symbol folder-symbol"><i class="ph ph-folder-simple-star"></i></div>
          <div class="file-main">
            <strong>{{ folderName(folder) }}</strong>
            <span>分类目录</span>
          </div>
          <button class="more-button" type="button" title="更多操作" @click.stop="openContext(folder, $event)"><i class="ph ph-dots-three-outline"></i></button>
        </article>

        <!-- SPECIALIZED CATEGORY CARDS -->
        <article
          v-for="file in filteredFiles"
          :key="file.key"
          class="file-card"
          :class="[isImage(file) ? 'file-card--image' : (isVideo(file) ? 'file-card--video' : (isAudio(file) ? 'file-card--audio' : (isArchive(file) ? 'file-card--archive' : 'file-card--document')))]"
          tabindex="0"
          @click="openFile(file)"
          @keydown.enter="openFile(file)"
          @contextmenu.stop.prevent="openContext(file, $event)"
        >
          <!-- 1A. PURE FULL HD PHOTO WATERFALL MASONRY CARD (ONLY IN PHOTO GALLERY VIEW) -->
          <template v-if="isImage(file) && filterCategory === 'image' && viewMode === 'grid'">
            <div class="photo-preview-pure">
              <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
              <div class="photo-hover-overlay">
                <div class="photo-overlay-top">
                  <span class="photo-tag-badge">{{ fileName(file.key) }}</span>
                </div>
                <div class="photo-overlay-bottom">
                  <span class="photo-size-badge">{{ formatSize(file.size) }}</span>
                  <div class="photo-overlay-actions">
                    <button class="overlay-btn" type="button" title="大图幻灯片预览" @click.stop="openFile(file)">
                      <i class="ph ph-arrows-out"></i>
                    </button>
                    <a class="overlay-btn" :href="rawPath(file.key)" download title="下载原图" @click.stop>
                      <i class="ph ph-download-simple"></i>
                    </a>
                    <button class="overlay-btn" type="button" title="更多选项" @click.stop="openContext(file, $event)">
                      <i class="ph ph-dots-three-outline"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 1B. FOLDER VIEW IMAGE CARD (CONTAINED THUMBNAIL + TITLE + SIZE + DATE) -->
          <template v-else-if="isImage(file)">
            <div class="folder-image-preview">
              <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
            </div>
            <div class="file-main">
              <strong>{{ fileName(file.key) }}</strong>
              <span>{{ formatDate(file.uploaded) }} · 照片</span>
            </div>
            <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
            <div class="file-footer">
              <strong>{{ formatSize(file.size) }}</strong>
              <span class="file-action-hint"><i class="ph ph-eye"></i> 预览</span>
            </div>
          </template>

          <!-- 2. VIDEO CINEMA STREAMING CARD -->
          <template v-else-if="isVideo(file)">
            <div class="photo-preview video-cinema-preview">
              <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
              <div class="video-play-badge">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
                </svg>
              </div>
            </div>
            <div class="file-main">
              <strong>{{ fileName(file.key) }}</strong>
              <span>{{ formatDate(file.uploaded) }} · 高清视频</span>
            </div>
            <footer class="file-footer">
              <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
            </footer>
            <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
          </template>

          <!-- 3. MUSIC VINYL PLATFORM CARD -->
          <template v-else-if="isAudio(file)">
            <div class="music-album-wrapper">
              <div class="music-vinyl-disc">
                <i class="ph ph-music-notes"></i>
              </div>
              <div class="music-album-art">
                <i class="ph ph-vinyl-record"></i>
                <div class="music-play-overlay">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z"/>
                  </svg>
                </div>
              </div>
            </div>
            <div class="file-main">
              <strong>{{ fileName(file.key) }}</strong>
              <span>无损音频 · {{ formatDate(file.uploaded) }}</span>
            </div>
            <footer class="file-footer">
              <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
            </footer>
            <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
          </template>

          <!-- 4. GENERAL ARCHIVE & DOCUMENT CARD -->
          <template v-else>
            <div v-if="isArchive(file)" class="archive-card-icon">
              <i class="ph ph-package"></i>
              <span class="archive-pill">{{ archiveExt(file) }}</span>
            </div>
            <MimeIcon v-else :content-type="file.httpMetadata?.contentType || ''" :thumbnail="file.customMetadata?.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(storageId)}` : null" :size="40" />
            <div class="file-main">
              <strong>{{ fileName(file.key) }}</strong>
              <span>{{ formatDate(file.uploaded) }}</span>
            </div>
            <footer class="file-footer">
              <span>大小</span><strong>{{ formatSize(file.size) }}</strong>
            </footer>
            <button class="more-button" type="button" title="更多操作" @click.stop="openContext(file, $event)"><i class="ph ph-dots-three-outline"></i></button>
          </template>
        </article>
      </section>
    </section>

    <!-- Floating Glassmorphism Upload Action Pill -->
    <button class="upload-button" type="button" title="上传或新建" @click="openUploadWithAuth">
      <i class="ph ph-plus-bold"></i>
      <span>新建或上传</span>
    </button>

    <!-- Modals & Progress Overlays -->
    <Transition name="fade">
      <div v-if="isDragging" class="drag-overlay" @drop.prevent="onDrop">
        <div class="drag-content">
          <div class="drag-icon"><i class="ph ph-cloud-arrow-up"></i></div>
          <h3>释放鼠标立即上传</h3>
          <p>文件将保存至「{{ currentFolderName }}」</p>
        </div>
      </div>
    </Transition>

    <UploadProgress v-if="uploadProgress !== null" :progress="uploadProgress" :file-name="uploadFileName" :queue-count="uploadQueue.length" :speed-text="speedText" />
    <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder" />
    <ContextMenu :visible="showContextMenu" :x="contextPosition.x" :y="contextPosition.y" :title="contextTitle" :actions="contextActions" @close="closeContext" @select="runContextAction" />
    <PromptDialog v-model="dialog.visible" :mode="dialog.mode" :title="dialog.title" :message="dialog.message" :initial-value="dialog.initialValue" :confirm-text="dialog.confirmText" :error="dialog.error" @submit="onDialogSubmit" />
    <LightboxModal :visible="lightbox.visible" :items="imageItems" :index="lightbox.index" @close="lightbox.visible = false" @change="lightbox.index = $event" />
    <MediaPlayerModal :visible="mediaPlayer.visible" :items="mediaItems" :index="mediaPlayer.index" @close="mediaPlayer.visible = false" @change="mediaPlayer.index = $event" />
    <ArchiveModal :visible="archiveModal.visible" :file="archiveModal.file" @close="archiveModal.visible = false" />
    <HotkeysModal :visible="showHotkeysModal" @close="showHotkeysModal = false" />
    <ShareModal :visible="shareModal.visible" :file="shareModal.file" :raw-url="shareModal.rawUrl" @close="shareModal.visible = false" />
  </main>
</div>
</template>

<script>
import { generateThumbnail, blobDigest, multipartUpload, MULTIPART_THRESHOLD } from "/assets/main.mjs";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";
import UploadProgress from "./UploadProgress.vue";
import ContextMenu from "./ContextMenu.vue";
import PromptDialog from "./PromptDialog.vue";
import LightboxModal from "./LightboxModal.vue";
import MediaPlayerModal from "./MediaPlayerModal.vue?v=13.0";
import ArchiveModal from "./ArchiveModal.vue";
import HotkeysModal from "./HotkeysModal.vue";
import CatLogo from "./CatLogo.vue";
import ShareModal from "./ShareModal.vue";

function loadAuthCredentials() {
  try {
    const saved = localStorage.getItem("drive-auth") || sessionStorage.getItem("drive-auth");
    return JSON.parse(saved || "null");
  } catch {
    return null;
  }
}
export default {
  data: () => ({
    cwd: new URL(window.location).searchParams.get("p") || "",
    storageId: new URL(window.location).searchParams.get("storage") || "default",
    storageOptions: [{ id: "default", label: "主存储" }],
    files: [],
    folders: [],
    globalFiles: [],
    globalFilesLoaded: false,
    autoGlobalScan: true,
    filterCategory: "all",
    clipboard: null,
    focusedItem: null,
    contextPosition: { x: 0, y: 0 },
    loading: false,
    order: "name-asc",
    search: "",
    showSearchInput: false,
    viewMode: localStorage.getItem("drive-view") || "grid",
    showContextMenu: false,
    showMenu: false,
    showUploadPopup: false,
    uploadProgress: null,
    uploadFileName: "",
    speedText: "",
    uploadQueue: [],
    isUploading: false,
    isDragging: false,
    lightbox: { visible: false, index: 0 },
    mediaPlayer: { visible: false, index: 0 },
    archiveModal: { visible: false, file: null },
    showHotkeysModal: false,
    shareModal: { visible: false, file: null, rawUrl: "" },
    authCredentials: loadAuthCredentials(),
    dialog: { visible: false, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "" },
    dialogAction: null
  }),
  computed: {
    menuItems() { return [{ text: "按名称排序", value: "name-asc" }, { text: "按大小从小到大", value: "size-asc" }, { text: "按大小从大到小", value: "size-desc" }, { text: "粘贴项目", value: "paste", disabled: !this.clipboard }, { text: "退出登录", value: "logout" }]; },
    contextTitle() { if (!this.focusedItem) return this.storageOptions.find((item) => item.id === this.storageId)?.label || "文件库"; return typeof this.focusedItem === "string" ? this.folderName(this.focusedItem) : this.fileName(this.focusedItem.key); },
    contextActions() {
      if (!this.focusedItem) return [
        { id: "upload", label: "上传文件", icon: "ph-upload-simple" },
        { id: "create-folder", label: "新建文件夹", icon: "ph-folder-plus" },
        { id: "paste", label: "粘贴项目", icon: "ph-clipboard", disabled: !this.clipboard },
        { id: "logout", label: "退出登录", icon: "ph-sign-out", danger: true }
      ];
      if (typeof this.focusedItem === "string") return [
        { id: "open", label: "打开文件夹", icon: "ph-folder-open" },
        { id: "copy-link", label: "复制链接", icon: "ph-link" },
        { id: "copy-item", label: "复制文件夹", icon: "ph-copy" },
        { id: "cut-item", label: "剪切文件夹", icon: "ph-scissors" },
        { id: "move", label: "移动到...", icon: "ph-arrows-out-cardinal" },
        { id: "delete", label: "删除文件夹", icon: "ph-trash", danger: true }
      ];
      return [
        { id: "preview", label: "查看/播放", icon: "ph-eye" },
        { id: "download", label: "下载原文件", icon: "ph-download-simple" },
        { id: "share", label: "分享与二维码", icon: "ph-share-network" },
        { id: "copy-link", label: "复制直链", icon: "ph-link" },
        { id: "copy-item", label: "复制文件", icon: "ph-copy" },
        { id: "cut-item", label: "剪切文件", icon: "ph-scissors" },
        { id: "rename", label: "重命名", icon: "ph-pencil-simple" },
        { id: "move", label: "移动到...", icon: "ph-arrows-out-cardinal" },
        { id: "delete", label: "删除文件", icon: "ph-trash", danger: true }
      ];
    },
    pathParts() { return this.cwd.split("/").filter(Boolean); },
    parentPath() {
      const clean = this.cwd.endsWith("/") ? this.cwd.slice(0, -1) : this.cwd;
      const lastSlash = clean.lastIndexOf("/");
      return lastSlash >= 0 ? clean.slice(0, lastSlash + 1) : "";
    },
    currentFolderName() { return this.pathParts.at(-1) || "资源总览"; },
    itemCountText() { const count = this.filteredFiles.length + this.filteredFolders.length; return `${count} 个资源项目${this.search ? " · 搜索结果" : ""}`; },
    totalItemCount() { return this.files.length + this.folders.length; },
    
    categoryMeta() {
      const map = {
        all: { title: "个人云端 Showcase 展厅", desc: "直连存储 · 在线影音播放 · 归档解压预览 · 全速传输" },
        image: { title: "🖼️ 瀑布流高清照片图库", desc: "Pinterest 级高保真瀑布流展厅 · 点击开启沉浸式幻灯片" },
        video: { title: "🎬 4K 影音与视频画廊", desc: "B 站 / 影院级 16:9 画幅画廊 · 专属浮动控件与高保真流媒体" },
        audio: { title: "🎵 3D 黑胶无损唱片曲库", desc: "Apple Music 级 3D 唱片滑出视效 · 动态频谱与在线高保真音频" },
        archive: { title: "📦 压缩包与归档资源", desc: "跨目录全盘自动归类 · 支持在线解压检视 ZIP/RAR 目录树" },
        document: { title: "📄 文档与办公资料", desc: "跨目录全盘自动归类 · PDF / Word / Markdown / 电子书" },
      };
      return map[this.filterCategory] || map.all;
    },

    sourceFileList() {
      if (this.filterCategory === "all") return this.files;
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.autoGlobalScan && this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      return Array.from(map.values());
    },

    totalStorageBytes() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key && f.size) map.set(f.key, f.size);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key && f.size) map.set(f.key, f.size);
        }
      }
      let total = 0;
      for (const size of map.values()) total += size;
      return total;
    },

    categoryBytes() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      const bytes = { image: 0, video: 0, audio: 0, archive: 0, document: 0 };
      for (const f of map.values()) {
        const s = f.size || 0;
        if (this.isImage(f)) bytes.image += s;
        else if (this.isVideo(f)) bytes.video += s;
        else if (this.isAudio(f)) bytes.audio += s;
        else if (this.isArchive(f)) bytes.archive += s;
        else if (this.isDocument(f)) bytes.document += s;
      }
      return bytes;
    },

    storagePercent() {
      const cap = 10 * 1024 * 1024 * 1024; // 10 GB
      const pct = (this.totalStorageBytes / cap) * 100;
      return Math.min(100, Math.max(1, pct));
    },

    filteredFiles() {
      const query = this.search.toLocaleLowerCase();
      return this.sourceFileList.filter((file) => {
        const nameMatch = !query || this.fileName(file.key).toLocaleLowerCase().includes(query);
        if (!nameMatch) return false;
        if (this.filterCategory === "image") return this.isImage(file);
        if (this.filterCategory === "video") return this.isVideo(file);
        if (this.filterCategory === "audio") return this.isAudio(file);
        if (this.filterCategory === "archive") return this.isArchive(file);
        if (this.filterCategory === "document") return this.isDocument(file);
        return true;
      });
    },

    filteredFolders() {
      const query = this.search.toLocaleLowerCase();
      if (this.filterCategory !== "all") return [];
      return this.folders.filter((folder) => !query || this.folderName(folder).toLocaleLowerCase().includes(query));
    },

    categoryCounts() {
      const map = new Map();
      for (const f of this.files) {
        if (f && f.key) map.set(f.key, f);
      }
      if (this.globalFilesLoaded) {
        for (const f of this.globalFiles) {
          if (f && f.key) map.set(f.key, f);
        }
      }
      const list = Array.from(map.values());
      const counts = { image: 0, video: 0, audio: 0, archive: 0, document: 0 };
      for (const f of list) {
        if (this.isImage(f)) counts.image++;
        else if (this.isVideo(f)) counts.video++;
        else if (this.isAudio(f)) counts.audio++;
        else if (this.isArchive(f)) counts.archive++;
        else if (this.isDocument(f)) counts.document++;
      }
      return counts;
    },

    imageItems() { return this.filteredFiles.filter(this.isImage).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
    mediaItems() { return this.filteredFiles.filter(this.isMedia).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
  },
  methods: {
    onGlobalKeydown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.showSearchInput = true;
        this.$nextTick(() => this.$refs.searchInputRef?.focus());
      } else if (e.key === "?" || (e.shiftKey && e.key === "?")) {
        const tag = document.activeElement?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          this.showHotkeysModal = true;
        }
      }
    },

    onSearchBlur() {
      if (!this.search) {
        this.showSearchInput = false;
      }
    },

    loadCachedGlobalIndex() {
      try {
        const cacheKey = `flaredrive_index_cache_${this.storageId}`;
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length) {
            this.globalFiles = parsed.items;
            this.globalFilesLoaded = true;
          }
        }
      } catch (err) {
        console.warn("Load index cache error", err);
      }
    },

    saveGlobalIndexCache() {
      try {
        const cacheKey = `flaredrive_index_cache_${this.storageId}`;
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), items: this.globalFiles }));
      } catch (err) {
        console.warn("Save index cache error", err);
      }
    },

    selectCategory(cat) {
      this.filterCategory = cat;
      this.mediaPlayer.visible = false;
      this.lightbox.visible = false;
      this.archiveModal.visible = false;
      if (cat !== "all" && this.autoGlobalScan && !this.globalFilesLoaded) {
        this.fetchGlobalFiles();
      }
    },

    onToggleGlobalScan() {
      if (this.autoGlobalScan && !this.globalFilesLoaded) {
        this.fetchGlobalFiles();
      }
    },

    async fetchGlobalFiles(silent = false) {
      try {
        const items = await this.getAllItems("");
        this.globalFiles = items.filter((item) => item.key && !item.key.endsWith("_$folder$"));
        this.globalFilesLoaded = true;
        this.saveGlobalIndexCache();
      } catch (err) {
        console.warn("Global scan failed", err);
      }
    },

    async getAllItems(prefix = "") {
      try {
        const cleanPrefix = prefix ? (prefix.endsWith("/") ? prefix : `${prefix}/`) : "";
        const response = await fetch(`/api/children/${cleanPrefix}`, { headers: this.storageHeaders() });
        if (!response.ok) return [];
        const data = await response.json();
        const items = [...(data.value || [])];
        for (const folder of data.folders || []) {
          items.push({ key: `${folder}_$folder$` });
          const subItems = await this.getAllItems(folder);
          items.push(...subItems);
        }
        return items;
      } catch (err) {
        console.warn("getAllItems failed for prefix:", prefix, err);
        return [];
      }
    },

    isImage(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("image/")) return true; return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|heic|ico)$/i.test(file.key || ""); },
    isVideo(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("video/")) return true; return /\.(mp4|webm|mkv|mov|m4v|avi|flv|wmv|3gp)$/i.test(file.key || ""); },
    isAudio(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("audio/")) return true; return /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma|aiff|alac)$/i.test(file.key || ""); },
    isArchive(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.includes("zip") || type.includes("rar") || type.includes("compressed") || type.includes("tar") || type.includes("archive")) return true; return /\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|apk|exe|deb|pkg)$/i.test(file.key || ""); },
    isDocument(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.includes("pdf") || type.includes("word") || type.includes("document") || type.includes("text")) return true; return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|json|csv|epub)$/i.test(file.key || ""); },
    isMedia(file) { return this.isVideo(file) || this.isAudio(file); },
    archiveExt(file) { const ext = (file.key || "").split(".").pop(); return ext ? ext.toUpperCase() : "ZIP"; },
    imageUrl(file) {
      if (this.isImage(file)) return this.rawPath(file.key);
      if (file.customMetadata?.thumbnail) return `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(this.storageId)}`;
      return this.rawPath(file.key);
    },
    openFile(file) {
      if (typeof file === "string") {
        const found = (this.autoGlobalScan ? this.sourceFileList : this.files).find((f) => f.key === file);
        if (found) file = found;
      }
      if (this.isImage(file)) {
        const index = this.imageItems.findIndex((item) => item.file.key === file.key);
        if (index !== -1) {
          this.lightbox.index = index;
          this.lightbox.visible = true;
          return;
        }
      }
      if (this.isMedia(file)) {
        const index = this.mediaItems.findIndex((item) => item.file.key === file.key);
        if (index !== -1) {
          this.mediaPlayer.index = index;
          this.mediaPlayer.visible = true;
          return;
        }
      }
      if (this.isArchive(file)) {
        this.archiveModal.file = { ...file, name: this.fileName(file.key), url: this.rawPath(file.key), file };
        this.archiveModal.visible = true;
        return;
      }
      this.preview(this.rawPath(file.key));
    },
    onDragEnter(e) { if (e.dataTransfer?.types?.includes("Files")) this.isDragging = true; }, onDragLeave(e) { if (e.clientX === 0 || e.clientY === 0) this.isDragging = false; },
    fileName(key) { return key.split("/").filter(Boolean).pop() || key; }, folderName(folder) { return folder.split("/").filter(Boolean).pop() || "文件"; }, pathUntil(index) { return `${this.pathParts.slice(0, index + 1).join("/")}/`; }, goToFolder(path) { this.filterCategory = "all"; this.mediaPlayer.visible = false; this.lightbox.visible = false; this.archiveModal.visible = false; this.cwd = path; }, formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }, rawPath(key) { const path = `/raw/${key}`; return this.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(this.storageId)}`; }, authHeaders() { if (!this.authCredentials) return {}; return { Authorization: `Basic ${btoa(`${this.authCredentials.username}:${this.authCredentials.password}`)}` }; }, storageHeaders() { return { "x-storage-id": this.storageId, ...this.authHeaders() }; }, copyLink(link) { navigator.clipboard.writeText(new URL(link, window.location.origin).toString()); this.closeContext(); }, openContext(item, event) { this.focusedItem = item; const width = 218; const height = 270; this.contextPosition = { x: Math.min(event?.clientX || 24, window.innerWidth - width - 12), y: Math.min(event?.clientY || 80, window.innerHeight - height - 12) }; this.showContextMenu = true; }, closeContext() { this.showContextMenu = false; },
    openDialog(options, action) { this.dialog = { visible: true, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "", ...options }; this.dialogAction = action; }, closeDialog() { this.dialog.visible = false; this.dialogAction = null; }, onDialogSubmit(value) { const action = this.dialogAction; this.closeDialog(); action?.(value); },
    async login(credentials) {
      try {
        const response = await fetch("/api/write/test", { headers: { Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` } });
        if (!response.ok) return false;
        this.authCredentials = credentials;
        localStorage.setItem("drive-auth", JSON.stringify(credentials));
        sessionStorage.setItem("drive-auth", JSON.stringify(credentials));
        return true;
      } catch (e) { console.error("Login error", e); return false; }
    },
    promptLogin(onSuccess) {
      this.openDialog(
        { mode: "login", title: "登录资源站", message: "输入管理员账号和密码", confirmText: "登录" },
        async (credentials) => {
          const ok = await this.login(credentials);
          if (ok) { onSuccess?.(); } else {
            this.promptLogin(onSuccess);
            this.$nextTick(() => { this.dialog.error = "账号或密码不合规，请重试"; });
          }
        }
      );
    },
    logout() { localStorage.removeItem("drive-auth"); sessionStorage.removeItem("drive-auth"); this.authCredentials = null; location.reload(); },
    async runContextAction(action) {
      const item = this.focusedItem;
      this.closeContext();
      if (action === "logout") return this.logout();
      if (action === "upload") return this.openUploadWithAuth();
      if (action === "create-folder") return this.createFolder();
      if (action === "paste") return this.pasteFile();
      if (!item) return;
      if (action === "copy-item") {
        this.clipboard = { action: "copy", item };
        return;
      }
      if (action === "cut-item") {
        this.clipboard = { action: "cut", item };
        return;
      }
      if (action === "open") return this.goToFolder(item);
      if (action === "preview") {
        const targetFile = typeof item === "string" ? this.files.find((f) => f.key === item) : item;
        if (targetFile) return this.openFile(targetFile);
        return this.preview(this.rawPath(item.key || item));
      }
      if (action === "download") {
        if (typeof item === "string") return;
        const link = document.createElement("a");
        link.href = this.rawPath(item.key);
        link.download = this.fileName(item.key);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      if (action === "copy-link" || action === "share") {
        const targetFile = typeof item === "object" ? item : { key: item };
        this.shareModal = { visible: true, file: targetFile, rawUrl: typeof item === "string" ? `/?p=${encodeURIComponent(item)}&storage=${encodeURIComponent(this.storageId)}` : this.rawPath(item.key) };
        return;
      }
      if (action === "rename") return this.renameFile(typeof item === "string" ? item : item.key);
      if (action === "move") return this.moveFile(typeof item === "string" ? `${item}_$folder$` : item.key);
      if (action === "delete") return this.removeFile(typeof item === "string" ? `${item}_$folder$` : item.key);
    },
    sortItems() { const compare = (a, b) => this.order === "size-asc" ? a.size - b.size : this.order === "size-desc" ? b.size - a.size : a.key.localeCompare(b.key, "zh-CN"); this.files.sort(compare); this.folders.sort((a, b) => a.localeCompare(b, "zh-CN")); }, async copyPaste(source, target) { await axios.put(`/api/write/items/${target}`, "", { headers: { ...this.storageHeaders(), "x-amz-copy-source": encodeURIComponent(source) } }); },
    async createFolder() { this.openDialog({ title: "新建文件夹", message: "为文件夹输入一个清晰的名称", confirmText: "创建" }, async (folderName) => { if (!folderName) return; try { await axios.put(`/api/write/items/${this.cwd}${folderName}/_$folder$`, "", { headers: this.storageHeaders() }); this.showUploadPopup = false; this.fetchFiles(); } catch (error) { this.handleWriteError(error); console.error("Create folder failed", error); } }); },
    async fetchStorages() { try { const response = await fetch("/api/storages"); const data = await response.json(); if (Array.isArray(data.storages) && data.storages.length) { this.storageOptions = data.storages; if (!this.storageOptions.some((item) => item.id === this.storageId)) this.storageId = this.storageOptions[0].id; } } catch (error) { console.warn("Storage discovery failed", error); } },
    async fetchFiles(forceScan = false) {
      this.loading = true;
      try {
        const response = await fetch(`/api/children/${this.cwd}`, { headers: this.storageHeaders() });
        const items = await response.json();
        this.files = items.value || [];
        this.folders = items.folders || [];
        this.sortItems();
        if (this.autoGlobalScan && (!this.globalFilesLoaded || forceScan)) {
          this.fetchGlobalFiles(true);
        }
      } catch (error) {
        console.error("Fetch files failed", error);
        this.files = [];
        this.folders = [];
      } finally {
        this.loading = false;
      }
    },
    formatSize(size) { if (!size || isNaN(size)) return "0 B"; const units = ["B", "KB", "MB", "GB", "TB"]; let index = 0; while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; } return `${size.toFixed(index ? 1 : 0)} ${units[index]}`; }, onDrop(event) { this.isDragging = false; const files = event.dataTransfer.items ? [...event.dataTransfer.items].filter((item) => item.kind === "file").map((item) => item.getAsFile()) : event.dataTransfer.files; this.uploadFiles(files); }, onMenuClick(value) { if (value === "logout") return this.logout(); if (value === "paste") return this.pasteFile(); this.order = value; this.sortItems(); }, onUploadClicked(fileElement) { if (!fileElement.value) return; this.uploadFiles(fileElement.files); this.showUploadPopup = false; fileElement.value = null; }, preview(itemOrUrl) { if (typeof itemOrUrl === "object") return this.openFile(itemOrUrl); window.open(itemOrUrl, "_blank", "noopener"); },
    async pasteFile() {
      if (!this.clipboard || !this.clipboard.item) return;
      const { action, item } = this.clipboard;
      const isFolder = typeof item === "string";
      const sourceKey = isFolder ? `${item}_$folder$` : item.key;
      const originalName = isFolder ? this.folderName(item) : this.fileName(item.key);
      
      this.openDialog({
        title: action === "cut" ? "剪切项目" : "粘贴项目",
        message: "可以修改新文件名/目录名，留空使用原名称",
        initialValue: originalName,
        confirmText: "粘贴"
      }, async (name) => {
        if (!name) name = originalName;
        try {
          if (isFolder) {
            const sourceBase = item.endsWith("/") ? item : `${item}/`;
            const targetBase = `${this.cwd}${name}/`;
            const items = await this.getAllItems(sourceBase);
            for (const subItem of items) {
              const nextKey = `${targetBase}${subItem.key.slice(sourceBase.length)}`;
              await this.copyPaste(subItem.key, nextKey);
              if (action === "cut") {
                await axios.delete(`/api/write/items/${subItem.key}`, { headers: this.storageHeaders() });
              }
            }
            await this.copyPaste(sourceKey, `${targetBase}_$folder$`);
            if (action === "cut") {
              await axios.delete(`/api/write/items/${sourceKey}`, { headers: this.storageHeaders() });
              this.clipboard = null;
            }
          } else {
            const targetKey = `${this.cwd}${name}`;
            await this.copyPaste(sourceKey, targetKey);
            if (action === "cut") {
              await axios.delete(`/api/write/items/${sourceKey}`, { headers: this.storageHeaders() });
              this.clipboard = null;
            }
          }
          this.fetchFiles(true);
        } catch (error) {
          this.handleWriteError(error);
        }
      });
    },
    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        await this.fetchFiles(true);
        this.uploadProgress = null;
        this.uploadFileName = "";
        this.speedText = "";
        this.isUploading = false;
        return;
      }
      const { basedir, file } = this.uploadQueue.shift();
      this.uploadFileName = file.name;
      this.uploadProgress = 0;
      this.speedText = "准备中...";
      let thumbnailDigest = null;
      if (file.type.startsWith("image/") || (file.type.startsWith("video/") && file.size < 50 * 1024 * 1024)) {
        try {
          const thumbnail = await generateThumbnail(file);
          if (thumbnail) {
            thumbnailDigest = await blobDigest(thumbnail);
            await axios.put(`/api/write/items/_$flaredrive$/thumbnails/${thumbnailDigest}.png`, thumbnail, {
              headers: { ...this.storageHeaders(), "Content-Type": "image/png" }
            });
          }
        } catch (error) {
          console.warn("Thumbnail generation failed", error);
        }
      }
      try {
        const contentType = file.type || "application/octet-stream";
        const headers = {
          ...this.storageHeaders(),
          "Content-Type": contentType,
          ...(thumbnailDigest ? { "fd-thumbnail": thumbnailDigest } : {})
        };
        let lastLoaded = 0;
        let lastTime = Date.now();
        const onUploadProgress = ({ loaded, total }) => {
          this.uploadProgress = total ? (loaded * 100) / total : 0;
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5 && loaded > lastLoaded) {
            const bytesDiff = loaded - lastLoaded;
            const bps = bytesDiff / timeDiff;
            this.speedText = `${this.formatSize(bps)}/s`;
            lastLoaded = loaded;
            lastTime = now;
          }
        };
        if (file.size >= MULTIPART_THRESHOLD) {
          await multipartUpload(`${basedir}${file.name}`, file, { headers, onUploadProgress });
        } else {
          await axios.put(`/api/write/items/${basedir}${file.name}`, file, { headers, onUploadProgress });
        }
      } catch (error) {
        console.error(`Upload ${file.name} failed`, error);
        if (error?.response?.status === 401) {
          this.uploadQueue.unshift({ basedir, file });
          this.isUploading = false;
          this.uploadProgress = null;
          this.uploadFileName = "";
          this.speedText = "";
          this.promptLogin(() => { this.isUploading = true; this.processUploadQueue(); });
          return;
        }
      }
      this.processUploadQueue();
    },
    handleWriteError(error) { if (error?.response?.status === 401) { this.promptLogin(() => { this.fetchFiles(true); }); } }, async removeFile(key) { this.openDialog({ mode: "confirm", title: "删除资源", message: `确定删除“${this.fileName(key)}”吗？`, confirmText: "删除" }, async () => { try { await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(true); } catch (error) { this.handleWriteError(error); } }); }, async renameFile(key) { this.openDialog({ title: "重命名资源", message: "输入新的资源名称", initialValue: this.fileName(key), confirmText: "保存" }, async (name) => { if (!name || name === this.fileName(key)) return; try { await this.copyPaste(key, `${this.cwd}${name}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(true); } catch (error) { this.handleWriteError(error); } }); },
    async moveFile(key) { this.openDialog({ title: "移动项目", message: "输入目标文件夹路径，留空移动到根目录", confirmText: "移动" }, async (destination) => { const target = destination ? `${destination.replace(/^\/+|\/+$/g, "")}/` : ""; const isFolder = key.endsWith("_$folder$"); const sourceName = isFolder ? this.folderName(key.slice(0, -9)) : this.fileName(key); try { if (isFolder) { const sourceBase = key.slice(0, -9); const targetBase = `${target}${sourceName}/`; const items = await this.getAllItems(sourceBase); for (const item of items) { const nextKey = `${targetBase}${item.key.slice(sourceBase.length)}`; await this.copyPaste(item.key, nextKey); await axios.delete(`/api/write/items/${item.key}`, { headers: this.storageHeaders() }); } await this.copyPaste(key, `${targetBase}_$folder$`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } else { await this.copyPaste(key, `${target}${sourceName}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } this.fetchFiles(true); } catch (error) { this.handleWriteError(error); console.error("Move failed", error); } }); },
    openUploadWithAuth() {
      if (!this.authCredentials) {
        this.promptLogin(() => { this.showUploadPopup = true; });
        return;
      }
      this.showUploadPopup = true;
    },
    uploadFiles(files) {
      if (!files || !files.length) return;
      if (!this.authCredentials) {
        this.promptLogin(() => this.uploadFiles(files));
        return;
      }
      let targetCwd = this.cwd;
      if (targetCwd && !targetCwd.endsWith("/")) targetCwd += "/";
      this.uploadQueue.push(...Array.from(files).map((file) => ({ basedir: targetCwd, file })));
      if (!this.isUploading && this.uploadQueue.length) {
        this.isUploading = true;
        this.processUploadQueue();
      }
    },
  },
  watch: {
    cwd: { handler() { this.fetchFiles(); const url = new URL(window.location); this.cwd ? url.searchParams.set("p", this.cwd) : url.searchParams.delete("p"); window.history.pushState(null, "", url); document.title = `${this.currentFolderName} · 天才猫 R2 网盘系统`; }, immediate: true },
    storageId(value) { const url = new URL(window.location); value === "default" ? url.searchParams.delete("storage") : url.searchParams.set("storage", value); window.history.replaceState(null, "", url); this.loadCachedGlobalIndex(); this.fetchFiles(); },
    viewMode(value) { localStorage.setItem("drive-view", value); }
  },
  created() {
    this.loadCachedGlobalIndex();
    this.fetchStorages();
    window.addEventListener("popstate", () => {
      const url = new URL(window.location);
      this.cwd = url.searchParams.get("p") || "";
      this.storageId = url.searchParams.get("storage") || "default";
    });
    window.addEventListener("keydown", this.onGlobalKeydown);
  },
  unmounted() {
    window.removeEventListener("keydown", this.onGlobalKeydown);
  },
  components: { Menu, MimeIcon, UploadPopup, UploadProgress, ContextMenu, PromptDialog, LightboxModal, MediaPlayerModal, ArchiveModal, HotkeysModal, CatLogo, ShareModal },
};
</script>
