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

// Release & Hot Update State
const appPresets = {
  live: {
    name: '天才猫极速直播助手 (Go 2.0 极速版)',
    slug: 'live',
    defaultPatch: (v) => `/apps/live/TianCaiMao.LiveAssistant.exe`,
    defaultSetup: (v) => `/apps/live/天才猫极速直播助手-Setup-v${v}.exe`,
    defaultChangelog: '1. 升级原生 CDP 极速直控引擎；\n2. 优化价格与库存控制调度，毫秒级响应；\n3. 增强宏自动化蓝图库与自愈保护机制。',
  },
  dy: {
    name: '天才猫直播助手 (C# 旗舰版)',
    slug: 'dy',
    defaultPatch: (v) => `/apps/dy/patch_v${v}.zip`,
    defaultSetup: (v) => `/apps/dy/天才猫直播助手-Setup-v${v}.exe`,
    defaultChangelog: '1. 优化商品讲解与开价监控；\n2. 升级弹幕捕获中枢与热敏标签打印；\n3. 修复已知交互问题。',
  },
  datacenter: {
    name: '天才猫数据中心 2.0 (Go+Wails)',
    slug: 'datacenter',
    defaultPatch: (v) => `/apps/datacenter/TianCaiMao.DataCenter.exe`,
    defaultSetup: (v) => `/apps/datacenter/天才猫数据中心-Setup-v${v}.exe`,
    defaultChangelog: '1. 升级实时大屏与本地 SQLite 极速数据中枢；\n2. 增强多维度数据透视与报表导出；\n3. 优化内存占用与启动性能。',
  },
};

const releaseForm = ref({
  app: 'live',
  version: '2.0.0',
  minSupportedVersion: '2.0.0',
  patchUrl: '/apps/live/TianCaiMao.LiveAssistant.exe',
  patchMd5: '',
  patchSize: 11985408,
  fullSetupUrl: '/apps/live/天才猫极速直播助手-Setup-v2.0.0.exe',
  forceUpdate: false,
  changelog: '1. 升级原生 CDP 极速直控引擎；\n2. 优化价格与库存控制调度，毫秒级响应；\n3. 增强宏自动化蓝图库与自愈保护机制。',
});
const currentLiveVersion = ref(null);
const releaseHistory = ref([]);
const isPublishing = ref(false);
const publishStatusMsg = ref('');
const showDrivePickerModal = ref(false);
const drivePickerTarget = ref('patchUrl'); // 'patchUrl' | 'fullSetupUrl'

const driveInstallerFiles = computed(() => {
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
  return Array.from(map.values()).filter(f => /\.(exe|zip|dmg|pkg|7z|apk|tar\.gz)$/i.test(f.key || ''));
});

function switchReleaseApp(appKey) {
  releaseForm.value.app = appKey;
  const preset = appPresets[appKey] || appPresets.live;
  const v = releaseForm.value.version || '2.0.0';
  releaseForm.value.patchUrl = preset.defaultPatch(v);
  releaseForm.value.fullSetupUrl = preset.defaultSetup(v);
  releaseForm.value.changelog = preset.defaultChangelog;
  fetchLiveVersion(appKey);
  fetchReleaseHistory(appKey);
}

function bumpVersion(type) {
  let baseVer = releaseForm.value.version || currentLiveVersion.value?.version || '2.0.0';
  const parts = baseVer.replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0);
  while (parts.length < 3) parts.push(0);

  if (type === 'patch') {
    parts[2] += 1;
  } else if (type === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (type === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  }
  const newVer = parts.join('.');
  releaseForm.value.version = newVer;

  const preset = appPresets[releaseForm.value.app] || appPresets.live;
  releaseForm.value.patchUrl = preset.defaultPatch(newVer);
  releaseForm.value.fullSetupUrl = preset.defaultSetup(newVer);
  copySuccessTip.value = `已自动自增版本号为 v${newVer}`;
  setTimeout(() => (copySuccessTip.value = ''), 2500);
}

async function fetchLiveVersion(app = 'live') {
  try {
    const res = await fetch(`/api/update?app=${app}&_t=${Date.now()}`);
    if (res.ok) {
      currentLiveVersion.value = await res.json();
    } else {
      currentLiveVersion.value = null;
    }
  } catch (e) {
    currentLiveVersion.value = null;
  }
}

async function fetchReleaseHistory(app = 'live') {
  try {
    const res = await fetch(`/api/update?app=${app}&action=history&_t=${Date.now()}`);
    if (res.ok) {
      releaseHistory.value = await res.json();
    } else {
      releaseHistory.value = [];
    }
  } catch (e) {
    releaseHistory.value = [];
  }
}

function loadHistoryItem(item) {
  if (!item) return;
  releaseForm.value = {
    app: item.app || releaseForm.value.app,
    version: item.version,
    minSupportedVersion: item.minSupportedVersion || item.version,
    patchUrl: item.patchUrl || '',
    patchMd5: item.patchMd5 || '',
    patchSize: Number(item.patchSize || 0),
    fullSetupUrl: item.fullSetupUrl || '',
    forceUpdate: Boolean(item.forceUpdate),
    changelog: item.changelog || '',
  };
  copySuccessTip.value = `已载入历史版本 v${item.version} 的发版配置！`;
  setTimeout(() => (copySuccessTip.value = ''), 2500);
}

function openDriveFilePicker(targetField) {
  drivePickerTarget.value = targetField;
  showDrivePickerModal.value = true;
}

function selectDriveFile(file) {
  if (!file) return;
  const path = file.key.startsWith('/') ? file.key : '/' + file.key;
  if (drivePickerTarget.value === 'patchUrl') {
    releaseForm.value.patchUrl = path;
    if (file.size) {
      releaseForm.value.patchSize = file.size;
    }
  } else if (drivePickerTarget.value === 'fullSetupUrl') {
    releaseForm.value.fullSetupUrl = path;
  }
  showDrivePickerModal.value = false;
  copySuccessTip.value = `已关联网盘文件: ${file.key}`;
  setTimeout(() => (copySuccessTip.value = ''), 2500);
}

