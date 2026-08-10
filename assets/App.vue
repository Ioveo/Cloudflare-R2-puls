<template>
<main class="drive-shell" @click="closeContext" @contextmenu.prevent="openContext(null, $event)" @dragenter.prevent="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop.prevent="onDrop">
    <header class="topbar">
      <a class="brand" href="/" aria-label="返回文件库首页"><span class="brand-mark"><i class="ph ph-cube-focus"></i></span><span>文件库</span></a>
      <label class="search-box">
        <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
        <input v-model.trim="search" type="search" placeholder="搜索当前目录" aria-label="搜索当前目录" />
        <button v-if="search" class="icon-button small" type="button" title="清除搜索" @click="search = ''">×</button>
      </label>
      <div class="topbar-actions">
        <label class="storage-switcher" title="切换存储桶"><i class="ph ph-database"></i><select v-model="storageId" aria-label="选择存储桶"><option v-for="storage in storageOptions" :key="storage.id" :value="storage.id">{{ storage.label }}</option></select></label>
        <button class="icon-button" type="button" title="刷新" @click="fetchFiles"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i></button>
        <div class="menu-button"><button class="icon-button" type="button" title="显示选项" @click="showMenu = true"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i></button><Menu v-model="showMenu" :items="menuItems" @click="onMenuClick" /></div>
      </div>
    </header>
    <section class="workspace">
      <div class="workspace-heading">
        <div>
          <nav class="breadcrumbs" aria-label="当前位置"><button type="button" @click="goToFolder('')">文件</button><template v-for="(part, index) in pathParts" :key="`${part}-${index}`"><span aria-hidden="true">/</span><button type="button" @click="goToFolder(pathUntil(index))">{{ part }}</button></template></nav>
          <h1>{{ currentFolderName }}</h1><p>{{ itemCountText }}</p>
        </div>
        <div class="view-controls" aria-label="视图设置"><button class="view-button" :class="{ active: viewMode === 'grid' }" type="button" title="网格视图" @click="viewMode = 'grid'"><i class="ph ph-squares-four" aria-hidden="true"></i></button><button class="view-button" :class="{ active: viewMode === 'list' }" type="button" title="列表视图" @click="viewMode = 'list'"><i class="ph ph-list-bullets" aria-hidden="true"></i></button></div>
      </div>
      <section v-if="loading" class="file-grid loading-grid" :class="viewMode"><div v-for="item in 8" :key="item" class="file-skeleton"></div></section>
      <section v-else-if="!filteredFiles.length && !filteredFolders.length" class="empty-state"><div class="empty-icon"><i class="ph ph-folder-open"></i></div><h2>{{ search ? '没有匹配的文件' : '这个文件夹还是空的' }}</h2><p>{{ search ? '尝试使用其他关键词进行搜索。' : '拖放文件到这里，或使用右下角的上传按钮。' }}</p><button v-if="!search" class="primary-button" type="button" @click="showUploadPopup = true"><i class="ph ph-upload-simple"></i> 上传文件</button></section>
      <section v-else class="file-grid" :class="viewMode">
        <article v-if="cwd" class="file-card parent-card" tabindex="0" @click="goToFolder(parentPath)" @keydown.enter="goToFolder(parentPath)"><div class="file-symbol folder-symbol"><i class="ph ph-arrow-bend-up-left"></i></div><div class="file-main"><strong>上一级目录</strong><span>返回父文件夹</span></div></article>
        <article v-for="folder in filteredFolders" :key="folder" class="file-card folder-card" tabindex="0" @click="goToFolder(folder)" @keydown.enter="goToFolder(folder)" @contextmenu.stop.prevent="openContext(folder, $event)"><div class="file-symbol folder-symbol"><i class="ph ph-folder-simple"></i></div><div class="file-main"><strong>{{ folderName(folder) }}</strong><span>文件夹</span></div><button class="more-button" type="button" title="更多操作" @click.stop="openContext(folder, $event)"><i class="ph ph-dots-three-outline"></i></button></article>
        <article v-for="file in filteredFiles" :key="file.key" class="file-card" :class="[isImage(file) || isVideo(file) ? 'file-card--photo' : 'file-card--document']" tabindex="0" @click="openFile(file)" @keydown.enter="openFile(file)" @contextmenu.stop.prevent="openContext(file, $event)">
          <div v-if="isImage(file) || isVideo(file)" class="photo-preview">
            <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
            <div v-if="isVideo(file)" class="video-play-badge"><i class="ph ph-play-fill"></i></div>
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
        </article>
      </section>
    </section>
    <Transition name="fade">
      <div v-if="isDragging" class="drag-overlay" @drop.prevent="onDrop">
        <div class="drag-content">
          <div class="drag-icon"><i class="ph ph-cloud-arrow-up"></i></div>
          <h3>释放鼠标立即上传</h3>
          <p>文件将直接保存至「{{ currentFolderName }}」</p>
        </div>
      </div>
    </Transition>
    <UploadProgress v-if="uploadProgress !== null" :progress="uploadProgress" :file-name="uploadFileName" :queue-count="uploadQueue.length" :speed-text="speedText" />
    <button class="upload-button" type="button" title="上传或新建" @click="showUploadPopup = true"><i class="ph ph-plus"></i><span>新建</span></button>
    <UploadPopup v-model="showUploadPopup" @upload="onUploadClicked" @createFolder="createFolder" />
    <ContextMenu :visible="showContextMenu" :x="contextPosition.x" :y="contextPosition.y" :title="contextTitle" :actions="contextActions" @close="closeContext" @select="runContextAction" />
    <PromptDialog v-model="dialog.visible" :mode="dialog.mode" :title="dialog.title" :message="dialog.message" :initial-value="dialog.initialValue" :confirm-text="dialog.confirmText" :error="dialog.error" @submit="onDialogSubmit" />
    <LightboxModal :visible="lightbox.visible" :items="imageItems" :index="lightbox.index" @close="lightbox.visible = false" @change="lightbox.index = $event" />
    <MediaPlayerModal :visible="mediaPlayer.visible" :items="mediaItems" :index="mediaPlayer.index" @close="mediaPlayer.visible = false" @change="mediaPlayer.index = $event" />
  </main>
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
import MediaPlayerModal from "./MediaPlayerModal.vue";

