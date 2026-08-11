<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";

const isMobile = ref(false);
function checkMobile() {
  isMobile.value = window.innerWidth <= 768;
}

const props = defineProps({
  title: { type: String, default: "访达" },
  icon: { type: String, default: "ph-folder" },
  visible: { type: Boolean, default: true },
  minimized: { type: Boolean, default: false },
  width: { type: Number, default: 880 },
  height: { type: Number, default: 560 },
  minWidth: { type: Number, default: 420 },
  minHeight: { type: Number, default: 280 },
  initialX: { type: Number, default: 80 },
  initialY: { type: Number, default: 60 },
  zIndex: { type: Number, default: 10 },
  isActive: { type: Boolean, default: false },
  closable: { type: Boolean, default: true },
  minimizable: { type: Boolean, default: true },
  maximizable: { type: Boolean, default: true },
});

const emit = defineEmits(["close", "minimize", "focus", "update:position", "update:size"]);

const posX = ref(props.initialX);
const posY = ref(props.initialY);
const winWidth = ref(props.width);
const winHeight = ref(props.height);
const isMaximized = ref(false);
const prevBounds = ref(null);

watch(() => props.width, (val) => {
  if (val && !isMaximized.value && !isResizing.value) {
    winWidth.value = val;
  }
});

watch(() => props.height, (val) => {
  if (val && !isMaximized.value && !isResizing.value) {
    winHeight.value = val;
  }
});

const isDragging = ref(false);
const isResizing = ref(false);
let dragStart = { mouseX: 0, mouseY: 0, winX: 0, winY: 0 };
let resizeStart = { mouseX: 0, mouseY: 0, winW: 0, winH: 0, winX: 0, winY: 0, direction: "" };

const windowStyle = computed(() => {
  if (isMaximized.value) {
    const dockH = isMobile.value ? 62 : 72;
    const barH = isMobile.value ? 28 : 32;
    return {
      top: `${barH}px`,
      left: "0px",
      width: "100vw",
      height: `calc(100vh - ${barH}px - ${dockH}px)`,
      zIndex: props.zIndex,
      borderRadius: "0px",
    };
  }
  return {
    top: `${posY.value}px`,
    left: `${posX.value}px`,
    width: `${winWidth.value}px`,
    height: `${winHeight.value}px`,
    zIndex: props.zIndex,
  };
});

function getEventXY(e) {
  if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function handleMouseDownHeader(e) {
  if (e.target.closest(".traffic-lights") || e.target.closest("button") || e.target.closest("input")) return;
  emit("focus");
  if (isMaximized.value || isMobile.value) return;

  isDragging.value = true;
  const { x, y } = getEventXY(e);
  dragStart = {
    mouseX: x,
    mouseY: y,
    winX: posX.value,
    winY: posY.value,
  };

  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd);
}

function onDragMove(e) {
  if (!isDragging.value) return;
  if (e.cancelable) e.preventDefault();
  const { x, y } = getEventXY(e);
  const dx = x - dragStart.mouseX;
  const dy = y - dragStart.mouseY;
  
  const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStart.winX + dx));
  const newY = Math.max(32, Math.min(window.innerHeight - 100, dragStart.winY + dy));
  
  posX.value = newX;
  posY.value = newY;
  emit("update:position", { x: newX, y: newY });
}

function onDragEnd() {
  isDragging.value = false;
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
}

function handleDoubleClickHeader() {
  toggleMaximize();
}

function toggleMaximize() {
  if (!props.maximizable) return;
  if (isMaximized.value) {
    isMaximized.value = false;
    if (prevBounds.value) {
      posX.value = prevBounds.value.x;
      posY.value = prevBounds.value.y;
      winWidth.value = prevBounds.value.w;
      winHeight.value = prevBounds.value.h;
    }
  } else {
    prevBounds.value = { x: posX.value, y: posY.value, w: winWidth.value, h: winHeight.value };
    isMaximized.value = true;
  }
}