watch(currentTab, (newTab) => {
  if (newTab === 'releases') {
    fetchLiveVersion(releaseForm.value.app);
    fetchReleaseHistory(releaseForm.value.app);
  }
});

async function submitPublish() {
  if (!releaseForm.value.version) {
    alert('请输入版本号！');
    return;
  }
  isPublishing.value = true;
  publishStatusMsg.value = '正在发布至 Cloudflare R2 并刷新 CDN...';
  try {
    const res = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseForm.value),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      publishStatusMsg.value = '🎉 发布成功！所有在线客户端已可感知最新版本。';
      copySuccessTip.value = '版本发布成功并已实时同步至 CDN！';
      setTimeout(() => (copySuccessTip.value = ''), 3000);
      await fetchLiveVersion(releaseForm.value.app);
      await fetchReleaseHistory(releaseForm.value.app);
    } else {
      publishStatusMsg.value = '❌ 发布失败: ' + (data.error || '未知错误');
    }
  } catch (e) {
    publishStatusMsg.value = '❌ 网络错误: ' + e.message;
  } finally {
    isPublishing.value = false;
  }
}


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
    id: "releases",
    name: "🚀 热更发版",
    subtitle: "Releases",
    icon: "ph-rocket-launch-fill",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    shadow: "0 4px 12px rgba(14, 165, 233, 0.42)",
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
  { match: ["studioone", "studio one", "studio_one"], title: "PreSonus Studio One Pro", category: "entertainment", appName: "Studio One.app", summary: "专业级全能音乐创作、录音混音与母带制作宿主工作站 (DAW)。", features: ["原生 64 位双精度音频引擎", "极速拖拽编曲工作流", "内置海量母带级别 DSP 效果器"] },
  { match: ["fl studio", "flstudio", "fruity"], title: "FL Studio Producer", category: "entertainment", appName: "FL Studio.app", summary: "全球电子音乐人与编曲制作人首选的全功能音乐制作环境。", features: ["经典步进音序器与钢琴卷帘", "矢量全动态缩放界面", "终身免费升级官方音色库"] },
  { match: ["cubase"], title: "Steinberg Cubase Pro", category: "entertainment", appName: "Cubase.app", summary: "影视配乐与流行音乐工业级标准数字音频工作站。", features: ["VariAudio 人声精准音高修正", "MixConsole 模拟调音台通道条", "支持 Dolby Atmos 全景声混音"] },
  { match: ["photoshop", "ps"], title: "Adobe Photoshop", category: "design", appName: "Adobe Photoshop 2024.app", summary: "全球行业标准的图像处理、合成与创意设计生产力旗舰软件。", features: ["生成式 AI 智能填充", "无损高保真图像合成", "RAW 格式全色彩深度调优"] },
  { match: ["premiere", "pr"], title: "Adobe Premiere Pro", category: "entertainment", appName: "Adobe Premiere Pro 2024.app", summary: "专业非线性视频编辑与电影级调色套件。", features: ["原生 8K ProRes 极速剪辑", "AI 自动文字转语音字幕", "Lumetri 电影级色彩调校"] },
  { match: ["after effects", "ae"], title: "Adobe After Effects", category: "design", appName: "Adobe After Effects 2024.app", summary: "电影级视觉特效制作与动态图形设计工作站。", features: ["3D 动态图形合成引擎", "精准 Roto 抠像与追踪", "电影级粒子与光效插件兼容"] },
  { match: ["illustrator", "ai"], title: "Adobe Illustrator", category: "design", appName: "Adobe Illustrator 2024.app", summary: "行业标准矢量插画、图标与品牌视觉设计利器。", features: ["无损矢量排版与排版设计", "生成式矢量绘图引擎", "精准几何图形构筑工具"] },
  { match: ["final cut", "fcp"], title: "Final Cut Pro", category: "entertainment", appName: "Final Cut Pro.app", summary: "Apple 专为 Mac 硬件深度优化的专业非线性剪辑神器。", features: ["Metal 硬件加速秒速渲染", "磁性时间线流线型剪辑", "智能面部与对象自动追踪"] },
  { match: ["logic pro"], title: "Logic Pro", category: "entertainment", appName: "Logic Pro.app", summary: "Apple 专业级音乐创作、录音、音效设计与母带处理工作站。", features: ["数千款高品质合成器音源", "空间音频杜比全景声混音", "实时打击乐伴奏生成器"] },
  { match: ["cleanmymac"], title: "CleanMyMac X", category: "utilities", appName: "CleanMyMac X.app", summary: "macOS 经典的全能系统深度清理、安全防护与性能提速管家。", features: ["一键全盘垃圾与系统缓存扫描", "恶意软件实时查杀拦截", "深度卸载与残留文件彻底粉碎"] },
  { match: ["snipaste", "pixpin"], title: "Snipaste 截图利器", category: "utilities", appName: "Snipaste.app", summary: "极其强大便捷的屏幕截图、贴图与取色标注神器。", features: ["像素级精准智能边缘吸附", "截图置顶贴图与透明度调节", "高级取色与标注工具箱"] },
  { match: ["bandizip", "7-zip", "7zip"], title: "Bandizip 全能压缩", category: "utilities", appName: "Bandizip.app", summary: "轻巧极速、支持全格式解压与多核心极速压缩的必备工具。", features: ["多核 CPU 满速并行压缩", "免解压直接预览图片文档", "支持长文件名与全字符集"] },
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
  { match: ["iina", "potplayer"], title: "IINA 全能播放器", category: "entertainment", appName: "IINA.app", summary: "现代化全能影音播放器，基于 mpv 内核，支持全格式硬解。", features: ["4K HDR 与杜比视界高保真回放", "原生毛玻璃与画中画模式", "支持在线字幕自动精准匹配"] },
  { match: ["downie"], title: "Downie 4", category: "utilities", appName: "Downie 4.app", summary: "macOS 最好用的全网高清音视频一键解析下载器。", features: ["支持全球数千个主流视频网站", "一键拖拽直链与批量抓取", "最高支持 4K/8K 与 HDR 原画下载"] },
  { match: ["permute"], title: "Permute 3", category: "utilities", appName: "Permute 3.app", summary: "精美优雅且极速的音视频/图片格式转换神器。", features: ["多核心硬件加速极速转码", "批量压制与体积大幅瘦身", "音视频一键拼接与提取伴奏"] },
  { match: ["clash", "clash verge"], title: "Clash Verge Rev", category: "network", appName: "Clash Verge.app", summary: "基于 Tauri 架构的高颜值全能网络代理工具与分流调度中心。", features: ["支持 Meta / Mihomo 新内核", "强大的规则订阅与自定义分流", "全平台统一极简毛玻璃界面"] },
  { match: ["surge"], title: "Surge for Mac", category: "network", appName: "Surge.app", summary: "macOS 上最强大的高级网络调试、抓包与流量接管工具。", features: ["精准分流与本地 DNS 高性能优化", "全协议请求实时解密抓包分析", "支持网关接管全屋局域网流量"] },
  { match: ["raycast"], title: "Raycast", category: "productivity", appName: "Raycast.app", summary: "新一代键盘驱动的极速 macOS 效率启动台与工作流中心。", features: ["海量插件生态秒级唤醒操作", "内置剪贴板历史与快捷短语", "深度集成 AI 交互与系统设置"] },
  { match: ["betterdisplay"], title: "BetterDisplay", category: "utilities", appName: "BetterDisplay.app", summary: "外接显示器 HiDPI 渲染与屏幕亮度精准调节神器。", features: ["一键解锁外接屏最佳 HiDPI 分辨率", "键盘原生亮度与音量 DDC 控制", "支持画中画与自定义色域映射"] },
];

