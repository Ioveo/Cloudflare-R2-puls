<script setup>
import { ref, computed, watch, onMounted } from "vue";
import MacWindow from "./MacWindow.vue";
import MacIcons from "./MacIcons.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  minimized: { type: Boolean, default: false },
  files: { type: Array, default: () => [] },
  allFiles: { type: Array, default: () => [] },
  metadata: { type: Object, default: () => ({}) },
  storageId: { type: String, default: "default" },
  zIndex: { type: Number, default: 35 },
  isActive: { type: Boolean, default: false },
  authCredentials: { type: Object, default: null },
});

const emit = defineEmits(["close", "minimize", "focus", "save-metadata", "upload", "download"]);

// State
const currentTab = ref("discover"); // 'discover' | 'design' | 'productivity' | 'developer' | 'utilities' | 'entertainment' | 'network' | 'mobile' | 'all'
const selectedPlatform = ref("all"); // 'all' | 'mac' | 'win' | 'mobile' | 'linux'
const searchQuery = ref("");
const selectedApp = ref(null); // Active app for Detail modal
const editingApp = ref(null); // Active app for Edit modal
const copySuccessTip = ref("");

// Category definitions
const categories = [
  { id: "discover", name: "探索发现", icon: "ph-sparkle-fill", color: "#3b82f6" },
  { id: "design", name: "设计创意", icon: "ph-paint-brush-fill", color: "#ec4899" },
  { id: "productivity", name: "效率办公", icon: "ph-lightning-fill", color: "#f59e0b" },
  { id: "developer", name: "开发工具", icon: "ph-code-fill", color: "#10b981" },
  { id: "utilities", name: "系统工具", icon: "ph-wrench-fill", color: "#6366f1" },
  { id: "entertainment", name: "影音娱乐", icon: "ph-film-strip-fill", color: "#8b5cf6" },
  { id: "network", name: "网络通讯", icon: "ph-globe-simple-fill", color: "#06b6d4" },
  { id: "mobile", name: "移动专属", icon: "ph-device-mobile-fill", color: "#14b8a6" },
  { id: "all", name: "全部应用", icon: "ph-squares-four-fill", color: "#64748b" },
];

// Helper: Check if a file is a software package
function isSoftware(file) {
  if (!file || !file.key) return false;
  const key = file.key.toLowerCase();
  return /\.(dmg|pkg|app\.zip|exe|msi|apk|ipa|deb|appimage|rpm)$/i.test(key) ||
    (key.endsWith(".zip") && (key.includes("mac") || key.includes("win") || key.includes("v1.") || key.includes("v2.") || key.includes("app")));
}

// Helper: Detect platform from file
function detectPlatform(key) {
  const lower = (key || "").toLowerCase();
  if (lower.endsWith(".dmg") || lower.endsWith(".pkg") || lower.includes("macos") || lower.includes("mac_")) {
    if (lower.includes("arm64") || lower.includes("apple_silicon") || lower.includes("m1") || lower.includes("m2") || lower.includes("m3") || lower.includes("m4")) {
      return "macOS (Apple Silicon)";
    }
    if (lower.includes("intel") || lower.includes("x64") || lower.includes("x86_64")) {
      return "macOS (Intel)";
    }
    return "macOS (通用)";
  }
  if (lower.endsWith(".exe") || lower.endsWith(".msi") || lower.includes("win_") || lower.includes("windows")) {
    return lower.includes("arm") ? "Windows (ARM64)" : "Windows (x64)";
  }
  if (lower.endsWith(".apk")) return "Android (APK)";
  if (lower.endsWith(".ipa")) return "iOS (IPA)";
  if (lower.endsWith(".deb") || lower.endsWith(".appimage")) return "Linux";
  return "跨平台通用";
}

