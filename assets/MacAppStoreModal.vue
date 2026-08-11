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

const emit = defineEmits(["close", "minimize", "focus", "save-metadata", "upload", "download", "refresh"]);

// State
const currentTab = ref("discover");
const selectedPlatform = ref("all"); // 'all' | 'mac' | 'win' | 'mobile'
const searchQuery = ref("");
const selectedApp = ref(null); // For detail view modal
const editingApp = ref(null); // For metadata editor modal
const linkModalApp = ref(null); // For "获取下载链接" multi-link picker modal
const copySuccessTip = ref("");

// Category definitions with rich, tactile multi-stop gradient color tokens & SF glyphs
const categories = [
  {
    id: "discover",
    name: "探索发现",
    subtitle: "Discover",
    icon: "ph-compass-rose-fill",
    gradient: "linear-gradient(135deg, #007aff 0%, #38bdf8 100%)",
    shadow: "0 4px 12px rgba(0, 122, 255, 0.42)",
  },
  {
    id: "design",
    name: "设计创意",
    subtitle: "Create",
    icon: "ph-palette-fill",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
    shadow: "0 4px 12px rgba(236, 72, 153, 0.42)",
  },
  {
    id: "productivity",
    name: "效率办公",
    subtitle: "Work",
    icon: "ph-briefcase-fill",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
    shadow: "0 4px 12px rgba(245, 158, 11, 0.42)",
  },
  {
    id: "developer",
    name: "开发工具",
    subtitle: "Develop",
    icon: "ph-code-fill",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)",
    shadow: "0 4px 12px rgba(16, 185, 129, 0.42)",
  },
  {
    id: "utilities",
    name: "系统工具",
    subtitle: "Utilities",
    icon: "ph-wrench-fill",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    shadow: "0 4px 12px rgba(99, 102, 241, 0.42)",
  },
  {
    id: "entertainment",
    name: "影音娱乐",
    subtitle: "Play",
    icon: "ph-film-strip-fill",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
    shadow: "0 4px 12px rgba(139, 92, 246, 0.42)",
  },
  {
    id: "network",
    name: "网络通讯",
    subtitle: "Connect",
    icon: "ph-globe-hemisphere-east-fill",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)",
    shadow: "0 4px 12px rgba(6, 182, 212, 0.42)",
  },
  {
    id: "mobile",
    name: "移动专属",
    subtitle: "Mobile",
    icon: "ph-device-mobile-camera-fill",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
    shadow: "0 4px 12px rgba(20, 184, 166, 0.42)",
  },
  {
    id: "all",
    name: "全部应用",
    subtitle: "All Apps",
    icon: "ph-squares-four-fill",
    gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)",
    shadow: "0 4px 12px rgba(100, 116, 139, 0.42)",
  },
];

// Recommended suggestions for empty category state
const categorySuggestions = {
  discover: ["Final Cut Pro", "Photoshop 2024", "VS Code", "CleanMyMac X", "Obsidian"],
  design: ["Adobe Photoshop", "Adobe Illustrator", "After Effects", "Blender 3D", "Figma", "Sketch"],
  productivity: ["Notion", "Obsidian", "Typora", "Raycast", "WPS Office", "1Password"],
  developer: ["Visual Studio Code", "IntelliJ IDEA", "PyCharm", "TablePlus", "Docker", "Navicat"],
  utilities: ["CleanMyMac X", "Downie 4", "Permute 3", "BetterDisplay", "Alfred 5"],
  entertainment: ["Final Cut Pro", "Logic Pro", "IINA 播放器", "Premiere Pro", "VLC"],
  network: ["Clash Verge", "Surge for Mac", "Google Chrome", "Telegram", "Arc Browser"],
  mobile: ["Android APK", "iOS IPA", "移动安装包"],
  all: ["Final Cut Pro", "Photoshop", "VS Code", "CleanMyMac X"],
};

// Helper: Check if a file is a software package
function isSoftware(file) {
  if (!file || !file.key) return false;
  const key = file.key.toLowerCase();
  if (key.endsWith("_$folder$")) return false;
  return /\.(dmg|pkg|app\.zip|exe|msi|apk|ipa|deb|appimage|rpm|iso)$/i.test(key) ||
    key.startsWith("软件/") ||
    (key.endsWith(".zip") && (key.includes("mac") || key.includes("win") || key.includes("v1.") || key.includes("v2.") || key.includes("app") || key.includes("软件") || key.includes("setup") || key.includes("install")));
}

// Helper: Detect platform from file
function detectPlatform(key) {
  const lower = (key || "").toLowerCase();
  if (lower.endsWith(".dmg") || lower.endsWith(".pkg") || lower.includes("macos") || lower.includes("mac_")) {
    if (lower.includes("arm64") || lower.includes("apple_silicon") || lower.includes("m1") || lower.includes("m2") || lower.includes("m3") || lower.includes("m4")) {
      return "macOS (Apple Silicon M系列)";
    }
    if (lower.includes("intel") || lower.includes("x64") || lower.includes("x86_64")) {
      return "macOS (Intel x86_64)";
    }
    return "macOS (Universal 通用)";
  }
  if (lower.endsWith(".exe") || lower.endsWith(".msi") || lower.includes("win_") || lower.includes("windows")) {
    return lower.includes("arm") ? "Windows (ARM64)" : "Windows (x64)";
  }
  if (lower.endsWith(".apk")) return "Android (APK)";
  if (lower.endsWith(".ipa")) return "iOS (IPA)";
  if (lower.endsWith(".deb") || lower.endsWith(".appimage")) return "Linux (Deb/AppImage)";
  return "跨平台通用";
}