// Helper: Normalize lookup of metadata regardless of folder prefixes
function getAppMetadata(metadata, fileKey) {
  if (!metadata || typeof metadata !== "object" || !fileKey) return {};
  if (metadata[fileKey]) return metadata[fileKey];

  // Try with "软件/" prefix
  const withPrefix = fileKey.startsWith("软件/") ? fileKey : `软件/${fileKey}`;
  if (metadata[withPrefix]) return metadata[withPrefix];

  // Try without "软件/" prefix
  const withoutPrefix = fileKey.replace(/^软件\//, "");
  if (metadata[withoutPrefix]) return metadata[withoutPrefix];

  // Try matching by base filename
  const fileName = fileKey.split("/").pop();
  if (fileName && metadata[fileName]) return metadata[fileName];

  for (const [k, v] of Object.entries(metadata)) {
    if (k.split("/").pop() === fileName) {
      return v;
    }
  }
  return {};
}

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
    const custom = getAppMetadata(props.metadata, file.key);
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
      custom: !!(custom && custom.title),
    };
  });
});

// Filtered apps based on tab, platform, and search
const filteredApps = computed(() => {
  let list = softwareItems.value;

  if (currentTab.value !== "discover" && currentTab.value !== "all") {
    list = list.filter((app) => (app.category || "").toLowerCase() === currentTab.value.toLowerCase());
  }

  if (selectedPlatform.value !== "all") {
    if (selectedPlatform.value === "mac") list = list.filter((app) => (app.platform || "").toLowerCase().includes("mac"));
    else if (selectedPlatform.value === "win") list = list.filter((app) => (app.platform || "").toLowerCase().includes("win"));
    else if (selectedPlatform.value === "mobile") list = list.filter((app) => (app.platform || "").toLowerCase().includes("android") || (app.platform || "").toLowerCase().includes("ios") || (app.platform || "").toLowerCase().includes("mobile"));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((app) =>
      (app.title || "").toLowerCase().includes(q) ||
      (app.summary || "").toLowerCase().includes(q) ||
      (app.key || "").toLowerCase().includes(q) ||
      (app.version || "").toLowerCase().includes(q)
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

function downloadDirectly(app) {
  if (!app || !app.key) return;
  const url = fullDirectUrl(app.key);
  const a = document.createElement("a");
  a.href = url;
  a.download = app.title || app.key.split("/").pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  copySuccessTip.value = `正在启动「${app.title}」极速下载...`;
  setTimeout(() => (copySuccessTip.value = ""), 3000);
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

  const metaData = {
    title: editingApp.value.title,
    version: editingApp.value.version,
    category: editingApp.value.category,
    platform: editingApp.value.platform,
    summary: editingApp.value.summary,
    features,
    installGuide: editingApp.value.installGuide,
    updatedAt: new Date().toISOString(),
  };

  const currentKey = editingApp.value.key;
  const fullKey = currentKey.startsWith("软件/") ? currentKey : `软件/${currentKey}`;
  const baseKey = currentKey.split("/").pop();

  const updated = {
    ...props.metadata,
    [currentKey]: metaData,
    [fullKey]: metaData,
    [baseKey]: metaData,
  };

  emit("save-metadata", updated);
  editingApp.value = null;

  if (selectedApp.value && (selectedApp.value.key === currentKey || selectedApp.value.key === fullKey || selectedApp.value.key === baseKey)) {
    selectedApp.value = {
      ...selectedApp.value,
      ...metaData,
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
              {{ cat.id === 'all' ? softwareItems.length : softwareItems.filter(a => (a.category || '').toLowerCase() === cat.id.toLowerCase()).length }}
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
        <!-- 🚀 2.5 Software Releases & Hot Update Console (When currentTab === 'releases') -->
        <section v-if="currentTab === 'releases'" class="store-releases-view">
          <div class="releases-header-card">
            <div class="releases-header-icon">
              <i class="ph ph-rocket-launch-fill"></i>
            </div>
            <div class="releases-header-info">
              <h3>软件版本与热更新管理控制台</h3>
              <p>一键发布增量补丁（0.22MB）与全量安装包，秒级同步至 Cloudflare R2 全球 CDN 节点，客户端启动无感热更。</p>
            </div>
            <div class="live-version-badge" v-if="currentLiveVersion && currentLiveVersion.version">
              <span class="live-dot-pulse"></span>
              <span>当前线上版本：<strong>v{{ currentLiveVersion.version }}</strong></span>
            </div>
            <div class="live-version-badge live-version-empty" v-else>
              <span class="live-dot-pulse bg-amber-500"></span>
              <span>暂未发布线上版本</span>
            </div>
          </div>

          <!-- 应用快捷切换选择栏 -->
          <div class="app-presets-row">
            <button 
              v-for="(p, k) in appPresets" 
              :key="k" 
              type="button"
              class="app-preset-btn"
              :class="{ active: releaseForm.app === k }"
              @click="switchReleaseApp(k)"
            >
              <span class="preset-icon">{{ k === 'live' ? '⚡' : k === 'datacenter' ? '📊' : '💎' }}</span>
              <span class="preset-name">{{ p.name }}</span>
              <span class="preset-slug">({{ k }})</span>
            </button>
          </div>

          <div class="releases-form-card">
            <div class="form-row-2col">
              <div class="form-group">
                <label>软件标识 (App Slug)</label>
                <select v-model="releaseForm.app" @change="switchReleaseApp(releaseForm.app)">
                  <option value="live">⚡ 天才猫极速直播助手 (live - Go 极速版)</option>
                  <option value="dy">💎 天才猫直播助手 (dy - C# 旗舰版)</option>
                  <option value="datacenter">📊 天才猫数据中心 (datacenter - Go 2.0)</option>
                </select>
              </div>

              <div class="form-group">
                <div class="label-with-actions">
                  <label>发布版本号 (Version)</label>
                  <div class="version-bump-group">
                    <button type="button" class="btn-bump-pill" @click="bumpVersion('patch')" title="补丁自增 +0.0.1">+0.0.1 (Patch)</button>
                    <button type="button" class="btn-bump-pill" @click="bumpVersion('minor')" title="特性自增 +0.1.0">+0.1.0 (Minor)</button>
                    <button type="button" class="btn-bump-pill" @click="bumpVersion('major')" title="大版本 +1.0.0">+1.0.0 (Major)</button>
                  </div>
                </div>
                <div class="input-with-prefix">
                  <span class="input-prefix">v</span>
                  <input v-model="releaseForm.version" type="text" placeholder="例如 2.0.1" />
                </div>
              </div>
            </div>

            <div class="form-row-2col">
              <div class="form-group">
                <div class="label-with-actions">
                  <label>增量补丁 / 单文件更新包路径 (Patch URL)</label>
                  <button type="button" class="btn-pick-drive" @click="openDriveFilePicker('patchUrl')">
                    <i class="ph ph-folder-open-fill"></i> 📂 从网盘选取
                  </button>
                </div>
                <input v-model="releaseForm.patchUrl" type="text" placeholder="例如 /apps/live/TianCaiMao.LiveAssistant.exe" />
              </div>

              <div class="form-group">
                <div class="label-with-actions">
                  <label>全量安装包路径 (Full Setup URL)</label>
                  <button type="button" class="btn-pick-drive" @click="openDriveFilePicker('fullSetupUrl')">
                    <i class="ph ph-folder-open-fill"></i> 📂 从网盘选取
                  </button>
                </div>
                <input v-model="releaseForm.fullSetupUrl" type="text" placeholder="例如 /apps/live/天才猫极速直播助手-Setup-v2.0.0.exe" />
              </div>
            </div>

            <div class="form-row-3col">
              <div class="form-group">
                <label>最低兼容支持版本 (Min Supported)</label>
                <input v-model="releaseForm.minSupportedVersion" type="text" placeholder="低于此版本将强制全量更新" />
              </div>
              <div class="form-group">
                <label>补丁 MD5 校验码 (可选)</label>
                <input v-model="releaseForm.patchMd5" type="text" placeholder="留空则不校验 MD5" />
              </div>
              <div class="form-group">
                <label>补丁文件大小 (字节数 Bytes: {{ (releaseForm.patchSize / 1024 / 1024).toFixed(2) }} MB)</label>
                <input v-model.number="releaseForm.patchSize" type="number" placeholder="11985408" />
              </div>
            </div>

            <div class="form-group">
              <label>更新说明 (Changelog，将直接展示给客户端用户)</label>
              <textarea v-model="releaseForm.changelog" rows="4" placeholder="1. 升级原生 CDP 极速直控引擎；&#10;2. 优化开价与库存调度算法；&#10;3. 修复已知问题。"></textarea>
            </div>

            <div class="form-row-checkbox">
              <label class="checkbox-label">
                <input v-model="releaseForm.forceUpdate" type="checkbox" />
                <span>⚠️ 设为紧急强制更新 (客户端检测到后必须完成更新方可使用)</span>
              </label>
            </div>

            <div class="releases-action-bar">
              <div class="status-tip-text" v-if="publishStatusMsg">{{ publishStatusMsg }}</div>
              <button class="btn-publish-submit" type="button" :disabled="isPublishing" @click="submitPublish">
                <i class="ph ph-paper-plane-tilt-fill"></i>
                <span>{{ isPublishing ? '正在同步 CDN...' : '🚀 立即发布并推送更新' }}</span>
              </button>
            </div>
          </div>

          <!-- 历史发版时间线与一键回滚 -->
          <div class="releases-history-section" v-if="releaseHistory && releaseHistory.length > 0">
            <div class="history-section-title">
              <i class="ph ph-clock-counter-clockwise-fill"></i>
              <span>历史发版审计与快速回滚 ({{ releaseHistory.length }} 个版本)</span>
            </div>

            <div class="history-cards-grid">
              <div 
                v-for="(item, hIdx) in releaseHistory" 
                :key="hIdx" 
                class="history-ver-card"
                :class="{ 'is-current-active': currentLiveVersion && currentLiveVersion.version === item.version }"
              >
                <div class="history-ver-top">
                  <div class="history-ver-badge">
                    <span class="ver-tag">v{{ item.version }}</span>
                    <span v-if="currentLiveVersion && currentLiveVersion.version === item.version" class="active-now-tag">当前线上</span>
                    <span v-if="item.forceUpdate" class="force-tag">强制更新</span>
                  </div>
                  <span class="history-date">{{ item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '历史版本' }}</span>
                </div>

                <div class="history-ver-meta">
                  <span>大小: {{ item.patchSize ? (item.patchSize / 1024 / 1024).toFixed(2) + ' MB' : '未记录' }}</span>
                  <span class="history-meta-path truncate" :title="item.patchUrl">{{ item.patchUrl }}</span>
                </div>

                <p class="history-changelog">{{ item.changelog || '无更新说明' }}</p>

                <div class="history-ver-actions">
                  <button type="button" class="btn-load-history" @click="loadHistoryItem(item)">
                    <i class="ph ph-arrow-counter-clockwise-bold"></i> 载入此版本配置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 3. Category Header Bar -->
        <div v-else-if="currentTab !== 'discover'" class="store-grid-header">
          <div class="grid-title-row">
            <div class="grid-title-left">
              <h3>{{ categories.find(c => c.id === currentTab)?.name || '软件应用库' }}</h3>
              <span class="grid-subtitle">{{ categories.find(c => c.id === currentTab)?.subtitle || 'Applications' }}</span>
            </div>
            <span class="grid-count">共 {{ filteredApps.length }} 款软件</span>
          </div>
        </div>

        <!-- 🎨 3. Refined Apple-Style Empty State Showcase -->
        <div v-if="currentTab !== 'releases' && filteredApps.length === 0" class="store-empty-showcase">
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
        <div class="app-detail-card grand-showcase-card">
          
          <!-- 🌟 1. 顶部 Hero 全景横幅与核心介绍区 (Hero Banner Showcase) -->
          <header class="detail-hero-banner">
            <div class="hero-glow-bg"></div>
            
            <div class="hero-top-bar">
              <div class="hero-breadcrumb">
                <span class="hero-cat-tag">
                  <i class="ph ph-squares-four-fill"></i>
                  <span>{{ categories.find(c => c.id === selectedApp.category)?.name || '软件应用' }}</span>
                </span>
                <span class="hero-sep">/</span>
                <span class="hero-platform-tag">{{ selectedApp.platform }}</span>
              </div>
              <button class="hero-close-btn" type="button" @click="selectedApp = null" title="关闭详情">
                <i class="ph ph-x-bold"></i>
              </button>
            </div>

            <div class="hero-content-row">
              <!-- 大号发光 App 图标 -->
              <div class="hero-icon-wrapper">
                <div class="hero-icon-box">
                  <i class="ph" :class="getAppIcon(selectedApp.category)"></i>
                </div>
                <div class="hero-icon-glow"></div>
              </div>

              <!-- 软件大标题与一句话亮点 -->
              <div class="hero-titles-col">
                <div class="hero-title-line">
                  <h2 class="hero-app-title">{{ selectedApp.title }}</h2>
                  <span class="badge-official">
                    <i class="ph ph-seal-check-fill"></i> 官方正版
                  </span>
                  <span class="badge-version">v{{ selectedApp.version }}</span>
                </div>

                <p class="hero-summary-lead">{{ selectedApp.summary || '官方完整安装包，由 Cloudflare Anycast 全球 CDN 边缘网络直连极速分发，安全纯净无捆绑。' }}</p>

                <!-- 🌟 核心高能下载与操作按钮组 -->
                <div class="hero-action-buttons">
                  <button class="btn-hero-primary-download" type="button" @click="downloadDirectly(selectedApp)">
                    <div class="btn-glow-layer"></div>
                    <i class="ph ph-arrow-circle-down-fill"></i>
                    <span class="btn-main-text">立即高速下载</span>
                    <span class="btn-size-tag">({{ formatSize(selectedApp.size) }})</span>
                  </button>

                  <button class="btn-hero-secondary" type="button" @click="openGetLinks(selectedApp)">
                    <i class="ph ph-link-simple-horizontal-bold"></i>
                    <span>多端直链与扫码</span>
                  </button>

                  <button class="btn-hero-secondary" type="button" @click="copyText(fullDirectUrl(selectedApp.key), '原生极速直链已复制！')">
                    <i class="ph ph-copy-simple-bold"></i>
                    <span>复制直链</span>
                  </button>

                  <button class="btn-hero-icon-only" type="button" @click="openEditor(selectedApp)" title="编辑软件详情">
                    <i class="ph ph-pencil-simple-bold"></i>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <!-- 🌟 2. 软件规格与信任指标横条 (Specs & Trust Strip) -->
          <div class="detail-specs-strip">
            <div class="spec-col">
              <span class="spec-label"><i class="ph ph-laptop"></i> 适用平台</span>
              <span class="spec-value text-blue">{{ selectedApp.platform }}</span>
            </div>
            <div class="spec-divider"></div>
            <div class="spec-col">
              <span class="spec-label"><i class="ph ph-tag"></i> 软件版本</span>
              <span class="spec-value text-emerald">v{{ selectedApp.version }}</span>
            </div>
            <div class="spec-divider"></div>
            <div class="spec-col">
              <span class="spec-label"><i class="ph ph-hard-drive"></i> 安装包体积</span>
              <span class="spec-value">{{ formatSize(selectedApp.size) }}</span>
            </div>
            <div class="spec-divider"></div>
            <div class="spec-col">
              <span class="spec-label"><i class="ph ph-shield-check"></i> 安全保障</span>
              <span class="spec-value text-green">
                <i class="ph ph-check-circle-fill"></i> 纯净无毒 / MD5 校验
              </span>
            </div>
            <div class="spec-divider"></div>
            <div class="spec-col">
              <span class="spec-label"><i class="ph ph-clock"></i> 最近更新</span>
              <span class="spec-value">{{ formatDate(selectedApp.uploaded) }}</span>
            </div>
          </div>

          <!-- 🌟 3. 软件主体介绍与特性展示区 (Showcase Body Content) -->
          <div class="detail-body-scrollable">
            
            <!-- 🌟 核心功能特色网格 (Core Highlights Grid) -->
            <section class="showcase-section" v-if="selectedApp.features && selectedApp.features.length">
              <div class="section-title-row">
                <div class="title-with-icon">
                  <div class="sec-icon-pill sec-icon-purple"><i class="ph ph-sparkle-fill"></i></div>
                  <h3>核心功能特色与技术亮点</h3>
                </div>
                <span class="sec-badge">{{ selectedApp.features.length }} 大核心优势</span>
              </div>

              <div class="features-grand-grid">
                <div v-for="(feat, idx) in selectedApp.features" :key="idx" class="feature-grand-card">
                  <div class="feat-card-header">
                    <span class="feat-index-dot">{{ idx + 1 }}</span>
                    <i class="ph ph-check-circle-fill feat-check-icon"></i>
                  </div>
                  <p class="feat-text-content">{{ feat }}</p>
                </div>
              </div>
            </section>

            <!-- 🌟 安装与使用指南 (Installation & Setup Guide) -->
            <section class="showcase-section" v-if="selectedApp.installGuide">
              <div class="section-title-row">
                <div class="title-with-icon">
                  <div class="sec-icon-pill sec-icon-amber"><i class="ph ph-terminal-window-fill"></i></div>
                  <h3>安装与使用指南 / 避坑备忘</h3>
                </div>
                <button
                  class="btn-copy-guide-action"
                  type="button"
                  @click="copyText(selectedApp.installGuide, '安装指南已复制！')"
                >
                  <i class="ph ph-copy-simple-bold"></i>
                  <span>一键复制指南</span>
                </button>
              </div>

              <div class="install-guide-container">
                <pre class="guide-formatted-pre">{{ selectedApp.installGuide }}</pre>
              </div>
            </section>

            <!-- 🌟 极速分发与多端接入卡片 (Distribution Channels) -->
            <section class="showcase-section">
              <div class="section-title-row">
                <div class="title-with-icon">
                  <div class="sec-icon-pill sec-icon-cyan"><i class="ph ph-globe-hemisphere-east-fill"></i></div>
                  <h3>全球 Anycast CDN 直连加速节点</h3>
                </div>
              </div>

              <div class="distribution-info-card">
                <div class="dist-icon-box">
                  <i class="ph ph-lightning-fill"></i>
                </div>
                <div class="dist-info-text">
                  <strong>Cloudflare R2 0 出网流量极速通道</strong>
                  <p>本软件包已托管于 Cloudflare 全球分布式边缘存储网络，支持断点续传、多线程下载器（IDM / Aria2 / Downie）加速，国内秒级拉取。</p>
                </div>
                <button class="btn-dist-download" type="button" @click="downloadDirectly(selectedApp)">
                  <i class="ph ph-download-simple-bold"></i> 立即下载
                </button>
              </div>
            </section>

          </div>

          <!-- 🌟 4. 底部常驻精美下载操作栏 (Sticky Footer CTA Bar) -->
          <footer class="detail-footer-bar">
            <div class="footer-app-mini">
              <div class="mini-app-icon">
                <i class="ph" :class="getAppIcon(selectedApp.category)"></i>
              </div>
              <div class="mini-app-info">
                <strong>{{ selectedApp.title }}</strong>
                <span>v{{ selectedApp.version }} · {{ formatSize(selectedApp.size) }}</span>
              </div>
            </div>

            <div class="footer-actions">
              <button class="btn-footer-link" type="button" @click="openGetLinks(selectedApp)">
                <i class="ph ph-qr-code-bold"></i> 扫码 / 终端命令
              </button>
              <button class="btn-footer-download" type="button" @click="downloadDirectly(selectedApp)">
                <i class="ph ph-arrow-circle-down-fill"></i> 立即高速下载 ({{ formatSize(selectedApp.size) }})
              </button>
            </div>
          </footer>

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
                <select v-model="editingApp.platform">
                  <option value="Windows (x64)">🪟 Windows (x64)</option>
                  <option value="Windows (ARM64)">🪟 Windows (ARM64)</option>
                  <option value="macOS (Universal 通用)">🍎 macOS (Universal 通用)</option>
                  <option value="macOS (Apple Silicon M系列)">🍎 macOS (Apple Silicon M系列)</option>
                  <option value="macOS (Intel x86_64)">🍎 macOS (Intel x86_64)</option>
                  <option value="Android (APK)">📱 Android (APK)</option>
                  <option value="iOS (IPA)">📱 iOS (IPA)</option>
                  <option value="Linux (Deb / AppImage)">🐧 Linux (Deb / AppImage)</option>
                  <option value="跨平台通用">🌐 跨平台通用</option>
                </select>
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

    <!-- 🗂️ R2 网盘已有安装包/补丁文件一键关联拾取弹窗 -->
    <div v-if="showDrivePickerModal" class="mac-modal-backdrop" @click.self="showDrivePickerModal = false">
      <div class="drive-picker-window">
        <div class="drive-picker-header">
          <div class="picker-title">
            <i class="ph ph-folder-open-fill"></i>
            <span>选择要绑定的网盘文件 ({{ drivePickerTarget === 'patchUrl' ? '补丁/单文件包' : '全量安装包' }})</span>
          </div>
          <button type="button" class="btn-picker-close" @click="showDrivePickerModal = false">✕</button>
        </div>

        <div class="drive-picker-body">
          <div v-if="driveInstallerFiles.length === 0" class="drive-picker-empty">
            <p>网盘中暂无识别到的 .exe / .zip / .dmg 安装包或补丁文件。</p>
            <p class="text-sub">请先上传文件至 R2 存储桶对应的 <code>apps/live/</code> 或 <code>apps/dy/</code> 目录。</p>
          </div>

          <div v-else class="drive-picker-list">
            <div 
              v-for="(file, fIdx) in driveInstallerFiles" 
              :key="fIdx" 
              class="drive-picker-item"
              @click="selectDriveFile(file)"
            >
              <div class="picker-file-icon">
                <i class="ph ph-file-zip-fill" v-if="/\.zip$/i.test(file.key)"></i>
                <i class="ph ph-package-fill" v-else></i>
              </div>
              <div class="picker-file-info">
                <div class="picker-file-name">{{ file.key }}</div>
                <div class="picker-file-meta">
                  <span>{{ (file.size / 1024 / 1024).toFixed(2) }} MB</span>
                  <span v-if="file.uploaded">· {{ new Date(file.uploaded).toLocaleString() }}</span>
                </div>
              </div>
              <button type="button" class="btn-picker-select">一键选用</button>
            </div>
          </div>
        </div>
      </div>
    </div>

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

/* Releases & Hot Update Console */
.store-releases-view {
  padding: 10px 4px 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.releases-header-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%);
  border: 1px solid rgba(14, 165, 233, 0.28);
}
.releases-header-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
  flex-shrink: 0;
}
.releases-header-info {
  flex: 1;
}
.releases-header-info h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
}
.releases-header-info p {
  margin: 0;
  font-size: 12px;
  color: var(--store-text-sub, #64748b);
  line-height: 1.45;
}
.live-version-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  font-size: 12px;
  color: #10b981;
  white-space: nowrap;
}
.live-dot-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.releases-form-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px;
  border-radius: 16px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  backdrop-filter: blur(20px);
}
.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.form-row-checkbox {
  margin: 2px 0 6px;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  cursor: pointer;
}
.releases-action-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
.status-tip-text {
  font-size: 12.5px;
  font-weight: 600;
  color: #0ea5e9;
}
.btn-publish-submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, #007aff 0%, #38bdf8 100%);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
  transition: all 0.15s ease;
}
.btn-publish-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 122, 255, 0.45);
}
.btn-publish-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

/* Enhanced Releases View Styling */
.app-presets-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.app-preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  color: var(--store-text, #1e293b);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.app-preset-btn:hover {
  background: rgba(14, 165, 233, 0.1);
  border-color: rgba(14, 165, 233, 0.4);
}
.app-preset-btn.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
  border-color: #0ea5e9;
  color: #0284c7;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.25);
}
.preset-slug {
  font-size: 11px;
  opacity: 0.7;
}