function startResize(e, direction) {
  e.preventDefault();
  e.stopPropagation();
  emit("focus");
  if (isMaximized.value || isMobile.value) return;

  isResizing.value = true;
  const { x, y } = getEventXY(e);
  resizeStart = {
    mouseX: x,
    mouseY: y,
    winW: winWidth.value,
    winH: winHeight.value,
    winX: posX.value,
    winY: posY.value,
    direction,
  };

  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
  window.addEventListener("touchmove", onResizeMove, { passive: false });
  window.addEventListener("touchend", onResizeEnd);
}

function onResizeMove(e) {
  if (!isResizing.value) return;
  if (e.cancelable) e.preventDefault();
  const { x, y } = getEventXY(e);
  const dx = x - resizeStart.mouseX;
  const dy = y - resizeStart.mouseY;
  const dir = resizeStart.direction;

  if (dir.includes("e")) {
    winWidth.value = Math.max(props.minWidth, resizeStart.winW + dx);
  }
  if (dir.includes("s")) {
    winHeight.value = Math.max(props.minHeight, resizeStart.winH + dy);
  }
  if (dir.includes("w")) {
    const nextW = Math.max(props.minWidth, resizeStart.winW - dx);
    if (nextW > props.minWidth) {
      posX.value = resizeStart.winX + dx;
      winWidth.value = nextW;
    }
  }
  if (dir.includes("n")) {
    const nextH = Math.max(props.minHeight, resizeStart.winH - dy);
    if (nextH > props.minHeight) {
      posY.value = Math.max(32, resizeStart.winY + dy);
      winHeight.value = nextH;
    }
  }
}

function onResizeEnd() {
  isResizing.value = false;
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
  window.removeEventListener("touchmove", onResizeMove);
  window.removeEventListener("touchend", onResizeEnd);
}

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
  // On mobile: force maximized; on desktop: center window
  if (isMobile.value) {
    isMaximized.value = true;
  } else if (props.initialX === 80 && window.innerWidth > props.width) {
    posX.value = Math.max(40, Math.round((window.innerWidth - props.width) / 2));
    posY.value = Math.max(60, Math.round((window.innerHeight - props.height - 80) / 2));
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
  window.removeEventListener("touchmove", onResizeMove);
  window.removeEventListener("touchend", onResizeEnd);
});
</script>

<template>
  <div
    v-show="visible && !minimized"
    class="mac-window"
    :class="{ 'is-active': isActive, 'is-maximized': isMaximized }"
    :style="windowStyle"
    @mousedown="emit('focus')"
  >
    <!-- macOS Titlebar Header -->
    <header class="mac-titlebar" @mousedown="handleMouseDownHeader" @touchstart.passive="handleMouseDownHeader" @dblclick="handleDoubleClickHeader">
      <!-- 🔴🟡🟢 Traffic Lights -->
      <div class="traffic-lights">
        <button class="traffic-btn btn-close" type="button" title="关闭 (⌘W)" @click.stop="emit('close')">
          <span class="icon-sym">×</span>
        </button>
        <button class="traffic-btn btn-minimize" type="button" title="最小化 (⌘M)" @click.stop="emit('minimize')">
          <span class="icon-sym">–</span>
        </button>
        <button class="traffic-btn btn-maximize" type="button" :title="isMaximized ? '还原' : '全屏'" @click.stop="toggleMaximize">
          <span class="icon-sym">+</span>
        </button>
      </div>

      <!-- Window Title & Icon -->
      <div class="window-title-badge">
        <i v-if="icon" class="ph" :class="icon"></i>
        <span>{{ title }}</span>
      </div>

      <!-- Header Right Slot (Custom Actions) -->
      <div class="titlebar-actions">
        <slot name="titlebar-right"></slot>
      </div>
    </header>

    <!-- Window Main Body Slot -->
    <div class="mac-window-body">
      <slot></slot>
    </div>

    <!-- 8 Resize Handles -->
    <template v-if="!isMaximized">
      <div class="resize-handle res-n" @mousedown="startResize($event, 'n')"></div>
      <div class="resize-handle res-s" @mousedown="startResize($event, 's')"></div>
      <div class="resize-handle res-w" @mousedown="startResize($event, 'w')"></div>
      <div class="resize-handle res-e" @mousedown="startResize($event, 'e')"></div>
      <div class="resize-handle res-nw" @mousedown="startResize($event, 'nw')"></div>
      <div class="resize-handle res-ne" @mousedown="startResize($event, 'ne')"></div>
      <div class="resize-handle res-sw" @mousedown="startResize($event, 'sw')"></div>
      <div class="resize-handle res-se" @mousedown="startResize($event, 'se')"></div>
    </template>
  </div>
