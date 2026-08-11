<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  minimized: { type: Boolean, default: false },
  file: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  storageId: { type: String, default: "default" },
  zIndex: { type: Number, default: 38 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "minimize", "change", "set-wallpaper", "focus", "upload"]);

// Views: 'grid' (All Photos Library) vs 'canvas' (Single Photo Detail)
const viewMode = ref("grid");
const showSidebar = ref(true);
const currentTab = ref("all"); // 'all' | 'recents' | 'favorites'
const gridThumbSize = ref(130); // 80px to 240px
const selectedKeys = ref(new Set());
const wallpaperSavedTip = ref(false);
const showInfoPanel = ref(false);
const favorites = ref(JSON.parse(localStorage.getItem("mac-photos-favs") || "[]"));

// Single Photo Dimensions & Ratio Detection
const photoDimensions = ref({ width: 0, height: 0, ratio: 16 / 9, ratioText: "自适应" });

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
  detectCurrentImageDimensions();
});

watch(() => props.visible, (val) => {
  if (val) {
    if (props.file) {
      viewMode.value = "canvas";
    } else {
      viewMode.value = "grid";
    }
    resetTransform();
    detectCurrentImageDimensions();
  }
});

const currentItem = computed(() => {
  if (props.items.length && activeIndex.value >= 0 && activeIndex.value < props.items.length) {
    return props.items[activeIndex.value];
  }
  return props.file ? { name: fileName(props.file.key), url: rawPath(props.file.key), file: props.file } : null;
});

const displayPhotos = computed(() => {
  if (currentTab.value === "favorites") {
    return props.items.filter((item) => favorites.value.includes(item.file?.key || item.name));
  }
  return props.items;
});

const isCurrentFavorite = computed(() => {
  if (!currentItem.value) return false;
  const key = currentItem.value.file?.key || currentItem.value.name;
  return favorites.value.includes(key);
});

// Dynamic Adaptive Aspect Ratio Window Sizing (9:16 竖屏, 16:9 宽屏, 1:1 正方形, 4:3)
const windowBounds = computed(() => {
  if (viewMode.value === "grid") {
    return { width: 960, height: 620 };
  }
  const ratio = photoDimensions.value.ratio || 1.6;
  const maxW = typeof window !== "undefined" ? Math.min(window.innerWidth - 80, 1150) : 1000;
  const maxH = typeof window !== "undefined" ? Math.min(window.innerHeight - 110, 800) : 720;
  const chromeH = props.items.length > 1 ? 100 : 44;

  if (ratio < 0.75) {
    // 9:16 or Tall Portrait (竖屏照片)
    const targetH = Math.min(maxH, 750);
    const contentH = targetH - chromeH;
    const targetW = Math.max(460, Math.min(maxW, Math.round(contentH * ratio) + 32));
    return { width: targetW, height: targetH };
  } else if (ratio > 1.45) {
    // 16:9 or Ultra-wide Landscape (宽屏照片)
    const targetW = Math.min(maxW, 980);
    const contentW = targetW - 32;
    const targetH = Math.max(480, Math.min(maxH, Math.round(contentW / ratio) + chromeH));
    return { width: targetW, height: targetH };
  } else {
    // 1:1 Square, 4:3, 3:2, or 3:4 Normal Proportions
    const targetH = Math.min(maxH, 700);
    const contentH = targetH - chromeH;
    const targetW = Math.max(540, Math.min(maxW, Math.round(contentH * ratio) + 32));
    return { width: targetW, height: targetH };
  }
});

function detectCurrentImageDimensions() {
  if (!currentItem.value?.url) return;
  const img = new Image();
  img.onload = () => {
    const nw = img.naturalWidth || 1920;
    const nh = img.naturalHeight || 1080;
    const ratio = nw / nh;
    let text = "自适应";
    if (Math.abs(ratio - 9 / 16) < 0.1) text = "9:16 竖屏";
    else if (Math.abs(ratio - 16 / 9) < 0.1) text = "16:9 宽屏";
    else if (Math.abs(ratio - 1) < 0.08) text = "1:1 正方形";
    else if (Math.abs(ratio - 4 / 3) < 0.1) text = "4:3 横屏";
    else if (Math.abs(ratio - 3 / 4) < 0.1) text = "3:4 竖屏";
    else if (ratio < 0.8) text = `${nw}×${nh} (竖屏)`;
    else text = `${nw}×${nh} (横屏)`;

    photoDimensions.value = { width: nw, height: nh, ratio, ratioText: text };
  };
  if (currentItem.value?.url) img.src = currentItem.value.url;
}

function cleanFileName(key) {
  if (!key) return "";
  let name = key.split("/").filter(Boolean).pop() || key;
  name = name.replace(/~[a-zA-Z0-9_\-]+(?=\.[a-zA-Z0-9]+$)/, "");
  name = name.split("?")[0];
  return name;
}

