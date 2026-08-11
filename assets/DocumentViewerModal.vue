<script setup>
import { ref, computed, watch, onMounted } from "vue";

const props = defineProps({
  visible: Boolean,
  file: Object,
  storageId: { type: String, default: "default" },
});

const emit = defineEmits(["close"]);

const isFullscreen = ref(false);
const zoomLevel = ref(100);
const officeEngine = ref("microsoft"); // 'microsoft' | 'google'
const loadingIframe = ref(true);

const fileName = computed(() => {
  if (!props.file || !props.file.key) return "未命名文档";
  return props.file.key.split("/").filter(Boolean).pop() || "未命名文档";
});

const fileExt = computed(() => {
  const parts = fileName.value.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "doc";
});

const isPdf = computed(() => fileExt.value === "pdf");
const isWord = computed(() => ["doc", "docx"].includes(fileExt.value));
const isExcel = computed(() => ["xls", "xlsx", "csv"].includes(fileExt.value));
const isPpt = computed(() => ["ppt", "pptx"].includes(fileExt.value));
const isOffice = computed(() => isWord.value || isExcel.value || isPpt.value);

const directUrl = computed(() => {
  if (!props.file || !props.file.key) return "";
  const path = `/raw/${props.file.key}`;
  const full = props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
  try {
    return new URL(full, window.location.origin).href;
  } catch {
    return full;
  }
});

const officeViewerUrl = computed(() => {
  if (!directUrl.value) return "";
  if (officeEngine.value === "google") {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl.value)}&embedded=true`;
  }
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl.value)}`;
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadingIframe.value = true;
    zoomLevel.value = 100;
  }
});

function onIframeLoad() {
  loadingIframe.value = false;
}

function printDocument() {
  if (isPdf.value) {
    const iframe = document.getElementById("pdf-frame");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
      return;
    }
  }
  window.open(directUrl.value, "_blank");
}

onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (props.visible && e.key === "Escape") {
      emit("close");
    }
  });
});
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="doc-mask" @click.self="emit('close')">
      <div class="doc-window" :class="{ fullscreen: isFullscreen }">
        <!-- Top Toolbar -->
        <header class="doc-header">
          <div class="doc-title-group">
            <div class="doc-icon-badge" :class="isPdf ? 'pdf' : (isExcel ? 'excel' : (isPpt ? 'ppt' : 'word'))">
              <i class="ph" :class="isPdf ? 'ph-file-pdf' : (isExcel ? 'ph-file-xls' : (isPpt ? 'ph-file-ppt' : 'ph-file-doc'))"></i>
            </div>
            <div class="doc-meta">
              <strong :title="fileName">{{ fileName }}</strong>
              <span>{{ isPdf ? 'PDF 矢量高清文档' : (isExcel ? 'Excel 表格文档' : (isPpt ? 'PowerPoint 演示文稿' : 'Word 办公文档')) }}</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="doc-controls">
            <!-- Office Engine Switcher -->
            <div v-if="isOffice" class="engine-switcher">
              <button type="button" :class="{ active: officeEngine === 'microsoft' }" @click="officeEngine = 'microsoft'; loadingIframe = true">微软预览</button>
              <button type="button" :class="{ active: officeEngine === 'google' }" @click="officeEngine = 'google'; loadingIframe = true">谷歌预览</button>
            </div>

            <!-- PDF Zoom controls -->
            <div v-if="isPdf" class="zoom-pill">
              <button class="icon-tool" type="button" title="缩小" @click="zoomLevel = Math.max(50, zoomLevel - 15)"><i class="ph ph-minus"></i></button>
              <span class="zoom-label">{{ zoomLevel }}%</span>
              <button class="icon-tool" type="button" title="放大" @click="zoomLevel = Math.min(200, zoomLevel + 15)"><i class="ph ph-plus"></i></button>
            </div>

            <!-- Action buttons -->
            <button v-if="isPdf" class="btn-tool" type="button" title="打印文档" @click="printDocument">
              <i class="ph ph-printer"></i> 打印
            </button>
            <a class="btn-tool primary" :href="directUrl" :download="fileName" target="_blank">
              <i class="ph ph-download-simple"></i> 下载
            </a>
            <button class="icon-tool" type="button" :title="isFullscreen ? '退出全屏' : '全屏阅读'" @click="isFullscreen = !isFullscreen">
              <i class="ph" :class="isFullscreen ? 'ph-corners-in' : 'ph-corners-out'"></i>
            </button>
            <button class="close-btn" type="button" aria-label="关闭" @click="emit('close')">×</button>
          </div>
        </header>

        <!-- Document Viewer Container -->
        <main class="doc-content">
          <!-- Loading overlay for iframe -->
          <div v-if="loadingIframe && isOffice" class="doc-loading">
            <i class="ph ph-spinner-gap animate-spin"></i>
            <p>正在通过云端引擎解析文档...</p>
          </div>

          <!-- Native PDF Viewer Frame -->
          <div v-if="isPdf" class="pdf-viewer-wrap">
            <iframe
              id="pdf-frame"
              :src="`${directUrl}#zoom=${zoomLevel}`"
              class="doc-iframe"
              title="PDF 文档预览"
            ></iframe>
          </div>

          <!-- Office Online Viewer Frame -->
          <div v-else-if="isOffice" class="office-viewer-wrap">
            <iframe
              :src="officeViewerUrl"
              class="doc-iframe"
              title="Office 文档预览"
              @load="onIframeLoad"
            ></iframe>
          </div>

          <!-- Fallback Document Frame -->
          <div v-else class="fallback-viewer-wrap">
            <iframe :src="directUrl" class="doc-iframe" title="文档预览"></iframe>
          </div>
        </main>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.doc-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 12, 18, 0.65);
  backdrop-filter: blur(20px) saturate(160%);
  animation: fade-in 0.2s ease-out;
}