</template>

<style scoped>
.mac-window {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(30, 31, 38, 0.88);
  color: #f2f2f7;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(45px) saturate(210%);
  overflow: hidden;
  user-select: none;
  animation: mac-window-open 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, opacity 0.18s ease;
  will-change: width, height, transform, opacity;
}

.mac-window.is-dragging,
.mac-window.is-resizing {
  transition: none;
}

@keyframes mac-window-open {
  from {
    opacity: 0;
    transform: scale(0.93) translateY(14px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

[data-theme="light"] .mac-window {
  background: rgba(255, 255, 255, 0.88);
  color: #1d1d1f;
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.mac-window.is-active {
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.25), 0 0 0 2px rgba(10, 132, 255, 0.4);
}

.mac-window:not(.is-active) {
  opacity: 0.94;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.45);
}

.mac-window:not(.is-active) .traffic-btn {
  filter: grayscale(40%) opacity(0.8);
}

[data-theme="light"] .mac-window.is-active {
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3), 0 0 0 1.5px rgba(10, 132, 255, 0.4);
}

/* Titlebar */
.mac-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 38px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: grab;
}

[data-theme="light"] .mac-titlebar {
  background: rgba(0, 0, 0, 0.03);
  border-bottom-color: rgba(60, 60, 67, 0.08);
}

.mac-titlebar:active {
  cursor: grabbing;
}

/* Traffic Lights */
.traffic-lights {
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.traffic-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.traffic-btn:hover {
  transform: scale(1.12);
}

.traffic-btn .icon-sym {
  opacity: 0;
  font-size: 8.5px;
  font-weight: 900;
  line-height: 1;
  color: rgba(0, 0, 0, 0.75);
  transition: opacity 0.15s ease;
}

.traffic-lights:hover .traffic-btn .icon-sym {
  opacity: 1;
}

.btn-close {
  background: #ff5f56;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}

.btn-minimize {
  background: #ffbd2e;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}

.btn-maximize {
  background: #27c93f;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}

/* Window Title */
.window-title-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.1px;
  color: inherit;
  pointer-events: none;
}

.window-title-badge i {
  color: #0a84ff;
  font-size: 15px;
}

.titlebar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Main Body */
.mac-window-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  user-select: auto;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  z-index: 10;
}

.res-n { top: 0; left: 6px; right: 6px; height: 6px; cursor: n-resize; }
.res-s { bottom: 0; left: 6px; right: 6px; height: 6px; cursor: s-resize; }
.res-w { left: 0; top: 6px; bottom: 6px; width: 6px; cursor: w-resize; }
.res-e { right: 0; top: 6px; bottom: 6px; width: 6px; cursor: e-resize; }

.res-nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nw-resize; }
.res-ne { top: 0; right: 0; width: 10px; height: 10px; cursor: ne-resize; }
.res-sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: sw-resize; }
.res-se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: se-resize; }

/* ========== Mobile Responsive ========== */
@media (max-width: 768px) {
  .mac-window {
    border-radius: 0 !important;
    border: none !important;
    animation: none !important;
  }
  .mac-titlebar {
    height: 32px;
    padding: 0 10px;
    cursor: default;
  }
  .traffic-btn {
    width: 10px;
    height: 10px;
  }
  .window-title-badge {
    font-size: 12px;
  }
  .resize-handle {
    display: none !important;
  }
  .mac-window-body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
