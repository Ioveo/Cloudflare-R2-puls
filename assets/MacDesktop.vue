<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import MacWindow from "./MacWindow.vue";
import MacTopBar from "./MacTopBar.vue";
import MacDock from "./MacDock.vue";
import MacControlCenter from "./MacControlCenter.vue";
import MacSpotlight from "./MacSpotlight.vue";
import MacSettingsModal from "./MacSettingsModal.vue";
import MacIcons from "./MacIcons.vue";
import MacVideoPlayerModal from "./MacVideoPlayerModal.vue";
import MacMusicPlayerModal from "./MacMusicPlayerModal.vue";
import MacPhotosModal from "./MacPhotosModal.vue";
import MacCalculatorModal from "./MacCalculatorModal.vue";
import MacNotesModal from "./MacNotesModal.vue";
import MacDesktopWidgets from "./MacDesktopWidgets.vue";
import MacWidgetPickerModal from "./MacWidgetPickerModal.vue";
import MacAppStoreModal from "./MacAppStoreModal.vue";
import MacMobileAssistiveTouch from "./MacMobileAssistiveTouch.vue";
import ContextMenu from "./ContextMenu.vue";

const props = defineProps({
  files: { type: Array, default: () => [] },
  folders: { type: Array, default: () => [] },
  allFiles: { type: Array, default: () => [] },
  appsMetadata: { type: Object, default: () => ({}) },
  cwd: { type: String, default: "" },
  storageId: { type: String, default: "default" },
  storageOptions: { type: Array, default: () => [{ id: "default", label: "主存储" }] },
  theme: { type: String, default: "dark" },
  loading: { type: Boolean, default: false },
  viewMode: { type: String, default: "grid" },
  search: { type: String, default: "" },
  filterCategory: { type: String, default: "all" },
  authCredentials: { type: Object, default: null },
  categoryCounts: { type: Object, default: () => ({ image: 0, video: 0, audio: 0, software: 0, archive: 0, document: 0 }) },
  totalStorageBytes: { type: Number, default: 0 },
});

const emit = defineEmits([
  "navigate",
  "open-file",
  "upload",
  "upload-to-folder",
  "init-system-folders",
  "create-folder",
  "rename",
  "move",
  "delete",
  "save-apps-metadata",
  "copy-item",
  "cut-item",
  "paste",
  "share",
  "inspect",
  "edit",
  "toggle-theme",
  "switch-storage",
  "switch-mode",
  "login",
  "logout",
  "refresh",
  "drop-files",
  "update:viewMode",
  "update:filterCategory",
  "update:search",
]);

// 4K macOS Official & Dynamic Wallpapers
const wallpapers = [
  {
    id: "sequoia",
    name: "Sequoia 杉树晨光 (macOS 15)",
    url: "https://images.unsplash.com/photo-1511497584788-87676104235f?q=85&w=2800&auto=format&fit=crop",
    gradient: "radial-gradient(circle at 50% 30%, #1e3c72, #2a5298, #0f2027)",
  },
  {
    id: "macos26",
    name: "macOS 26 流体玻璃 (Liquid Tahoe)",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)",
  },
  {
    id: "sonoma",
    name: "Sonoma 极光天际 (macOS 14)",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #13072e 0%, #3f0d75 50%, #09203f 100%)",
  },
  {
    id: "ventura",
    name: "Ventura 炽烈流光 (macOS 13)",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #ff7e5f, #feb47b)",
  },
  {
    id: "monterey",
    name: "Monterey 蒙特利深海 (macOS 12)",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #001f3f, #0074D9)",
  },
  {
    id: "bigsur",
    name: "Big Sur 晨曦群山 (macOS 11)",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  },
  {
    id: "aurora",
    name: "Aurora 璀璨极光 4K",
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #000428, #004e92)",
  },
  {
    id: "mojave",
    name: "Mojave 暗夜星河 4K",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  },
  {
    id: "neon",
    name: "Cyberpunk 赛博霓虹 4K",
    url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=85&w=2800&auto=format&fit=crop",
    gradient: "linear-gradient(135deg, #000428, #004e92)",
  },
  {
    id: "obsidian",
    name: "Obsidian 黑曜石极简",
    url: "",
    gradient: "linear-gradient(135deg, #090a0f 0%, #151821 50%, #0c0d12 100%)",
  },
];
const currentWallpaper = ref(localStorage.getItem("mac-wallpaper") || "sequoia");
const customWallpaper = ref(localStorage.getItem("mac-custom-wallpaper") || "");

const wallpaperStyle = computed(() => {
  if (customWallpaper.value) {
    return {
      backgroundImage: `url("${customWallpaper.value}")`,
      backgroundSize: "cover",
      backgroundPosition: "center center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#111216",
    };
  }
  const wp = wallpapers.find((w) => w.id === currentWallpaper.value) || wallpapers[0];
  if (wp.url) {
    return {
      backgroundImage: `url("${wp.url}")`,
      backgroundSize: "cover",
      backgroundPosition: "center center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#111216",
    };
  }
  return { background: wp.gradient };
});

function changeWallpaper(id) {
  customWallpaper.value = "";
  localStorage.removeItem("mac-custom-wallpaper");
  currentWallpaper.value = id;
  localStorage.setItem("mac-wallpaper", id);
}

function resetWallpaper() {
  customWallpaper.value = "";
  localStorage.removeItem("mac-custom-wallpaper");
}

function setAsWallpaper(fileOrUrl) {
  const url = typeof fileOrUrl === "string" ? fileOrUrl : (fileOrUrl.url || imageUrl(fileOrUrl));
  customWallpaper.value = url;
  localStorage.setItem("mac-custom-wallpaper", url);
}

function handleDesktopKeydown(e) {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    if (photosModal.value.visible) {
      photosModal.value.visible = false;
      return;
    }
    if (videoModal.value.visible) {
      videoModal.value.visible = false;
      return;
    }
    if (musicModal.value.visible) {
      musicModal.value.visible = false;
      return;
    }
    if (selectedFileKey.value) {
      const selFile = props.files.find((f) => f.key === selectedFileKey.value) || (props.allFiles && props.allFiles.find((f) => f.key === selectedFileKey.value));
      if (selFile) {
        handleOpenFile(selFile);
      }
    }
  }
}

