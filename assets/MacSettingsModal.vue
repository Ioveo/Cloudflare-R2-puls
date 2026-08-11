<script setup>
import { ref } from "vue";

const props = defineProps({
  visible: Boolean,
  theme: String,
  storageId: String,
  storageOptions: Array,
  currentWallpaper: String,
  wallpapers: Array,
  authCredentials: Object,
});

const emit = defineEmits([
  "close",
  "toggle-theme",
  "switch-storage",
  "change-wallpaper",
  "login",
  "logout",
]);

const activeTab = ref("about"); // 'about' | 'storage' | 'appearance' | 'account'

const usernameInput = ref("");
const passwordInput = ref("");

function handleLogin() {
  if (!usernameInput.value || !passwordInput.value) return;
  emit("login", { username: usernameInput.value.trim(), password: passwordInput.value });
}
</script>

<template>
  <div v-if="visible" class="settings-modal-wrap">
    <div class="settings-sidebar">
      <div class="settings-user-card">
        <div class="user-avatar">
          <i class="ph ph-cat-fill"></i>
        </div>
        <div class="user-info">
          <strong>天才猫云端电脑</strong>
          <span>{{ authCredentials ? `已登录: ${authCredentials.username}` : '访客身份' }}</span>
        </div>
      </div>

      <nav class="settings-nav">
        <button class="nav-btn" :class="{ active: activeTab === 'about' }" type="button" @click="activeTab = 'about'">
          <i class="ph ph-info-bold"></i> 关于本机
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'storage' }" type="button" @click="activeTab = 'storage'">
          <i class="ph ph-database-bold"></i> R2 存储桶管理
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'appearance' }" type="button" @click="activeTab = 'appearance'">
          <i class="ph ph-paint-brush-bold"></i> 外观与桌面壁纸
        </button>
        <button class="nav-btn" :class="{ active: activeTab === 'account' }" type="button" @click="activeTab = 'account'">
          <i class="ph ph-lock-key-bold"></i> 管理员鉴权
        </button>
      </nav>
    </div>

    <!-- Main Settings Body -->
    <main class="settings-content">
      <!-- 1. About This Mac -->
      <section v-if="activeTab === 'about'" class="tab-pane">
        <div class="about-hero">
          <div class="mac-logo-box">
            <i class="ph ph-apple-logo-fill"></i>
          </div>
          <h2>GeniusCat macOS 26 Sequoia</h2>
          <p class="mac-version">版本 26.4 (云端边缘构建)</p>
        </div>

        <div class="specs-card">
          <div class="spec-row">
            <span>芯片</span>
            <strong>Cloudflare Edge Workers V8 Engine</strong>
          </div>
          <div class="spec-row">
            <span>对象存储</span>
            <strong>Cloudflare R2 Global Distributed Bucket</strong>
          </div>
          <div class="spec-row">
            <span>前端框架</span>
            <strong>Vue 3 SFC Loader + Phosphor Icons</strong>
          </div>
          <div class="spec-row">
            <span>加速协议</span>
            <strong>HTTP/3 (QUIC) + Global Anycast CDN</strong>
          </div>
        </div>
      </section>

      <!-- 2. Storage Buckets -->
      <section v-else-if="activeTab === 'storage'" class="tab-pane">
        <h3>R2 存储桶绑定与切换</h3>
        <p class="tab-subtitle">当前 Cloudflare Pages / Workers 已挂载的存储节点：</p>
        
        <div class="storage-list">
          <div
            v-for="s in storageOptions"
            :key="s.id"
            class="storage-card-item"
            :class="{ active: storageId === s.id }"
            @click="emit('switch-storage', s.id)"
          >
            <div class="s-icon"><i class="ph ph-database-fill"></i></div>
            <div class="s-info">
              <strong>{{ s.label }}</strong>
              <span>ID: {{ s.id }} · {{ s.id === 'default' ? '主存储桶' : '备用存储桶' }}</span>
            </div>
            <span v-if="storageId === s.id" class="active-badge">当前使用</span>
          </div>
        </div>
      </section>

      <!-- 3. Appearance & Wallpapers -->
      <section v-else-if="activeTab === 'appearance'" class="tab-pane">
        <h3>外观主题与壁纸</h3>
        
        <div class="theme-row-selector">
          <div class="theme-choice" :class="{ active: theme === 'dark' }" @click="emit('toggle-theme')">
            <div class="theme-preview dark-p"></div>
            <span>深色外观 (Dark)</span>
          </div>
          <div class="theme-choice" :class="{ active: theme === 'light' }" @click="emit('toggle-theme')">
            <div class="theme-preview light-p"></div>
            <span>浅色外观 (Light)</span>
          </div>
        </div>

        <h4 style="margin-top: 20px;">桌面 4K 动态壁纸</h4>
        <div class="wp-grid-settings">
          <div
            v-for="wp in wallpapers"
            :key="wp.id"
            class="wp-box-card"
            :class="{ active: currentWallpaper === wp.id }"
            @click="emit('change-wallpaper', wp.id)"
          >
            <div class="wp-box-preview" :style="{ background: wp.gradient }"></div>
            <span>{{ wp.name }}</span>
          </div>
        </div>
      </section>

      <!-- 4. Account -->
      <section v-else-if="activeTab === 'account'" class="tab-pane">
        <h3>管理员身份与读写鉴权</h3>
        
        <div v-if="authCredentials" class="auth-logged-card">
          <div class="auth-icon-check"><i class="ph ph-check-circle-fill"></i></div>
          <div class="auth-logged-info">
            <strong>已登录管理员账号</strong>
            <span>用户名: {{ authCredentials.username }}</span>
          </div>
          <button class="btn-logout" type="button" @click="emit('logout')">退出登录</button>
        </div>

        <div v-else class="auth-login-form">
          <p class="tab-subtitle">输入管理员账号和密码以解锁上传、重命名、移动和删除权限：</p>
          <div class="form-group">
            <label>管理员用户名</label>
            <input v-model="usernameInput" type="text" placeholder="例如: admin" />
          </div>
          <div class="form-group">
            <label>管理员密码</label>
            <input v-model="passwordInput" type="password" placeholder="请输入密码" />
          </div>
          <button class="btn-login-submit" type="button" @click="handleLogin">登录保存</button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings-modal-wrap {
  display: flex;
  width: 100%;
  height: 100%;
}