// Global Knowledge Base for Popular Software
const PRESET_APP_DB = [
  { match: ["photoshop", "ps"], title: "Adobe Photoshop", category: "design", appName: "Adobe Photoshop 2024.app", summary: "全球行业标准的图像处理、合成与创意设计生产力旗舰软件。", features: ["生成式 AI 智能填充", "无损高保真图像合成", "RAW 格式全色彩深度调优"] },
  { match: ["premiere", "pr"], title: "Adobe Premiere Pro", category: "entertainment", appName: "Adobe Premiere Pro 2024.app", summary: "专业非线性视频编辑与电影级调色套件。", features: ["原生 8K ProRes 极速剪辑", "AI 自动文字转语音字幕", "Lumetri 电影级色彩调校"] },
  { match: ["after effects", "ae"], title: "Adobe After Effects", category: "design", appName: "Adobe After Effects 2024.app", summary: "电影级视觉特效制作与动态图形设计工作站。", features: ["3D 动态图形合成引擎", "精准 Roto 抠像与追踪", "电影级粒子与光效插件兼容"] },
  { match: ["illustrator", "ai"], title: "Adobe Illustrator", category: "design", appName: "Adobe Illustrator 2024.app", summary: "行业标准矢量插画、图标与品牌视觉设计利器。", features: ["无损矢量排版与排版设计", "生成式矢量绘图引擎", "精准几何图形构筑工具"] },
  { match: ["final cut", "fcp"], title: "Final Cut Pro", category: "entertainment", appName: "Final Cut Pro.app", summary: "Apple 专为 Mac 硬件深度优化的专业非线性剪辑神器。", features: ["Metal 硬件加速秒速渲染", "磁性时间线流线型剪辑", "智能面部与对象自动追踪"] },
  { match: ["logic pro"], title: "Logic Pro", category: "entertainment", appName: "Logic Pro.app", summary: "Apple 专业级音乐创作、录音、音效设计与母带处理工作站。", features: ["数千款高品质合成器音源", "空间音频杜比全景声混音", "实时打击乐伴奏生成器"] },
  { match: ["cleanmymac"], title: "CleanMyMac X", category: "utilities", appName: "CleanMyMac X.app", summary: "macOS 经典的全能系统深度清理、安全防护与性能提速管家。", features: ["一键全盘垃圾与系统缓存扫描", "恶意软件实时查杀拦截", "深度卸载与残留文件彻底粉碎"] },
  { match: ["vscode", "visual studio code"], title: "Visual Studio Code", category: "developer", appName: "Visual Studio Code.app", summary: "微软轻量级、跨平台且生态极度丰富的现代化代码编辑器。", features: ["海量插件与主题生态支持", "内置 Git 版本控制与终端", "智能代码提示与调试器集成"] },
  { match: ["intellij", "idea"], title: "IntelliJ IDEA Ultimate", category: "developer", appName: "IntelliJ IDEA.app", summary: "Java / Kotlin 业界天花板级企业应用开发集成环境。", features: ["深度智能代码分析与重构", "全栈框架与数据库工具集成", "AI 编程助手深度嵌入"] },
  { match: ["pycharm"], title: "PyCharm Professional", category: "developer", appName: "PyCharm.app", summary: "Python 专业开发者首选的全栈开发与数据科学 IDE。", features: ["Django / Flask 框架深度支持", "科学计算与 Jupyter 交互", "远程容器与 SSH 部署环境"] },
  { match: ["webstorm"], title: "WebStorm", category: "developer", appName: "WebStorm.app", summary: "专为 JavaScript / TypeScript / Vue / React 生态打造的最聪明的前端 IDE。", features: ["前端全套框架深度智能提示", "CSS / Sass / Tailwind 实时校验", "强大的重构与单元测试工具"] },
  { match: ["tableplus"], title: "TablePlus", category: "developer", appName: "TablePlus.app", summary: "轻量、极速且颜值爆表的原生关系型数据库管理客户端。", features: ["支持 MySQL/PostgreSQL/Redis/SQLite", "内联编辑与多标签页管理", "端到端 SSH 隧道加密连接"] },
  { match: ["navicat"], title: "Navicat Premium", category: "developer", appName: "Navicat Premium.app", summary: "企业级多连接数据库管理与数据迁移建模套件。", features: ["可视化数据模型设计器", "跨库结构与数据实时同步", "自动化定时备份与脚本执行"] },
  { match: ["docker"], title: "Docker Desktop", category: "developer", appName: "Docker.app", summary: "容器化应用构建、分发与本地运行的一体化桌面工作流。", features: ["一键启动 Kubernetes 环境", "多架构镜像跨平台编译", "低功耗虚拟化后台引擎"] },
  { match: ["notion"], title: "Notion", category: "productivity", appName: "Notion.app", summary: "All-in-one 知识库、项目管理与协作笔记神器。", features: ["自由无限制的 Block 模块化排版", "强大的 Database 多视图联动", "Notion AI 智能写作辅助"] },
  { match: ["obsidian"], title: "Obsidian", category: "productivity", appName: "Obsidian.app", summary: "本地离线优先、基于 Markdown 双向链接的第二大脑知识库。", features: ["无缝构建个人网状知识图谱", "数千款社区插件与主题拓展", "数据纯本地保存，隐私绝对自主"] },
  { match: ["typora"], title: "Typora", category: "productivity", appName: "Typora.app", summary: "极简纯粹、所见即所得的顶级 Markdown 写作体验利器。", features: ["输入即渲染，去除繁琐分屏", "支持数学公式与 Mermaid 图表", "丰富的高颜值 PDF / HTML 导出主题"] },
  { match: ["iina"], title: "IINA 播放器", category: "entertainment", appName: "IINA.app", summary: "专为 macOS 设计的现代化全能开源影音播放器，基于 mpv 内核。", features: ["4K HDR 与杜比视界高保真回放", "原生 macOS 毛玻璃与画中画", "支持在线字幕自动精准匹配"] },
  { match: ["downie"], title: "Downie 4", category: "utilities", appName: "Downie 4.app", summary: "macOS 最好用的全网高清音视频一键解析下载器。", features: ["支持全球数千个主流视频网站", "一键拖拽直链与批量抓取", "最高支持 4K/8K 与 HDR 原画下载"] },
  { match: ["permute"], title: "Permute 3", category: "utilities", appName: "Permute 3.app", summary: "精美优雅且极速的音视频/图片格式转换神器。", features: ["多核心硬件加速极速转码", "批量压制与体积大幅瘦身", "音视频一键拼接与提取伴奏"] },
  { match: ["clash", "clash verge"], title: "Clash Verge Rev", category: "network", appName: "Clash Verge.app", summary: "基于 Tauri 架构的高颜值全能网络代理工具与分流调度中心。", features: ["支持 Meta / Mihomo 新内核", "强大的规则订阅与自定义分流", "全平台统一极简毛玻璃界面"] },
  { match: ["surge"], title: "Surge for Mac", category: "network", appName: "Surge.app", summary: "macOS 上最强大的高级网络调试、抓包与流量接管工具。", features: ["精准分流与本地 DNS 高性能优化", "全协议请求实时解密抓包分析", "支持网关接管全屋局域网流量"] },
  { match: ["raycast"], title: "Raycast", category: "productivity", appName: "Raycast.app", summary: "新一代键盘驱动的极速 macOS 效率启动台与工作流中心。", features: ["海量插件生态秒级唤醒操作", "内置剪贴板历史与快捷短语", "深度集成 AI 交互与系统设置"] },
  { match: ["betterdisplay"], title: "BetterDisplay", category: "utilities", appName: "BetterDisplay.app", summary: "外接显示器 HiDPI 渲染与屏幕亮度精准调节神器。", features: ["一键解锁外接屏最佳 HiDPI 分辨率", "键盘原生亮度与音量 DDC 控制", "支持画中画与自定义色域映射"] },
];