// Helper: Parse title & version from file key
function parseDefaultMeta(file) {
  const key = file.key || "";
  let baseName = key.split("/").pop() || key;
  baseName = baseName.replace(/\.[a-zA-Z0-9_\.]*$/, ""); // remove ext

  // Try extracting version
  let version = "1.0.0";
  const verMatch = baseName.match(/[vV]?(\d+\.\d+(\.\d+)?)/);
  if (verMatch) {
    version = `v${verMatch[1]}`;
  }

  // Clean title
  let title = baseName
    .replace(/[vV]?\d+\.\d+(\.\d+)?.*$/, "")
    .replace(/[_\-]+(mac|macos|win|windows|x64|arm64|universal|crack|patch|setup|installer)/gi, " ")
    .replace(/[_\-\.]+/g, " ")
    .trim();

  if (!title) title = baseName;

  // Auto category guess
  let category = "utilities";
  const l = baseName.toLowerCase();
  if (l.includes("adobe") || l.includes("photoshop") || l.includes("sketch") || l.includes("figma") || l.includes("illustrator") || l.includes("blender") || l.includes("c4d")) category = "design";
  else if (l.includes("notion") || l.includes("office") || l.includes("word") || l.includes("excel") || l.includes("obsidian") || l.includes("wps")) category = "productivity";
  else if (l.includes("vscode") || l.includes("idea") || l.includes("pycharm") || l.includes("git") || l.includes("docker") || l.includes("navicat") || l.includes("tableplus")) category = "developer";
  else if (l.includes("final") || l.includes("cut") || l.includes("premiere") || l.includes("logic") || l.includes("vlc") || l.includes("iina") || l.includes("music")) category = "entertainment";
  else if (l.includes("clash") || l.includes("surge") || l.includes("chrome") || l.includes("edge") || l.includes("telegram") || l.includes("vpn")) category = "network";
  else if (l.endsWith(".apk") || l.endsWith(".ipa")) category = "mobile";

  return {
    title,
    version,
    category,
    platform: detectPlatform(key),
    summary: `${title} 官方高保真安装包，纯净无广告，极速直连下载。`,
    features: ["极速云端直连下载", "经过完整兼容性校验", "支持断点续传"],
    installGuide: detectPlatform(key).includes("macOS")
      ? "1. 双击打开 DMG 镜像包；\n2. 将应用图标拖拽至「Applications / 应用程序」文件夹；\n3. 若打开提示「文件已损坏」或无法打开，请在终端输入并回车：\nsudo xattr -rd com.apple.quarantine /Applications/应用名.app"
      : "1. 下载安装包后双击运行；\n2. 按照安装向导提示点击「下一步」完成安装。",
  };
}

// All parsed software items with merged metadata
const softwareItems = computed(() => {
  const source = props.allFiles && props.allFiles.length ? props.allFiles : props.files;
  const list = source.filter(isSoftware);

  return list.map((file) => {
    const custom = props.metadata[file.key] || {};
    const def = parseDefaultMeta(file);
    return {
      file,
      key: file.key,
      size: file.size || 0,
      uploaded: file.uploaded || "",
      title: custom.title || def.title,
      version: custom.version || def.version,
      category: custom.category || def.category,
      platform: custom.platform || def.platform,
      summary: custom.summary || def.summary,
      features: custom.features && custom.features.length ? custom.features : def.features,
      installGuide: custom.installGuide || def.installGuide,
      icon: custom.icon || "",
      screenshots: custom.screenshots || [],
      custom: !!props.metadata[file.key],
    };
  });
});

// Filtered apps based on tab, platform, and search
const filteredApps = computed(() => {
  let list = softwareItems.value;

  // Category filter
  if (currentTab.value !== "discover" && currentTab.value !== "all") {
    list = list.filter((app) => app.category === currentTab.value);
  }

  // Platform filter
  if (selectedPlatform.value !== "all") {
    if (selectedPlatform.value === "mac") list = list.filter((app) => app.platform.toLowerCase().includes("mac"));
    else if (selectedPlatform.value === "win") list = list.filter((app) => app.platform.toLowerCase().includes("win"));
    else if (selectedPlatform.value === "mobile") list = list.filter((app) => app.platform.toLowerCase().includes("android") || app.platform.toLowerCase().includes("ios"));
    else if (selectedPlatform.value === "linux") list = list.filter((app) => app.platform.toLowerCase().includes("linux"));
  }

  // Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((app) =>
      app.title.toLowerCase().includes(q) ||
      app.summary.toLowerCase().includes(q) ||
      app.key.toLowerCase().includes(q) ||
      app.version.toLowerCase().includes(q)
    );
  }

  return list;
});