.settings-sidebar {
  width: 220px;
  background: rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

[data-theme="light"] .settings-sidebar {
  background: rgba(0, 0, 0, 0.03);
  border-right-color: rgba(60, 60, 67, 0.08);
}

.settings-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0a84ff;
  color: #fff;
  font-size: 20px;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-info strong {
  font-size: 12px;
  font-weight: 700;
}

.user-info span {
  font-size: 10.5px;
  color: #8e8e93;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-btn.active {
  background: #0a84ff;
  color: #ffffff;
}

/* Content Area */
.settings-content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
}

.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-pane h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.tab-subtitle {
  margin: 0;
  font-size: 12.5px;
  color: #8e8e93;
}

/* About Mac */
.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 0;
}

.mac-logo-box {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #ffffff;
  font-size: 36px;
  margin-bottom: 12px;
  box-shadow: 0 10px 24px rgba(10, 132, 255, 0.4);
}

.about-hero h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 750;
}

.mac-version {
  margin: 0;
  font-size: 12px;
  color: #8e8e93;
}

.specs-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .specs-card {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.06);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
}

.spec-row span { color: #8e8e93; }
.spec-row strong { font-weight: 600; }

/* Storage list */
.storage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.16s ease;
}

.storage-card-item:hover, .storage-card-item.active {
  border-color: #0a84ff;
  background: rgba(10, 132, 255, 0.1);
}

.s-icon {
  font-size: 24px;
  color: #0a84ff;
}

.s-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.s-info strong { font-size: 13px; }
.s-info span { font-size: 11px; color: #8e8e93; }

.active-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #0a84ff;
  color: #fff;
  font-weight: 600;
}

/* Appearance */
.theme-row-selector {
  display: flex;
  gap: 14px;
}

.theme-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.theme-preview {
  width: 100px;
  height: 60px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: all 0.16s ease;
}

.dark-p { background: #1a1a24; }
.light-p { background: #e5e5ea; }

.theme-choice.active .theme-preview {
  border-color: #0a84ff;
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.35);
}

.theme-choice span { font-size: 11.5px; }

.wp-grid-settings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.wp-box-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.wp-box-preview {
  width: 100%;
  height: 60px;
  border-radius: 10px;
  border: 2px solid transparent;
}

.wp-box-card.active .wp-box-preview {
  border-color: #0a84ff;
}

.wp-box-card span { font-size: 11px; color: #8e8e93; }

/* Auth */
.auth-logged-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(50, 215, 75, 0.12);
  border: 1px solid rgba(50, 215, 75, 0.25);
}

.auth-icon-check { font-size: 32px; color: #32d74b; }
.auth-logged-info { flex: 1; display: flex; flex-direction: column; }
.btn-logout { padding: 6px 14px; border-radius: 8px; border: none; background: #ff453a; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }

.auth-login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label { font-size: 12px; color: #8e8e93; font-weight: 600; }
.form-group input { height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.06); color: inherit; outline: none; }
.btn-login-submit { height: 36px; border-radius: 8px; border: none; background: #0a84ff; color: #fff; font-weight: 600; cursor: pointer; }
</style>
