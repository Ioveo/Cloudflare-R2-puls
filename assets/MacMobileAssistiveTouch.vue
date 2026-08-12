<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
  panMode: { type: Boolean, default: false },
  scale: { type: Number, default: 1 },
  isFullscreen: { type: Boolean, default: false },
});

const emit = defineEmits([
  "toggle-pan",
  "reset-view",
  "toggle-trackpad",
  "toggle-fullscreen",
  "open-finder",
  "open-spotlight",
  "open-control-center",
  "show-desktop",
  "trigger-right-click",
]);

// 1. Floating Orb Position & Dragging State
const orbX = ref(window.innerWidth - 68);
const orbY = ref(window.innerHeight - 170);
const isDraggingOrb = ref(false);
const isMenuOpen = ref(false);
const showTrackpad = ref(false);

let dragStart = { x: 0, y: 0, orbStartX: 0, orbStartY: 0 };
let hasMoved = false;

function onOrbTouchStart(e) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  isDraggingOrb.value = true;
  hasMoved = false;
  dragStart = {
    x: touch.clientX,
    y: touch.clientY,
    orbStartX: orbX.value,
    orbStartY: orbY.value,
  };
  window.addEventListener("touchmove", onOrbTouchMove, { passive: false });
  window.addEventListener("touchend", onOrbTouchEnd);
}

function onOrbTouchMove(e) {
  if (!isDraggingOrb.value) return;
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  const dx = touch.clientX - dragStart.x;
  const dy = touch.clientY - dragStart.y;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    hasMoved = true;
  }
  const maxX = window.innerWidth - 56;
  const maxY = window.innerHeight - 64;
  orbX.value = Math.max(8, Math.min(maxX, dragStart.orbStartX + dx));
  orbY.value = Math.max(36, Math.min(maxY, dragStart.orbStartY + dy));
}

function onOrbTouchEnd() {
  isDraggingOrb.value = false;
  window.removeEventListener("touchmove", onOrbTouchMove);
  window.removeEventListener("touchend", onOrbTouchEnd);

  // Snap to nearest screen edge (left or right)
  const screenMid = window.innerWidth / 2;
  if (orbX.value < screenMid) {
    orbX.value = 12;
  } else {
    orbX.value = window.innerWidth - 62;
  }

  // If didn't drag significantly, treat as tap
  if (!hasMoved) {
    toggleMenu();
  }
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
  if (navigator.vibrate) navigator.vibrate(30);
}

function handleAction(action) {
  if (navigator.vibrate) navigator.vibrate(35);
  switch (action) {
    case "pan":
      emit("toggle-pan");
      break;
    case "reset":
      emit("reset-view");
      break;
    case "trackpad":
      showTrackpad.value = !showTrackpad.value;
      emit("toggle-trackpad", showTrackpad.value);
      break;
    case "fullscreen":
      emit("toggle-fullscreen");
      break;
    case "finder":
      emit("open-finder");
      break;
    case "spotlight":
      emit("open-spotlight");
      break;
    case "control-center":
      emit("open-control-center");
      break;
    case "show-desktop":
      emit("show-desktop");
      break;
    case "right-click":
      emit("trigger-right-click");
      break;
  }
  isMenuOpen.value = false;
}

// 2. Virtual Trackpad Controller Logic
const cursorX = ref(window.innerWidth / 2);
const cursorY = ref(window.innerHeight / 2);
const isCursorVisible = ref(false);

let tpTouchStart = { x: 0, y: 0, curX: 0, curY: 0, time: 0 };

function onTrackpadTouchStart(e) {
  if (!e.touches.length) return;
  isCursorVisible.value = true;
  const t = e.touches[0];
  tpTouchStart = {
    x: t.clientX,
    y: t.clientY,
    curX: cursorX.value,
    curY: cursorY.value,
    time: Date.now(),
  };
}

function onTrackpadTouchMove(e) {
  if (!e.touches.length) return;
  if (e.cancelable) e.preventDefault();
  const t = e.touches[0];
  const dx = (t.clientX - tpTouchStart.x) * 1.5;
  const dy = (t.clientY - tpTouchStart.y) * 1.5;
  cursorX.value = Math.max(0, Math.min(window.innerWidth - 10, tpTouchStart.curX + dx));
  cursorY.value = Math.max(0, Math.min(window.innerHeight - 10, tpTouchStart.curY + dy));
}