.label-with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.version-bump-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.btn-bump-pill {
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(14, 165, 233, 0.35);
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-bump-pill:hover {
  background: #0ea5e9;
  color: #ffffff;
}
.btn-pick-drive {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.35);
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-pick-drive:hover {
  background: #6366f1;
  color: #ffffff;
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}
.input-prefix {
  position: absolute;
  left: 12px;
  font-weight: 700;
  color: #64748b;
  font-size: 13px;
}
.input-with-prefix input {
  padding-left: 28px !important;
}

.form-row-3col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}

.live-version-empty {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
  color: #d97706;
}

/* History Section */
.releases-history-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
}
.history-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--store-text, #1e293b);
}
.history-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.history-ver-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.15s ease;
}
.history-ver-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}
.history-ver-card.is-current-active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.04);
}
.history-ver-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.history-ver-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ver-tag {
  font-size: 13px;
  font-weight: 800;
  color: #0284c7;
}
.active-now-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  background: #10b981;
  color: #ffffff;
}
.force-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  background: #f43f5e;
  color: #ffffff;
}
.history-date {
  font-size: 11px;
  color: #94a3b8;
}
.history-ver-meta {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: #64748b;
}
.history-meta-path {
  font-family: monospace;
  font-size: 10.5px;
  color: #94a3b8;
}
.history-changelog {
  margin: 0;
  font-size: 11.5px;
  color: var(--store-text, #334155);
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 60px;
  overflow-y: auto;
}
.history-ver-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.btn-load-history {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(14, 165, 233, 0.35);
  background: rgba(14, 165, 233, 0.08);
  color: #0284c7;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-load-history:hover {
  background: #0ea5e9;
  color: #ffffff;
}

/* Drive Picker Modal */
.drive-picker-window {
  width: 520px;
  max-width: 90vw;
  max-height: 75vh;
  border-radius: 18px;
  background: var(--store-bg, #ffffff);
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.12));
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.drive-picker-header {
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
}
.picker-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--store-text, #1e293b);
}
.btn-picker-close {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #94a3b8;
}
.drive-picker-body {
  padding: 14px 18px;
  overflow-y: auto;
}
.drive-picker-empty {
  text-align: center;
  padding: 30px 10px;
  color: #64748b;
  font-size: 12.5px;
}
.drive-picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.drive-picker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.06));
  background: var(--store-card-bg, rgba(255, 255, 255, 0.5));
  cursor: pointer;
  transition: all 0.15s ease;
}
.drive-picker-item:hover {
  border-color: #0ea5e9;
  background: rgba(14, 165, 233, 0.06);
}
.picker-file-icon {
  font-size: 22px;
  color: #0284c7;
}
.picker-file-info {
  flex: 1;
  min-width: 0;
}
.picker-file-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--store-text, #1e293b);
  word-break: break-all;
}
.picker-file-meta {
  font-size: 10.5px;
  color: #94a3b8;
}
.btn-picker-select {
  padding: 4px 12px;
  border-radius: 8px;
  border: none;
  background: #0ea5e9;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}


/* ==========================================================================
   🌟 Grand Atmospheric Software Showcase Page Styling
   ========================================================================== */
.grand-showcase-card {
  width: 92vw !important;
  max-width: 900px !important;
  height: 88vh !important;
  max-height: 820px !important;
  border-radius: 24px !important;
  display: flex !important;
  flex-direction: column !important;
  background: var(--store-bg, #ffffff) !important;
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.12)) !important;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.45) !important;
  overflow: hidden !important;
  position: relative !important;
}