function loadAuthCredentials() {
  try {
    const saved = localStorage.getItem("drive-auth") || sessionStorage.getItem("drive-auth");
    return JSON.parse(saved || "null");
  } catch {
    return null;
  }
}
export default {
  data: () => ({ cwd: new URL(window.location).searchParams.get("p") || "", storageId: new URL(window.location).searchParams.get("storage") || "default", storageOptions: [{ id: "default", label: "主存储" }], files: [], folders: [], clipboard: null, focusedItem: null, contextPosition: { x: 0, y: 0 }, loading: false, order: "name-asc", search: "", viewMode: localStorage.getItem("drive-view") || "grid", showContextMenu: false, showMenu: false, showUploadPopup: false, uploadProgress: null, uploadFileName: "", speedText: "", uploadQueue: [], isUploading: false, isDragging: false, lightbox: { visible: false, index: 0 }, mediaPlayer: { visible: false, index: 0 }, authCredentials: loadAuthCredentials(), dialog: { visible: false, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "" }, dialogAction: null }),
  computed: {
    menuItems() { return [{ text: "按名称排序", value: "name-asc" }, { text: "按大小从小到大", value: "size-asc" }, { text: "按大小从大到小", value: "size-desc" }, { text: "粘贴", value: "paste", disabled: !this.clipboard }, { text: "退出登录", value: "logout" }]; },
    contextTitle() { if (!this.focusedItem) return this.storageOptions.find((item) => item.id === this.storageId)?.label || "文件库"; return typeof this.focusedItem === "string" ? this.folderName(this.focusedItem) : this.fileName(this.focusedItem.key); },
    contextActions() { if (!this.focusedItem) return [{ id: "upload", label: "上传文件", icon: "ph-upload-simple" }, { id: "create-folder", label: "新建文件夹", icon: "ph-folder-plus" }, { id: "paste", label: "粘贴", icon: "ph-clipboard", disabled: !this.clipboard }, { id: "logout", label: "退出登录", icon: "ph-sign-out", danger: true }]; if (typeof this.focusedItem === "string") return [{ id: "open", label: "打开文件夹", icon: "ph-folder-open" }, { id: "copy-link", label: "复制链接", icon: "ph-link" }, { id: "move", label: "移动", icon: "ph-arrows-out-cardinal" }, { id: "delete", label: "删除文件夹", icon: "ph-trash", danger: true }]; return [{ id: "preview", label: "播放/预览", icon: "ph-play-circle" }, { id: "download", label: "下载", icon: "ph-download-simple" }, { id: "copy-link", label: "复制链接", icon: "ph-link" }, { id: "rename", label: "重命名", icon: "ph-pencil-simple" }, { id: "move", label: "移动", icon: "ph-arrows-out-cardinal" }, { id: "delete", label: "删除文件", icon: "ph-trash", danger: true }]; },
    pathParts() { return this.cwd.split("/").filter(Boolean); }, parentPath() { return this.cwd.replace(/[^/]+\/$/, ""); }, currentFolderName() { return this.pathParts.at(-1) || "我的文件"; }, itemCountText() { const count = this.filteredFiles.length + this.filteredFolders.length; return `${count} 个项目${this.search ? " · 搜索结果" : ""}`; },
    filteredFiles() { const query = this.search.toLocaleLowerCase(); return this.files.filter((file) => !query || this.fileName(file.key).toLocaleLowerCase().includes(query)); }, filteredFolders() { const query = this.search.toLocaleLowerCase(); return this.folders.filter((folder) => !query || this.folderName(folder).toLocaleLowerCase().includes(query)); },
    imageItems() { return this.filteredFiles.filter(this.isImage).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
    mediaItems() { return this.filteredFiles.filter(this.isMedia).map((f) => ({ name: this.fileName(f.key), url: this.rawPath(f.key), file: f })); },
  },
  methods: {
    isImage(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("image/")) return true; return /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|heic|ico)$/i.test(file.key || ""); },
    isVideo(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("video/")) return true; return /\.(mp4|webm|mkv|mov|m4v|avi|flv|wmv|3gp)$/i.test(file.key || ""); },
    isAudio(file) { const type = (file.httpMetadata?.contentType || "").toLowerCase(); if (type.startsWith("audio/")) return true; return /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma|aiff|alac)$/i.test(file.key || ""); },
    isMedia(file) { return this.isVideo(file) || this.isAudio(file); },
    imageUrl(file) { if (file.customMetadata?.thumbnail) return `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(this.storageId)}`; return this.rawPath(file.key); },
    openFile(file) {
      if (typeof file === "string") {
        const found = this.files.find((f) => f.key === file);
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
      this.preview(this.rawPath(file.key));
    },
    onDragEnter(e) { if (e.dataTransfer?.types?.includes("Files")) this.isDragging = true; }, onDragLeave(e) { if (e.clientX === 0 || e.clientY === 0) this.isDragging = false; },
    fileName(key) { return key.split("/").filter(Boolean).pop() || key; }, folderName(folder) { return folder.split("/").filter(Boolean).pop() || "文件"; }, pathUntil(index) { return `${this.pathParts.slice(0, index + 1).join("/")}/`; }, goToFolder(path) { this.cwd = path; }, formatDate(value) { return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }, rawPath(key) { const path = `/raw/${key}`; return this.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(this.storageId)}`; }, authHeaders() { if (!this.authCredentials) return {}; return { Authorization: `Basic ${btoa(`${this.authCredentials.username}:${this.authCredentials.password}`)}` }; }, storageHeaders() { return { "x-storage-id": this.storageId, ...this.authHeaders() }; }, copyLink(link) { navigator.clipboard.writeText(new URL(link, window.location.origin).toString()); this.closeContext(); }, openContext(item, event) { this.focusedItem = item; const width = 218; const height = 270; this.contextPosition = { x: Math.min(event?.clientX || 24, window.innerWidth - width - 12), y: Math.min(event?.clientY || 80, window.innerHeight - height - 12) }; this.showContextMenu = true; }, closeContext() { this.showContextMenu = false; },
    openDialog(options, action) { this.dialog = { visible: true, mode: "input", title: "", message: "", initialValue: "", confirmText: "确定", error: "", ...options }; this.dialogAction = action; }, closeDialog() { this.dialog.visible = false; this.dialogAction = null; }, onDialogSubmit(value) { const action = this.dialogAction; this.closeDialog(); action?.(value); },
    async login(credentials) { const response = await fetch("/api/write/test", { headers: { Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}` } }); if (!response.ok) { this.dialogAction = (nextCredentials) => this.login(nextCredentials); this.dialog = { ...this.dialog, visible: true, error: "账号或密码不合规" }; return; } this.authCredentials = credentials; localStorage.setItem("drive-auth", JSON.stringify(credentials)); sessionStorage.setItem("drive-auth", JSON.stringify(credentials)); },
    logout() { localStorage.removeItem("drive-auth"); sessionStorage.removeItem("drive-auth"); this.authCredentials = null; location.reload(); },
    async runContextAction(action) {
      const item = this.focusedItem;
      this.closeContext();
      if (action === "logout") return this.logout();
      if (action === "upload") return (this.showUploadPopup = true);
      if (action === "create-folder") return this.createFolder();
      if (action === "paste") return this.pasteFile();
      if (!item) return;
      if (action === "open") return this.goToFolder(item);
      if (action === "preview") {
        const targetFile = typeof item === "string" ? this.files.find((f) => f.key === item) : item;
        if (targetFile) return this.openFile(targetFile);
        return this.preview(this.rawPath(item.key || item));
      }
      if (action === "download") { const link = document.createElement("a"); link.href = this.rawPath(item.key); link.download = this.fileName(item.key); link.click(); return; }
      if (action === "copy-link") return this.copyLink(typeof item === "string" ? `/?p=${encodeURIComponent(item)}&storage=${encodeURIComponent(this.storageId)}` : this.rawPath(item.key));
      if (action === "rename") return this.renameFile(item.key);
      if (action === "move") return this.moveFile(typeof item === "string" ? `${item}_$folder$` : item.key);
      if (action === "delete") return this.removeFile(typeof item === "string" ? `${item}_$folder$` : item.key);
    },
    sortItems() { const compare = (a, b) => this.order === "size-asc" ? a.size - b.size : this.order === "size-desc" ? b.size - a.size : a.key.localeCompare(b.key, "zh-CN"); this.files.sort(compare); this.folders.sort((a, b) => a.localeCompare(b, "zh-CN")); }, async copyPaste(source, target) { await axios.put(`/api/write/items/${target}`, "", { headers: { ...this.storageHeaders(), "x-amz-copy-source": encodeURIComponent(source) } }); },
    async createFolder() { this.openDialog({ title: "新建文件夹", message: "为文件夹输入一个清晰的名称", confirmText: "创建" }, async (folderName) => { if (!folderName) return; try { await axios.put(`/api/write/items/${this.cwd}${folderName}/_$folder$`, "", { headers: this.storageHeaders() }); this.showUploadPopup = false; this.fetchFiles(); } catch (error) { this.handleWriteError(error); console.error("Create folder failed", error); } }); },
    async fetchStorages() { try { const response = await fetch("/api/storages"); const data = await response.json(); if (Array.isArray(data.storages) && data.storages.length) { this.storageOptions = data.storages; if (!this.storageOptions.some((item) => item.id === this.storageId)) this.storageId = this.storageOptions[0].id; } } catch (error) { console.warn("Storage discovery failed", error); } },
    async fetchFiles() { this.loading = true; try { const response = await fetch(`/api/children/${this.cwd}`, { headers: this.storageHeaders() }); const items = await response.json(); this.files = items.value || []; this.folders = items.folders || []; this.sortItems(); } catch (error) { console.error("Fetch files failed", error); this.files = []; this.folders = []; } finally { this.loading = false; } },
    formatSize(size) { const units = ["B", "KB", "MB", "GB", "TB"]; let index = 0; while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; } return `${size.toFixed(index ? 1 : 0)} ${units[index]}`; }, onDrop(event) { this.isDragging = false; const files = event.dataTransfer.items ? [...event.dataTransfer.items].filter((item) => item.kind === "file").map((item) => item.getAsFile()) : event.dataTransfer.files; this.uploadFiles(files); }, onMenuClick(value) { if (value === "logout") return this.logout(); if (value === "paste") return this.pasteFile(); this.order = value; this.sortItems(); }, onUploadClicked(fileElement) { if (!fileElement.value) return; this.uploadFiles(fileElement.files); this.showUploadPopup = false; fileElement.value = null; }, preview(itemOrUrl) { if (typeof itemOrUrl === "object") return this.openFile(itemOrUrl); window.open(itemOrUrl, "_blank", "noopener"); },
    async pasteFile() { if (!this.clipboard) return; this.openDialog({ title: "粘贴文件", message: "可以修改文件名，留空使用原名称", initialValue: this.fileName(this.clipboard), confirmText: "粘贴" }, async (name) => { if (!name) name = this.fileName(this.clipboard); try { await this.copyPaste(this.clipboard, `${this.cwd}${name}`); this.fetchFiles(); } catch (error) { this.handleWriteError(error); } }); },
    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        await this.fetchFiles();
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
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        try {
          const thumbnail = await generateThumbnail(file);
          thumbnailDigest = await blobDigest(thumbnail);
          await axios.put(`/api/write/items/_$flaredrive$/thumbnails/${thumbnailDigest}.png`, thumbnail, {
            headers: { ...this.storageHeaders(), "Content-Type": "image/png" }
          });
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
        this.handleWriteError(error);
        console.error(`Upload ${file.name} failed`, error);
      }
      this.processUploadQueue();
    },
    handleWriteError(error) { if (error?.response?.status === 401) { this.openDialog({ mode: "login", title: "登录文件库", message: "输入 ADMIN 和 PASS 对应的账号密码", confirmText: "登录" }, (credentials) => this.login(credentials)); } }, async removeFile(key) { this.openDialog({ mode: "confirm", title: "删除文件", message: `确定删除“${this.fileName(key)}”吗？`, confirmText: "删除" }, async () => { try { await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(); } catch (error) { this.handleWriteError(error); } }); }, async renameFile(key) { this.openDialog({ title: "重命名文件", message: "输入新的文件名", initialValue: this.fileName(key), confirmText: "保存" }, async (name) => { if (!name || name === this.fileName(key)) return; try { await this.copyPaste(key, `${this.cwd}${name}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); this.fetchFiles(); } catch (error) { this.handleWriteError(error); } }); },
    async moveFile(key) { this.openDialog({ title: "移动项目", message: "输入目标文件夹路径，留空移动到根目录", confirmText: "移动" }, async (destination) => { const target = destination ? `${destination.replace(/^\/+|\/+$/g, "")}/` : ""; const isFolder = key.endsWith("_$folder$"); const sourceName = isFolder ? this.folderName(key.slice(0, -9)) : this.fileName(key); try { if (isFolder) { const sourceBase = key.slice(0, -9); const targetBase = `${target}${sourceName}/`; const items = await this.getAllItems(sourceBase); for (const item of items) { const nextKey = `${targetBase}${item.key.slice(sourceBase.length)}`; await this.copyPaste(item.key, nextKey); await axios.delete(`/api/write/items/${item.key}`, { headers: this.storageHeaders() }); } await this.copyPaste(key, `${targetBase}_$folder$`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } else { await this.copyPaste(key, `${target}${sourceName}`); await axios.delete(`/api/write/items/${key}`, { headers: this.storageHeaders() }); } this.fetchFiles(); } catch (error) { this.handleWriteError(error); console.error("Move failed", error); } }); },
    async getAllItems(prefix) { const response = await fetch(`/api/children/${prefix}`, { headers: this.storageHeaders() }); const data = await response.json(); const items = [...(data.value || [])]; for (const folder of data.folders || []) { items.push({ key: `${folder}_$folder$` }); items.push(...await this.getAllItems(folder)); } return items; }, uploadFiles(files) { if (this.cwd && !this.cwd.endsWith("/")) this.cwd += "/"; this.uploadQueue.push(...Array.from(files).map((file) => ({ basedir: this.cwd, file }))); if (!this.isUploading && this.uploadQueue.length) { this.isUploading = true; this.processUploadQueue(); } },
  },
  watch: { cwd: { handler() { this.fetchFiles(); const url = new URL(window.location); this.cwd ? url.searchParams.set("p", this.cwd) : url.searchParams.delete("p"); window.history.pushState(null, "", url); document.title = `${this.currentFolderName} · 文件库`; }, immediate: true }, storageId(value) { const url = new URL(window.location); value === "default" ? url.searchParams.delete("storage") : url.searchParams.set("storage", value); window.history.replaceState(null, "", url); this.fetchFiles(); }, viewMode(value) { localStorage.setItem("drive-view", value); } },
  created() { this.fetchStorages(); window.addEventListener("popstate", () => { const url = new URL(window.location); this.cwd = url.searchParams.get("p") || ""; this.storageId = url.searchParams.get("storage") || "default"; }); }, components: { Menu, MimeIcon, UploadPopup, UploadProgress, ContextMenu, PromptDialog, LightboxModal, MediaPlayerModal },
};
</script>