onMounted(() => {
  window.addEventListener("wallpaper-changed", (e) => {
    if (e.detail) customWallpaper.value = e.detail;
  });
  window.addEventListener("keydown", handleDesktopKeydown);
  window.addEventListener("resize", checkIsMobile);
  document.addEventListener("fullscreenchange", () => {
    isFullscreen.value = !!document.fullscreenElement;
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleDesktopKeydown);
  window.removeEventListener("resize", checkIsMobile);
});

// Window Management States
const windowZ = ref({
  finder: 10,
  settings: 11,
  photos: 12,
  video: 13,
  music: 14,
  calculator: 15,
  notes: 16,
  appstore: 17,
});

const windows = ref({
  finder: { visible: true, minimized: false, zIndex: 10 },
  settings: { visible: false, minimized: false, zIndex: 11 },
});

const videoModal = ref({ visible: false, minimized: false, file: null, items: [], index: 0 });
const musicModal = ref({ visible: false, minimized: false, file: null, items: [], index: 0 });
const photosModal = ref({ visible: false, minimized: false, file: null, items: [], index: 0 });
const calculatorModal = ref({ visible: false, minimized: false });
const notesModal = ref({ visible: false, minimized: false });
const appStoreModal = ref({ visible: false, minimized: false });
const appStoreRef = ref(null);
const selectedFileKey = ref("");

const activeAppId = ref("finder");
const topZIndex = ref(30);

function bringToFront(appId) {
  activeAppId.value = appId;
  topZIndex.value += 1;
  windowZ.value[appId] = topZIndex.value;
  if (windows.value[appId]) {
    windows.value[appId].zIndex = topZIndex.value;
    windows.value[appId].minimized = false;
    windows.value[appId].visible = true;
  }
  if (appId === "photos") { photosModal.value.minimized = false; photosModal.value.visible = true; }
  if (appId === "video" || appId === "cinema") { videoModal.value.minimized = false; videoModal.value.visible = true; }
  if (appId === "music") { musicModal.value.minimized = false; musicModal.value.visible = true; }
  if (appId === "calculator") { calculatorModal.value.minimized = false; calculatorModal.value.visible = true; }
  if (appId === "notes") { notesModal.value.minimized = false; notesModal.value.visible = true; }
  if (appId === "appstore" || appId === "apps") { appStoreModal.value.minimized = false; appStoreModal.value.visible = true; }
}

function closeWindow(appId) {
  if (windows.value[appId]) {
    windows.value[appId].visible = false;
  }
}

function minimizeWindow(appId) {
  if (windows.value[appId]) {
    windows.value[appId].minimized = true;
  }
}

const allImages = computed(() => {
  const list = props.allFiles && props.allFiles.length ? props.allFiles : props.files;
  return list.filter(isImage);
});

const allVideos = computed(() => {
  const list = props.allFiles && props.allFiles.length ? props.allFiles : props.files;
  return list.filter(isVideo);
});

const allAudios = computed(() => {
  const list = props.allFiles && props.allFiles.length ? props.allFiles : props.files;
  return list.filter(isAudio);
});

function launchApp(appId) {
  if (appId === "finder") {
    if (windows.value.finder.minimized) {
      windows.value.finder.minimized = false;
      windows.value.finder.visible = true;
      bringToFront("finder");
    } else if (windows.value.finder.visible && activeAppId.value === "finder") {
      windows.value.finder.minimized = true;
    } else {
      emit("update:filterCategory", "all");
      bringToFront("finder");
    }
  } else if (appId === "settings") {
    if (windows.value.settings.minimized) {
      windows.value.settings.minimized = false;
      windows.value.settings.visible = true;
      bringToFront("settings");
    } else if (windows.value.settings.visible && activeAppId.value === "settings") {
      windows.value.settings.minimized = true;
    } else {
      bringToFront("settings");
    }
  } else if (appId === "calculator") {
    if (calculatorModal.value.minimized) {
      calculatorModal.value.minimized = false;
      calculatorModal.value.visible = true;
      bringToFront("calculator");
    } else if (calculatorModal.value.visible && activeAppId.value === "calculator") {
      calculatorModal.value.minimized = true;
    } else {
      calculatorModal.value.visible = true;
      calculatorModal.value.minimized = false;
      bringToFront("calculator");
    }
  } else if (appId === "notes") {
    if (notesModal.value.minimized) {
      notesModal.value.minimized = false;
      notesModal.value.visible = true;
      bringToFront("notes");
    } else if (notesModal.value.visible && activeAppId.value === "notes") {
      notesModal.value.minimized = true;
    } else {
      notesModal.value.visible = true;
      notesModal.value.minimized = false;
      bringToFront("notes");
    }
  } else if (appId === "photos") {
    if (photosModal.value.minimized) {
      photosModal.value.minimized = false;
      photosModal.value.visible = true;
      bringToFront("photos");
    } else if (photosModal.value.visible && activeAppId.value === "photos") {
      photosModal.value.minimized = true;
    } else {
      bringToFront("photos");
      photosModal.value = {
        visible: true,
        minimized: false,
        file: null, // open in all photos library grid view
        items: allImages.value.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
        index: 0,
      };
    }
  } else if (appId === "cinema") {
    if (videoModal.value.minimized) {
      videoModal.value.minimized = false;
      videoModal.value.visible = true;
      bringToFront("video");
    } else if (videoModal.value.visible && activeAppId.value === "video") {
      videoModal.value.minimized = true;
    } else {
      bringToFront("video");
      videoModal.value = {
        visible: true,
        minimized: false,
        file: allVideos.value.length ? allVideos.value[0] : null,
        items: allVideos.value.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
        index: 0,
      };
    }
  } else if (appId === "music") {
    if (musicModal.value.minimized) {
      musicModal.value.minimized = false;
      musicModal.value.visible = true;
      bringToFront("music");
    } else if (musicModal.value.visible && activeAppId.value === "music") {
      musicModal.value.minimized = true;
    } else {
      bringToFront("music");
      musicModal.value = {
        visible: true,
        minimized: false,
        file: allAudios.value.length ? allAudios.value[0] : null,
        items: allAudios.value.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
        index: 0,
      };
    }
  } else if (appId === "appstore" || appId === "apps") {
    if (appStoreModal.value.minimized) {
      appStoreModal.value.minimized = false;
      appStoreModal.value.visible = true;
      bringToFront("appstore");
    } else if (appStoreModal.value.visible && activeAppId.value === "appstore") {
      appStoreModal.value.minimized = true;
    } else {
      appStoreModal.value.visible = true;
      appStoreModal.value.minimized = false;
      bringToFront("appstore");
    }
  } else if (appId === "archive") {
    emit("update:filterCategory", "archive");
    bringToFront("finder");
  } else if (appId === "doc") {
    emit("update:filterCategory", "document");
    bringToFront("finder");
  } else if (appId === "upload") {
    handleFinderUpload();
  } else if (appId === "trash") {
    bringToFront("settings");
  }
}

const openApps = computed(() => {
  const list = [];
  if (windows.value.finder.visible && !windows.value.finder.minimized) list.push("finder");
  if (windows.value.settings.visible && !windows.value.settings.minimized) list.push("settings");
  if (appStoreModal.value.visible && !appStoreModal.value.minimized) list.push("appstore");
  if (videoModal.value.visible && !videoModal.value.minimized) list.push("cinema");
  if (musicModal.value.visible && !musicModal.value.minimized) list.push("music");
  if (photosModal.value.visible && !photosModal.value.minimized) list.push("photos");
  if (calculatorModal.value.visible && !calculatorModal.value.minimized) list.push("calculator");
  if (notesModal.value.visible && !notesModal.value.minimized) list.push("notes");
  return list;
});

// Spotlight & Control Center
const showSpotlight = ref(false);
const showControlCenter = ref(false);

// Desktop Context Menu
const showDesktopContext = ref(false);
const contextPos = ref({ x: 0, y: 0 });
const contextTarget = ref(null);

function onDesktopContextMenu(e) {
  if (e.target.closest(".mac-window") || e.target.closest(".dock-container") || e.target.closest(".mac-menubar")) return;
  e.preventDefault();
  contextTarget.value = null;
  contextPos.value = { x: e.clientX, y: e.clientY };
  showDesktopContext.value = true;
}

// Desktop Widgets Management (Auto-saved to localStorage)
const defaultWidgets = ["weather", "clock", "notes"];
const desktopWidgets = ref(JSON.parse(localStorage.getItem("mac-desktop-widgets") || JSON.stringify(defaultWidgets)));
const showWidgetPicker = ref(false);

function toggleDesktopWidget(id) {
  const idx = desktopWidgets.value.indexOf(id);
  if (idx > -1) {
    desktopWidgets.value.splice(idx, 1);
  } else {
    desktopWidgets.value.push(id);
  }
  localStorage.setItem("mac-desktop-widgets", JSON.stringify(desktopWidgets.value));
}

function removeDesktopWidget(id) {
  const idx = desktopWidgets.value.indexOf(id);
  if (idx > -1) {
    desktopWidgets.value.splice(idx, 1);
    localStorage.setItem("mac-desktop-widgets", JSON.stringify(desktopWidgets.value));
  }
}

const desktopContextActions = computed(() => {
  const list = [
    { id: "edit-widgets", label: "添加 / 编辑桌面小组件...", icon: "ph-squares-four" },
    { id: "new-folder", label: "新建文件夹", icon: "ph-folder-plus" },
    { id: "upload", label: "上传文件...", icon: "ph-upload-simple" },
  ];
  if (customWallpaper.value) {
    list.push({ id: "reset-wallpaper", label: "还原官方动态壁纸", icon: "ph-arrow-counter-clockwise" });
  }
  list.push(
    { id: "next-wallpaper", label: "切换官方动态壁纸", icon: "ph-paint-brush" },
    { id: "refresh", label: "刷新桌面", icon: "ph-arrows-clockwise" },
    { id: "settings", label: "系统偏好设置...", icon: "ph-gear-six" },
    { id: "switch-studio", label: "切换经典展厅模式", icon: "ph-layout" }
  );
  return list;
});

function handleDesktopContextSelect(id) {
  showDesktopContext.value = false;
  if (id === "edit-widgets") showWidgetPicker.value = true;
  if (id === "new-folder") emit("create-folder");
  if (id === "upload") emit("upload");
  if (id === "refresh") emit("refresh");
  if (id === "settings") bringToFront("settings");
  if (id === "switch-studio") emit("switch-mode", "studio");
  if (id === "reset-wallpaper") resetWallpaper();
  if (id === "next-wallpaper") {
    const idx = wallpapers.findIndex((w) => w.id === currentWallpaper.value);
    const nextWp = wallpapers[(idx + 1) % wallpapers.length];
    changeWallpaper(nextWp.id);
  }
}

// Finder Specific Navigation
const pathParts = computed(() => props.cwd.split("/").filter(Boolean));
const parentPath = computed(() => {
  const clean = props.cwd.endsWith("/") ? props.cwd.slice(0, -1) : props.cwd;
  const lastSlash = clean.lastIndexOf("/");
  return lastSlash >= 0 ? clean.slice(0, lastSlash + 1) : "";
});

function cleanFileName(key) {
  if (!key) return "";
  let name = key.split("/").filter(Boolean).pop() || key;
  name = name.replace(/~[a-zA-Z0-9_\-]+(?=\.[a-zA-Z0-9]+$)/, "");
  name = name.split("?")[0];
  return name;
}

function truncateMiddle(str, maxLen = 20) {
  if (!str || str.length <= maxLen) return str;
  const extIndex = str.lastIndexOf(".");
  const ext = extIndex !== -1 ? str.slice(extIndex) : "";
  const base = extIndex !== -1 ? str.slice(0, extIndex) : str;
  const avail = maxLen - ext.length - 3;
  if (avail <= 4) return str.slice(0, maxLen - 3) + "..." + ext;
  const front = Math.ceil(avail / 2);
  const back = Math.floor(avail / 2);
  return `${base.slice(0, front)}...${base.slice(-back)}${ext}`;
}

function displayFileName(key, isGrid = true) {
  const clean = cleanFileName(key);
  return isGrid ? truncateMiddle(clean, 20) : clean;
}

function fileName(key) {
  return cleanFileName(key);
}

function folderName(folder) {
  return folder ? folder.split("/").filter(Boolean).pop() || "文件夹" : "";
}

function pathUntil(index) {
  return `${pathParts.value.slice(0, index + 1).join("/")}/`;
}

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
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function imageUrl(file) {
  if (!file) return "";
  if (file.customMetadata?.thumbnail) {
    return `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png?storage=${encodeURIComponent(props.storageId)}`;
  }
  const path = `/raw/${file.key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

function rawPath(key) {
  if (!key) return "";
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

function isImage(file) {
  if (!file) return false;
  const type = (file.httpMetadata?.contentType || "").toLowerCase();
  return type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|heic|ico)$/i.test(file.key || "");
}

function isVideo(file) {
  if (!file) return false;
  const type = (file.httpMetadata?.contentType || "").toLowerCase();
  return type.startsWith("video/") || /\.(mp4|webm|mkv|mov|m4v|avi|flv|wmv)$/i.test(file.key || "");
}

function isAudio(file) {
  if (!file) return false;
  const type = (file.httpMetadata?.contentType || "").toLowerCase();
  return type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(file.key || "");
}

function isSoftware(file) {
  const key = (typeof file === "string" ? file : file?.key || "").toLowerCase();
  return /\.(dmg|pkg|exe|msi|apk|ipa|deb|appimage|rpm)$/i.test(key) || (key.endsWith(".zip") && (key.includes("mac") || key.includes("win") || key.includes("app")));
}

function getSoftwarePlatformPill(file) {
  const key = (typeof file === "string" ? file : file?.key || "").toLowerCase();
  if (key.includes("arm64") || key.includes("m1") || key.includes("m2") || key.includes("m3") || key.includes("m4") || key.includes("apple_silicon")) return "M系列";
  if (key.includes("intel") || key.includes("x64") || key.includes("x86_64")) return "Intel";
  if (key.endsWith(".dmg") || key.endsWith(".pkg")) return "Mac";
  if (key.endsWith(".exe") || key.endsWith(".msi")) return "Win64";
  if (key.endsWith(".apk")) return "APK";
  if (key.endsWith(".ipa")) return "IPA";
  return "App";
}

function openAppStoreDetail(fileOrKey) {
  const key = typeof fileOrKey === "string" ? fileOrKey : fileOrKey?.key;
  bringToFront("appstore");
  appStoreModal.value.visible = true;
  appStoreModal.value.minimized = false;
  setTimeout(() => {
    appStoreRef.value?.openDetailByKey(key);
  }, 60);
}

function openAppStoreEditor(fileOrKey) {
  const key = typeof fileOrKey === "string" ? fileOrKey : fileOrKey?.key;
  bringToFront("appstore");
  appStoreModal.value.visible = true;
  appStoreModal.value.minimized = false;
  setTimeout(() => {
    appStoreRef.value?.openEditorByKey(key);
  }, 60);
}

function openAppStoreLinks(fileOrKey) {
  const key = typeof fileOrKey === "string" ? fileOrKey : fileOrKey?.key;
  bringToFront("appstore");
  appStoreModal.value.visible = true;
  appStoreModal.value.minimized = false;
  setTimeout(() => {
    appStoreRef.value?.openLinksByKey(key);
  }, 60);
}

function isArchive(file) {
  const key = (typeof file === "string" ? file : file?.key || "").toLowerCase();
  if (isSoftware(file)) return false;
  return /\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|pkg|sql\.gz)$/i.test(key);
}

function getFileExt(file) {
  const name = typeof file === "string" ? file : file?.key || "";
  const parts = name.split("/").pop().split(".");
  if (parts.length > 2 && (parts.at(-1) === "gz" || parts.at(-1) === "br")) {
    return `${parts.at(-2)}.${parts.at(-1)}`.slice(0, 7);
  }
  return (parts.pop() || "").slice(0, 5);
}

function getArchiveExt(file) {
  const key = (typeof file === "string" ? file : file?.key || "").toLowerCase();
  if (key.endsWith(".sql.gz")) return "SQL.GZ";
  if (key.endsWith(".tar.gz")) return "TAR.GZ";
  if (key.endsWith(".gz")) return "GZ";
  if (key.endsWith(".zip")) return "ZIP";
  if (key.endsWith(".7z")) return "7Z";
  if (key.endsWith(".rar")) return "RAR";
  if (key.endsWith(".tar")) return "TAR";
  if (key.endsWith(".dmg")) return "DMG";
  return "ZIP";
}

function getFolderIcon(folder) {
  const name = folderName(folder).trim().toLowerCase();
  if (name === "软件" || name === "applications" || name === "apps" || name === "app" || name === "software") return "folder-applications";
  if (name === "照片" || name === "pictures" || name === "photos" || name === "图片" || name === "相册") return "folder-pictures";
  if (name === "视频" || name === "movies" || name === "videos" || name === "影视") return "folder-movies";
  if (name === "音乐" || name === "music" || name === "歌曲") return "folder-music";
  if (name === "文档" || name === "documents" || name === "docs") return "folder-documents";
  if (name === "下载" || name === "downloads") return "folder-downloads";
  return "folder";
}

function handleFinderUpload() {
  if (props.filterCategory === "software" || props.filterCategory === "app") emit("upload", "软件/");
  else if (props.filterCategory === "image") emit("upload", "照片/");
  else if (props.filterCategory === "video") emit("upload", "视频/");
  else if (props.filterCategory === "audio") emit("upload", "音乐/");
  else if (props.filterCategory === "document") emit("upload", "文档/");
  else if (props.filterCategory === "archive") emit("upload", "下载/");
  else emit("upload", props.cwd);
}

// Open File Action (Directly Dispatches to macOS Dedicated Windows and brings them to the very front)
function handleOpenFile(file) {
  if (isSoftware(file)) {
    openAppStoreDetail(file);
    return;
  }
  if (isImage(file)) {
    const list = allImages.value.length ? allImages.value : props.files.filter(isImage);
    const idx = list.findIndex((f) => f.key === file.key);
    bringToFront("photos");
    photosModal.value = {
      visible: true,
      file,
      items: list.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
      index: Math.max(0, idx),
    };
    return;
  }
  if (isVideo(file)) {
    const list = allVideos.value.length ? allVideos.value : props.files.filter(isVideo);
    const idx = list.findIndex((f) => f.key === file.key);
    bringToFront("video");
    videoModal.value = {
      visible: true,
      file,
      items: list.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
      index: Math.max(0, idx),
    };
    return;
  }
  if (isAudio(file)) {
    const list = allAudios.value.length ? allAudios.value : props.files.filter(isAudio);
    const idx = list.findIndex((f) => f.key === file.key);
    bringToFront("music");
    musicModal.value = {
      visible: true,
      file,
      items: list.map((f) => ({ name: fileName(f.key), url: rawPath(f.key), file: f })),
      index: Math.max(0, idx),
    };
    return;
  }
  emit("open-file", file);
}

// Rubberband Selection Box on Desktop
const rubberband = ref({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });

const rubberbandBox = computed(() => {
  if (!rubberband.value.active) return {};
  const left = Math.min(rubberband.value.startX, rubberband.value.currentX);
  const top = Math.min(rubberband.value.startY, rubberband.value.currentY);
  const width = Math.abs(rubberband.value.currentX - rubberband.value.startX);
  const height = Math.abs(rubberband.value.currentY - rubberband.value.startY);
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` };
});