[data-theme="dark"] .grand-showcase-card,
:root.dark .grand-showcase-card {
  background: #0f131a !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.8) !important;
}

/* 1. Hero Banner */
.detail-hero-banner {
  position: relative;
  padding: 24px 30px 22px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(99, 102, 241, 0.14) 50%, rgba(236, 72, 153, 0.08) 100%);
  border-bottom: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  overflow: hidden;
  flex-shrink: 0;
}

.hero-glow-bg {
  position: absolute;
  top: -80px;
  right: -80px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, rgba(99, 102, 241, 0) 70%);
  filter: blur(40px);
  pointer-events: none;
}

.hero-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.hero-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}

.hero-cat-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(14, 165, 233, 0.15);
  color: #0284c7;
}

.hero-sep {
  color: #94a3b8;
}

.hero-platform-tag {
  color: #64748b;
}

.hero-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: var(--store-text, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.hero-close-btn:hover {
  background: rgba(244, 63, 94, 0.15);
  color: #f43f5e;
  transform: rotate(90deg);
}

.hero-content-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.hero-icon-wrapper {
  position: relative;
  flex-shrink: 0;
}

.hero-icon-box {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  box-shadow: 0 12px 30px rgba(14, 165, 233, 0.45);
  position: relative;
  z-index: 2;
}

.hero-icon-glow {
  position: absolute;
  inset: -6px;
  border-radius: 26px;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  opacity: 0.4;
  filter: blur(12px);
  z-index: 1;
}

.hero-titles-col {
  flex: 1;
  min-width: 0;
}

.hero-title-line {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.hero-app-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--store-text, #0f172a);
  letter-spacing: -0.02em;
}

.badge-official {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  font-size: 11.5px;
  font-weight: 700;
}

.badge-version {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  font-size: 11.5px;
  font-weight: 700;
  font-family: monospace;
}

.hero-summary-lead {
  margin: 0 0 16px;
  font-size: 13.5px;
  color: var(--store-text-sub, #475569);
  line-height: 1.5;
  max-width: 680px;
}

/* Hero Action Buttons */
.hero-action-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-hero-primary-download {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 26px;
  border-radius: 14px;
  background: linear-gradient(135deg, #007aff 0%, #38bdf8 100%);
  color: #ffffff;
  border: none;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 122, 255, 0.45);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.btn-hero-primary-download:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 28px rgba(0, 122, 255, 0.6);
}

.btn-hero-primary-download:active {
  transform: translateY(0) scale(0.98);
}

.btn-size-tag {
  font-size: 12px;
  opacity: 0.9;
  font-weight: 600;
}

.btn-hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 11px 18px;
  border-radius: 12px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.8));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.12));
  color: var(--store-text, #1e293b);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-hero-secondary:hover {
  background: rgba(14, 165, 233, 0.12);
  border-color: #0ea5e9;
  color: #0284c7;
  transform: translateY(-1px);
}

