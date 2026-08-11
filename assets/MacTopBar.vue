<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  activeAppName: { type: String, default: "访达" },
  theme: { type: String, default: "dark" },
  storageId: { type: String, default: "default" },
  storageOptions: { type: Array, default: () => [{ id: "default", label: "主存储" }] },
});

const emit = defineEmits([
  "action",
  "toggle-theme",
  "open-spotlight",
  "toggle-control-center",
  "switch-storage",
  "switch-mode",
  "open-settings",
]);

const currentTime = ref("");
const currentDate = ref("");
const activeMenu = ref(null);
const weather = ref({ temp: "26°C", text: "晴", icon: "ph-sun-dim-fill" });

function updateClock() {
  const now = new Date();
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dayStr = days[now.getDay()];
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  currentDate.value = `${dayStr} ${month}月${date}日`;
  currentTime.value = `${hours}:${minutes}:${seconds}`;
}

let timer = null;

function toggleMenu(name) {
  activeMenu.value = activeMenu.value === name ? null : name;
}

function handleGlobalClick(e) {
  if (!e.target.closest(".mac-menubar")) {
    activeMenu.value = null;
  }
}

onMounted(() => {
  updateClock();
  timer = setInterval(updateClock, 1000);
  window.addEventListener("click", handleGlobalClick);
});

onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener("click", handleGlobalClick);
});
</script>

<template>
  <header class="mac-menubar">
    <!-- Left Menu Group -->
    <div class="menubar-left">
      <!--  Apple / Cat Logo Dropdown -->
      <div class="menu-item-group">
        <button class="menubar-btn apple-logo-btn" :class="{ active: activeMenu === 'apple' }" type="button" @click.stop="toggleMenu('apple')">
          <i class="ph ph-apple-logo-fill"></i>
        </button>
        <div v-if="activeMenu === 'apple'" class="mac-dropdown-menu">
          <button class="dropdown-item" type="button" @click="emit('open-settings'); activeMenu = null">
            <i class="ph ph-info"></i> 关于此天才猫云端电脑...
          </button>
          <button class="dropdown-item" type="button" @click="emit('open-settings'); activeMenu = null">
            <i class="ph ph-sliders"></i> 系统偏好设置...
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" @click="emit('switch-mode', 'studio'); activeMenu = null">
            <i class="ph ph-layout"></i> 切换为经典展厅模式
          </button>
          <button class="dropdown-item" type="button" @click="emit('toggle-theme'); activeMenu = null">
            <i class="ph" :class="theme === 'dark' ? 'ph-sun' : 'ph-moon'"></i> 切换为{{ theme === 'dark' ? '浅色模式' : '暗色模式' }}
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" @click="emit('action', 'reload'); activeMenu = null">
            <i class="ph ph-arrows-clockwise"></i> 刷新桌面
          </button>
          <button class="dropdown-item danger" type="button" @click="emit('action', 'logout'); activeMenu = null">
            <i class="ph ph-power"></i> 锁定屏幕 / 退出登录
          </button>
        </div>
      </div>

      <!-- App Name Bold -->
      <strong class="active-app-name">{{ activeAppName }}</strong>

      <!-- App Menus -->
      <div class="menu-item-group">
        <button class="menubar-btn" :class="{ active: activeMenu === 'file' }" type="button" @click.stop="toggleMenu('file')">文件</button>
        <div v-if="activeMenu === 'file'" class="mac-dropdown-menu">
          <button class="dropdown-item" type="button" @click="emit('action', 'new-folder'); activeMenu = null">
            <span>新建文件夹</span> <kbd>⇧⌘N</kbd>
          </button>
          <button class="dropdown-item" type="button" @click="emit('action', 'upload'); activeMenu = null">
            <span>上传文件...</span> <kbd>⌘U</kbd>
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" @click="emit('action', 'close-window'); activeMenu = null">
            <span>关闭窗口</span> <kbd>⌘W</kbd>
          </button>
        </div>
      </div>

      <div class="menu-item-group">
        <button class="menubar-btn" :class="{ active: activeMenu === 'edit' }" type="button" @click.stop="toggleMenu('edit')">编辑</button>
        <div v-if="activeMenu === 'edit'" class="mac-dropdown-menu">
          <button class="dropdown-item" type="button" @click="emit('action', 'paste'); activeMenu = null">
            <span>粘贴项目</span> <kbd>⌘V</kbd>
          </button>
          <button class="dropdown-item" type="button" @click="emit('action', 'select-all'); activeMenu = null">
            <span>全选</span> <kbd>⌘A</kbd>
          </button>
        </div>
      </div>

      <div class="menu-item-group">
        <button class="menubar-btn" :class="{ active: activeMenu === 'view' }" type="button" @click.stop="toggleMenu('view')">显示</button>
        <div v-if="activeMenu === 'view'" class="mac-dropdown-menu">
          <button class="dropdown-item" type="button" @click="emit('action', 'view-grid'); activeMenu = null">
            <span>作为图标</span> <kbd>⌘1</kbd>
          </button>
          <button class="dropdown-item" type="button" @click="emit('action', 'view-list'); activeMenu = null">
            <span>作为列表</span> <kbd>⌘2</kbd>
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" type="button" @click="emit('action', 'toggle-fullscreen'); activeMenu = null">
            <span>进入全屏幕</span> <kbd>⌃⌘F</kbd>
          </button>
        </div>
      </div>

      <div class="menu-item-group">
        <button class="menubar-btn" :class="{ active: activeMenu === 'help' }" type="button" @click.stop="toggleMenu('help')">帮助</button>
        <div v-if="activeMenu === 'help'" class="mac-dropdown-menu">
          <button class="dropdown-item" type="button" @click="emit('action', 'hotkeys'); activeMenu = null">
            <span>键盘快捷键速查</span> <kbd>?</kbd>
          </button>
          <button class="dropdown-item" type="button" @click="emit('open-settings'); activeMenu = null">
            <span>关于 GeniusCat R2 OS</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Right Status Bar Group -->
    <div class="menubar-right">
      <!-- Storage Switcher Pill -->
      <label class="status-storage-badge" title="当前存储桶">
        <i class="ph ph-database"></i>
        <select :value="storageId" @change="emit('switch-storage', $event.target.value)">
          <option v-for="s in storageOptions" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </label>

      <!-- Weather Widget Pill -->
      <div class="status-weather-pill" title="天气预报">
        <i class="ph" :class="weather.icon"></i>
        <span>{{ weather.temp }} {{ weather.text }}</span>
      </div>

      <!-- Theme Switcher -->
      <button class="status-btn" type="button" :title="theme === 'dark' ? '切换为浅色模式' : '切换为暗色模式'" @click="emit('toggle-theme')">
        <i class="ph" :class="theme === 'dark' ? 'ph-moon-stars-fill' : 'ph-sun-dim-fill'"></i>
      </button>

      <!-- Spotlight Search -->
      <button class="status-btn" type="button" title="Spotlight 聚焦搜索 (⌘K)" @click="emit('open-spotlight')">
        <i class="ph ph-magnifying-glass"></i>
      </button>

      <!-- Control Center Button -->
      <button class="status-btn" type="button" title="控制中心" @click="emit('toggle-control-center')">
        <i class="ph ph-faders-horizontal"></i>
      </button>

      <!-- Clock & Date (With Seconds) -->
      <div class="status-clock" title="日期与时间">
        <span>{{ currentDate }}</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>
    </div>
  </header>