// Spotlight Hero App (Top 1 app for Discover view)
const heroApp = computed(() => {
  if (softwareItems.value.length > 0) {
    return softwareItems.value[0];
  }
  return {
    title: "macOS 软件工坊 (Software Hub)",
    version: "v2026.1",
    category: "productivity",
    platform: "macOS · Windows · Mobile",
    summary: "专为个人与团队打造的云端软件分发中心。支持全平台架构智能分类、一键直连秒下与安装备忘。",
    features: ["全盘安装包自动归档", "macOS 1:1 商店高保真视效", "安装教程与终端指令一键复制"],
  };
});

function formatSize(size) {
  if (!size || isNaN(size)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function rawUrl(key) {
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

function openDetail(app) {
  selectedApp.value = app;
}

function openEditor(app) {
  editingApp.value = {
    key: app.key,
    title: app.title,
    version: app.version,
    category: app.category,
    platform: app.platform,
    summary: app.summary,
    featuresText: Array.isArray(app.features) ? app.features.join("\n") : "",
    installGuide: app.installGuide,
  };
}

function saveAppEditor() {
  if (!editingApp.value || !editingApp.value.key) return;
  const features = editingApp.value.featuresText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const updated = {
    ...props.metadata,
    [editingApp.value.key]: {
      title: editingApp.value.title,
      version: editingApp.value.version,
      category: editingApp.value.category,
      platform: editingApp.value.platform,
      summary: editingApp.value.summary,
      features,
      installGuide: editingApp.value.installGuide,
      updatedAt: new Date().toISOString(),
    },
  };

  emit("save-metadata", updated);
  editingApp.value = null;

  // Refresh selected app view if open
  if (selectedApp.value && selectedApp.value.key === editingApp.value?.key) {
    selectedApp.value = {
      ...selectedApp.value,
      ...updated[selectedApp.value.key],
    };
  }
}

function copyText(text, label = "已复制到剪贴板") {
  navigator.clipboard.writeText(text);
  copySuccessTip.value = label;
  setTimeout(() => {
    copySuccessTip.value = "";
  }, 2500);
}
</script>

<template>
  <MacWindow
    v-if="visible"
    title="App Store · 软件工坊"
    icon="ph-app-store-logo-fill"
    :visible="visible"
    :minimized="minimized"
    :width="980"
    :height="640"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
    @minimize="emit('minimize')"
  >
    <!-- macOS App Store Toolbar -->
    <template #titlebar-right>
      <div class="store-titlebar-tools">
        <!-- Platform Segmented Picker -->
        <div class="platform-segment">
          <button :class="{ active: selectedPlatform === 'all' }" type="button" @click="selectedPlatform = 'all'">全部</button>
          <button :class="{ active: selectedPlatform === 'mac' }" type="button" @click="selectedPlatform = 'mac'">🍎 macOS</button>
          <button :class="{ active: selectedPlatform === 'win' }" type="button" @click="selectedPlatform = 'win'">🪟 Win</button>
          <button :class="{ active: selectedPlatform === 'mobile' }" type="button" @click="selectedPlatform = 'mobile'">📱 移动端</button>
        </div>

        <!-- Quick Search -->
        <div class="store-search-box">
          <i class="ph ph-magnifying-glass"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索软件、版本或关键词..." />
          <button v-if="searchQuery" class="clear-search" type="button" @click="searchQuery = ''">×</button>
        </div>

        <!-- Upload Package Button -->
        <button class="store-upload-btn" type="button" title="上传新软件安装包" @click="emit('upload', '软件/')">
          <i class="ph ph-plus-circle-bold"></i>
          <span>发布软件</span>
        </button>
      </div>
    </template>

    <!-- App Store 2-Column Layout -->
    <div class="appstore-layout">
      <!-- Left Glass Sidebar -->
      <aside class="store-sidebar">
        <div class="sidebar-sec-title">分类浏览</div>
        <nav class="store-nav">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="store-nav-item"
            :class="{ active: currentTab === cat.id }"
            type="button"
            @click="currentTab = cat.id"
          >
            <div class="nav-cat-icon" :style="{ backgroundColor: cat.color }">
              <i class="ph" :class="cat.icon"></i>
            </div>
            <span class="nav-cat-name">{{ cat.name }}</span>
            <span v-if="cat.id !== 'discover'" class="nav-cat-badge">
              {{ cat.id === 'all' ? softwareItems.length : softwareItems.filter(a => a.category === cat.id).length }}
            </span>
          </button>
        </nav>

        <!-- Storage Status Pill -->
        <div class="store-sidebar-footer">
          <div class="footer-chip">
            <i class="ph ph-shield-check-fill"></i>
            <span>Cloudflare R2 直连加速</span>
          </div>
        </div>
      </aside>

      <!-- Right Main Content Area -->
      <main class="store-content-pane">
        <!-- 🌟 1. Discover Hero Banner (When currentTab === 'discover') -->
        <section v-if="currentTab === 'discover' && !searchQuery" class="store-hero-banner">
          <div class="hero-backdrop-glow"></div>
          <div class="hero-content">
            <div class="hero-tag">🌟 精选主推 · FEATURED APP</div>
            <h2 class="hero-title">{{ heroApp.title }}</h2>
            <p class="hero-summary">{{ heroApp.summary }}</p>
            <div class="hero-meta-row">
              <span class="meta-pill platform-pill"><i class="ph ph-laptop"></i> {{ heroApp.platform }}</span>
              <span class="meta-pill version-pill"><i class="ph ph-tag"></i> {{ heroApp.version }}</span>
              <span v-if="heroApp.size" class="meta-pill size-pill"><i class="ph ph-hard-drive"></i> {{ formatSize(heroApp.size) }}</span>
            </div>
            <div class="hero-actions">
              <a v-if="heroApp.file" :href="rawUrl(heroApp.key)" :download="heroApp.title" class="hero-get-btn">
                <i class="ph ph-arrow-circle-down-bold"></i>
                <span>立即下载</span>
              </a>
              <button v-if="heroApp.file" class="hero-detail-btn" type="button" @click="openDetail(heroApp)">
                <i class="ph ph-info-bold"></i>
                <span>功能与安装指南</span>
              </button>
            </div>
          </div>
          <div class="hero-badge-icon">
            <MacIcons name="appstore" :size="96" />
          </div>
        </section>

        <!-- 📦 2. Section Header & App Grid -->
        <div class="store-grid-header">
          <div class="grid-title-row">
            <h3>{{ categories.find(c => c.id === currentTab)?.name || '软件应用库' }}</h3>
            <span class="grid-count">共 {{ filteredApps.length }} 款软件</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredApps.length === 0" class="store-empty-state">
          <div class="empty-icon"><i class="ph ph-package-fill"></i></div>
          <h4>暂无该分类下的软件包</h4>
          <p>点击上方「发布软件」上传 `.dmg`、`.exe`、`.apk` 等软件安装包，即可自动智能生成专属展示卡片！</p>
          <button class="empty-upload-btn" type="button" @click="emit('upload', '软件/')">
            <i class="ph ph-upload-simple-bold"></i>
            <span>立即上传软件</span>
          </button>
        </div>

        <!-- Software Cards Grid -->
        <div v-else class="store-apps-grid">
          <article
            v-for="app in filteredApps"
            :key="app.key"
            class="app-card"
            @click="openDetail(app)"
          >
            <div class="app-card-top">
              <!-- App Vector / System Icon -->
              <div class="app-icon-frame">
                <MacIcons name="apps" :size="48" />
              </div>
              <div class="app-info-block">
                <h4 class="app-title" :title="app.title">{{ app.title }}</h4>
                <div class="app-sub-row">
                  <span class="app-ver">{{ app.version }}</span>
                  <span class="app-size">{{ formatSize(app.size) }}</span>
                </div>
                <div class="app-platform-tag" :title="app.platform">
                  <i v-if="app.platform.includes('macOS')" class="ph ph-apple-logo"></i>
                  <i v-else-if="app.platform.includes('Windows')" class="ph ph-windows-logo"></i>
                  <i v-else-if="app.platform.includes('Android')" class="ph ph-android-logo"></i>
                  <i v-else class="ph ph-device-mobile"></i>
                  <span>{{ app.platform }}</span>
                </div>
              </div>
            </div>

            <!-- One-Sentence Summary -->
            <p class="app-summary-text">{{ app.summary }}</p>

            <!-- Card Bottom Buttons -->
            <div class="app-card-footer" @click.stop>
              <a :href="rawUrl(app.key)" :download="app.title" class="app-download-btn" title="直连极速下载">
                <i class="ph ph-download-simple-bold"></i>
                <span>获取</span>
              </a>
              <button class="app-meta-edit-btn" type="button" title="编辑软件简介与安装说明" @click="openEditor(app)">
                <i class="ph ph-pencil-simple-bold"></i>
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>

    <!-- 📖 3. macOS App Detail Full Modal (沉浸式详情与安装指南浮层) -->
    <Transition name="fade-slide">
      <div v-if="selectedApp" class="app-detail-overlay" @click.self="selectedApp = null">
        <div class="app-detail-card">
          <header class="detail-header">
            <div class="detail-top-info">
              <div class="detail-icon-wrap">
                <MacIcons name="apps" :size="68" />
              </div>
              <div class="detail-titles">
                <h2>{{ selectedApp.title }}</h2>
                <p class="detail-summary-lead">{{ selectedApp.summary }}</p>
                <div class="detail-pills">
                  <span class="dpill dpill-platform">{{ selectedApp.platform }}</span>
                  <span class="dpill dpill-ver">{{ selectedApp.version }}</span>
                  <span class="dpill dpill-size">{{ formatSize(selectedApp.size) }}</span>
                  <span class="dpill dpill-date">更新于 {{ formatDate(selectedApp.uploaded) }}</span>
                </div>
              </div>
            </div>

            <!-- Top Actions -->
            <div class="detail-actions">
              <a :href="rawUrl(selectedApp.key)" :download="selectedApp.title" class="detail-get-btn">
                <i class="ph ph-download-simple-bold"></i>
                <span>极速下载 ({{ formatSize(selectedApp.size) }})</span>
              </a>
              <button class="detail-copy-btn" type="button" @click="copyText(rawUrl(selectedApp.key), '直链已复制！')">
                <i class="ph ph-link-bold"></i>
                <span>复制直链</span>
              </button>
              <button class="detail-edit-btn" type="button" @click="openEditor(selectedApp)">
                <i class="ph ph-pencil-simple-bold"></i>
                <span>编辑信息</span>
              </button>
              <button class="detail-close-btn" type="button" @click="selectedApp = null">
                <i class="ph ph-x-bold"></i>
              </button>
            </div>
          </header>

          <div class="detail-body">
            <!-- 🌟 Highlights List -->
            <section v-if="selectedApp.features && selectedApp.features.length" class="detail-section">
              <h4 class="section-heading"><i class="ph ph-sparkle-fill"></i> 核心功能特色</h4>
              <ul class="features-grid">
                <li v-for="(feat, idx) in selectedApp.features" :key="idx" class="feature-item">
                  <i class="ph ph-check-circle-fill"></i>
                  <span>{{ feat }}</span>
                </li>
              </ul>
            </section>

            <!-- 🔑 Installation & License Guide -->
            <section class="detail-section">
              <div class="section-heading-row">
                <h4 class="section-heading"><i class="ph ph-terminal-window-fill"></i> 安装与激活指南 / 避坑备忘</h4>
                <button
                  v-if="selectedApp.installGuide"
                  class="copy-guide-btn"
                  type="button"
                  @click="copyText(selectedApp.installGuide, '安装指南已复制！')"
                >
                  <i class="ph ph-copy-simple-bold"></i>
                  <span>复制说明</span>
                </button>
              </div>
              <div class="install-guide-box">
                <pre class="guide-pre">{{ selectedApp.installGuide }}</pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ✏️ 4. macOS App Metadata Editor Modal (软件信息编辑器) -->
    <Transition name="fade-slide">
      <div v-if="editingApp" class="app-editor-overlay" @click.self="editingApp = null">
        <div class="app-editor-card">
          <header class="editor-header">
            <h3><i class="ph ph-pencil-simple-fill"></i> 编辑软件信息与简介</h3>
            <button class="editor-close-btn" type="button" @click="editingApp = null">×</button>
          </header>

          <form class="editor-form" @submit.prevent="saveAppEditor">
            <div class="form-row form-row-2">
              <div class="form-group">
                <label>🏷️ 软件名称 (Title)</label>
                <input v-model="editingApp.title" type="text" required placeholder="如 Final Cut Pro" />
              </div>
              <div class="form-group">
                <label>🔢 版本号 (Version)</label>
                <input v-model="editingApp.version" type="text" required placeholder="如 v10.8.1" />
              </div>
            </div>

            <div class="form-row form-row-2">
              <div class="form-group">
                <label>🗂️ 所属分类 (Category)</label>
                <select v-model="editingApp.category">
                  <option value="design">🎨 设计创意</option>
                  <option value="productivity">⚡ 效率办公</option>
                  <option value="developer">💻 开发者工具</option>
                  <option value="utilities">🛠️ 系统工具</option>
                  <option value="entertainment">🎬 影音娱乐</option>
                  <option value="network">🌐 网络通讯</option>
                  <option value="mobile">📱 移动专属</option>
                </select>
              </div>
              <div class="form-group">
                <label>💻 适用平台与架构 (Platform)</label>
                <input v-model="editingApp.platform" type="text" placeholder="如 macOS (Apple Silicon M系列)" />
              </div>
            </div>

            <div class="form-group">
              <label>📝 一句话亮点简介 (Summary)</label>
              <input v-model="editingApp.summary" type="text" placeholder="如 Apple 旗舰级非线性视频剪辑生产力神器" />
            </div>

            <div class="form-group">
              <label>🌟 核心功能亮点 (每行一条，换行分隔)</label>
              <textarea v-model="editingApp.featuresText" rows="3" placeholder="支持 8K ProRes 实时剪辑&#10;全新 AI 智能对象跟踪&#10;极速硬件加速导出"></textarea>
            </div>

            <div class="form-group">
              <label>🔑 安装与激活指南 / 终端指令 / 备忘</label>
              <textarea v-model="editingApp.installGuide" rows="4" placeholder="1. 打开 DMG 拖入 Applications&#10;2. 如提示损坏请在终端运行: sudo xattr -rd com.apple.quarantine /Applications/xxx.app"></textarea>
            </div>

            <div class="editor-btn-row">
              <button class="btn-cancel" type="button" @click="editingApp = null">取消</button>
              <button class="btn-save" type="submit">
                <i class="ph ph-floppy-disk-bold"></i>
                <span>保存并同步到云端</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Toast Notification -->
    <Transition name="fade">
      <div v-if="copySuccessTip" class="store-toast">
        <i class="ph ph-check-circle-fill"></i>
        <span>{{ copySuccessTip }}</span>
      </div>
    </Transition>
  </MacWindow>
</template>

<style scoped>
/* Toolbar tools */
.store-titlebar-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-segment {
  display: flex;
  padding: 2px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.08);
}
:root.dark .platform-segment,
@media (prefers-color-scheme: dark) {
  .platform-segment { background: rgba(255, 255, 255, 0.1); }
}

.platform-segment button {
  padding: 3px 9px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.platform-segment button.active {
  background: #ffffff;
  color: #007aff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
:root.dark .platform-segment button.active,
@media (prefers-color-scheme: dark) {
  .platform-segment button.active {
    background: #007aff;
    color: #ffffff;
  }
}

.store-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.store-search-box i {
  position: absolute;
  left: 8px;
  color: #8e8e93;
  font-size: 13px;
  pointer-events: none;
}

.store-search-box input {
  width: 170px;
  height: 26px;
  padding: 0 24px 0 26px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  outline: none;
  transition: all 0.2s;
}
:root.dark .store-search-box input,
@media (prefers-color-scheme: dark) {
  .store-search-box input {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
  }
}
.store-search-box input:focus {
  width: 210px;
  border-color: #007aff;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.clear-search {
  position: absolute;
  right: 6px;
  border: none;
  background: transparent;
  color: #8e8e93;
  font-size: 13px;
  cursor: pointer;
}

.store-upload-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 13px;
  background: linear-gradient(135deg, #007aff, #0051d5);
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.3);
  transition: all 0.15s;
}
.store-upload-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 10px rgba(0, 122, 255, 0.4);
}

/* 2-Column Layout */
.appstore-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 100%;
  overflow: hidden;
}

.store-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(245, 245, 247, 0.6);
  backdrop-filter: blur(20px);
}
:root.dark .store-sidebar,
@media (prefers-color-scheme: dark) {
  .store-sidebar {
    border-right-color: rgba(255, 255, 255, 0.08);
    background: rgba(30, 30, 35, 0.6);
  }
}