// Helper: Parse title & version from file key with knowledge base integration
function parseDefaultMeta(file) {
  const key = file.key || "";
  let baseName = key.split("/").pop() || key;
  baseName = baseName.replace(/\.[a-zA-Z0-9_\.]*$/, "");

  let version = "1.0.0";
  const verMatch = baseName.match(/[vV]?(\d+\.\d+(\.\d+)?)/);
  if (verMatch) {
    version = `v${verMatch[1]}`;
  }

  const lowerName = baseName.toLowerCase();
  const matched = PRESET_APP_DB.find(p => p.match.some(m => lowerName.includes(m)));

  const platform = detectPlatform(key);
  let appName = matched ? matched.appName : `${baseName}.app`;

  let title = matched ? matched.title : baseName
    .replace(/[vV]?\d+\.\d+(\.\d+)?.*$/, "")
    .replace(/[_\-]+(mac|macos|win|windows|x64|arm64|universal|crack|patch|setup|installer)/gi, " ")
    .replace(/[_\-\.]+/g, " ")
    .trim();

  if (!title) title = baseName;

  let category = matched ? matched.category : "utilities";
  let summary = matched ? matched.summary : `${title} 官方完整安装包，直连高速下载。`;
  let features = matched ? matched.features : ["极速云端直连下载", "经过完整兼容性校验", "支持断点续传"];

  let installGuide = "";
  if (platform.includes("macOS")) {
    installGuide = `1. 双击打开 DMG 镜像包；\n2. 将【${title}】拖入 Applications 应用程序文件夹；\n3. 若打开提示「文件已损坏」或无法打开，请在终端输入并回车：\nsudo xattr -rd com.apple.quarantine /Applications/${appName.replace(/\s/g, "\\ ")}`;
  } else if (platform.includes("Windows")) {
    installGuide = `1. 双击运行安装程序；\n2. 按照屏幕提示完成安装向导。`;
  } else {
    installGuide = `1. 手机端直接扫码或下载原安装包；\n2. 授权安装未知来源应用即可畅快体验。`;
  }

  return {
    title,
    version,
    category,
    platform,
    summary,
    features,
    installGuide,
    appName,
  };
}

// All parsed software items with merged metadata (merging current files and all bucket files)
const softwareItems = computed(() => {
  const map = new Map();
  if (Array.isArray(props.files)) {
    for (const f of props.files) {
      if (f && f.key) map.set(f.key, f);
    }
  }
  if (Array.isArray(props.allFiles)) {
    for (const f of props.allFiles) {
      if (f && f.key) map.set(f.key, f);
    }
  }
  const source = Array.from(map.values());
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
      appName: def.appName,
      icon: custom.icon || "",
      screenshots: custom.screenshots || [],
      custom: !!props.metadata[file.key],
    };
  });
});