function onDesktopMouseDown(e) {
  if (e.target.closest(".mac-window") || e.target.closest(".dock-container") || e.target.closest(".mac-menubar") || e.target.closest(".desktop-icon-item")) return;
  selectedFileKey.value = "";
  rubberband.value = {
    active: true,
    startX: e.clientX,
    startY: e.clientY,
    currentX: e.clientX,
    currentY: e.clientY,
  };
  window.addEventListener("mousemove", onRubberbandMove);
  window.addEventListener("mouseup", onRubberbandUp);
}

function onRubberbandMove(e) {
  if (!rubberband.value.active) return;
  rubberband.value.currentX = e.clientX;
  rubberband.value.currentY = e.clientY;
}

function onRubberbandUp() {
  rubberband.value.active = false;
  window.removeEventListener("mousemove", onRubberbandMove);
  window.removeEventListener("mouseup", onRubberbandUp);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// Drag and Drop File Upload Directly onto Desktop or Finder
const isDraggingFiles = ref(false);

function onDragEnterDesktop(e) {
  if (e.dataTransfer?.types?.includes("Files")) {
    isDraggingFiles.value = true;
  }
}

function onDragLeaveDesktop(e) {
  if (e.relatedTarget === null || e.clientX === 0 || e.clientY === 0) {
    isDraggingFiles.value = false;
  }
}

function onDropFiles(e) {
  isDraggingFiles.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (!files.length) return;
  emit("drop-files", { files, cwd: props.cwd });
}

// 📱 Mobile Remote Desktop Interaction & Gesture System
const isMobile = ref(window.innerWidth <= 768);
const panMode = ref(false);
const canvasScale = ref(1.0);
const canvasTranslateX = ref(0);
const canvasTranslateY = ref(0);
const isFullscreen = ref(false);

function checkIsMobile() {
  isMobile.value = window.innerWidth <= 768;
}

let desktopTouchTimer = null;
let desktopTouchStart = { x: 0, y: 0 };
let pinchStartDist = 0;
let pinchStartScale = 1.0;
let panStart = { x: 0, y: 0, curX: 0, curY: 0 };

function onDesktopTouchStart(e) {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    desktopTouchStart = { x: t.clientX, y: t.clientY };

    if (panMode.value) {
      panStart = {
        x: t.clientX,
        y: t.clientY,
        curX: canvasTranslateX.value,
        curY: canvasTranslateY.value,
      };
      return;
    }

    // Long-press detection on desktop background (450ms) for Right-Click
    if (!e.target.closest(".mac-window") && !e.target.closest(".dock-container") && !e.target.closest(".mac-menubar") && !e.target.closest(".mobile-assistive-container")) {
      clearTimeout(desktopTouchTimer);
      desktopTouchTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(40);
        contextPos.value = { x: desktopTouchStart.x, y: desktopTouchStart.y };
        showDesktopContext.value = true;
      }, 450);
    }
  } else if (e.touches.length === 2) {
    clearTimeout(desktopTouchTimer);
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    pinchStartScale = canvasScale.value;
    panStart = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
      curX: canvasTranslateX.value,
      curY: canvasTranslateY.value,
    };
  }
}