function onTrackpadTouchEnd(e) {
  const duration = Date.now() - tpTouchStart.time;
  if (duration < 250 && e.changedTouches.length === 1) {
    // Single tap on trackpad = Left Click on element under cursor
    simulateCursorClick("click");
  }
}

function simulateCursorClick(eventType) {
  const target = document.elementFromPoint(cursorX.value, cursorY.value);
  if (!target) return;
  if (navigator.vibrate) navigator.vibrate(40);
  const mouseEvent = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: cursorX.value,
    clientY: cursorY.value,
  });
  target.dispatchEvent(mouseEvent);
}

function closeTrackpad() {
  showTrackpad.value = false;
  isCursorVisible.value = false;
  emit("toggle-trackpad", false);
}

// Window resize repositioning
function onResize() {
  if (orbX.value > window.innerWidth - 62) {
    orbX.value = window.innerWidth - 62;
  }
  if (orbY.value > window.innerHeight - 64) {
    orbY.value = window.innerHeight - 64;
  }
}

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<template>
  <div class="mobile-assistive-container">
    <!-- 1. Apple AssistiveTouch Floating Orb -->
    <div
      class="assistive-orb"
      :class="{ 'is-open': isMenuOpen, 'is-dragging': isDraggingOrb, 'is-pan-active': panMode }"
      :style="{ left: `${orbX}px`, top: `${orbY}px` }"
      @touchstart="onOrbTouchStart"
      @click="toggleMenu"
    >
      <div class="orb-core">
        <i v-if="panMode" class="ph ph-hand-grabbing-fill orb-icon"></i>
        <i v-else-if="showTrackpad" class="ph ph-cursor-click-fill orb-icon"></i>
        <span v-else class="orb-dot"></span>
      </div>
    </div>

    <!-- 2. Assistive Radial / Card Quick Action Overlay Menu -->
    <Transition name="assistive-fade">
      <div v-if="isMenuOpen" class="assistive-menu-overlay" @click.self="isMenuOpen = false">
        <div class="assistive-menu-card" :style="{ left: `${Math.min(window.innerWidth - 270, Math.max(16, orbX - 110))}px`, top: `${Math.min(window.innerHeight - 290, Math.max(50, orbY - 140))}px` }">
          <header class="assistive-card-header">
            <span>📱 远程电脑交互控制</span>
            <button class="assistive-card-close" type="button" @click="isMenuOpen = false">×</button>
          </header>

          <div class="assistive-grid">
            <!-- Pan / Drag Screen Mode -->
            <button class="assistive-btn" :class="{ active: panMode }" type="button" @click="handleAction('pan')">
              <div class="btn-bubble">
                <i class="ph ph-hand-grabbing-bold"></i>
              </div>
              <span>{{ panMode ? '退出拉屏' : '单指拉屏' }}</span>
            </button>

            <!-- Virtual Trackpad Mode -->
            <button class="assistive-btn" :class="{ active: showTrackpad }" type="button" @click="handleAction('trackpad')">
              <div class="btn-bubble">
                <i class="ph ph-mouse-bold"></i>
              </div>
              <span>虚拟触控板</span>
            </button>

            <!-- Reset Scale & Position -->
            <button class="assistive-btn" type="button" @click="handleAction('reset')">
              <div class="btn-bubble">
                <i class="ph ph-arrows-in-cardinal-bold"></i>
              </div>
              <span>适应屏幕</span>
            </button>

            <!-- Right Click Trigger -->
            <button class="assistive-btn" type="button" @click="handleAction('right-click')">
              <div class="btn-bubble">
                <i class="ph ph-list-plus-bold"></i>
              </div>
              <span>呼出右键</span>
            </button>

            <!-- Show Desktop -->
            <button class="assistive-btn" type="button" @click="handleAction('show-desktop')">
              <div class="btn-bubble">
                <i class="ph ph-desktop-bold"></i>
              </div>
              <span>显示桌面</span>
            </button>

            <!-- Open Finder -->
            <button class="assistive-btn" type="button" @click="handleAction('finder')">
              <div class="btn-bubble">
                <i class="ph ph-folder-open-bold"></i>
              </div>
              <span>打开访达</span>
            </button>

            <!-- Spotlight Search -->
            <button class="assistive-btn" type="button" @click="handleAction('spotlight')">
              <div class="btn-bubble">
                <i class="ph ph-magnifying-glass-bold"></i>
              </div>
              <span>聚焦搜索</span>
            </button>

            <!-- Control Center -->
            <button class="assistive-btn" type="button" @click="handleAction('control-center')">
              <div class="btn-bubble">
                <i class="ph ph-sliders-bold"></i>
              </div>
              <span>控制中心</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 3. Virtual Remote Trackpad Floating Unit -->
    <Transition name="trackpad-fade">
      <div v-if="showTrackpad" class="virtual-trackpad-card">
        <header class="tp-header">
          <div class="tp-title">
            <i class="ph ph-cursor-bold"></i>
            <span>虚拟触控板 · 单指移/点</span>
          </div>
          <button class="tp-close" type="button" @click="closeTrackpad">×</button>
        </header>

        <div
          class="tp-surface"
          @touchstart="onTrackpadTouchStart"
          @touchmove="onTrackpadTouchMove"
          @touchend="onTrackpadTouchEnd"
        >
          <div class="tp-hint">
            <i class="ph ph-hand-tap"></i>
            <span>滑动移动光标，轻点左键</span>
          </div>
        </div>

        <footer class="tp-btn-bar">
          <button class="tp-act-btn" type="button" @click="simulateCursorClick('click')">
            <i class="ph ph-mouse-left-click-bold"></i>
            <span>左键单击</span>
          </button>
          <button class="tp-act-btn tp-right-click" type="button" @click="simulateCursorClick('contextmenu')">
            <i class="ph ph-mouse-right-click-bold"></i>
            <span>右键菜单</span>
          </button>
        </footer>
      </div>
    </Transition>

    <!-- 4. Virtual Remote macOS Mouse Pointer Cursor -->
    <div
      v-if="isCursorVisible && showTrackpad"
      class="virtual-mouse-pointer"
      :style="{ transform: `translate3d(${cursorX}px, ${cursorY}px, 0)` }"
    >
      <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
        <path d="M1 1L9.5 24.5L13.8 15.2L21 13.8L1 1Z" fill="#1C1C1E" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.mobile-assistive-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 999999;
}

