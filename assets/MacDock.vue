<script setup>
import { ref } from "vue";
import MacIcons from "./MacIcons.vue";

const props = defineProps({
  openApps: { type: Array, default: () => ["finder"] },
  activeAppId: { type: String, default: "finder" },
});

const emit = defineEmits(["launch"]);

const mouseX = ref(null);
const hoveredIndex = ref(null);
const bouncingApp = ref(null);

const apps = [
  { id: "finder", name: "访达 (Finder)", iconName: "finder" },
  { id: "appstore", name: "App Store (软件工坊)", iconName: "appstore" },
  { id: "photos", name: "照片 (Photos)", iconName: "photos" },
  { id: "cinema", name: "影院 (QuickTime)", iconName: "cinema" },
  { id: "music", name: "音乐 (Music)", iconName: "music" },
  { id: "editor", name: "代码工坊 (Xcode)", iconName: "xcode" },
  { id: "archive", name: "归档解压 (Archive)", iconName: "archive" },
  { id: "doc", name: "预览与文档 (Preview)", iconName: "preview" },
  { id: "settings", name: "系统偏好设置 (Settings)", iconName: "settings" },
  { id: "calculator", name: "计算器 (Calculator)", iconName: "calculator" },
  { id: "notes", name: "备忘录 (Notes)", iconName: "notes" },
  { id: "upload", name: "极速上传 (Upload)", iconName: "upload" },
  { id: "trash", name: "废纸篓 (Trash)", iconName: "trash" },
];

function onMouseMove(e) {
  mouseX.value = e.clientX;
}

function onMouseLeave() {
  mouseX.value = null;
  hoveredIndex.value = null;
}

function onMouseEnterItem(index) {
  hoveredIndex.value = index;
}

// Crisp macOS magnification: Hovered icon expands smoothly, neighbors have minimal lift
function getIconScale(index) {
  if (mouseX.value === null) return 1;
  const iconEl = document.getElementById(`dock-item-${index}`);
  if (!iconEl) return 1;
  const rect = iconEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const dist = Math.abs(mouseX.value - centerX);
  
  // Tight focus radius of 56px: only current item & slight neighbor lift
  if (dist > 56) return 1;
  const factor = 1 - (dist / 56);
  return 1 + (0.35 * Math.pow(factor, 2));
}

function launchApp(app) {
  bouncingApp.value = app.id;
  setTimeout(() => { bouncingApp.value = null; }, 900);
  emit("launch", app.id);
}
</script>

<template>
  <div class="dock-container" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="dock-bar">
      <div
        v-for="(app, index) in apps"
        :id="`dock-item-${index}`"
        :key="app.id"
        class="dock-item"
        :class="{
          'is-bouncing': bouncingApp === app.id,
          'is-active': activeAppId === app.id,
          'is-hovered': hoveredIndex === index,
        }"
        :style="{ transform: `scale(${getIconScale(index)})` }"
        @mouseenter="onMouseEnterItem(index)"
        @click="launchApp(app)"
      >
        <!-- Tooltip (Only on single hovered target) -->
        <span v-if="hoveredIndex === index" class="dock-tooltip">{{ app.name }}</span>

        <!-- Authentic macOS Vector Icon -->
        <div class="dock-icon-tile">
          <MacIcons :name="app.iconName" :size="50" />
        </div>

        <!-- Active Dot Indicator -->
        <div v-if="openApps.includes(app.id)" class="active-dot"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dock-container {
  position: fixed;
  bottom: 10px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
}

.dock-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 22px;
  background: rgba(30, 31, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(40px) saturate(220%);
  pointer-events: auto;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="light"] .dock-bar {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.16), inset 0 1px 0 #ffffff;
}

.dock-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform-origin: bottom center;
  transition: transform 0.08s ease-out;
  padding: 2px 2px;
}

.dock-icon-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  transition: filter 0.15s ease;
}

.dock-item.is-hovered .dock-icon-tile {
  filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.5));
}

/* Tooltip (macOS Sequoia Frosted Pill) */
.dock-tooltip {
  position: absolute;
  top: -42px;
  pointer-events: none;
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(20, 21, 28, 0.92);
  color: #f2f2f7;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(24px);
  animation: tooltip-pop 0.15s ease-out both;
  z-index: 105;
}

[data-theme="light"] .dock-tooltip {
  background: rgba(255, 255, 255, 0.94);
  color: #1d1d1f;
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}

@keyframes tooltip-pop {
  from { opacity: 0; transform: translateY(4px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Active Dot */
.active-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffffff;
  margin-top: 3px;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
}

[data-theme="light"] .active-dot {
  background: #1d1d1f;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

/* Bounce Animation */
.is-bouncing {
  animation: mac-dock-bounce 0.85s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
}

@keyframes mac-dock-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-24px) scale(1.12); }
  65% { transform: translateY(-8px) scale(1.05); }
}

@media (max-width: 768px) {
  .dock-container {
    bottom: 4px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .dock-bar {
    gap: 3px;
    padding: 5px 8px;
    border-radius: 18px;
    max-width: calc(100vw - 16px);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .dock-bar::-webkit-scrollbar {
    display: none;
  }
  .dock-icon-tile {
    width: 34px;
    height: 34px;
  }
  .dock-item {
    padding: 1px;
    /* Disable magnification on touch — it doesn't work well */
    transform: scale(1) !important;
  }
  .dock-tooltip {
    display: none !important;
  }
  .active-dot {
    width: 3px;
    height: 3px;
    margin-top: 2px;
  }
}
</style>