function onDesktopTouchMove(e) {
  if (e.touches.length === 1) {
    const t = e.touches[0];
    const dx = t.clientX - desktopTouchStart.x;
    const dy = t.clientY - desktopTouchStart.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearTimeout(desktopTouchTimer);
    }

    if (panMode.value) {
      if (e.cancelable) e.preventDefault();
      canvasTranslateX.value = panStart.curX + dx;
      canvasTranslateY.value = panStart.curY + dy;
    }
  } else if (e.touches.length === 2) {
    if (e.cancelable) e.preventDefault();
    clearTimeout(desktopTouchTimer);
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    
    // Pinch to Zoom
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    if (pinchStartDist > 0) {
      const scaleFactor = dist / pinchStartDist;
      canvasScale.value = Math.max(0.6, Math.min(2.4, pinchStartScale * scaleFactor));
    }

    // Two-finger Pan (拉屏幕)
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    canvasTranslateX.value = panStart.curX + (midX - panStart.x);
    canvasTranslateY.value = panStart.curY + (midY - panStart.y);
  }
}

function onDesktopTouchEnd(e) {
  clearTimeout(desktopTouchTimer);
  if (e.touches.length === 0) {
    pinchStartDist = 0;
  }
}

// Finder Item Touch Handlers: Double-Tap to Open & Long-Press for Right-Click
let itemTouchTimer = null;
let itemTouchStartPos = { x: 0, y: 0 };
let lastTapTime = 0;
let lastTapItem = null;

function onTouchStartItem(item, e) {
  if (!e.touches || !e.touches.length) return;
  const t = e.touches[0];
  itemTouchStartPos = { x: t.clientX, y: t.clientY };
  
  clearTimeout(itemTouchTimer);
  itemTouchTimer = setTimeout(() => {
    if (navigator.vibrate) navigator.vibrate(45);
    emit('context', { item, event: { clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} } });
  }, 450);
}

function onTouchMoveItem(e) {
  if (!e.touches || !e.touches.length) return;
  const t = e.touches[0];
  if (Math.hypot(t.clientX - itemTouchStartPos.x, t.clientY - itemTouchStartPos.y) > 10) {
    clearTimeout(itemTouchTimer);
  }
}

function onTouchEndItem(item, isFolder = false) {
  clearTimeout(itemTouchTimer);
  const now = Date.now();
  if (now - lastTapTime < 340 && lastTapItem === item) {
    // Double tap on mobile!
    if (isFolder) {
      emit('navigate', item);
    } else {
      handleOpenFile(item);
    }
    lastTapTime = 0;
    lastTapItem = null;
  } else {
    lastTapTime = now;
    lastTapItem = item;
    selectedFileKey.value = isFolder ? item : item?.key;
  }
}

function resetCanvasView() {
  canvasScale.value = 1.0;
  canvasTranslateX.value = 0;
  canvasTranslateY.value = 0;
  panMode.value = false;
  if (navigator.vibrate) navigator.vibrate(30);
}

function togglePanMode() {
  panMode.value = !panMode.value;
  if (navigator.vibrate) navigator.vibrate(30);
}

function triggerMobileRightClick() {
  contextPos.value = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  showDesktopContext.value = true;
}

function showDesktop() {
  activeAppId.value = "";
  if (navigator.vibrate) navigator.vibrate(30);
}

const desktopCanvasStyle = computed(() => {
  if (canvasScale.value === 1.0 && canvasTranslateX.value === 0 && canvasTranslateY.value === 0) {
    return {};
  }
  return {
    transform: `translate3d(${canvasTranslateX.value}px, ${canvasTranslateY.value}px, 0) scale(${canvasScale.value})`,
    transformOrigin: "center center",
    transition: panMode.value ? "none" : "transform 0.15s ease-out",
  };
});

defineExpose({ handleOpenFile, bringToFront, launchApp, openAppStoreDetail, openAppStoreEditor, openAppStoreLinks });
</script>

