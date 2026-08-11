<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  storageId: { type: String, default: "default" },
  zIndex: { type: Number, default: 38 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "change", "set-wallpaper", "focus"]);

// Views: 'grid' (All Photos Library) vs 'canvas' (Single Photo Detail)
const viewMode = ref("canvas");
const showSidebar = ref(true);
const currentTab = ref("all"); // 'all' | 'recents' | 'favorites'
const gridThumbSize = ref(130); // 80px to 240px
const selectedKeys = ref(new Set());
const wallpaperSavedTip = ref(false);

// Single Photo Viewer Transform States
const activeIndex = ref(props.index || 0);
const zoomScale = ref(1);
const rotation = ref(0);
const isPanning = ref(false);
const panPos = ref({ x: 0, y: 0 });
const panStart = ref({ x: 0, y: 0, initX: 0, initY: 0 });

watch(() => props.index, (val) => {
  activeIndex.value = val;
  resetTransform();
});

watch(() => props.visible, (val) => {
  if (val) {
    if (props.file || props.items.length) {
      viewMode.value = "canvas";
    } else {
      viewMode.value = "grid";
    }
    resetTransform();
  }
});

const displayPhotos = computed(() => {
  if (currentTab.value === "favorites") {
    const favs = JSON.parse(localStorage.getItem("mac-photos-favs") || "[]");
    return props.items.filter((item) => favs.includes(item.file?.key || item.name));
  }
  return props.items;
});

const currentItem = computed(() => {
  if (props.items.length && activeIndex.value >= 0 && activeIndex.value < props.items.length) {
    return props.items[activeIndex.value];
  }
  return props.file ? { name: fileName(props.file.key), url: rawPath(props.file.key), file: props.file } : null;
});

const photoTitle = computed(() => {
  if (viewMode.value === "canvas") {
    return currentItem.value?.name || "照片 (Photos)";
  }
  return `照片图库 (${displayPhotos.value.length} 张照片)`;
});

function fileName(key) {
  return key ? key.split("/").filter(Boolean).pop() || key : "";
}