// Filtered apps based on tab, platform, and search
const filteredApps = computed(() => {
  let list = softwareItems.value;

  if (currentTab.value !== "discover" && currentTab.value !== "all") {
    list = list.filter((app) => app.category === currentTab.value);
  }

  if (selectedPlatform.value !== "all") {
    if (selectedPlatform.value === "mac") list = list.filter((app) => app.platform.toLowerCase().includes("mac"));
    else if (selectedPlatform.value === "win") list = list.filter((app) => app.platform.toLowerCase().includes("win"));
    else if (selectedPlatform.value === "mobile") list = list.filter((app) => app.platform.toLowerCase().includes("android") || app.platform.toLowerCase().includes("ios"));
  }

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

function fullDirectUrl(key) {
  const origin = window.location.origin;
  const path = `/raw/${key}`;
  const query = props.storageId === "default" ? "" : `?storage=${encodeURIComponent(props.storageId)}`;
  return `${origin}${path}${query}`;
}

function fullShareUrl(key) {
  const origin = window.location.origin;
  let folder = key.split("/").slice(0, -1).join("/");
  if (folder) folder = `${folder}/`;
  const query = props.storageId === "default" ? `?p=${encodeURIComponent(folder)}` : `?p=${encodeURIComponent(folder)}&storage=${encodeURIComponent(props.storageId)}`;
  return `${origin}/${query}`;
}

function curlCommand(app) {
  if (!app || !app.key) return "";
  const url = fullDirectUrl(app.key);
  const fname = app.key.split("/").pop() || app.title;
  return `curl -L -o "${fname}" "${url}"`;
}

function quarantineCommand(app) {
  if (!app) return "";
  return `sudo xattr -rd com.apple.quarantine /Applications/${(app.appName || "App.app").replace(/\s/g, "\\ ")}`;
}

function qrCodeUrl(key) {
  if (!key) return "";
  const url = fullDirectUrl(key);
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
}

function openDetail(app) {
  selectedApp.value = app;
}

function openGetLinks(app) {
  linkModalApp.value = app;
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

watch(
  () => props.visible,
  (val) => {
    if (val) {
      emit("refresh");
    }
  }
);

onMounted(() => {
  if (props.visible) {
    emit("refresh");
  }
});

defineExpose({
  openDetailByKey(key) {
    const item = softwareItems.value.find(a => a.key === key);
    if (item) selectedApp.value = item;
  },
  openEditorByKey(key) {
    const item = softwareItems.value.find(a => a.key === key);
    if (item) openEditor(item);
  },
  openLinksByKey(key) {
    const item = softwareItems.value.find(a => a.key === key);
    if (item) openGetLinks(item);
  },
  softwareItems,
});
</script>

<template>
  <MacWindow
    v-if="visible"
    title="App Store"
    icon="ph-app-store-logo-fill"
    :visible="visible"
    :minimized="minimized"
    :show-title="false"
    :width="990"
    :height="660"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
    @minimize="emit('minimize')"
  >
    <!-- macOS App Store Unified Titlebar Toolbar -->
    <template #titlebar-right>
      <div class="store-titlebar-tools">
        <!-- Platform Segmented Picker -->
        <div class="platform-segment">
          <button :class="{ active: selectedPlatform === 'all' }" type="button" @click="selectedPlatform = 'all'">全部应用</button>
          <button :class="{ active: selectedPlatform === 'mac' }" type="button" @click="selectedPlatform = 'mac'">🍎 macOS</button>
          <button :class="{ active: selectedPlatform === 'win' }" type="button" @click="selectedPlatform = 'win'">🪟 Windows</button>
          <button :class="{ active: selectedPlatform === 'mobile' }" type="button" @click="selectedPlatform = 'mobile'">📱 移动端</button>
        </div>

        <!-- macOS Pill Search Bar -->
        <div class="store-search-box">
          <i class="ph ph-magnifying-glass-bold"></i>
          <input v-model="searchQuery" type="text" placeholder="搜索软件、版本或关键词..." />
          <button v-if="searchQuery" class="clear-search" type="button" @click="searchQuery = ''">×</button>
        </div>

        <!-- Apple Blue Publish Button -->
        <button class="store-upload-btn" type="button" title="上传新软件安装包" @click="emit('upload', '软件/')">
          <i class="ph ph-plus-circle-fill"></i>
          <span>发布软件</span>
        </button>
      </div>
    </template>

    <!-- App Store 2-Column High-End Layout -->
    <div class="appstore-layout">
      <!-- Left Glass Sidebar -->
      <aside class="store-sidebar">
        <!-- Brand Header inside Sidebar -->
        <div class="sidebar-brand-header">
          <div class="brand-icon-box">
            <MacIcons name="appstore" :size="32" />
          </div>
          <div class="brand-text-col">
            <span class="brand-title">App Store</span>
            <span class="brand-sub">软件工坊 · 极速分发</span>
          </div>
        </div>

        <div class="sidebar-sec-title">探索与分类</div>

        <!-- Category Nav -->
        <nav class="store-nav">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="store-nav-item"
            :class="{ active: currentTab === cat.id }"
            type="button"
            @click="currentTab = cat.id"
          >
            <!-- Tactile Multi-stop Gradient SF Icon Badge -->
            <div
              class="nav-cat-icon"
              :style="{ background: cat.gradient, boxShadow: cat.shadow }"
            >
              <i class="ph" :class="cat.icon"></i>
            </div>
            <div class="nav-text-col">
              <span class="nav-cat-name">{{ cat.name }}</span>
            </div>
            <span v-if="cat.id !== 'discover'" class="nav-cat-badge">
              {{ cat.id === 'all' ? softwareItems.length : softwareItems.filter(a => a.category === cat.id).length }}
            </span>
          </button>
        </nav>

        <!-- Storage Status Pill -->
        <div class="store-sidebar-footer">
          <div class="footer-chip">
            <span class="live-dot"></span>
            <span>Cloudflare R2 直连加速</span>
          </div>
        </div>
      </aside>

      <!-- Right Main Content Area -->
      <main class="store-content-pane">
        <!-- 🌟 1. Discover Hero Banner (When currentTab === 'discover' & no search) -->
        <section v-if="currentTab === 'discover' && !searchQuery" class="store-hero-banner">
          <div class="hero-backdrop-glow"></div>
          <div class="hero-content">
            <div class="hero-tag">🌟 精选主推 · FEATURED APP</div>
            <h2 class="hero-title">{{ heroApp.title }}</h2>
            <p class="hero-summary">{{ heroApp.summary }}</p>
            <div class="hero-meta-row">
              <span class="meta-pill platform-pill"><i class="ph ph-laptop-fill"></i> {{ heroApp.platform }}</span>
              <span class="meta-pill version-pill"><i class="ph ph-tag-fill"></i> {{ heroApp.version }}</span>
              <span v-if="heroApp.size" class="meta-pill size-pill"><i class="ph ph-hard-drive-fill"></i> {{ formatSize(heroApp.size) }}</span>
            </div>
            <div class="hero-actions">
              <button v-if="heroApp.file" class="hero-get-btn" type="button" @click="openGetLinks(heroApp)">
                <i class="ph ph-link-simple-bold"></i>
                <span>获取下载链接</span>
              </button>
              <button v-if="heroApp.file" class="hero-detail-btn" type="button" @click="openDetail(heroApp)">
                <i class="ph ph-info-bold"></i>
                <span>功能与安装指南</span>
              </button>
              <button v-if="!heroApp.file" class="hero-get-btn" type="button" @click="emit('upload', '软件/')">
                <i class="ph ph-upload-simple-bold"></i>
                <span>发布第一款软件</span>
              </button>
            </div>
          </div>
          <div class="hero-badge-icon">
            <MacIcons name="appstore" :size="108" />
          </div>
        </section>

        <!-- 📦 2. Section Header -->
        <div class="store-grid-header">
          <div class="grid-title-row">
            <div class="grid-title-left">
              <h3>{{ categories.find(c => c.id === currentTab)?.name || '软件应用库' }}</h3>
              <span class="grid-subtitle">{{ categories.find(c => c.id === currentTab)?.subtitle || 'Applications' }}</span>
            </div>
            <span class="grid-count">共 {{ filteredApps.length }} 款软件</span>
          </div>
        </div>

        <!-- 🎨 3. Refined Apple-Style Empty State Showcase -->
        <div v-if="filteredApps.length === 0" class="store-empty-showcase">
          <div class="empty-glow-orbit"></div>
          <div class="empty-app-icon-wrap">
            <div
              class="empty-icon-bubble"
              :style="{
                background: categories.find(c => c.id === currentTab)?.gradient || 'linear-gradient(135deg, #007aff 0%, #38bdf8 100%)',
                boxShadow: categories.find(c => c.id === currentTab)?.shadow || '0 8px 24px rgba(0, 122, 255, 0.45)'
              }"
            >
              <i class="ph" :class="categories.find(c => c.id === currentTab)?.icon || 'ph-package-fill'"></i>
            </div>
          </div>
          <h4 class="empty-title">暂无「{{ categories.find(c => c.id === currentTab)?.name }}」软件包</h4>
          <p class="empty-desc">
            点击下方「<strong>立即上传发布</strong>」上传 <code>.dmg</code>、<code>.exe</code>、<code>.apk</code>、<code>.zip</code> 安装包，系统将自动匹配官方名称与安装说明。
          </p>

          <div class="empty-action-group">
            <button class="empty-primary-btn" type="button" @click="emit('upload', '软件/')">
              <i class="ph ph-upload-simple-bold"></i>
              <span>立即上传发布</span>
            </button>
          </div>

          <!-- Quick Inspiration Tag Pills -->
          <div class="empty-suggestions">
            <span class="sugg-label">💡 常见推荐软件：</span>
            <div class="sugg-tags">
              <span
                v-for="sugg in (categorySuggestions[currentTab] || categorySuggestions.all)"
                :key="sugg"
                class="sugg-tag"
                @click="emit('upload', '软件/')"
              >
                + {{ sugg }}
              </span>
            </div>
          </div>
        </div>

        <!-- 🚀 4. Rich App Cards Grid -->
        <div v-else class="store-apps-grid">
          <article
            v-for="app in filteredApps"
            :key="app.key"
            class="app-card"
            @click="openDetail(app)"
          >
            <div class="app-card-top">
              <!-- App Vector / System Icon (52x52 Squircle) -->
              <div class="app-icon-frame">
                <MacIcons name="apps" :size="52" />
              </div>
              <div class="app-info-block">
                <h4 class="app-title" :title="app.title">{{ app.title }}</h4>
                <div class="app-sub-row">
                  <span class="app-ver">{{ app.version }}</span>
                  <span class="app-dot">·</span>
                  <span class="app-size">{{ formatSize(app.size) }}</span>
                </div>
                <div class="app-platform-tag" :title="app.platform">
                  <i v-if="app.platform.includes('macOS')" class="ph ph-apple-logo-fill"></i>
                  <i v-else-if="app.platform.includes('Windows')" class="ph ph-windows-logo-fill"></i>
                  <i v-else-if="app.platform.includes('Android')" class="ph ph-android-logo-fill"></i>
                  <i v-else class="ph ph-device-mobile-fill"></i>
                  <span>{{ app.platform }}</span>
                </div>
              </div>
            </div>

            <!-- One-Sentence Summary -->
            <p class="app-summary-text">{{ app.summary }}</p>

            <!-- Card Bottom Buttons -->
            <div class="app-card-footer" @click.stop>
              <button class="app-download-btn" type="button" title="获取下载链接与安装包" @click="openGetLinks(app)">
                <i class="ph ph-download-simple-bold"></i>
                <span>获取</span>
              </button>
              <button class="app-meta-edit-btn" type="button" title="编辑软件简介与安装说明" @click="openEditor(app)">
                <i class="ph ph-pencil-simple-bold"></i>
              </button>
            </div>
          </article>
        </div>
      </main>
    </div>

    <!-- 📖 5. macOS App Detail Full Modal -->
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
                  <span class="dpill dpill-platform"><i class="ph ph-laptop"></i> {{ selectedApp.platform }}</span>
                  <span class="dpill dpill-ver"><i class="ph ph-tag"></i> {{ selectedApp.version }}</span>
                  <span class="dpill dpill-size"><i class="ph ph-hard-drive"></i> {{ formatSize(selectedApp.size) }}</span>
                  <span class="dpill dpill-date">更新于 {{ formatDate(selectedApp.uploaded) }}</span>
                </div>
              </div>
            </div>

            <!-- Top Actions -->
            <div class="detail-actions">
              <button class="detail-get-btn" type="button" @click="openGetLinks(selectedApp)">
                <i class="ph ph-link-simple-bold"></i>
                <span>获取下载链接 ({{ formatSize(selectedApp.size) }})</span>
              </button>
              <button class="detail-copy-btn" type="button" @click="copyText(fullDirectUrl(selectedApp.key), '原生极速直链已复制！')">
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

    <!-- 🔗 6. Get Download Links & Multi-Link Picker Modal -->
    <Transition name="fade-slide">
      <div v-if="linkModalApp" class="app-links-overlay" @click.self="linkModalApp = null">
        <div class="app-links-card">
          <header class="links-header">
            <div class="links-header-info">
              <div class="links-app-icon">
                <MacIcons name="apps" :size="46" />
              </div>
              <div class="links-titles">
                <h3>获取「{{ linkModalApp.title }}」下载与链接</h3>
                <div class="links-sub-meta">
                  <span class="l-pill l-ver">{{ linkModalApp.version }}</span>
                  <span class="l-pill l-plat">{{ linkModalApp.platform }}</span>
                  <span class="l-pill l-size">{{ formatSize(linkModalApp.size) }}</span>
                </div>
              </div>
            </div>
            <button class="links-close-btn" type="button" @click="linkModalApp = null">×</button>
          </header>

          <div class="links-body">
            <!-- 1. Direct Browser Download -->
            <a :href="rawUrl(linkModalApp.key)" :download="linkModalApp.title" class="link-action-card primary-action" @click="linkModalApp = null">
              <div class="action-left-icon icon-direct">
                <i class="ph ph-arrow-circle-down-bold"></i>
              </div>
              <div class="action-text-col">
                <div class="action-row-title">
                  <strong>🚀 本地极速直接下载</strong>
                  <span class="action-tag">推荐</span>
                </div>
                <span class="action-subtext">通过 Cloudflare 全球边缘 CDN 极速下载原包体 ({{ formatSize(linkModalApp.size) }})</span>
              </div>
              <i class="ph ph-caret-right-bold action-arrow"></i>
            </a>

            <!-- 2. Copy Raw Direct Link -->
            <button class="link-action-card" type="button" @click="copyText(fullDirectUrl(linkModalApp.key), '原生极速直链已复制！')">
              <div class="action-left-icon icon-link">
                <i class="ph ph-link-simple-bold"></i>
              </div>
              <div class="action-text-col">
                <div class="action-row-title">
                  <strong>🔗 复制 Cloudflare R2 原生直链</strong>
                </div>
                <span class="action-subtext">可粘贴至迅雷、IDM、Downie 或浏览器地址栏直接开启多线程下载</span>
              </div>
              <span class="action-btn-pill">复制直链</span>
            </button>

            <!-- 3. Copy Web Share Link -->
            <button class="link-action-card" type="button" @click="copyText(fullShareUrl(linkModalApp.key), '网盘分享链接已复制！')">
              <div class="action-left-icon icon-share">
                <i class="ph ph-share-network-bold"></i>
              </div>
              <div class="action-text-col">
                <div class="action-row-title">
                  <strong>🌐 复制网盘分享/浏览页面链接</strong>
                </div>
                <span class="action-subtext">可发送给好友或团队，支持在带有 macOS 展厅界面的网盘中浏览</span>
              </div>
              <span class="action-btn-pill">复制分享</span>
            </button>

            <!-- 4. Terminal cURL Command -->
            <button class="link-action-card" type="button" @click="copyText(curlCommand(linkModalApp), 'cURL 终端下载命令已复制！')">
              <div class="action-left-icon icon-terminal">
                <i class="ph ph-terminal-window-bold"></i>
              </div>
              <div class="action-text-col">
                <div class="action-row-title">
                  <strong>💻 复制终端 cURL 极速下载命令</strong>
                </div>
                <span class="action-subtext"><code>{{ curlCommand(linkModalApp) }}</code></span>
              </div>
              <span class="action-btn-pill">复制命令</span>
            </button>

            <!-- 5. macOS Quarantine Bypass (If macOS) -->
            <button v-if="linkModalApp.platform.includes('macOS')" class="link-action-card" type="button" @click="copyText(quarantineCommand(linkModalApp), 'macOS 免隔离命令已复制！')">
              <div class="action-left-icon icon-apple">
                <i class="ph ph-shield-check-bold"></i>
              </div>
              <div class="action-text-col">
                <div class="action-row-title">
                  <strong>🍎 复制 macOS 终端绕过隔离命令</strong>
                </div>
                <span class="action-subtext">解决打开 DMG / APP 提示「文件已损坏」或「无法打开」报错</span>
              </div>
              <span class="action-btn-pill">复制指令</span>
            </button>

            <!-- 6. Mobile QR Code -->
            <div class="qr-download-section">
              <div class="qr-box">
                <img :src="qrCodeUrl(linkModalApp.key)" alt="扫码下载" loading="lazy" />
              </div>
              <div class="qr-desc-col">
                <strong>📱 手机扫码直连极速下载</strong>
                <p>使用手机自带相机或扫一扫，即可直接在移动端下载并安装该应用包。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ✏️ 7. macOS App Metadata Editor Modal -->
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
                  <option value="developer">💻 开发工具</option>
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
  gap: 10px;
  margin-left: auto;
}

.platform-segment {
  display: flex;
  padding: 3px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
}
:root.dark .platform-segment,
[data-theme="dark"] .platform-segment,
@media (prefers-color-scheme: dark) {
  .platform-segment {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.platform-segment button {
  padding: 3px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #8e8e93;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.platform-segment button.active {
  background: #ffffff;
  color: #007aff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
}
:root.dark .platform-segment button.active,
[data-theme="dark"] .platform-segment button.active,
@media (prefers-color-scheme: dark) {
  .platform-segment button.active {
    background: rgba(255, 255, 255, 0.22);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }
}

.store-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.store-search-box i {
  position: absolute;
  left: 9px;
  color: #8e8e93;
  font-size: 13px;
  pointer-events: none;
}

.store-search-box input {
  width: 165px;
  height: 28px;
  padding: 0 24px 0 28px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  outline: none;
  transition: all 0.22s ease;
}
:root.dark .store-search-box input,
[data-theme="dark"] .store-search-box input,
@media (prefers-color-scheme: dark) {
  .store-search-box input {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.35);
    color: #ffffff;
  }
}
.store-search-box input:focus {
  width: 205px;
  border-color: #007aff;
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
}
:root.dark .store-search-box input:focus,
[data-theme="dark"] .store-search-box input:focus {
  background: rgba(0, 0, 0, 0.6);
}

.clear-search {
  position: absolute;
  right: 7px;
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
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #007aff, #0051d5);
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 650;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
  transition: all 0.18s;
  white-space: nowrap;
}
.store-upload-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.5);
}