<template>
  <div
    class="mac-desktop-environment"
    :style="wallpaperStyle"
    @contextmenu="onDesktopContextMenu"
    @mousedown="onDesktopMouseDown"
    @dragenter.prevent="onDragEnterDesktop"
    @dragover.prevent="onDragEnterDesktop"
    @dragleave="onDragLeaveDesktop"
    @drop.prevent="onDropFiles"
  >
    <!-- macOS AirDrop Style Upload Dropzone Overlay -->
    <div v-if="isDraggingFiles" class="mac-dropzone-overlay">
      <div class="dropzone-card">
        <div class="dropzone-icon">
          <i class="ph ph-cloud-arrow-up-fill"></i>
        </div>
        <h2>松开鼠标开始极速上传</h2>
        <p>文件将直传至当前路径：<strong class="font-mono">{{ cwd ? `/${cwd}` : '根目录' }}</strong></p>
      </div>
    </div>
    <!-- 1. macOS Top Menu Bar -->
    <MacTopBar
      :active-app-name="activeAppId === 'finder' ? '访达' : (activeAppId === 'settings' ? '系统设置' : '天才猫桌面')"
      :theme="theme"
      :storage-id="storageId"
      :storage-options="storageOptions"
      @toggle-theme="emit('toggle-theme')"
      @open-spotlight="showSpotlight = true"
      @toggle-control-center="showControlCenter = !showControlCenter"
      @switch-storage="emit('switch-storage', $event)"
      @switch-mode="emit('switch-mode', $event)"
      @open-settings="bringToFront('settings')"
      @action="$emit('action', $event)"
    />

    <!-- 2. Desktop Primary Canvas Viewport (Supports Pinch Zoom, Pan & Drag Screen) -->
    <div
      class="desktop-canvas-viewport"
      :style="desktopCanvasStyle"
      @touchstart="onDesktopTouchStart"
      @touchmove="onDesktopTouchMove"
      @touchend="onDesktopTouchEnd"
    >
      <!-- 2.1 Desktop Primary Volumes (macOS Top-Right Align) -->
      <div class="desktop-icons-area">
        <!-- R2 Main Disk Volume -->
        <div class="desktop-icon-item" @dblclick="emit('navigate', ''); bringToFront('finder')" @touchstart="onTouchStartItem('', $event)" @touchmove="onTouchMoveItem" @touchend="onTouchEndItem('', true)">
          <MacIcons name="finder" :size="56" />
          <span class="icon-label">天才猫 R2 根目录</span>
        </div>

        <!-- Photos Album -->
        <div class="desktop-icon-item" @dblclick="launchApp('photos')" @touchstart="onTouchStartItem('photos', $event)" @touchmove="onTouchMoveItem" @touchend="launchApp('photos')">
          <MacIcons name="photos" :size="56" />
          <span class="icon-label">我的照片图库</span>
        </div>

        <!-- Video Cinema -->
        <div class="desktop-icon-item" @dblclick="launchApp('cinema')" @touchstart="onTouchStartItem('cinema', $event)" @touchmove="onTouchMoveItem" @touchend="launchApp('cinema')">
          <MacIcons name="cinema" :size="56" />
          <span class="icon-label">影视放映厅</span>
        </div>
      </div>

      <!-- 2.2 Floating macOS Desktop Widgets (Auto-persisted to LocalStorage) -->
      <MacDesktopWidgets
        :active-widgets="desktopWidgets"
        :total-bytes="totalStorageBytes"
        :total-files="files.length + folders.length"
        @remove-widget="removeDesktopWidget"
        @open-app="launchApp"
      />

      <!-- 3. Rubberband Selection Rectangle -->
      <div v-if="rubberband.active" class="rubberband-box" :style="rubberbandBox"></div>

      <!-- 4. Multi-Window Management -->

      <!-- 📁 Window 1: macOS 3-Column Finder (访达) -->
      <MacWindow
        title="访达 (Finder)"
        icon="ph-folder-simple-star-fill"
        :visible="windows.finder.visible"
        :minimized="windows.finder.minimized"
        :z-index="windows.finder.zIndex"
        :is-active="activeAppId === 'finder'"
        :width="920"
        :height="580"
        @focus="bringToFront('finder')"
        @close="closeWindow('finder')"
        @minimize="minimizeWindow('finder')"
      >
        <template #titlebar-right>
          <!-- Segmented View & Action Buttons in Finder Titlebar -->
          <div class="finder-titlebar-tools">
            <div class="finder-segmented-group">
              <button class="seg-btn" :class="{ active: viewMode === 'grid' }" type="button" title="图标视图" @click="emit('update:viewMode', 'grid')">
                <i class="ph ph-squares-four"></i>
              </button>
              <button class="seg-btn" :class="{ active: viewMode === 'list' }" type="button" title="列表视图" @click="emit('update:viewMode', 'list')">
                <i class="ph ph-list-bullets"></i>
              </button>
            </div>

            <button class="finder-action-icon-btn" type="button" title="新建文件夹" @click="emit('create-folder')">
              <i class="ph ph-folder-plus"></i>
            </button>
            <button class="finder-action-icon-btn highlight" type="button" :title="filterCategory !== 'all' ? `极速上传到 ${filterCategory === 'image' ? '照片' : filterCategory === 'video' ? '视频' : filterCategory === 'audio' ? '音乐' : filterCategory === 'document' ? '文档' : '下载'} 文件夹` : '极速上传'" @click="handleFinderUpload">
              <i class="ph ph-cloud-arrow-up"></i>
            </button>
          </div>
        </template>

        <!-- 3-Column Finder Layout -->
        <div class="finder-window-inner">
          <!-- Finder Sidebar -->
          <aside class="finder-sidebar">
            <div class="sidebar-section">
              <span class="section-title">收藏夹</span>
              <button class="sidebar-row" :class="{ active: filterCategory === 'all' && !cwd }" @click="emit('update:filterCategory', 'all'); emit('navigate', '')">
                <i class="ph ph-house-fill"></i>
                <span>全部文件</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'software' }" @click="emit('update:filterCategory', 'software')">
                <i class="ph ph-app-store-logo-fill" style="color: #007aff;"></i>
                <span>软件应用</span>
                <span v-if="categoryCounts.software" class="sidebar-badge">{{ categoryCounts.software }}</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'image' }" @click="emit('update:filterCategory', 'image')">
                <i class="ph ph-image-fill" style="color: #ff2d55;"></i>
                <span>照片图库</span>
                <span v-if="categoryCounts.image" class="sidebar-badge">{{ categoryCounts.image }}</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'video' }" @click="emit('update:filterCategory', 'video')">
                <i class="ph ph-film-strip-fill" style="color: #af52de;"></i>
                <span>高清影视</span>
                <span v-if="categoryCounts.video" class="sidebar-badge">{{ categoryCounts.video }}</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'audio' }" @click="emit('update:filterCategory', 'audio')">
                <i class="ph ph-music-notes-fill" style="color: #34c759;"></i>
                <span>无损音乐</span>
                <span v-if="categoryCounts.audio" class="sidebar-badge">{{ categoryCounts.audio }}</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'document' }" @click="emit('update:filterCategory', 'document')">
                <i class="ph ph-file-text-fill" style="color: #007aff;"></i>
                <span>办公文档</span>
                <span v-if="categoryCounts.document" class="sidebar-badge">{{ categoryCounts.document }}</span>
              </button>
              <button class="sidebar-row" :class="{ active: filterCategory === 'archive' }" @click="emit('update:filterCategory', 'archive')">
                <i class="ph ph-package-fill" style="color: #ff9500;"></i>
                <span>压缩归档</span>
                <span v-if="categoryCounts.archive" class="sidebar-badge">{{ categoryCounts.archive }}</span>
              </button>
            </div>

            <div class="sidebar-section">
              <span class="section-title">位置 (Locations)</span>
              <button
                v-for="s in storageOptions"
                :key="s.id"
                class="sidebar-row"
                :class="{ active: storageId === s.id }"
                @click="emit('switch-storage', s.id)"
              >
                <i class="ph ph-hard-drive-fill"></i> {{ s.label }}
              </button>
            </div>
          </aside>

          <!-- Finder Main Files Pane -->
          <main class="finder-main-pane" @contextmenu.stop.prevent="$emit('context', { item: null, event: $event })">
            <!-- Finder Path Bar -->
            <div class="finder-pathbar">
              <button class="path-btn" @click="emit('update:filterCategory', 'all'); emit('navigate', '')">
                <i class="ph ph-house"></i> 根目录
              </button>
              <template v-if="filterCategory !== 'all'">
                <span class="path-divider">/</span>
                <span class="path-category-pill">
                  <i class="ph" :class="filterCategory === 'image' ? 'ph-image-fill' : filterCategory === 'video' ? 'ph-film-strip-fill' : filterCategory === 'audio' ? 'ph-music-notes-fill' : filterCategory === 'document' ? 'ph-file-text-fill' : 'ph-package-fill'"></i>
                  <span>{{ filterCategory === 'image' ? '照片图库' : filterCategory === 'video' ? '高清影视' : filterCategory === 'audio' ? '无损音乐' : filterCategory === 'document' ? '办公文档' : '压缩归档' }}</span>
                </span>
              </template>
              <template v-else-if="cwd">
                <template v-for="(part, idx) in pathParts" :key="part + idx">
                  <span class="path-divider">/</span>
                  <button class="path-btn" @click="emit('navigate', pathUntil(idx))">{{ part }}</button>
                </template>
              </template>
              <span class="finder-status-count">{{ files.length + folders.length }} 个项目</span>
            </div>

            <!-- Files Grid / List Container (Right click on blank space triggers Finder folder upload/create actions) -->
            <div
              class="finder-content-area"
              :class="[viewMode, { 'waterfall-mode': filterCategory === 'image' && viewMode === 'grid' }]"
              @contextmenu.stop.prevent="$emit('context', { item: null, event: $event })"
            >
              <!-- Empty Root Setup Banner -->
              <div v-if="!cwd && filterCategory === 'all' && folders.length === 0 && files.length === 0" class="mac-empty-setup-card">
                <div class="setup-icon"><i class="ph ph-sparkle-fill"></i></div>
                <h3>欢迎使用天才猫 macOS 空间</h3>
                <p>一键创建 macOS 标准个人目录（照片、视频、音乐、文档、下载），让管理和分类井井有条：</p>
                <button class="setup-btn" type="button" @click="emit('init-system-folders')">
                  <i class="ph ph-folder-simple-plus"></i>
                  <span>一键初始化系统目录</span>
                </button>
              </div>

              <!-- Parent Folder Card -->
              <article v-if="cwd && filterCategory === 'all'" class="finder-file-item folder-item parent-folder" @dblclick="emit('navigate', parentPath)" @touchstart="onTouchStartItem(parentPath, $event)" @touchmove="onTouchMoveItem" @touchend="onTouchEndItem(parentPath, true)">
                <div class="item-icon">
                  <MacIcons name="folder" :size="viewMode === 'grid' ? 56 : 22" />
                </div>
                <span class="item-title">上一级目录</span>
              </article>

              <!-- Folder Items -->
              <article
                v-for="folder in folders"
                :key="folder"
                class="finder-file-item folder-item"
                :class="{ 'is-selected': selectedFileKey === folder }"
                @click="selectedFileKey = folder"
                @dblclick="emit('navigate', folder)"
                @touchstart="onTouchStartItem(folder, $event)"
                @touchmove="onTouchMoveItem"
                @touchend="onTouchEndItem(folder, true)"
                @contextmenu.stop.prevent="$emit('context', { item: folder, event: $event })"
              >
                <div class="item-icon">
                  <MacIcons :name="getFolderIcon(folder)" :size="viewMode === 'grid' ? 56 : 22" />
                </div>
                <span class="item-title" :title="folderName(folder)">{{ folderName(folder) }}</span>
              </article>

              <!-- File Items -->
              <article
                v-for="file in files"
                :key="file.key"
                class="finder-file-item"
                :class="[{ 'is-selected': selectedFileKey === file.key }]"
                @click="selectedFileKey = file.key"
                @dblclick="handleOpenFile(file)"
                @touchstart="onTouchStartItem(file, $event)"
                @touchmove="onTouchMoveItem"
                @touchend="onTouchEndItem(file, false)"
                @contextmenu.stop.prevent="$emit('context', { item: file, event: $event })"
              >
                <!-- 1. Real Image Thumbnail -->
                <div v-if="isImage(file)" class="item-thumbnail">
                  <img :src="imageUrl(file)" loading="lazy" :alt="fileName(file.key)" />
                </div>

                <!-- 2. Software Package Icon (.dmg, .pkg, .exe, .apk, .ipa) -->
                <div v-else-if="isSoftware(file)" class="item-icon">
                  <MacIcons name="apps" :size="viewMode === 'grid' ? 52 : 22" :extension="getFileExt(file)" />
                </div>

                <!-- 2.1 Archive File Icon (.sql.gz, .zip, .tar, etc.) -->
                <div v-else-if="isArchive(file)" class="item-icon">
                  <MacIcons name="zip" :size="viewMode === 'grid' ? 52 : 22" :extension="getArchiveExt(file)" />
                </div>

                <!-- 3. Video File Icon -->
                <div v-else-if="isVideo(file)" class="item-icon">
                  <MacIcons name="video" :size="viewMode === 'grid' ? 52 : 22" :extension="getFileExt(file)" />
                </div>

                <!-- 4. Audio File Icon -->
                <div v-else-if="isAudio(file)" class="item-icon">
                  <MacIcons name="audio" :size="viewMode === 'grid' ? 52 : 22" :extension="getFileExt(file)" />
                </div>

                <!-- 5. Document / Code / SQL / Other File Icon -->
                <div v-else class="item-icon">
                  <MacIcons name="doc" :size="viewMode === 'grid' ? 52 : 22" :extension="getFileExt(file)" />
                </div>

                <span class="item-title" :title="file.key">{{ displayFileName(file.key, viewMode === 'grid') }}</span>
                <span v-if="isSoftware(file)" class="item-platform-badge">{{ getSoftwarePlatformPill(file) }}</span>
                <span v-if="viewMode === 'list'" class="item-size">{{ formatSize(file.size) }}</span>
                <span v-if="viewMode === 'list'" class="item-date">{{ formatDate(file.uploaded) }}</span>
              </article>
            </div>

            <!-- 🧭 Finder macOS Bottom Path & Item Counter Bar -->
            <footer class="finder-path-statusbar">
              <div class="path-breadcrumbs">
                <span class="crumb-item" @click="emit('navigate', '')">
                  <i class="ph ph-hard-drive"></i>
                  <span>天才猫 R2</span>
                </span>
                <template v-for="(part, idx) in pathParts" :key="idx">
                  <span class="crumb-sep">›</span>
                  <span class="crumb-item" @click="emit('navigate', pathUntil(idx))">
                    <i class="ph ph-folder"></i>
                    <span>{{ part }}</span>
                  </span>
                </template>
              </div>
              <div class="statusbar-info">
                <span v-if="selectedFileKey">已选中 1 项</span>
                <span v-else>共 {{ files.length + folders.length }} 个项目</span>
              </div>
            </footer>
          </main>
        </div>
      </MacWindow>

      <!-- 🎬 Window 2: macOS QuickTime Video Studio Modal -->
      <MacVideoPlayerModal
        :visible="videoModal.visible"
        :minimized="videoModal.minimized"
        :file="videoModal.file"
        :items="videoModal.items"
        :index="videoModal.index"
        :storage-id="storageId"
        :z-index="windowZ.video"
        :is-active="activeAppId === 'video'"
        @focus="bringToFront('video')"
        @close="videoModal.visible = false"
        @minimize="videoModal.minimized = true"
        @change="videoModal.index = $event"
        @upload="emit('upload', '视频/')"
      />

      <!-- 🎵 Window 3: macOS Apple Music Vinyl Turntable Modal -->
      <MacMusicPlayerModal
        :visible="musicModal.visible"
        :minimized="musicModal.minimized"
        :file="musicModal.file"
        :items="musicModal.items"
        :index="musicModal.index"
        :storage-id="storageId"
        :z-index="windowZ.music"
        :is-active="activeAppId === 'music'"
        @focus="bringToFront('music')"
        @close="musicModal.visible = false"
        @minimize="musicModal.minimized = true"
        @change="musicModal.index = $event"
        @upload="emit('upload', '音乐/')"
      />

      <!-- 🖼️ Window 4: macOS Photos Pro Viewer Modal -->
      <MacPhotosModal
        :visible="photosModal.visible"
        :minimized="photosModal.minimized"
        :file="photosModal.file"
        :items="photosModal.items"
        :index="photosModal.index"
        :storage-id="storageId"
        :z-index="windowZ.photos"
        :is-active="activeAppId === 'photos'"
        @focus="bringToFront('photos')"
        @close="photosModal.visible = false"
        @minimize="photosModal.minimized = true"
        @change="photosModal.index = $event"
        @set-wallpaper="setAsWallpaper"
        @upload="emit('upload', '照片/')"
      />

      <!-- 🔢 Window 5: macOS Calculator Modal -->
      <MacCalculatorModal
        :visible="calculatorModal.visible"
        :minimized="calculatorModal.minimized"
        :z-index="windowZ.calculator"
        :is-active="activeAppId === 'calculator'"
        @focus="bringToFront('calculator')"
        @close="calculatorModal.visible = false"
        @minimize="calculatorModal.minimized = true"
      />

      <!-- 📝 Window 6: macOS Notes Modal -->
      <MacNotesModal
        :visible="notesModal.visible"
        :minimized="notesModal.minimized"
        :z-index="windowZ.notes"
        :is-active="activeAppId === 'notes'"
        @focus="bringToFront('notes')"
        @close="notesModal.visible = false"
        @minimize="notesModal.minimized = true"
      />

      <!-- 🛍️ Window 7: macOS App Store & Software Hub Modal -->
      <MacAppStoreModal
        ref="appStoreRef"
        :visible="appStoreModal.visible"
        :minimized="appStoreModal.minimized"
        :files="files"
        :all-files="allFiles"
        :metadata="appsMetadata"
        :storage-id="storageId"
        :z-index="windowZ.appstore"
        :is-active="activeAppId === 'appstore'"
        :auth-credentials="authCredentials"
        @focus="bringToFront('appstore')"
        @close="appStoreModal.visible = false"
        @minimize="appStoreModal.minimized = true"
        @save-metadata="emit('save-apps-metadata', $event)"
        @upload="emit('upload', '软件/')"
        @upload-to-folder="emit('upload-to-folder', $event)"
        @refresh="emit('refresh')"
      />

      <!-- ⚙️ Window 4: macOS System Settings -->
      <MacWindow
        title="系统偏好设置 (System Settings)"
        icon="ph-gear-six-fill"
        :visible="windows.settings.visible"
        :minimized="windows.settings.minimized"
        :z-index="windows.settings.zIndex"
        :is-active="activeAppId === 'settings'"
        :width="760"
        :height="500"
        :initial-x="180"
        :initial-y="90"
        @focus="bringToFront('settings')"
        @close="closeWindow('settings')"
        @minimize="minimizeWindow('settings')"
      >
        <MacSettingsModal
          :visible="windows.settings.visible"
          :theme="theme"
          :storage-id="storageId"
          :storage-options="storageOptions"
          :current-wallpaper="currentWallpaper"
          :wallpapers="wallpapers"
          :auth-credentials="authCredentials"
          @toggle-theme="emit('toggle-theme')"
          @switch-storage="emit('switch-storage', $event)"
          @change-wallpaper="changeWallpaper"
          @login="emit('login', $event)"
          @logout="emit('logout')"
        />
      </MacWindow>
    </div>

    <!-- 5. macOS Control Center Dropdown -->
    <MacControlCenter
      :visible="showControlCenter"
      :theme="theme"
      :storage-id="storageId"
      :total-files="files.length + folders.length"
      :total-bytes="totalStorageBytes"
      :current-wallpaper="currentWallpaper"
      :custom-wallpaper="customWallpaper"
      :wallpapers="wallpapers"
      @close="showControlCenter = false"
      @toggle-theme="emit('toggle-theme')"
      @change-wallpaper="changeWallpaper"
      @reset-wallpaper="resetWallpaper"
      @toggle-fullscreen="toggleFullscreen"
      @open-settings="bringToFront('settings')"
      @reload="emit('refresh')"
    />

    <!-- 6. Spotlight Search Overlay (⌘K) -->
    <MacSpotlight
      :visible="showSpotlight"
      :files="files"
      :folders="folders"
      @close="showSpotlight = false"
      @select-file="handleOpenFile($event)"
      @select-folder="emit('navigate', $event); bringToFront('finder')"
      @launch-app="launchApp"
    />

    <!-- 7. Desktop Context Menu -->
    <ContextMenu
      :visible="showDesktopContext"
      :x="contextPos.x"
      :y="contextPos.y"
      title="macOS 桌面"
      :actions="desktopContextActions"
      @close="showDesktopContext = false"
      @select="handleDesktopContextSelect"
    />

    <!-- 7.1 Desktop Widget Gallery Modal -->
    <MacWidgetPickerModal
      :visible="showWidgetPicker"
      :active-widgets="desktopWidgets"
      @close="showWidgetPicker = false"
      @toggle-widget="toggleDesktopWidget"
    />

    <!-- 8. macOS Dock Bar -->
    <MacDock
      :open-apps="openApps"
      :active-app-id="activeAppId"
      @launch="launchApp"
    />

    <!-- 9. Mobile Remote Desktop AssistiveTouch Floating Controller -->
    <MacMobileAssistiveTouch
      v-if="isMobile"
      :pan-mode="panMode"
      :scale="canvasScale"
      :is-fullscreen="isFullscreen"
      @toggle-pan="togglePanMode"
      @reset-view="resetCanvasView"
      @open-finder="bringToFront('finder')"
      @open-spotlight="showSpotlight = true"
      @open-control-center="showControlCenter = !showControlCenter"
      @show-desktop="showDesktop"
      @trigger-right-click="triggerMobileRightClick"
      @toggle-fullscreen="toggleFullscreen"
    />
  </div>