</template>

<style scoped>
.mac-menubar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: rgba(20, 21, 28, 0.72);
  color: #f2f2f7;
  backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 13px;
  font-weight: 500;
  user-select: none;
}

[data-theme="light"] .mac-menubar {
  background: rgba(255, 255, 255, 0.75);
  color: #1d1d1f;
  border-bottom-color: rgba(60, 60, 67, 0.1);
}

.menubar-left, .menubar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.menubar-btn {
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.menubar-btn:hover, .menubar-btn.active {
  background: rgba(255, 255, 255, 0.15);
}

[data-theme="light"] .menubar-btn:hover, [data-theme="light"] .menubar-btn.active {
  background: rgba(0, 0, 0, 0.08);
}

.apple-logo-btn {
  font-size: 15px;
  padding: 0 8px;
}

.active-app-name {
  padding: 0 8px 0 4px;
  font-size: 13.5px;
  font-weight: 750;
  letter-spacing: -0.2px;
}

/* Dropdown Menu */
.menu-item-group {
  position: relative;
}

.mac-dropdown-menu {
  position: absolute;
  top: 28px;
  left: 0;
  min-width: 220px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(30, 31, 38, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(40px) saturate(200%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 110;
  animation: dropdown-in 0.15s ease-out;
}

[data-theme="light"] .mac-dropdown-menu {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18), inset 0 1px 0 #ffffff;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s ease;
  text-align: left;
}

.dropdown-item:hover {
  background: #0a84ff;
  color: #ffffff;
}

.dropdown-item.danger:hover {
  background: #ff453a;
  color: #ffffff;
}

.dropdown-item kbd {
  font-family: -apple-system, BlinkMacSystemFont, monospace;
  font-size: 11px;
  opacity: 0.7;
}

.dropdown-divider {
  height: 1px;
  margin: 4px 6px;
  background: rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .dropdown-divider {
  background: rgba(60, 60, 67, 0.08);
}

/* Status Bar Right */
.status-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.status-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

[data-theme="light"] .status-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.status-storage-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.status-storage-badge select {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11.5px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.status-weather-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  height: 22px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  font-weight: 600;
  color: #ffcc00;
  cursor: default;
}

[data-theme="light"] .status-weather-pill {
  background: rgba(0, 0, 0, 0.06);
  color: #ff9500;
}

.status-weather-pill i {
  font-size: 14px;
}

.status-clock {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  font-size: 12px;
  cursor: default;
}

.status-clock strong {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