.sidebar-sec-title {
  padding: 0 8px 8px;
  color: #8e8e93;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.store-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  overflow-y: auto;
}

.store-nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}

.store-nav-item:hover {
  background: rgba(0, 0, 0, 0.05);
}
:root.dark .store-nav-item:hover,
@media (prefers-color-scheme: dark) {
  .store-nav-item:hover { background: rgba(255, 255, 255, 0.08); }
}

.store-nav-item.active {
  background: #007aff;
  color: #ffffff;
}

.nav-cat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  flex-shrink: 0;
}

.nav-cat-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-cat-badge {
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  color: #8e8e93;
  font-size: 10px;
  font-weight: 600;
}
.store-nav-item.active .nav-cat-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.store-sidebar-footer {
  padding-top: 10px;
}
.footer-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  font-size: 10px;
  font-weight: 600;
}
:root.dark .footer-chip,
@media (prefers-color-scheme: dark) {
  .footer-chip {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
}

/* Right Content Pane */
.store-content-pane {
  padding: 18px 24px;
  overflow-y: auto;
}

/* Discover Hero Banner */
.store-hero-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  margin-bottom: 22px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);
  color: #ffffff;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
}

.hero-backdrop-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 580px;
}

.hero-tag {
  display: inline-block;
  padding: 3px 8px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.hero-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.hero-summary {
  margin: 0 0 14px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  line-height: 1.5;
}

.hero-meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 11px;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.hero-get-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  background: #ffffff;
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.15s;
}
.hero-get-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 16px rgba(0,0,0,0.2);
}

