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

const zoomScale = ref(1);
const rotation = ref(0);
const isPanning = ref(false);
const panPos = ref({ x: 0, y: 0 });
const panStart = ref({ x: 0, y: 0, initX: 0, initY: 0 });

const currentItem = computed(() => {
  if (props.items.length && props.index >= 0 && props.index < props.items.length) {
    return props.items[props.index];
  }
  return props.file ? { name: fileName(props.file.key), url: rawPath(props.file.key), file: props.file } : null;
});

const photoTitle = computed(() => currentItem.value?.name || "照片 (Photos)");

function fileName(key) {
  return key ? key.split("/").filter(Boolean).pop() || key : "";
}

function rawPath(key) {
  if (!key) return "";
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
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
    const nextIdx = (props.index - 1 + props.items.length) % props.items.length;
    emit("change", nextIdx);
  }
}

function nextPhoto() {
  if (props.items.length > 1) {
    const nextIdx = (props.index + 1) % props.items.length;
    emit("change", nextIdx);
  }
}

function onWheel(e) {
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

function onMouseDown(e) {
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
  const dx = e.clientX - panStart.value.x;
  const dy = e.clientY - panStart.value.y;
  panPos.value = {
    x: panStart.value.initX + dx,
    y: panStart.value.initY + dy,
  };
}

function onMouseUp() {
  isPanning.value = false;
  window.removeEventListener("mousemove", onMouseMove);
  window.removeEventListener("mouseup", onMouseUp);
}

const wallpaperSavedTip = ref(false);

function setAsDesktopWallpaper() {
  if (!currentItem.value) return;
  const url = currentItem.value.url;
  localStorage.setItem("mac-custom-wallpaper", url);
  window.dispatchEvent(new CustomEvent("wallpaper-changed", { detail: url }));
  emit("set-wallpaper", url);
  wallpaperSavedTip.value = true;
  setTimeout(() => { wallpaperSavedTip.value = false; }, 3000);
}

function handleKeydown(e) {
  if (!props.visible) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
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
    emit("close");
  }
}

watch(() => props.index, resetTransform);
watch(() => props.visible, (val) => {
  if (val) resetTransform();
});

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
    :width="900"
    :height="600"
    :initial-x="130"
    :initial-y="60"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <!-- macOS Native Toolbar -->
    <template #titlebar-right>
      <div class="photos-top-tools">
        <!-- Index Counter & Zoom Pill -->
        <span v-if="items.length > 1" class="photo-badge">{{ index + 1 }} / {{ items.length }}</span>
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
          @click="setAsDesktopWallpaper"
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
      </div>
    </template>

    <!-- Main Viewport Body -->
    <div
      class="photos-viewport"
      :class="{ 'is-grabbed': isPanning, 'is-zoomed': zoomScale > 1 }"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @dblclick="resetTransform"
    >
      <!-- Navigation Paddles -->
      <button v-if="items.length > 1" class="photo-nav-arrow arrow-left" type="button" title="上一张 (←)" @click.stop="prevPhoto">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>

      <button v-if="items.length > 1" class="photo-nav-arrow arrow-right" type="button" title="下一张 (→)" @click.stop="nextPhoto">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>

      <!-- Center Image with GPU-accelerated Transform -->
      <div
        class="photo-transform-box"
        :style="{
          transform: `translate3d(${panPos.x}px, ${panPos.y}px, 0) scale(${zoomScale}) rotate(${rotation}deg)`,
        }"
      >
        <img
          :src="currentItem?.url"
          :alt="currentItem?.name"
          class="photo-render-img"
          draggable="false"
        />
      </div>

      <!-- Bottom Mini Filmstrip Gallery -->
      <div v-if="items.length > 1" class="photos-filmstrip-bar" @mousedown.stop>
        <div class="filmstrip-scroll">
          <div
            v-for="(item, idx) in items"
            :key="item.name + idx"
            class="thumb-tile"
            :class="{ active: index === idx }"
            @click="emit('change', idx)"
          >
            <img :src="item.url" :alt="item.name" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.photos-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0f1015;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  cursor: default;
}

[data-theme="light"] .photos-viewport {
  background: #e5e5ea;
}

.photos-viewport.is-zoomed {
  cursor: grab;
}

.photos-viewport.is-grabbed {
  cursor: grabbing;
}

.photo-transform-box {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 90%;
  max-height: 80%;
  transform-origin: center center;
  transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}

.photo-render-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65);
}

/* Nav Arrows */
.photo-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(30, 31, 38, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 15;
  transition: all 0.15s ease;
  opacity: 0.8;
}

.photo-nav-arrow:hover {
  opacity: 1;
  transform: translateY(-50%) scale(1.08);
  background: rgba(30, 31, 38, 0.88);
}

.arrow-left { left: 16px; }
.arrow-right { right: 16px; }

/* Filmstrip Bottom Bar */
.photos-filmstrip-bar {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(20, 21, 28, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(30px);
  z-index: 20;
  max-width: calc(100% - 40px);
}

[data-theme="light"] .photos-filmstrip-bar {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
}

.filmstrip-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  max-width: 600px;
}

.filmstrip-scroll::-webkit-scrollbar {
  display: none;
}

.thumb-tile {
  width: 44px;
  height: 32px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: all 0.15s ease;
}

.thumb-tile:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.thumb-tile.active {
  opacity: 1;
  border-color: #0a84ff;
  box-shadow: 0 0 10px rgba(10, 132, 255, 0.6);
}

.thumb-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Toolbar Tools */
.photos-top-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.photo-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: inherit;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
}

.zoom-pill {
  color: #0a84ff;
  background: rgba(10, 132, 255, 0.15);
}

.tools-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
}

.mac-tool-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.12s ease;
}

.mac-tool-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.mac-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 6px;
  background: #0a84ff;
  color: #ffffff;
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.4);
  transition: transform 0.12s ease;
}

.mac-action-pill:hover {
  transform: scale(1.05);
}
</style>