function truncateMiddle(str, maxLen = 22) {
  if (!str || str.length <= maxLen) return str;
  const extIndex = str.lastIndexOf(".");
  const ext = extIndex !== -1 ? str.slice(extIndex) : "";
  const base = extIndex !== -1 ? str.slice(0, extIndex) : str;
  const avail = maxLen - ext.length - 3;
  if (avail <= 4) return str.slice(0, maxLen - 3) + "..." + ext;
  const front = Math.ceil(avail / 2);
  const back = Math.floor(avail / 2);
  return `${base.slice(0, front)}...${base.slice(-back)}${ext}`;
}

const photoTitle = computed(() => {
  if (viewMode.value === "canvas") {
    return "照片";
  }
  return `照片图库 (${displayPhotos.value.length} 张照片)`;
});

function fileName(key) {
  return cleanFileName(key);
}

function rawPath(key) {
  if (!key) return "";
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function toggleFavorite() {
  if (!currentItem.value) return;
  const key = currentItem.value.file?.key || currentItem.value.name;
  if (favorites.value.includes(key)) {
    favorites.value = favorites.value.filter((k) => k !== key);
  } else {
    favorites.value.push(key);
  }
  localStorage.setItem("mac-photos-favs", JSON.stringify(favorites.value));
}

// Single Photo View Navigation & Physics
function openSinglePhoto(idx) {
  activeIndex.value = idx;
  emit("change", idx);
  viewMode.value = "canvas";
  resetTransform();
  detectCurrentImageDimensions();
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
    detectCurrentImageDimensions();
  }
}