/* 2-Column Layout */
.appstore-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100%;
  overflow: hidden;
}

/* Sidebar with Deep macOS Frosted Aesthetics */
.store-sidebar {
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(20, 22, 28, 0.78);
  backdrop-filter: blur(40px) saturate(200%);
}
[data-theme="light"] .store-sidebar {
  background: rgba(246, 247, 250, 0.92);
  border-right-color: rgba(0, 0, 0, 0.08);
}

.sidebar-brand-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}
[data-theme="light"] .sidebar-brand-header {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

.brand-icon-box {
  flex-shrink: 0;
  filter: drop-shadow(0 4px 10px rgba(0, 122, 255, 0.45));
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sidebar-brand-header:hover .brand-icon-box {
  transform: scale(1.06);
}

.brand-text-col {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: inherit;
}

.brand-sub {
  font-size: 10px;
  color: #8e8e93;
  font-weight: 600;
}

.sidebar-sec-title {
  padding: 0 8px 8px;
  color: #71717a;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.store-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow-y: auto;
}

.store-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 550;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.store-nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
}
[data-theme="light"] .store-nav-item {
  color: #475569;
}
[data-theme="light"] .store-nav-item:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #0f172a;
}

/* Translucent High-End macOS Active Row */
.store-nav-item.active {
  background: linear-gradient(90deg, rgba(0, 122, 255, 0.22) 0%, rgba(0, 122, 255, 0.06) 100%);
  border: 1px solid rgba(0, 122, 255, 0.35);
  color: #38bdf8;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 2px 10px rgba(0, 122, 255, 0.15);
}
[data-theme="light"] .store-nav-item.active {
  background: linear-gradient(90deg, rgba(0, 122, 255, 0.14) 0%, rgba(0, 122, 255, 0.04) 100%);
  border: 1px solid rgba(0, 122, 255, 0.3);
  color: #007aff;
  box-shadow: inset 0 1px 0 #ffffff, 0 2px 8px rgba(0, 122, 255, 0.1);
}