function rawPath(key) {
  if (!key) return "";
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

// Single Photo View Navigation & Physics
function openSinglePhoto(idx) {
  activeIndex.value = idx;
  emit("change", idx);
  viewMode.value = "canvas";
  resetTransform();
}

function returnToGrid() {
  viewMode.value = "grid";
}

function resetTransform() {
  zoomScale.value = 1;
  rotation.value = 0;
  panPos.value = { x: 0, y: 0 };
}

function zoomIn() {
  zoomScale.value = Math.min(4, Number((zoomScale.value + 0.25).toFixed(2)));
}

function zoomOut() {
  zoomScale.value = Math.max(0.25, Number((zoomScale.value - 0.25).toFixed(2)));
  if (zoomScale.value <= 1) {
    panPos.value = { x: 0, y: 0 };
  }
}

function rotateLeft() {
  rotation.value = (rotation.value - 90) % 360;
}

function rotateRight() {
  rotation.value = (rotation.value + 90) % 360;
}

function prevPhoto() {
  if (props.items.length > 1) {
    activeIndex.value = (activeIndex.value - 1 + props.items.length) % props.items.length;
    emit("change", activeIndex.value);
    resetTransform();
  }
}

function nextPhoto() {
  if (props.items.length > 1) {
    activeIndex.value = (activeIndex.value + 1) % props.items.length;
    emit("change", activeIndex.value);
    resetTransform();
  }
}

// Wallpaper Setting
function setAsDesktopWallpaper(targetUrl = null) {
  const url = targetUrl || currentItem.value?.url;
  if (!url) return;
  localStorage.setItem("mac-custom-wallpaper", url);
  window.dispatchEvent(new CustomEvent("wallpaper-changed", { detail: url }));
  emit("set-wallpaper", url);
  wallpaperSavedTip.value = true;
  setTimeout(() => { wallpaperSavedTip.value = false; }, 3000);
}

// Multi-Selection Logic in Grid View
function toggleSelect(itemKey, e) {
  if (e && (e.metaKey || e.ctrlKey)) {
    if (selectedKeys.value.has(itemKey)) {
      selectedKeys.value.delete(itemKey);
    } else {
      selectedKeys.value.add(itemKey);
    }
  } else {
    if (selectedKeys.value.has(itemKey) && selectedKeys.value.size === 1) {
      selectedKeys.value.clear();
    } else {
      selectedKeys.value.clear();
      selectedKeys.value.add(itemKey);
    }
  }
}

function selectAll() {
  props.items.forEach((item) => selectedKeys.value.add(item.file?.key || item.name));
}

function clearSelection() {
  selectedKeys.value.clear();
}

function downloadSelected() {
  const targets = props.items.filter((item) => selectedKeys.value.has(item.file?.key || item.name));
  targets.forEach((t) => {
    const link = document.createElement("a");
    link.href = t.url;
    link.download = t.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

function setFirstSelectedAsWallpaper() {
  const first = props.items.find((item) => selectedKeys.value.has(item.file?.key || item.name));
  if (first) setAsDesktopWallpaper(first.url);
}

// Mouse Pan & Zoom in Canvas Mode
function onWheel(e) {
  if (viewMode.value !== "canvas") return;
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

function onMouseDown(e) {
  if (viewMode.value !== "canvas") return;
  if (e.button !== 0) return;
  isPanning.value = true;
  panStart.value = {
    x: e.clientX,
    y: e.clientY,
    initX: panPos.value.x,
    initY: panPos.value.y,
  };
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e) {
  if (!isPanning.value) return;
  panPos.value = {
    x: panStart.value.initX + (e.clientX - panStart.value.x),
    y: panStart.value.initY + (e.clientY - panStart.value.y),
  };
}

function onMouseUp() {
  isPanning.value = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
}

function handleKeydown(e) {
  if (!props.visible) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (viewMode.value === "canvas") {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevPhoto();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextPhoto();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomIn();
    } else if (e.key === "-") {
      e.preventDefault();
      zoomOut();
    } else if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      rotateRight();
    } else if (e.key === "0") {
      e.preventDefault();
      resetTransform();
    } else if (e.key === "Escape") {
      returnToGrid();
    }
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <MacWindow
    v-if="visible"
    :title="photoTitle"
    icon="ph-image-square-fill"
    :visible="visible"
    :width="960"
    :height="620"
    :initial-x="110"
    :initial-y="50"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <!-- macOS Native Photos Toolbar -->
    <template #titlebar-right>
      <div class="photos-top-tools">
        <!-- 1. Canvas Mode Back Button -->
        <button v-if="viewMode === 'canvas'" class="mac-back-pill" type="button" title="返回全部照片图库 (Esc)" @click="returnToGrid">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
          <span>全部照片</span>
        </button>

        <!-- 2. Grid Mode View Tabs & Zoom Slider -->
        <template v-if="viewMode === 'grid'">
          <!-- Sidebar Toggle -->
          <button class="mac-tool-btn" :class="{ active: showSidebar }" type="button" title="切换边栏" @click="showSidebar = !showSidebar">
            <i class="ph ph-sidebar-simple"></i>
          </button>

          <!-- Grid Thumbnail Zoom Slider -->
          <div class="grid-zoom-controls" title="调整照片缩略图大小">
            <i class="ph ph-squares-four"></i>
            <input v-model.number="gridThumbSize" type="range" min="80" max="240" step="10" class="mac-slider" />
            <i class="ph ph-square"></i>
          </div>

          <div class="tools-divider"></div>

          <!-- Selection Info & Batch Actions -->
          <div v-if="selectedKeys.size > 0" class="batch-actions-cluster">
            <span class="selection-pill">已选 {{ selectedKeys.size }} 项</span>
            <button class="mac-action-pill highlight" type="button" title="设为壁纸" @click="setFirstSelectedAsWallpaper">
              <i class="ph ph-image"></i>
              <span>设为壁纸</span>
            </button>
            <button class="mac-tool-btn" type="button" title="批量下载" @click="downloadSelected">
              <i class="ph ph-download-simple"></i>
            </button>
            <button class="mac-tool-btn text-btn" type="button" @click="clearSelection">取消</button>
          </div>
          <button v-else class="mac-tool-btn text-btn" type="button" @click="selectAll">全选</button>
        </template>

        <!-- 3. Canvas Mode Controls -->
        <template v-else>
          <span v-if="items.length > 1" class="photo-badge">{{ activeIndex + 1 }} / {{ items.length }}</span>
          <span class="photo-badge zoom-pill">{{ Math.round(zoomScale * 100) }}%</span>

          <div class="tools-divider"></div>

          <!-- Rotate Left / Right -->
          <button class="mac-tool-btn" type="button" title="向左旋转 90°" @click="rotateLeft">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.51-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.89-1.6-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.52-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c3.37 0 6.09 2.72 6.09 6.09s-2.72 6.09-6.09 6.09c-.86 0-1.69-.19-2.46-.51l-1.46 1.46C10.15 19.68 11.53 20 13 20c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/>
            </svg>
          </button>

          <button class="mac-tool-btn" type="button" title="向右旋转 90° (R)" @click="rotateRight">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.55 5.55L11 1v3.07C6.58 4.07 3 7.65 3 12s3.58 8 8 8c1.47 0 2.85-.32 4.08-.88l-1.46-1.46c-.77.32-1.6.51-2.62.51-3.37 0-6.09-2.72-6.09-6.09s2.72-6.09 6.09-6.09V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.41 1.42c.52.75.89 1.6 1.01 2.47h2.02zm-2.03 2c-.14.87-.51 1.72-1.02 2.47l1.41 1.41c.9-1.16 1.45-2.5 1.62-3.88h-2.01zm-1.01 5.32c-1.16.9-2.51 1.44-3.9 1.61V17.9c.87-.15 1.71-.52 2.46-1.03l1.44 1.45z"/>
            </svg>
          </button>

          <!-- Zoom Controls -->
          <button class="mac-tool-btn" type="button" title="放大 (+)" @click="zoomIn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/>
            </svg>
          </button>

          <button class="mac-tool-btn" type="button" title="缩小 (-)" @click="zoomOut">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>
            </svg>
          </button>

          <!-- Set as Wallpaper Special Action -->
          <button
            class="mac-action-pill"
            :class="{ 'is-saved': wallpaperSavedTip }"
            type="button"
            :title="wallpaperSavedTip ? '已成功设置为桌面壁纸' : '将此照片设置为桌面壁纸'"
            @click="setAsDesktopWallpaper()"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <span>{{ wallpaperSavedTip ? '✓ 已设为壁纸' : '设为壁纸' }}</span>
          </button>

          <!-- Download Button -->
          <a class="mac-tool-btn" :href="currentItem?.url" download title="下载高清原图">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
            </svg>
          </a>
        </template>
      </div>
    </template>

    <!-- Main Body Container -->
    <div class="photos-app-body">
      <!-- 1. macOS Photos Sidebar (Only in Grid View) -->
      <aside v-if="viewMode === 'grid' && showSidebar" class="photos-sidebar">
        <div class="sidebar-sec-title">图库</div>
        <button class="p-side-btn" :class="{ active: currentTab === 'all' }" @click="currentTab = 'all'">
          <i class="ph ph-image-fill"></i>
          <span>全部照片</span>
          <span class="p-side-count">{{ items.length }}</span>
        </button>
        <button class="p-side-btn" :class="{ active: currentTab === 'recents' }" @click="currentTab = 'recents'">
          <i class="ph ph-clock-countdown-fill"></i>
          <span>最近项目</span>
        </button>

        <div class="sidebar-sec-title" style="margin-top: 14px;">个人相簿</div>
        <button class="p-side-btn" :class="{ active: currentTab === 'favorites' }" @click="currentTab = 'favorites'">
          <i class="ph ph-heart-fill"></i>
          <span>个人收藏</span>
        </button>
      </aside>

      <!-- 2. Main Content Area -->
      <div class="photos-main-stage">
        <!-- 🖼️ VIEW A: All Photos Grid -->
        <div v-if="viewMode === 'grid'" class="photos-grid-scroll">
          <div
            class="photos-masonry-grid"
            :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridThumbSize}px, 1fr))`, gridAutoRows: `${gridThumbSize}px` }"
          >
            <article
              v-for="(photo, idx) in displayPhotos"
              :key="photo.file?.key || photo.name"
              class="photo-grid-tile"
              :class="{ 'is-selected': selectedKeys.has(photo.file?.key || photo.name) }"
              @click="toggleSelect(photo.file?.key || photo.name, $event)"
              @dblclick="openSinglePhoto(idx)"
            >
              <img :src="photo.url" loading="lazy" :alt="photo.name" />
              <!-- Selection Checkmark Circle -->
              <div class="select-check-circle" :class="{ checked: selectedKeys.has(photo.file?.key || photo.name) }">
                <i class="ph ph-check-bold"></i>
              </div>
              <div class="photo-tile-meta">
                <span class="tile-title">{{ photo.name }}</span>
              </div>
            </article>
          </div>
        </div>

        <!-- 🔍 VIEW B: Single Photo Canvas Viewer -->
        <div v-else class="photos-canvas-view">
          <!-- Canvas Viewport with Pan & Zoom -->
          <div
            class="canvas-viewport"
            :class="{ 'cursor-grab': zoomScale > 1, 'cursor-grabbing': isPanning }"
            @wheel="onWheel"
            @mousedown="onMouseDown"
          >
            <!-- Previous / Next Floating Arrows -->
            <button v-if="items.length > 1" class="canvas-nav-arrow arrow-left" type="button" title="上一张照片 (←)" @click.stop="prevPhoto">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>

            <button v-if="items.length > 1" class="canvas-nav-arrow arrow-right" type="button" title="下一张照片 (→)" @click.stop="nextPhoto">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>

            <!-- Image Stage -->
            <div
              class="photo-stage-wrapper"
              :style="{
                transform: `translate3d(${panPos.x}px, ${panPos.y}px, 0px) scale(${zoomScale}) rotate(${rotation}deg)`,
                transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }"
            >
              <img
                v-if="currentItem"
                :src="currentItem.url"
                :alt="currentItem.name"
                class="main-photo-img"
                draggable="false"
              />
            </div>
          </div>

          <!-- Bottom Filmstrip Thumbnail Carousel -->
          <footer v-if="items.length > 1" class="photos-filmstrip-bar">
            <div class="filmstrip-scroll">
              <div
                v-for="(photo, idx) in items"
                :key="photo.name + idx"
                class="filmstrip-thumb"
                :class="{ active: activeIndex === idx }"
                @click="openSinglePhoto(idx)"
              >
                <img :src="photo.url" loading="lazy" :alt="photo.name" />
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.photos-app-body {
  display: flex;
  flex: 1;
  min-height: 0;
  background: #0d0e12;
  color: #f2f2f7;
  overflow: hidden;
}

[data-theme="light"] .photos-app-body {
  background: #fbfbfd;
  color: #1d1d1f;
}

/* Sidebar */
.photos-sidebar {
  width: 170px;
  background: rgba(0, 0, 0, 0.25);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
}

[data-theme="light"] .photos-sidebar {
  background: rgba(0, 0, 0, 0.03);
  border-right-color: rgba(60, 60, 67, 0.08);
}

.sidebar-sec-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #8e8e93;
  padding: 0 8px 6px;
  letter-spacing: 0.5px;
}

.p-side-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease;
}

.p-side-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.p-side-btn.active {
  background: #0a84ff;
  color: #ffffff;
}

.p-side-btn i {
  font-size: 16px;
}

.p-side-count {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
}

/* Main Stage */
.photos-main-stage {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Grid Scroll */
.photos-grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.photos-masonry-grid {
  display: grid;
  gap: 12px;
}

.photo-grid-tile {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.photo-grid-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.photo-grid-tile.is-selected {
  border-color: #0a84ff;
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.4);
}

.photo-grid-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.select-check-circle {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  border: 1.5px solid rgba(255, 255, 255, 0.8);
  display: grid;
  place-items: center;
  color: transparent;
  font-size: 12px;
  opacity: 0;
  transition: all 0.12s ease;
}

.photo-grid-tile:hover .select-check-circle,
.photo-grid-tile.is-selected .select-check-circle {
  opacity: 1;
}

.select-check-circle.checked {
  background: #0a84ff;
  border-color: #ffffff;
  color: #ffffff;
}

.photo-tile-meta {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 8px 6px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  opacity: 0;
  transition: opacity 0.15s ease;
}

.photo-grid-tile:hover .photo-tile-meta {
  opacity: 1;
}

.tile-title {
  font-size: 10.5px;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* Canvas Single View */
.photos-canvas-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #15161d 0%, #090a0d 100%);
  user-select: none;
}

.canvas-viewport.cursor-grab { cursor: grab; }
.canvas-viewport.cursor-grabbing { cursor: grabbing; }

.photo-stage-wrapper {
  max-width: 90%;
  max-height: 85%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
}

.main-photo-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

/* Nav Arrows */
.canvas-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(20, 21, 28, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 10;
  backdrop-filter: blur(16px);
  opacity: 0.6;
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.canvas-nav-arrow:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.08);
  background: rgba(30, 31, 38, 0.95);
}

.arrow-left { left: 16px; }
.arrow-right { right: 16px; }

/* Filmstrip Bottom Bar */
.photos-filmstrip-bar {
  height: 64px;
  background: rgba(15, 16, 22, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  display: flex;
  align-items: center;
  backdrop-filter: blur(24px);
  overflow-x: auto;
}

.filmstrip-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
}

.filmstrip-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  opacity: 0.55;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.filmstrip-thumb:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.filmstrip-thumb.active {
  opacity: 1;
  border-color: #0a84ff;
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.5);
}

.filmstrip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Toolbar Items */
.photos-top-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mac-back-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mac-back-pill:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: translateX(-1px);
}

.mac-tool-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5ea;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.mac-tool-btn:hover, .mac-tool-btn.active {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.mac-tool-btn.text-btn {
  width: auto;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 600;
}

.grid-zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  font-size: 13px;
  color: #8e8e93;
}

.mac-slider {
  width: 70px;
  height: 4px;
  accent-color: #0a84ff;
  cursor: pointer;
}

.batch-actions-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selection-pill {
  font-size: 11px;
  font-weight: 600;
  color: #0a84ff;
  background: rgba(10, 132, 255, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

.mac-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 7px;
  background: #0a84ff;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.4);
  transition: all 0.15s ease;
}

.mac-action-pill:hover {
  background: #0071e3;
  transform: translateY(-1px);
}

.mac-action-pill.is-saved {
  background: #34c759;
  box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4);
}

.photo-badge {
  font-size: 11px;
  color: #8e8e93;
  font-weight: 600;
}

.tools-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}
</style>