.hero-detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.hero-detail-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.hero-badge-icon {
  position: relative;
  z-index: 2;
  margin-right: 12px;
  filter: drop-shadow(0 12px 24px rgba(0,0,0,0.3));
}

/* Grid Header */
.store-grid-header {
  margin-bottom: 14px;
}
.grid-title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.grid-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}
.grid-count {
  color: #8e8e93;
  font-size: 12px;
}

/* Empty State */
.store-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
.empty-icon {
  color: #94a3b8;
  font-size: 48px;
  margin-bottom: 12px;
}
.store-empty-state h4 {
  margin: 0 0 6px;
  font-size: 15px;
}
.store-empty-state p {
  max-width: 420px;
  margin: 0 0 18px;
  color: #8e8e93;
  font-size: 12px;
  line-height: 1.5;
}
.empty-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 12px;
  background: #007aff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Apps Grid */
.store-apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.app-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
:root.dark .app-card,
@media (prefers-color-scheme: dark) {
  .app-card {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(35, 35, 42, 0.7);
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
}
.app-card:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 122, 255, 0.3);
  box-shadow: 0 8px 20px rgba(0, 122, 255, 0.12);
}

.app-card-top {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.app-icon-frame {
  flex-shrink: 0;
}

.app-info-block {
  flex: 1;
  min-width: 0;
}

.app-title {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sub-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  color: #8e8e93;
  font-size: 11px;
}

.app-platform-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.08);
  color: #007aff;
  font-size: 10px;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:root.dark .app-platform-tag,