.store-nav-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 7px;
  bottom: 7px;
  width: 3.5px;
  border-radius: 3px;
  background: #007aff;
  box-shadow: 0 0 10px #007aff;
}

/* Tactile Gradient Icon Badge with Inner Bevel */
.nav-cat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 3px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.store-nav-item:hover .nav-cat-icon {
  transform: scale(1.12);
}
.store-nav-item.active .nav-cat-icon {
  transform: scale(1.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 4px 12px rgba(0, 122, 255, 0.4);
}

.nav-cat-name {
  font-size: 13px;
  letter-spacing: -0.2px;
}

.nav-cat-badge {
  padding: 2px 7px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 650;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .nav-cat-badge {
  background: rgba(0, 0, 0, 0.06);
  color: #64748b;
  border-color: rgba(0, 0, 0, 0.04);
}
.store-nav-item.active .nav-cat-badge {
  background: rgba(0, 122, 255, 0.25);
  color: #38bdf8;
  border-color: rgba(0, 122, 255, 0.4);
}
[data-theme="light"] .store-nav-item.active .nav-cat-badge {
  background: rgba(0, 122, 255, 0.15);
  color: #007aff;
  border-color: rgba(0, 122, 255, 0.3);
}

.store-sidebar-footer {
  padding-top: 10px;
}
.footer-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 9px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  font-size: 10.5px;
  font-weight: 600;
}
:root.dark .footer-chip,
[data-theme="dark"] .footer-chip,
@media (prefers-color-scheme: dark) {
  .footer-chip {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

/* Right Content Pane */
.store-content-pane {
  padding: 20px 26px;
  overflow-y: auto;
}

/* Discover Hero Banner */
.store-hero-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px 30px;
  margin-bottom: 22px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #06b6d4 100%);
  color: #ffffff;
  overflow: hidden;
  box-shadow: 0 12px 36px rgba(37, 99, 235, 0.28);
}

.hero-backdrop-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.hero-tag {
  display: inline-block;
  padding: 3px 9px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.hero-title {
  margin: 0 0 6px;
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
}

.hero-summary {
  margin: 0 0 14px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  line-height: 1.5;
}

.hero-meta-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.28);
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
  padding: 8px 18px;
  border-radius: 20px;
  background: #ffffff;
  color: #1e3a8a;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  transition: all 0.16s;
  cursor: pointer;
  border: none;
}
.hero-get-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 20px rgba(0,0,0,0.25);
}