/* Apple AssistiveTouch Floating Orb */
.assistive-orb {
  position: fixed;
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: rgba(30, 30, 35, 0.78);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  cursor: grab;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}

.assistive-orb:active,
.assistive-orb.is-dragging {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.5), 0 0 0 4px rgba(10, 132, 255, 0.3);
}

.assistive-orb.is-pan-active {
  background: rgba(10, 132, 255, 0.85);
  border-color: #5ac8fa;
  box-shadow: 0 10px 30px rgba(10, 132, 255, 0.5);
}

.orb-core {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.orb-icon {
  color: #ffffff;
  font-size: 18px;
}

/* Assistive Menu Overlay */
.assistive-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
  display: flex;
  z-index: 1000000;
}

.assistive-menu-card {
  position: absolute;
  width: 260px;
  background: rgba(28, 28, 32, 0.9);
  backdrop-filter: blur(36px) saturate(200%);
  -webkit-backdrop-filter: blur(36px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

.assistive-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.assistive-card-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.assistive-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px 6px;
}

.assistive-btn {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 2px;
  border-radius: 12px;
  transition: all 0.18s ease;
}

.btn-bubble {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 20px;
  transition: all 0.2s ease;
}

.assistive-btn span {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.assistive-btn:active .btn-bubble,
.assistive-btn.active .btn-bubble {
  background: #0a84ff;
  border-color: #5ac8fa;
  transform: scale(1.08);
  box-shadow: 0 4px 16px rgba(10, 132, 255, 0.5);
}

/* Virtual Trackpad Card */
.virtual-trackpad-card {
  position: fixed;
  right: 14px;
  bottom: 24px;
  width: 220px;
  height: 240px;
  background: rgba(24, 24, 28, 0.88);
  backdrop-filter: blur(30px) saturate(190%);
  -webkit-backdrop-filter: blur(30px) saturate(190%);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999998;
}

.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.tp-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.tp-close {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-surface {
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;
}

.tp-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 11px;
  pointer-events: none;
}
.tp-hint i { font-size: 24px; }

.tp-btn-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 6px;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.tp-act-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.tp-act-btn:active {
  background: #0a84ff;
  border-color: #5ac8fa;
}

/* Virtual Pointer Cursor */
.virtual-mouse-pointer {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1000001;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  transition: transform 0.04s ease-out;
}

/* Animations */
.assistive-fade-enter-active,
.assistive-fade-leave-active,
.trackpad-fade-enter-active,
.trackpad-fade-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.assistive-fade-enter-from,
.assistive-fade-leave-to,
.trackpad-fade-enter-from,
.trackpad-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
</style>