</template>

<style scoped>
.mac-desktop-environment {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  background-size: cover;
  background-position: center;
  transition: background 0.4s ease;
}

.desktop-canvas-viewport {
  position: absolute;
  inset: 0;
  width: 100vw;
  height: 100vh;
  touch-action: pan-x pan-y pinch-zoom;
  overflow: visible;
}

/* Desktop Icons Grid (macOS Top-Right Volume Column) */
.desktop-icons-area {
  position: absolute;
  top: 46px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 5;
}

.desktop-icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 92px;
  padding: 8px 4px;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.16s ease;
  border: 1px solid transparent;
}

.desktop-icon-item:hover {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(14px);
}

.icon-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 2px 10px rgba(0, 0, 0, 0.85);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.25;
  margin-top: 6px;
}

/* Rubberband Box */
.rubberband-box {
  position: absolute;
  z-index: 8;
  border: 1px solid rgba(10, 132, 255, 0.8);
  background: rgba(10, 132, 255, 0.2);
  pointer-events: none;
}

/* Finder 3-Column Inner Layout */
.finder-window-inner {
  display: flex;
  height: 100%;
  width: 100%;
}

.finder-sidebar {
  width: 200px;
  background: rgba(0, 0, 0, 0.18);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

[data-theme="light"] .finder-sidebar {
  background: rgba(0, 0, 0, 0.035);
  border-right-color: rgba(60, 60, 67, 0.08);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #8e8e93;
  padding: 4px 8px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.sidebar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s ease;
  text-align: left;
}

.sidebar-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-row.active {
  background: #0a84ff;
  color: #ffffff;
}

.sidebar-row i {
  font-size: 16px;
  color: #0a84ff;
  flex-shrink: 0;
}

.sidebar-row span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #8e8e93;
}