.hero-detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.16s;
}
.hero-detail-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.hero-badge-icon {
  position: relative;
  z-index: 2;
  margin-right: 16px;
  filter: drop-shadow(0 14px 28px rgba(0,0,0,0.35));
}

/* Grid Header */
.store-grid-header {
  margin-bottom: 16px;
}
.grid-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.grid-title-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.grid-title-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
}
.grid-subtitle {
  color: #8e8e93;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}
.grid-count {
  color: #8e8e93;
  font-size: 12px;
  font-weight: 500;
}

/* 🎨 Apple Empty State Showcase */
.store-empty-showcase {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 40px;
  margin-top: 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.14);
  text-align: center;
  overflow: hidden;
}
:root.dark .store-empty-showcase,
[data-theme="dark"] .store-empty-showcase {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.empty-app-icon-wrap {
  margin-bottom: 16px;
}
.empty-icon-bubble {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 18px;
  color: #ffffff;
  font-size: 30px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 10px 25px rgba(0, 122, 255, 0.35);
}

.empty-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 750;
  letter-spacing: -0.2px;
}

.empty-desc {
  max-width: 460px;
  margin: 0 0 20px;
  color: #8e8e93;
  font-size: 12.5px;
  line-height: 1.6;
}
.empty-desc strong { color: #007aff; }
.empty-desc code {
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 11.5px;
}
:root.dark .empty-desc code,
[data-theme="dark"] .empty-desc code,
@media (prefers-color-scheme: dark) {
  .empty-desc code { background: rgba(255, 255, 255, 0.1); }
}

.empty-action-group {
  margin-bottom: 24px;
}
.empty-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #007aff, #0051d5);
  color: #ffffff;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.4);
  transition: all 0.18s;
}
.empty-primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(0, 122, 255, 0.55);
}

.empty-suggestions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-top: 18px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 500px;
}
:root.dark .empty-suggestions,
[data-theme="dark"] .empty-suggestions,
@media (prefers-color-scheme: dark) {
  .empty-suggestions { border-top-color: rgba(255, 255, 255, 0.06); }
}

.sugg-label {
  font-size: 11px;
  font-weight: 600;
  color: #8e8e93;
}

.sugg-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.sugg-tag {
  padding: 3px 9px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.08);
  color: #007aff;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
:root.dark .sugg-tag,
[data-theme="dark"] .sugg-tag,
@media (prefers-color-scheme: dark) {
  .sugg-tag { background: rgba(0, 122, 255, 0.16); color: #60a5fa; }
}
.sugg-tag:hover {
  background: #007aff;
  color: #ffffff;
  transform: scale(1.05);
}

/* Apps Grid */
.store-apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}

.app-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
:root.dark .app-card,
[data-theme="dark"] .app-card,
@media (prefers-color-scheme: dark) {
  .app-card {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(36, 36, 44, 0.75);
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  }
}
.app-card:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 122, 255, 0.35);
  box-shadow: 0 10px 26px rgba(0, 122, 255, 0.15);
}

.app-card-top {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.app-icon-frame {
  flex-shrink: 0;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.18));
}

.app-info-block {
  flex: 1;
  min-width: 0;
}

.app-title {
  margin: 0 0 3px;
  font-size: 14.5px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sub-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  color: #8e8e93;
  font-size: 11px;
}
.app-dot { opacity: 0.5; }

.app-platform-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(0, 122, 255, 0.09);
  color: #007aff;
  font-size: 10.5px;
  font-weight: 650;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:root.dark .app-platform-tag,
