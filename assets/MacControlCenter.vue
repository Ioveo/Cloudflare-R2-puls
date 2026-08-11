<script setup>
import { ref } from "vue";

const props = defineProps({
  visible: Boolean,
  theme: String,
  storageId: String,
  totalFiles: Number,
  totalBytes: Number,
  currentWallpaper: String,
  customWallpaper: String,
  wallpapers: Array,
});

const emit = defineEmits([
  "close",
  "toggle-theme",
  "change-wallpaper",
  "reset-wallpaper",
  "toggle-fullscreen",
  "open-settings",
  "reload",
]);

function formatSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="control-center-mask" @click.self="emit('close')">
      <aside class="control-center-panel">
        <!-- Top Title -->
        <header class="cc-header">
          <div class="cc-title">
            <i class="ph ph-faders-horizontal-bold"></i>
            <span>控制中心</span>
          </div>
          <button class="cc-close-btn" type="button" @click="emit('close')">×</button>
        </header>

        <!-- Main Module Grid -->
        <div class="cc-grid">
          <!-- 1. Storage Overview Tile -->
          <div class="cc-tile cc-tile-storage">
            <div class="tile-icon-bubble">
              <i class="ph ph-database-bold"></i>
            </div>
            <div class="tile-content">
              <strong>{{ storageId === 'default' ? '主存储桶 (R2)' : storageId }}</strong>
              <span>{{ totalFiles }} 个资源项目 · {{ formatSize(totalBytes) }}</span>
            </div>
          </div>

          <!-- 2. Dark / Light Mode Switcher Tile -->
          <div class="cc-tile cc-tile-clickable" @click="emit('toggle-theme')">
            <div class="tile-icon-bubble" :class="{ 'is-active': theme === 'dark' }">
              <i class="ph" :class="theme === 'dark' ? 'ph-moon-stars-fill' : 'ph-sun-dim-fill'"></i>
            </div>
            <div class="tile-content">
              <strong>{{ theme === 'dark' ? '深色外观' : '浅色外观' }}</strong>
              <span>点击切换</span>
            </div>
          </div>

          <!-- 3. Fullscreen & Settings Buttons -->
          <div class="cc-tile cc-tile-clickable" @click="emit('toggle-fullscreen')">
            <div class="tile-icon-bubble">
              <i class="ph ph-corners-out-bold"></i>
            </div>
            <div class="tile-content">
              <strong>全屏模式</strong>
              <span>进入/退出全屏</span>
            </div>
          </div>

          <div class="cc-tile cc-tile-clickable" @click="emit('reload')">
            <div class="tile-icon-bubble">
              <i class="ph ph-arrows-clockwise-bold"></i>
            </div>
            <div class="tile-content">
              <strong>刷新索引</strong>
              <span>秒级全盘扫描</span>
            </div>
          </div>
        </div>

        <!-- 4. Dynamic macOS Wallpapers Grid -->
        <div class="cc-wallpapers-section">
          <div class="cc-wp-header">
            <h4><i class="ph ph-paint-brush-bold"></i> macOS 桌面壁纸</h4>
            <button v-if="customWallpaper" class="reset-wp-link" type="button" @click="emit('reset-wallpaper')">
              还原默认壁纸
            </button>
          </div>
          <div class="wallpaper-cards-grid">
            <div
              v-for="wp in wallpapers"
              :key="wp.id"
              class="wp-thumb-card"
              :class="{ active: !customWallpaper && currentWallpaper === wp.id }"
              @click="emit('change-wallpaper', wp.id)"
            >
              <div class="wp-preview" :style="{ background: wp.gradient }"></div>
              <span>{{ wp.name }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.control-center-mask {
  position: fixed;
  inset: 0;
  z-index: 105;
  background: rgba(0, 0, 0, 0.15);
  animation: fade-in 0.18s ease-out;
}

.control-center-panel {
  position: fixed;
  top: 40px;
  right: 14px;
  width: 320px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(30, 31, 38, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(40px) saturate(220%);
  color: #f2f2f7;
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: cc-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

[data-theme="light"] .control-center-panel {
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.18), inset 0 1px 0 #ffffff;
  color: #1d1d1f;
}

.cc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
}

.cc-close-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: rgba(118, 118, 128, 0.12);
  color: #8e8e93;
  font-size: 16px;
  cursor: pointer;
}

/* 2x2 Grid */
.cc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.cc-tile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .cc-tile {
  background: rgba(0, 0, 0, 0.035);
  border-color: rgba(0, 0, 0, 0.06);
}

.cc-tile-storage {
  grid-column: 1 / -1;
}

.cc-tile-clickable {
  cursor: pointer;
  transition: all 0.16s ease;
}

.cc-tile-clickable:hover {
  background: rgba(10, 132, 255, 0.15);
  border-color: rgba(10, 132, 255, 0.3);
  transform: translateY(-1px);
}

.tile-icon-bubble {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #0a84ff;
  font-size: 18px;
  flex-shrink: 0;
}

.tile-icon-bubble.is-active {
  background: #0a84ff;
  color: #ffffff;
}

.tile-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tile-content strong {
  font-size: 12.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-content span {
  font-size: 10.5px;
  color: #8e8e93;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Wallpapers Section */
.cc-wp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 10px;
}

.cc-wp-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #8e8e93;
  display: flex;
  align-items: center;
  gap: 6px;
}

.reset-wp-link {
  font-size: 11px;
  color: #0a84ff;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.reset-wp-link:hover {
  text-decoration: underline;
}

.wallpaper-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.wp-thumb-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.wp-preview {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.18s ease;
}

.wp-thumb-card.active .wp-preview {
  border-color: #0a84ff;
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.35);
}

.wp-thumb-card span {
  font-size: 10px;
  color: #8e8e93;
}

@keyframes cc-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