function nextPhoto() {
  if (props.items.length > 1) {
    activeIndex.value = (activeIndex.value + 1) % props.items.length;
    emit("change", activeIndex.value);
    resetTransform();
    detectCurrentImageDimensions();
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
    } else if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      showInfoPanel.value = !showInfoPanel.value;
    }
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  detectCurrentImageDimensions();
});

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
    :minimized="minimized"
    :width="windowBounds.width"
    :height="windowBounds.height"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
    @minimize="emit('minimize')"
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

          <button class="mac-action-pill highlight" type="button" title="上传照片至照片文件夹" @click="emit('upload')">
            <i class="ph ph-plus-bold"></i>
            <span>添加照片</span>
          </button>

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
          <span class="photo-badge ratio-pill">{{ photoDimensions.ratioText }}</span>

          <div class="tools-divider"></div>

          <!-- Favorite Heart Button -->
          <button
            class="mac-tool-btn fav-btn"
            :class="{ active: isCurrentFavorite }"
            type="button"
            :title="isCurrentFavorite ? '取消个人收藏' : '添加到个人收藏'"
            @click="toggleFavorite"
          >
            <i class="ph" :class="isCurrentFavorite ? 'ph-heart-fill' : 'ph-heart'"></i>
          </button>

          <!-- Rotate Right -->
          <button class="mac-tool-btn" type="button" title="向右旋转 90° (R)" @click="rotateRight">
            <i class="ph ph-arrow-clockwise"></i>
          </button>

          <!-- Zoom In / Out -->
          <button class="mac-tool-btn" type="button" title="放大 (+)" @click="zoomIn">
            <i class="ph ph-magnifying-glass-plus"></i>
          </button>
          <button class="mac-tool-btn" type="button" title="缩小 (-)" @click="zoomOut">
            <i class="ph ph-magnifying-glass-minus"></i>
          </button>

          <!-- ℹ️ Info Exif Inspector Popover Toggle -->
          <button
            class="mac-tool-btn info-btn"
            :class="{ active: showInfoPanel }"
            type="button"
            title="显示照片信息 (I)"
            @click="showInfoPanel = !showInfoPanel"
          >
            <i class="ph ph-info"></i>
          </button>

          <div class="tools-divider"></div>

          <!-- Set as Wallpaper Special Action -->
          <button
            class="mac-action-pill"
            :class="{ 'is-saved': wallpaperSavedTip }"
            type="button"
            :title="wallpaperSavedTip ? '已成功设置为桌面壁纸' : '将此照片设置为桌面壁纸'"
            @click="setAsDesktopWallpaper()"
          >
            <i class="ph ph-image"></i>
            <span>{{ wallpaperSavedTip ? '✓ 已设壁纸' : '设为壁纸' }}</span>
          </button>

          <!-- Download Button -->
          <a class="mac-tool-btn" :href="currentItem?.url" download title="下载高清原图">
            <i class="ph ph-download-simple"></i>
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
          <span class="p-side-count">{{ favorites.length }}</span>
        </button>
      </aside>

      <!-- 2. Main Content Area -->
      <div class="photos-main-stage">
        <!-- 🖼️ VIEW A: All Photos Grid -->
        <div v-if="viewMode === 'grid'" class="photos-grid-scroll">
          <!-- Empty State -->
          <div v-if="displayPhotos.length === 0" class="photos-empty-state">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 100 100" width="80" height="80">
                <rect x="6" y="6" width="88" height="88" rx="20" fill="#ffffff" />
                <g transform="translate(50, 50)">
                  <ellipse cx="0" cy="-22" rx="7.5" ry="15" fill="#ff2d55" opacity="0.9" />
                  <ellipse cx="15.5" cy="-15.5" rx="7.5" ry="15" fill="#ff9500" opacity="0.9" transform="rotate(45)" />
                  <ellipse cx="22" cy="0" rx="7.5" ry="15" fill="#ffcc00" opacity="0.9" transform="rotate(90)" />
                  <ellipse cx="15.5" cy="15.5" rx="7.5" ry="15" fill="#34c759" opacity="0.9" transform="rotate(135)" />
                  <ellipse cx="0" cy="22" rx="7.5" ry="15" fill="#00c7be" opacity="0.9" transform="rotate(180)" />
                  <ellipse cx="-15.5" cy="15.5" rx="7.5" ry="15" fill="#007aff" opacity="0.9" transform="rotate(225)" />
                  <ellipse cx="-22" cy="0" rx="7.5" ry="15" fill="#5856d6" opacity="0.9" transform="rotate(270)" />
                  <ellipse cx="-15.5" cy="-15.5" rx="7.5" ry="15" fill="#af52de" opacity="0.9" transform="rotate(315)" />
                  <circle cx="0" cy="0" r="6" fill="#ffffff" />
                </g>
              </svg>
            </div>
            <h3>图库暂无照片</h3>
            <p>全盘照片及保存在「照片」系统目录中的图像将自动在此同步呈现</p>
            <button class="empty-upload-btn" type="button" @click="emit('upload')">
              <i class="ph ph-plus-circle-fill"></i>
              <span>添加第一张照片</span>
            </button>
          </div>

          <div
            v-else
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
                :class="{ 'is-portrait': photoDimensions.ratio < 0.85 }"
                draggable="false"
                @load="detectCurrentImageDimensions"
              />
            </div>

            <!-- ℹ️ Apple macOS Photos Floating Info Card -->
            <div v-if="showInfoPanel && currentItem" class="photo-info-popover">
              <div class="info-header">
                <strong>照片详细信息</strong>
                <button class="close-info-btn" type="button" @click="showInfoPanel = false">×</button>
              </div>
              <div class="info-rows">
                <div class="info-row">
                  <span class="info-label">文件名</span>
                  <span class="info-val" :title="currentItem.name">{{ currentItem.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">图像尺寸</span>
                  <span class="info-val font-mono">{{ photoDimensions.width }} × {{ photoDimensions.height }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">屏幕画幅</span>
                  <span class="info-val highlight-blue">{{ photoDimensions.ratioText }}</span>
                </div>
                <div v-if="currentItem.file?.size" class="info-row">
                  <span class="info-label">文件大小</span>
                  <span class="info-val">{{ formatSize(currentItem.file.size) }}</span>
                </div>
                <div v-if="currentItem.file?.uploaded" class="info-row">
                  <span class="info-label">存储时间</span>
                  <span class="info-val">{{ new Date(currentItem.file.uploaded).toLocaleString() }}</span>
                </div>
              </div>
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
  max-width: 95%;
  max-height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
}

.main-photo-img {
  max-width: 100%;
  max-height: 74vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}

.main-photo-img.is-portrait {
  max-height: 78vh;
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

/* ℹ️ Info Popover */
.photo-info-popover {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 260px;
  background: rgba(25, 26, 33, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(28px);
  padding: 12px 14px;
  z-index: 25;
  animation: info-pop 0.18s ease-out both;
}

[data-theme="light"] .photo-info-popover {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
}

@keyframes info-pop {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  margin-bottom: 10px;
  font-size: 13px;
}

[data-theme="light"] .info-header {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

.close-info-btn {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.6;
}

.close-info-btn:hover {
  opacity: 1;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
}

.info-label {
  color: #8e8e93;
  flex-shrink: 0;
}

.info-val {
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.highlight-blue {
  color: #0a84ff;
  font-weight: 600;
}

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

.mac-tool-btn.fav-btn.active {
  color: #ff375f;
  background: rgba(255, 55, 95, 0.18);
  border-color: rgba(255, 55, 95, 0.35);
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

.ratio-pill {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  color: #0a84ff;
}

.tools-divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

/* Photos Empty State */
.photos-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  min-height: 380px;
  padding: 30px;
}

.empty-icon-wrap {
  width: 84px;
  height: 84px;
  border-radius: 22px;
  background: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  margin-bottom: 20px;
}

.photos-empty-state h3 {
  font-size: 19px;
  font-weight: 700;
  color: #f2f2f7;
  margin: 0 0 8px;
}

[data-theme="light"] .photos-empty-state h3 {
  color: #1d1d1f;
}

.photos-empty-state p {
  font-size: 13px;
  color: #8e8e93;
  max-width: 360px;
  margin: 0 0 24px;
  line-height: 1.5;
}

.empty-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 12px;
  border: none;
  background: #0a84ff;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 650;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.4);
  transition: all 0.16s ease;
}

.empty-upload-btn:hover {
  background: #0071e3;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(10, 132, 255, 0.5);
}
</style>
