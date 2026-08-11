<script setup>
import { ref } from "vue";
import MacIcons from "./MacIcons.vue";

const props = defineProps({
  openApps: { type: Array, default: () => ["finder"] }, // List of currently active app IDs
  activeAppId: { type: String, default: "finder" },
});

const emit = defineEmits(["launch"]);

const mouseX = ref(null);
const bouncingApp = ref(null);

const apps = [
  { id: "finder", name: "访达 (Finder)", iconName: "finder" },
  { id: "photos", name: "照片 (Photos)", iconName: "photos" },
  { id: "cinema", name: "影院 (QuickTime)", iconName: "cinema" },
  { id: "music", name: "音乐 (Music)", iconName: "music" },
  { id: "editor", name: "代码工坊 (Xcode)", iconName: "xcode" },
  { id: "archive", name: "归档解压 (Archive)", iconName: "archive" },
  { id: "doc", name: "预览与文档 (Preview)", iconName: "preview" },
  { id: "settings", name: "系统设置 (Settings)", iconName: "settings" },
  { id: "upload", name: "极速上传 (Upload)", iconName: "upload" },
  { id: "trash", name: "废纸篓 / 存储 (Trash)", iconName: "trash" },
];

function onMouseMove(e) {
  mouseX.value = e.clientX;
}

function onMouseLeave() {
  mouseX.value = null;
}

function getIconScale(index) {
  if (mouseX.value === null) return 1;
  const iconEl = document.getElementById(`dock-item-${index}`);
  if (!iconEl) return 1;
  const rect = iconEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const dist = Math.abs(mouseX.value - centerX);
  
  // Magnification radius of 140px
  if (dist > 140) return 1;
  const scale = 1 + (0.45 * (1 - dist / 140));
  return scale;
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
        :class="{ 'is-bouncing': bouncingApp === app.id, 'is-active': activeAppId === app.id }"
        :style="{ transform: `scale(${getIconScale(index)})` }"
        @click="launchApp(app)"
      >
        <!-- Tooltip -->
        <span class="dock-tooltip">{{ app.name }}</span>

        <!-- Authentic macOS Vector Icon -->
        <div class="dock-icon-tile">
          <MacIcons :name="app.iconName" :size="52" />
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
  bottom: 12px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  z-index: 90;
  pointer-events: none;
}

.dock-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 22px;
  background: rgba(30, 31, 38, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(40px) saturate(220%);
  pointer-events: auto;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="light"] .dock-bar {
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), inset 0 1px 0 #ffffff;
}

.dock-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transform-origin: bottom center;
  transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-icon-tile {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  color: #ffffff;
  font-size: 26px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: filter 0.15s ease;
}

.dock-item:hover .dock-icon-tile {
  filter: brightness(1.1);
}

/* Tooltip */
.dock-tooltip {
  position: absolute;
  top: -38px;
  opacity: 0;
  pointer-events: none;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(20, 21, 28, 0.85);
  color: #f2f2f7;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
  transform: translateY(4px);
  transition: all 0.16s ease;
}

[data-theme="light"] .dock-tooltip {
  background: rgba(255, 255, 255, 0.88);
  color: #1d1d1f;
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.dock-item:hover .dock-tooltip {
  opacity: 1;
  transform: translateY(0);
}

/* Active Dot */
.active-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffffff;
  margin-top: 4px;
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
  35% { transform: translateY(-24px) scale(1.1); }
  65% { transform: translateY(-8px) scale(1.05); }
}

@media (max-width: 600px) {
  .dock-bar {
    gap: 4px;
    padding: 6px 8px;
  }
  .dock-icon-tile {
    width: 36px;
    height: 36px;
    font-size: 19px;
    border-radius: 10px;
  }
}
</style>