[data-theme="dark"] .app-platform-tag,
@media (prefers-color-scheme: dark) {
  .app-platform-tag { background: rgba(0, 122, 255, 0.2); color: #60a5fa; }
}

.app-summary-text {
  margin: 0 0 14px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
:root.dark .app-summary-text,
[data-theme="dark"] .app-summary-text,
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
[data-theme="dark"] .app-card-footer,
@media (prefers-color-scheme: dark) {
  .app-card-footer { border-top-color: rgba(255, 255, 255, 0.06); }
}

.app-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 16px;
  border: none;
  border-radius: 14px;
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.app-download-btn:hover {
  background: #007aff;
  color: #ffffff;
  transform: scale(1.04);
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
[data-theme="dark"] .app-meta-edit-btn:hover,
@media (prefers-color-scheme: dark) {
  .app-meta-edit-btn:hover { background: rgba(255, 255, 255, 0.1); color: #60a5fa; }
}

/* Detail Modal Overlay & High Contrast Card */
.app-detail-overlay,
.app-editor-overlay,
.app-links-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px);
}

.app-detail-card,
.app-editor-card,
.app-links-card {
  width: 100%;
  max-width: 680px;
  max-height: 88%;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: #ffffff;
  color: #1d1d1f;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

[data-theme="dark"] .app-detail-card,
[data-theme="dark"] .app-editor-card,
[data-theme="dark"] .app-links-card,
:root.dark .app-detail-card,
:root.dark .app-editor-card,
:root.dark .app-links-card,
@media (prefers-color-scheme: dark) {
  .app-detail-card,
  .app-editor-card,
  .app-links-card {
    background: #1e1e26;
    color: #f1f5f9;
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  }
}

.detail-header {
  padding: 22px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .detail-header,
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
  font-size: 21px;
  font-weight: 800;
  color: #1d1d1f;
}
[data-theme="dark"] .detail-titles h2,
:root.dark .detail-titles h2,
@media (prefers-color-scheme: dark) {
  .detail-titles h2 { color: #ffffff; }
}

.detail-summary-lead {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
[data-theme="dark"] .detail-summary-lead,
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
.dpill-platform { background: rgba(0, 122, 255, 0.12); color: #007aff; }
.dpill-ver { background: rgba(16, 185, 129, 0.12); color: #059669; }
.dpill-size, .dpill-date { background: rgba(0, 0, 0, 0.06); color: #64748b; }
[data-theme="dark"] .dpill-size, [data-theme="dark"] .dpill-date,
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
  border: none;
  border-radius: 12px;
  background: #007aff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  transition: all 0.15s;
}
.detail-get-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.45);
}

.detail-copy-btn,
.detail-edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  background: #f4f4f7;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
[data-theme="dark"] .detail-copy-btn,
[data-theme="dark"] .detail-edit-btn,
:root.dark .detail-copy-btn,
:root.dark .detail-edit-btn,
@media (prefers-color-scheme: dark) {
  .detail-copy-btn,
  .detail-edit-btn {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08);
    color: #f1f5f9;
  }
}

.detail-close-btn {
  margin-left: auto;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}
[data-theme="dark"] .detail-close-btn,
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
  font-weight: 750;
  color: #1d1d1f;
}
[data-theme="dark"] .section-heading,
:root.dark .section-heading,
@media (prefers-color-scheme: dark) {
  .section-heading { color: #ffffff; }
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
  padding: 9px 12px;
  border-radius: 8px;
  background: #f4f4f7;
  color: #1d1d1f;
  font-size: 12px;
  font-weight: 550;
}
[data-theme="dark"] .feature-item,
:root.dark .feature-item,
@media (prefers-color-scheme: dark) {
  .feature-item { background: rgba(255, 255, 255, 0.06); color: #f1f5f9; }
}
.feature-item i { color: #10b981; font-size: 15px; }

.install-guide-box {
  padding: 12px 16px;
  border-radius: 10px;
  background: #f4f4f7;
  border-left: 3px solid #007aff;
  color: #1d1d1f;
}
[data-theme="dark"] .install-guide-box,
:root.dark .install-guide-box,
@media (prefers-color-scheme: dark) {
  .install-guide-box { background: rgba(0, 0, 0, 0.45); color: #f1f5f9; }
}

.guide-pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: inherit;
}

/* 🔗 Links & Download Picker Modal */
.links-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .links-header,
:root.dark .links-header,
@media (prefers-color-scheme: dark) {
  .links-header { border-bottom-color: rgba(255, 255, 255, 0.08); }
}

.links-header-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.links-titles h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 800;
  color: #1d1d1f;
}
[data-theme="dark"] .links-titles h3,
:root.dark .links-titles h3,
@media (prefers-color-scheme: dark) {
  .links-titles h3 { color: #ffffff; }
}

.links-sub-meta {
  display: flex;
  gap: 6px;
}
.l-pill {
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
}
.l-ver { background: rgba(16, 185, 129, 0.12); color: #059669; }
.l-plat { background: rgba(0, 122, 255, 0.12); color: #007aff; }
.l-size { background: rgba(0, 0, 0, 0.06); color: #64748b; }
[data-theme="dark"] .l-size,
:root.dark .l-size,
@media (prefers-color-scheme: dark) {
  .l-size { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
}

.links-close-btn {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

.links-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.link-action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #f8fafc;
  color: #1d1d1f;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: left;
}
[data-theme="dark"] .link-action-card,
:root.dark .link-action-card,
@media (prefers-color-scheme: dark) {
  .link-action-card {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: #f1f5f9;
  }
}
.link-action-card:hover {
  transform: translateY(-2px);
  border-color: #007aff;
  background: rgba(0, 122, 255, 0.04);
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.12);
}
.link-action-card.primary-action {
  background: linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%);
  border-color: rgba(0, 122, 255, 0.3);
}

.action-left-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}
.icon-direct { background: #007aff; color: #ffffff; }
.icon-link { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.icon-share { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
.icon-terminal { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.icon-apple { background: rgba(236, 72, 153, 0.15); color: #ec4899; }

.action-text-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.action-row-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.action-row-title strong {
  font-size: 13px;
  font-weight: 700;
}
.action-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: #007aff;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
}
.action-subtext {
  font-size: 11.5px;
  color: #64748b;
}
[data-theme="dark"] .action-subtext,
:root.dark .action-subtext,
@media (prefers-color-scheme: dark) {
  .action-subtext { color: #94a3b8; }
}
.action-subtext code {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  font-family: ui-monospace, monospace;
  font-size: 11px;
}
[data-theme="dark"] .action-subtext code,
:root.dark .action-subtext code,
@media (prefers-color-scheme: dark) {
  .action-subtext code { background: rgba(255, 255, 255, 0.1); }
}

.action-btn-pill {
  padding: 5px 12px;
  border-radius: 8px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  font-size: 11.5px;
  font-weight: 650;
  flex-shrink: 0;
}
.link-action-card:hover .action-btn-pill {
  background: #007aff;
  color: #ffffff;
}

.action-arrow {
  color: #8e8e93;
  font-size: 14px;
}

.qr-download-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  margin-top: 4px;
}
[data-theme="dark"] .qr-download-section,
:root.dark .qr-download-section,
@media (prefers-color-scheme: dark) {
  .qr-download-section { background: rgba(255, 255, 255, 0.04); }
}
.qr-box {
  width: 76px;
  height: 76px;
  background: #ffffff;
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
.qr-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.qr-desc-col strong {
  display: block;
  margin-bottom: 3px;
  font-size: 12.5px;
  font-weight: 700;
}
.qr-desc-col p {
  margin: 0;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.4;
}
[data-theme="dark"] .qr-desc-col p,
:root.dark .qr-desc-col p,
@media (prefers-color-scheme: dark) {
  .qr-desc-col p { color: #94a3b8; }
}

/* Editor Form */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
[data-theme="dark"] .editor-header,
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
  color: #1d1d1f;
}
[data-theme="dark"] .editor-header h3,
:root.dark .editor-header h3,
@media (prefers-color-scheme: dark) {
  .editor-header h3 { color: #ffffff; }
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
  font-size: 11.5px;
  font-weight: 650;
  color: #475569;
}
[data-theme="dark"] .form-group label,
:root.dark .form-group label,
@media (prefers-color-scheme: dark) {
  .form-group label { color: #94a3b8; }
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 8px;
  background: #f2f3f8;
  color: #1d1d1f !important;
  font-size: 12.5px;
  font-weight: 500;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: all 0.15s ease;
}

[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group select,
[data-theme="dark"] .form-group textarea,
:root.dark .form-group input,
:root.dark .form-group select,
:root.dark .form-group textarea,
@media (prefers-color-scheme: dark) {
  .form-group input,
  .form-group select,
  .form-group textarea {
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff !important;
  }
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.25);
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