.sidebar-row.active .sidebar-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.sidebar-row.active i {
  color: #ffffff !important;
}

/* Category Guide Bar in Finder */
.finder-category-guide-bar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(10, 132, 255, 0.12);
  border: 1px solid rgba(10, 132, 255, 0.25);
  color: #0a84ff;
  font-size: 12px;
  margin-bottom: 6px;
}

[data-theme="light"] .finder-category-guide-bar {
  background: rgba(0, 122, 255, 0.08);
  border-color: rgba(0, 122, 255, 0.2);
  color: #007aff;
}

.finder-category-guide-bar strong {
  color: #ffffff;
  background: rgba(10, 132, 255, 0.85);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11.5px;
}

[data-theme="light"] .finder-category-guide-bar strong {
  color: #ffffff;
  background: #007aff;
}

/* Empty Setup Card in Finder */
.mac-empty-setup-card {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
  margin: 20px auto;
  max-width: 480px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.setup-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  display: grid;
  place-items: center;
  font-size: 26px;
  color: #ffffff;
  margin-bottom: 14px;
  box-shadow: 0 8px 20px rgba(10, 132, 255, 0.35);
}

.mac-empty-setup-card h3 {
  font-size: 16px;
  font-weight: 650;
  margin: 0 0 6px;
}