.btn-hero-icon-only {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.8));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.12));
  color: var(--store-text, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-hero-icon-only:hover {
  color: #0ea5e9;
  border-color: #0ea5e9;
}

/* 2. Specs Strip */
.detail-specs-strip {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 12px 24px;
  background: var(--store-card-bg, rgba(248, 250, 252, 0.85));
  border-bottom: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  flex-shrink: 0;
  gap: 10px;
}

.spec-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
}

.spec-label {
  font-size: 11px;
  color: var(--store-text-sub, #64748b);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.spec-value {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--store-text, #1e293b);
}

.spec-value.text-blue { color: #0284c7; }
.spec-value.text-emerald { color: #059669; }
.spec-value.text-green { color: #10b981; }

.spec-divider {
  width: 1px;
  height: 26px;
  background: var(--store-border, rgba(0, 0, 0, 0.08));
}

/* 3. Body Scrollable Content */
.detail-body-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 24px 30px 30px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.showcase-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sec-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #ffffff;
}

.sec-icon-purple { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
.sec-icon-amber { background: linear-gradient(135deg, #f59e0b, #ea580c); }
.sec-icon-cyan { background: linear-gradient(135deg, #0ea5e9, #6366f1); }

.section-title-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--store-text, #0f172a);
}

.sec-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.12);
  color: #8b5cf6;
}

.features-grand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.feature-grand-card {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--store-card-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.15s ease;
}

.feature-grand-card:hover {
  border-color: #0ea5e9;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(14, 165, 233, 0.15);
}

.feat-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feat-index-dot {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feat-check-icon {
  color: #10b981;
  font-size: 16px;
}

.feat-text-content {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--store-text, #334155);
  line-height: 1.45;
}

/* Install Guide Box */
.install-guide-container {
  border-radius: 14px;
  background: #181e29;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 18px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
}

.guide-formatted-pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  color: #38bdf8;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.btn-copy-guide-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-copy-guide-action:hover {
  background: #f59e0b;
  color: #ffffff;
}

/* Distribution Info Card */
.distribution-info-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
  border: 1px solid rgba(14, 165, 233, 0.25);
}

.dist-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.dist-info-text {
  flex: 1;
}

.dist-info-text strong {
  display: block;
  font-size: 13.5px;
  color: var(--store-text, #0f172a);
  margin-bottom: 2px;
}

.dist-info-text p {
  margin: 0;
  font-size: 12px;
  color: var(--store-text-sub, #64748b);
  line-height: 1.4;
}

.btn-dist-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 10px;
  background: #0ea5e9;
  color: #ffffff;
  border: none;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
  transition: all 0.15s ease;
}

.btn-dist-download:hover {
  background: #0284c7;
  transform: translateY(-1px);
}

/* 4. Sticky Footer CTA Bar */
.detail-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: var(--store-bg, #ffffff);
  border-top: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  flex-shrink: 0;
}

[data-theme="dark"] .detail-footer-bar,
:root.dark .detail-footer-bar {
  background: #111620;
}

.footer-app-mini {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-app-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.mini-app-info {
  display: flex;
  flex-direction: column;
}

.mini-app-info strong {
  font-size: 13px;
  color: var(--store-text, #0f172a);
}

.mini-app-info span {
  font-size: 11px;
  color: #94a3b8;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-footer-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid var(--store-border, rgba(0, 0, 0, 0.08));
  color: var(--store-text, #1e293b);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

[data-theme="dark"] .btn-footer-link,
:root.dark .btn-footer-link {
  background: rgba(255, 255, 255, 0.06);
}

.btn-footer-link:hover {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
}

.btn-footer-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #007aff 0%, #38bdf8 100%);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.4);
  transition: all 0.15s ease;
}

.btn-footer-download:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 122, 255, 0.55);
}

</style>