@media (prefers-color-scheme: dark) {
  .app-platform-tag { background: rgba(0, 122, 255, 0.18); color: #60a5fa; }
}

.app-summary-text {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
:root.dark .app-summary-text,
@media (prefers-color-scheme: dark) {
  .app-summary-text { color: #94a3b8; }
}

.app-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
:root.dark .app-card-footer,
@media (prefers-color-scheme: dark) {
  .app-card-footer { border-top-color: rgba(255, 255, 255, 0.06); }
}

.app-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.15s;
}
.app-download-btn:hover {
  background: #007aff;
  color: #ffffff;
}

.app-meta-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #8e8e93;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.app-meta-edit-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #007aff;
}
:root.dark .app-meta-edit-btn:hover,
@media (prefers-color-scheme: dark) {
  .app-meta-edit-btn:hover { background: rgba(255, 255, 255, 0.1); color: #60a5fa; }
}

/* Detail Modal Overlay */
.app-detail-overlay,
.app-editor-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(12px);
}

.app-detail-card,
.app-editor-card {
  width: 100%;
  max-width: 680px;
  max-height: 88%;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 25px 60px rgba(0,0,0,0.3);
  overflow: hidden;
}
:root.dark .app-detail-card,
:root.dark .app-editor-card,
@media (prefers-color-scheme: dark) {
  .app-detail-card,
  .app-editor-card {
    background: rgba(30, 30, 38, 0.95);
    color: #ffffff;
    box-shadow: 0 25px 60px rgba(0,0,0,0.6);
  }
}

.detail-header {
  padding: 22px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
:root.dark .detail-header,
@media (prefers-color-scheme: dark) {
  .detail-header { border-bottom-color: rgba(255, 255, 255, 0.08); }
}

.detail-top-info {
  display: flex;
  gap: 18px;
  margin-bottom: 16px;
}
.detail-titles h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
}
.detail-summary-lead {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
:root.dark .detail-summary-lead,
@media (prefers-color-scheme: dark) {
  .detail-summary-lead { color: #94a3b8; }
}

.detail-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dpill {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.dpill-platform { background: rgba(0, 122, 255, 0.12); color: #007aff; }
.dpill-ver { background: rgba(16, 185, 129, 0.12); color: #059669; }
.dpill-size, .dpill-date { background: rgba(0, 0, 0, 0.06); color: #64748b; }
:root.dark .dpill-size, :root.dark .dpill-date,
@media (prefers-color-scheme: dark) {
  .dpill-size, .dpill-date { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-get-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 12px;
  background: #007aff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.detail-copy-btn,
.detail-edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
:root.dark .detail-copy-btn, :root.dark .detail-edit-btn,
@media (prefers-color-scheme: dark) {
  .detail-copy-btn, .detail-edit-btn { border-color: rgba(255, 255, 255, 0.15); }
}

.detail-close-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}
:root.dark .detail-close-btn,
@media (prefers-color-scheme: dark) {
  .detail-close-btn { background: rgba(255, 255, 255, 0.1); }
}

.detail-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.detail-section {
  margin-bottom: 22px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
}
.section-heading i { color: #007aff; }

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.copy-guide-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 6px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  font-size: 12px;
}
:root.dark .feature-item,
@media (prefers-color-scheme: dark) {
  .feature-item { background: rgba(255, 255, 255, 0.05); }
}
.feature-item i { color: #10b981; font-size: 15px; }

.install-guide-box {
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #007aff;
}
:root.dark .install-guide-box,
@media (prefers-color-scheme: dark) {
  .install-guide-box { background: rgba(0, 0, 0, 0.35); }
}

.guide-pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Editor Form */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
:root.dark .editor-header,
@media (prefers-color-scheme: dark) {
  .editor-header { border-bottom-color: rgba(255, 255, 255, 0.08); }
}
.editor-header h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.editor-close-btn {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}

.editor-form {
  padding: 18px 20px;
  overflow-y: auto;
  flex: 1;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
:root.dark .form-group label,
@media (prefers-color-scheme: dark) {
  .form-group label { color: #94a3b8; }
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
:root.dark .form-group input,
:root.dark .form-group select,
:root.dark .form-group textarea,
@media (prefers-color-scheme: dark) {
  .form-group input,
  .form-group select,
  .form-group textarea {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
  }
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.editor-btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.btn-cancel {
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}
.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: none;
  border-radius: 8px;
  background: #007aff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* Toast */
.store-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.95);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 8px 25px rgba(0,0,0,0.25);
  backdrop-filter: blur(10px);
  z-index: 100;
  animation: toast-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease-out;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