.doc-window {
  display: flex;
  flex-direction: column;
  width: min(1200px, 100%);
  height: min(88vh, 900px);
  overflow: hidden;
  border-radius: 20px;
  background: #181920;
  color: #f2f2f7;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.doc-window.fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  border: none;
}

/* Header */
.doc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(25, 26, 34, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 16px;
}

.doc-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.doc-icon-badge {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 20px;
  background: rgba(10, 132, 255, 0.18);
  color: #0a84ff;
}

.doc-icon-badge.pdf { background: rgba(255, 69, 58, 0.18); color: #ff453a; }
.doc-icon-badge.word { background: rgba(10, 132, 255, 0.18); color: #0a84ff; }
.doc-icon-badge.excel { background: rgba(50, 215, 75, 0.18); color: #32d74b; }
.doc-icon-badge.ppt { background: rgba(255, 159, 10, 0.18); color: #ff9f0a; }

.doc-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.doc-meta strong {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta span {
  font-size: 11.5px;
  color: #8e8e93;
}

/* Controls */
.doc-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.engine-switcher {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.engine-switcher button {
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: #8e8e93;
  background: transparent;
  cursor: pointer;
  transition: all 0.16s ease;
}

.engine-switcher button.active {
  background: #0a84ff;
  color: #ffffff;
}

.zoom-pill {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 2px;
}

.icon-tool {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #a1a1a6;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-tool:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.zoom-label {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  padding: 0 6px;
  color: #8e8e93;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #d1d1d6;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.16s ease;
  text-decoration: none;
}

.btn-tool:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.btn-tool.primary {
  background: #0a84ff;
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.btn-tool.primary:hover {
  background: #0071e3;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #8e8e93;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.close-btn:hover {
  background: rgba(255, 69, 58, 0.2);
  color: #ff453a;
}

/* Content Area */
.doc-content {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #20212b;
}

.pdf-viewer-wrap, .office-viewer-wrap, .fallback-viewer-wrap {
  width: 100%;
  height: 100%;
}

.doc-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #ffffff;
}

.doc-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  gap: 12px;
  background: #181920;
  color: #8e8e93;
  font-size: 13.5px;
  text-align: center;
}

.doc-loading i {
  font-size: 32px;
  color: #0a84ff;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .doc-mask { padding: 0; }
  .doc-window { width: 100vw; height: 100vh; border-radius: 0; }
  .engine-switcher { display: none; }
  .zoom-pill { display: none; }
}
</style>
