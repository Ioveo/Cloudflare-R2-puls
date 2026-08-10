<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "change"]);

const contextMenu = ref({ visible: false, x: 0, y: 0 });
const showToast = ref(false);
const toastText = ref("");

const zoomScale = ref(1);
const rotation = ref(0);

const currentItem = computed(() => props.items[props.index] || null);

watch(
  () => props.index,
  () => {
    resetTransform();
  }
);

function resetTransform() {
  zoomScale.value = 1;
  rotation.value = 0;
}

function zoomIn() {
  zoomScale.value = Math.min(3, zoomScale.value + 0.25);
}

function zoomOut() {
  zoomScale.value = Math.max(0.4, zoomScale.value - 0.25);
}

function rotate90() {
  rotation.value = (rotation.value + 90) % 360;
}

function prev() {
  closeContextMenu();
  if (props.items.length <= 1) return;
  const nextIndex = (props.index - 1 + props.items.length) % props.items.length;
  emit("change", nextIndex);
}

function next() {
  closeContextMenu();
  if (props.items.length <= 1) return;
  const nextIndex = (props.index + 1) % props.items.length;
  emit("change", nextIndex);
}

function onContextMenu(e) {
  contextMenu.value = {
    visible: true,
    x: Math.min(e.clientX, window.innerWidth - 200),
    y: Math.min(e.clientY, window.innerHeight - 200),
  };
}

function closeContextMenu() {
  contextMenu.value.visible = false;
}

function downloadPhoto() {
  closeContextMenu();
  if (!currentItem.value) return;
  const link = document.createElement("a");
  link.href = currentItem.value.url;
  link.download = currentItem.value.name;
  link.click();
}

function copyPhotoLink() {
  closeContextMenu();
  if (!currentItem.value) return;
  const fullUrl = new URL(currentItem.value.url, window.location.origin).toString();
  navigator.clipboard.writeText(fullUrl);
  toastText.value = "已复制图片链接到剪贴板！";
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 2200);
}

function openInNewTab() {
  closeContextMenu();
  if (!currentItem.value) return;
  window.open(currentItem.value.url, "_blank", "noopener");
}

function onKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape") emit("close");
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "ArrowRight") next();
  else if (e.key === "+" || e.key === "=") zoomIn();
  else if (e.key === "-") zoomOut();
  else if (e.key.toLowerCase() === "r") rotate90();
  else if (e.key === "0") resetTransform();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Transition name="fade">
    <div
      v-if="visible && currentItem"
      class="lightbox-mask"
      @click="closeContextMenu"
      @click.self="emit('close')"
      @contextmenu.prevent.stop="onContextMenu"
    >
      <!-- Toast notification -->
      <Transition name="slide-down">
        <div v-if="showToast" class="lightbox-toast">
          <i class="ph ph-check-circle"></i>
          <span>{{ toastText }}</span>
        </div>
      </Transition>

      <!-- Top header bar -->
      <header class="lightbox-header" @click.stop>
        <div class="lightbox-info">
          <span class="lightbox-title">{{ currentItem.name }}</span>
          <span v-if="items.length > 1" class="lightbox-counter">{{ index + 1 }} / {{ items.length }}</span>
          <span class="lightbox-zoom-tag">{{ Math.round(zoomScale * 100) }}%</span>
        </div>

        <div class="lightbox-actions">
          <button class="lightbox-btn" type="button" title="放大 (+)" @click="zoomIn">
            <i class="ph ph-magnifying-glass-plus"></i>
          </button>

          <button class="lightbox-btn" type="button" title="缩小 (-)" @click="zoomOut">
            <i class="ph ph-magnifying-glass-minus"></i>
          </button>

          <button class="lightbox-btn" type="button" title="旋转 90° (R)" @click="rotate90">
            <i class="ph ph-arrows-clockwise"></i>
          </button>

          <button class="lightbox-btn" type="button" title="重置 100% (0)" @click="resetTransform">
            <i class="ph ph-arrows-in-line-horizontal"></i>
          </button>

          <div class="header-divider"></div>

          <button class="lightbox-btn" type="button" title="复制图片直链" @click="copyPhotoLink">
            <i class="ph ph-link"></i>
          </button>

          <a class="lightbox-btn" :href="currentItem.url" download :title="'下载原图 (' + currentItem.name + ')'">
            <i class="ph ph-download-simple"></i>
          </a>

          <a class="lightbox-btn" :href="currentItem.url" target="_blank" rel="noopener" title="在新标签页打开原图">
            <i class="ph ph-arrow-square-out"></i>
          </a>

          <button class="lightbox-btn close-btn" type="button" title="关闭 (Esc)" @click="emit('close')">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </header>

      <!-- Center content -->
      <div class="lightbox-body" @click.self="emit('close')">
        <button v-if="items.length > 1" class="nav-btn prev-btn" type="button" title="上一张 (←)" @click="prev">
          <i class="ph ph-caret-left"></i>
        </button>

        <div class="lightbox-media" @click.self="emit('close')">
          <img
            :src="currentItem.url"
            :alt="currentItem.name"
            :style="{ transform: `scale(${zoomScale}) rotate(${rotation}deg)` }"
            @contextmenu.prevent.stop="onContextMenu"
          />
        </div>

        <button v-if="items.length > 1" class="nav-btn next-btn" type="button" title="下一张 (→)" @click="next">
          <i class="ph ph-caret-right"></i>
        </button>
      </div>

      <!-- Custom Right-Click Context Menu -->
      <Transition name="fade">
        <div
          v-if="contextMenu.visible"
          class="lightbox-ctx-menu"
          :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
          @click.stop
        >
          <div class="ctx-title">{{ currentItem.name }}</div>
          <button class="ctx-item" type="button" @click="zoomIn">
            <i class="ph ph-magnifying-glass-plus"></i>
            <span>放大 (+25%)</span>
          </button>
          <button class="ctx-item" type="button" @click="rotate90">
            <i class="ph ph-arrows-clockwise"></i>
            <span>顺时针旋转 90°</span>
          </button>
          <button class="ctx-item" type="button" @click="copyPhotoLink">
            <i class="ph ph-link"></i>
            <span>复制直链 / 外链</span>
          </button>
          <button class="ctx-item" type="button" @click="downloadPhoto">
            <i class="ph ph-download-simple"></i>
            <span>下载高清原图</span>
          </button>
          <button class="ctx-item" type="button" @click="openInNewTab">
            <i class="ph ph-arrow-square-out"></i>
            <span>在新标签页打开</span>
          </button>
          <div v-if="items.length > 1" class="ctx-divider"></div>
          <button v-if="items.length > 1" class="ctx-item" type="button" @click="prev">
            <i class="ph ph-caret-left"></i>
            <span>上一张图片 (←)</span>
          </button>
          <button v-if="items.length > 1" class="ctx-item" type="button" @click="next">
            <i class="ph ph-caret-right"></i>
            <span>下一张图片 (→)</span>
          </button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 15, 0.94);
  backdrop-filter: blur(28px) saturate(180%);
  color: #fff;
  animation: fade-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.lightbox-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.lightbox-title {
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.lightbox-counter {
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 700;
}

.lightbox-zoom-tag {
  padding: 3px 9px;
  border-radius: 12px;
  background: rgba(10, 132, 255, 0.22);
  color: #0a84ff;
  font-size: 11.5px;
  font-weight: 800;
  font-family: ui-monospace, monospace;
}

.lightbox-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.14);
  margin: 0 4px;
}

.lightbox-btn {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.lightbox-btn:hover {
  background: rgba(10, 132, 255, 0.8);
  color: #fff;
  border-color: #0a84ff;
  transform: scale(1.08);
}

.close-btn:hover {
  background: rgba(255, 69, 58, 0.85);
  border-color: #ff453a;
}

.lightbox-body {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  overflow: hidden;
}

.lightbox-media {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow: hidden;
}

.lightbox-media img {
  max-width: 90vw;
  max-height: 82vh;
  object-fit: contain;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.8);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.nav-btn {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 26px;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.22s ease;
  z-index: 10;
}

.nav-btn:hover {
  background: #0a84ff;
  border-color: #0a84ff;
  transform: scale(1.12);
  box-shadow: 0 10px 30px rgba(10, 132, 255, 0.5);
}

.lightbox-ctx-menu {
  position: fixed;
  z-index: 150;
  width: 210px;
  padding: 8px;
  border-radius: 16px;
  background: rgba(28, 28, 35, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(24px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  animation: scale-up 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.ctx-title {
  padding: 6px 10px 8px;
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.15s ease;
}

.ctx-item:hover {
  background: #0a84ff;
  color: #fff;
}

.ctx-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 6px 4px;
}
</style>