.mac-empty-setup-card p {
  font-size: 12.5px;
  color: #8e8e93;
  margin: 0 0 18px;
  line-height: 1.5;
}

.setup-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: #0a84ff;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(10, 132, 255, 0.4);
  transition: all 0.16s ease;
}

.setup-btn:hover {
  background: #0071e3;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(10, 132, 255, 0.5);
}

/* Main Pane */
.finder-main-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: transparent;
}

.finder-pathbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 12px;
  color: #8e8e93;
}

[data-theme="light"] .finder-pathbar {
  border-bottom-color: rgba(60, 60, 67, 0.08);
}

.path-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.path-btn:hover {
  color: #0a84ff;
  background: rgba(255, 255, 255, 0.08);
}

.path-divider {
  opacity: 0.5;
}

.finder-status-count {
  margin-left: auto;
  font-size: 11px;
}

/* Content Area */
.finder-content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  grid-auto-rows: 112px;
  gap: 14px;
}

.finder-content-area.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.finder-file-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.finder-file-item:hover {
  background: rgba(10, 132, 255, 0.15);
  border-color: rgba(10, 132, 255, 0.3);
}

.finder-file-item.is-selected {
  background: rgba(10, 132, 255, 0.85);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(10, 132, 255, 0.4);
}

.finder-content-area.list .finder-file-item {
  flex-direction: row;
  height: 34px;
  padding: 0 12px;
  gap: 12px;
  text-align: left;
}

.item-icon {
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.finder-content-area.list .item-icon {
  margin-bottom: 0;
}

.item-thumbnail {
  width: 58px;
  height: 58px;
  border-radius: 9px;
  overflow: hidden;
  margin-bottom: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.42), 0 1px 3px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.finder-file-item:hover .item-thumbnail {
  transform: scale(1.04);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
}

.path-category-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #0a84ff;
  background: rgba(10, 132, 255, 0.14);
  padding: 2px 8px;
  border-radius: 6px;
}

[data-theme="light"] .path-category-pill {
  color: #007aff;
  background: rgba(0, 122, 255, 0.1);
}

.item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.finder-content-area.list .item-thumbnail {
  width: 24px;
  height: 24px;
  margin-bottom: 0;
}

.item-title {
  font-size: 11.5px;
  font-weight: 500;
  color: inherit;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.25;
}

.finder-content-area.list .item-title {
  flex: 1;
  white-space: nowrap;
}

.item-size, .item-date {
  font-size: 11px;
  color: #8e8e93;
  font-family: monospace;
}

.item-platform-badge {
  display: inline-block;
  padding: 1px 5px;
  margin-top: 3px;
  border-radius: 4px;
  background: rgba(0, 122, 255, 0.14);
  color: #0a84ff;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.finder-file-item.is-selected .item-platform-badge {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
}

.finder-file-item.is-selected .item-size,
.finder-file-item.is-selected .item-date {
  color: rgba(255, 255, 255, 0.85);
}

/* Finder macOS Bottom Path & Statusbar */
.finder-path-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 26px;
  padding: 0 14px;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: #8e8e93;
  user-select: none;
}

[data-theme="light"] .finder-path-statusbar {
  background: rgba(0, 0, 0, 0.03);
  border-top-color: rgba(60, 60, 67, 0.08);
  color: #636366;
}

.path-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.crumb-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 4px;
  transition: all 0.12s ease;
}

.crumb-item:hover {
  color: #0a84ff;
  background: rgba(255, 255, 255, 0.08);
}

.crumb-sep {
  opacity: 0.4;
  font-weight: 700;
}

.statusbar-info {
  font-size: 11px;
  opacity: 0.85;
}

/* Finder Titlebar Segmented & Action Controls */
.finder-titlebar-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.finder-segmented-group {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

[data-theme="light"] .finder-segmented-group {
  background: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.1);
}

.seg-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 22px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: #a1a1a6;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  color: #ffffff;
}

[data-theme="light"] .seg-btn:hover {
  color: #1d1d1f;
}

.seg-btn.active {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

[data-theme="light"] .seg-btn.active {
  background: #ffffff;
  color: #1d1d1f;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.finder-action-icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: #e5e5ea;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.finder-action-icon-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

[data-theme="light"] .finder-action-icon-btn {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
  color: #1d1d1f;
}

[data-theme="light"] .finder-action-icon-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.finder-action-icon-btn.highlight {
  background: #0a84ff;
  border-color: #0a84ff;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.4);
}

.finder-action-icon-btn.highlight:hover {
  background: #0071e3;
}

/* AirDrop Style Fullscreen Dropzone */
.mac-dropzone-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  background: rgba(10, 132, 255, 0.25);
  backdrop-filter: blur(20px);
  border: 4px dashed #0a84ff;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: dropzone-fade 0.2s ease-out;
}

.dropzone-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 48px;
  border-radius: 24px;
  background: rgba(20, 21, 28, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  color: #ffffff;
  text-align: center;
}

.dropzone-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #0a84ff;
  display: grid;
  place-items: center;
  font-size: 38px;
  color: #ffffff;
  margin-bottom: 16px;
  box-shadow: 0 10px 25px rgba(10, 132, 255, 0.5);
  animation: pulse-icon 1.2s infinite alternate ease-in-out;
}

@keyframes pulse-icon {
  from { transform: scale(0.95); }
  to { transform: scale(1.08); }
}

@keyframes dropzone-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dropzone-card h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
}

.dropzone-card p {
  font-size: 13px;
  color: #a1a1a6;
  margin: 0;
}

/* =============================================== */
/* ========== Mobile Responsive (≤768px) ========= */
/* =============================================== */
@media (max-width: 768px) {
  .mac-desktop-environment {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Hide desktop icons on mobile — Dock is primary nav */
  .desktop-icons-area {
    display: none;
  }

  /* Rubberband selection not needed on mobile */
  .rubberband-box {
    display: none !important;
  }

  /* Finder Sidebar: collapse to horizontal tab bar on mobile */
  .finder-window-inner {
    flex-direction: column;
  }

  .finder-sidebar {
    width: 100% !important;
    flex-direction: row;
    gap: 4px;
    padding: 6px 8px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    border-right: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .finder-sidebar .sidebar-section {
    flex-direction: row;
    gap: 4px;
    flex-shrink: 0;
  }

  .finder-sidebar .section-title {
    display: none;
  }

  .finder-sidebar .sidebar-row {
    height: 28px;
    padding: 0 10px;
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 11.5px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .finder-sidebar .sidebar-row.active {
    background: #0a84ff;
    border-color: #0a84ff;
  }

  /* Pathbar compact */
  .finder-pathbar {
    padding: 6px 10px;
    font-size: 11px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Content area: smaller grid, touch scroll */
  .finder-content-area {
    padding: 10px 10px;
    grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
    grid-auto-rows: 96px;
    gap: 8px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }

  .finder-file-item {
    padding: 6px 4px;
  }

  .item-thumbnail {
    width: 44px;
    height: 44px;
  }

  .item-title {
    font-size: 10.5px;
  }

  /* Bottom status bar */
  .finder-path-statusbar {
    height: 24px;
    font-size: 10px;
    padding: 0 8px;
  }

  .path-breadcrumbs {
    overflow-x: auto;
    flex-shrink: 1;
    min-width: 0;
  }

  /* Titlebar tools compact */
  .finder-titlebar-tools {
    gap: 4px;
  }

  .finder-action-icon-btn {
    width: 26px;
    height: 24px;
    font-size: 13px;
  }

  .finder-segmented-group {
    display: none;
  }

  /* Dropzone compact */
  .dropzone-card {
    padding: 24px 20px;
  }
  .dropzone-card h2 {
    font-size: 17px;
  }
  .dropzone-icon {
    width: 54px;
    height: 54px;
    font-size: 28px;
  }
}
</style>

