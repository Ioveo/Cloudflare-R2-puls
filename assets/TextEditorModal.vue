<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
  file: Object,
  storageHeaders: { type: Function, default: () => ({}) },
});

const emit = defineEmits(["close", "saved"]);

const content = ref("");
const originalContent = ref("");
const loading = ref(false);
const saving = ref(false);
const isSplitPreview = ref(false);
const isFullscreen = ref(false);
const fontSize = ref(13.5);
const saveSuccess = ref(false);
const errorMessage = ref("");
const textareaRef = ref(null);

const fileName = computed(() => {
  if (!props.file || !props.file.key) return "未命名文本";
  return props.file.key.split("/").filter(Boolean).pop() || "未命名文本";
});

const fileExt = computed(() => {
  const name = fileName.value.toLowerCase();
  const ext = name.split(".").pop();
  return ext || "txt";
});

const isMarkdown = computed(() => ["md", "markdown"].includes(fileExt.value));
const isJson = computed(() => fileExt.value === "json");
const isCode = computed(() => ["js", "ts", "css", "html", "vue", "py", "sh", "yaml", "yml", "sql", "json"].includes(fileExt.value));

const hasUnsavedChanges = computed(() => content.value !== originalContent.value);

const linesCount = computed(() => {
  if (!content.value) return 1;
  return content.value.split("\n").length;
});

const charCount = computed(() => content.value.length);
const wordCount = computed(() => {
  if (!content.value.trim()) return 0;
  return content.value.trim().split(/\s+/).length;
});

// Simple Markdown parser
const markdownHtml = computed(() => {
  if (!isMarkdown.value || !content.value) return "";
  let md = content.value;
  // Escape html
  md = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Headers
  md = md.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  md = md.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  md = md.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  // Bold & Italic
  md = md.replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>");
  md = md.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  md = md.replace(/\*(.*?)\*/gim, "<em>$1</em>");
  // Inline code
  md = md.replace(/`([^`]+)`/gim, "<code>$1</code>");
  // Blockquotes
  md = md.replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>");
  // Links
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Lists
  md = md.replace(/^\- (.*$)/gim, "<li>$1</li>");
  md = md.replace(/^\* (.*$)/gim, "<li>$1</li>");
  // Line breaks
  md = md.replace(/\n\n/gim, "<br/><br/>");
  return md;
});

watch(() => props.visible, async (newVal) => {
  if (newVal && props.file) {
    await fetchFileContent();
  } else {
    content.value = "";
    originalContent.value = "";
    errorMessage.value = "";
    saveSuccess.value = false;
  }
});

async function fetchFileContent() {
  if (!props.file || !props.file.key) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    const rawUrl = `/raw/${props.file.key}`;
    const res = await fetch(rawUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}: 无法读取文件内容`);
    const text = await res.text();
    content.value = text;
    originalContent.value = text;
    if (isMarkdown.value) isSplitPreview.value = true;
    nextTick(() => textareaRef.value?.focus());
  } catch (err) {
    errorMessage.value = `读取失败: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

async function saveContent() {
  if (!props.file || !props.file.key || saving.value) return;
  saving.value = true;
  errorMessage.value = "";
  saveSuccess.value = false;
  try {
    const url = `/api/write/items/${props.file.key}`;
    const contentType = isMarkdown.value ? "text/markdown; charset=utf-8" : isJson.value ? "application/json; charset=utf-8" : "text/plain; charset=utf-8";
    const headers = {
      ...props.storageHeaders(),
      "Content-Type": contentType,
    };
    const res = await axios.put(url, content.value, { headers });
    if (res.status >= 200 && res.status < 300) {
      originalContent.value = content.value;
      saveSuccess.value = true;
      emit("saved", props.file);
      setTimeout(() => {
        saveSuccess.value = false;
      }, 2500);
    } else {
      throw new Error(`保存返回状态: ${res.status}`);
    }
  } catch (err) {
    errorMessage.value = `保存失败: ${err.response?.data?.message || err.message || "无权限或网络错误"}`;
  } finally {
    saving.value = false;
  }
}

function handleKeydown(e) {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveContent();
  }
  // Tab key indent
  if (e.key === "Tab" && textareaRef.value) {
    e.preventDefault();
    const textarea = textareaRef.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    content.value = content.value.substring(0, start) + "  " + content.value.substring(end);
    nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    });
  }
}

function handleClose() {
  if (hasUnsavedChanges.value) {
    if (!confirm("当前文件有未保存的修改，确定要关闭吗？")) return;
  }
  emit("close");
}

function formatJson() {
  try {
    const parsed = JSON.parse(content.value);
    content.value = JSON.stringify(parsed, null, 2);
  } catch (err) {
    errorMessage.value = `JSON 格式错误: ${err.message}`;
    setTimeout(() => { errorMessage.value = ""; }, 3000);
  }
}

onMounted(() => {
  window.addEventListener("keydown", (e) => {
    if (props.visible && e.key === "Escape" && !hasUnsavedChanges.value) {
      emit("close");
    }
  });
});
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="editor-mask" @click.self="handleClose">
      <div class="editor-window" :class="{ fullscreen: isFullscreen }">
        <!-- Window Top Bar -->
        <header class="editor-header">
          <div class="editor-title-group">
            <div class="file-icon-badge" :class="isMarkdown ? 'md' : (isCode ? 'code' : 'txt')">
              <i class="ph" :class="isMarkdown ? 'ph-file-md' : (isJson ? 'ph-file-code' : (isCode ? 'ph-code' : 'ph-file-text'))"></i>
            </div>
            <div class="file-meta">
              <div class="title-row">
                <strong :title="fileName">{{ fileName }}</strong>
                <span v-if="hasUnsavedChanges" class="dirty-badge" title="有未保存的修改">● 已修改</span>
                <span v-else-if="saveSuccess" class="saved-badge"><i class="ph ph-check"></i> 已保存</span>
              </div>
              <span class="file-path-sub">{{ file?.key }}</span>
            </div>
          </div>

          <!-- Header Action Buttons -->
          <div class="header-actions">
            <button v-if="isJson" class="tool-btn" type="button" title="格式化 JSON" @click="formatJson">
              <i class="ph ph-brackets-curly"></i> 格式化
            </button>
            <button v-if="isMarkdown" class="tool-btn" :class="{ active: isSplitPreview }" type="button" title="双栏实时预览" @click="isSplitPreview = !isSplitPreview">
              <i class="ph ph-columns"></i> 实时预览
            </button>
            <div class="font-size-group">
              <button class="icon-tool-btn" type="button" title="缩小字体" @click="fontSize = Math.max(11, fontSize - 1)"><i class="ph ph-minus"></i></button>
              <span class="font-indicator">{{ fontSize }}px</span>
              <button class="icon-tool-btn" type="button" title="放大字体" @click="fontSize = Math.min(22, fontSize + 1)"><i class="ph ph-plus"></i></button>
            </div>
            <button class="tool-btn save-btn" :disabled="saving || !hasUnsavedChanges" type="button" @click="saveContent">
              <i class="ph" :class="saving ? 'ph-spinner animate-spin' : (saveSuccess ? 'ph-check-bold' : 'ph-floppy-disk-bold')"></i>
              <span>{{ saving ? '保存中...' : (saveSuccess ? '已保存' : '保存 (Ctrl+S)') }}</span>
            </button>
            <button class="icon-tool-btn" type="button" :title="isFullscreen ? '退出全屏' : '全屏模式'" @click="isFullscreen = !isFullscreen">
              <i class="ph" :class="isFullscreen ? 'ph-corners-in' : 'ph-corners-out'"></i>
            </button>
            <button class="close-btn" type="button" aria-label="关闭" @click="handleClose">×</button>
          </div>
        </header>

        <!-- Error Banner -->
        <div v-if="errorMessage" class="error-banner">
          <i class="ph ph-warning-circle"></i>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Editor Workspace Area -->
        <main class="editor-workspace" :class="{ 'split-view': isSplitPreview && isMarkdown }">
          <!-- Loading State -->
          <div v-if="loading" class="editor-loading">
            <i class="ph ph-spinner-gap animate-spin"></i>
            <p>正在从 R2 云端读取文本...</p>
          </div>

          <!-- Code Editor Body -->
          <div v-else class="editor-pane">
            <div class="line-numbers" aria-hidden="true">
              <span v-for="line in linesCount" :key="line">{{ line }}</span>
            </div>
            <textarea
              ref="textareaRef"
              v-model="content"
              class="code-textarea"
              :style="{ fontSize: `${fontSize}px` }"
              placeholder="在这里开始编写文本..."
              spellcheck="false"
              @keydown="handleKeydown"
            ></textarea>
          </div>

          <!-- Markdown Live Preview Pane -->
          <div v-if="isSplitPreview && isMarkdown && !loading" class="preview-pane">
            <div class="preview-header">
              <i class="ph ph-eye"></i> Markdown 实时渲染
            </div>
            <div class="markdown-body" v-html="markdownHtml"></div>
          </div>
        </main>

        <!-- Editor Status Footer -->
        <footer class="editor-footer">
          <div class="status-left">
            <span>行数: {{ linesCount }}</span>
            <span>字符数: {{ charCount }}</span>
            <span>词数: {{ wordCount }}</span>
          </div>
          <div class="status-right">
            <span>编码: UTF-8</span>
            <span>类型: {{ fileExt.toUpperCase() }}</span>
            <span class="tip-shortcut">按 <strong>Ctrl+S</strong> 快速保存</span>
          </div>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.editor-mask {
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

.editor-window {
  display: flex;
  flex-direction: column;
  width: min(1180px, 100%);
  height: min(85vh, 860px);
  overflow: hidden;
  border-radius: 20px;
  background: #181920;
  color: #f2f2f7;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.editor-window.fullscreen {
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  border: none;
}

/* Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(25, 26, 34, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 16px;
}

.editor-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.file-icon-badge {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 20px;
  background: rgba(10, 132, 255, 0.18);
  color: #0a84ff;
}

.file-icon-badge.md { background: rgba(50, 215, 75, 0.18); color: #32d74b; }
.file-icon-badge.code { background: rgba(255, 159, 10, 0.18); color: #ff9f0a; }

.file-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-row strong {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dirty-badge {
  font-size: 11px;
  font-weight: 700;
  color: #ff9f0a;
  background: rgba(255, 159, 10, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.saved-badge {
  font-size: 11px;
  font-weight: 700;
  color: #32d74b;
  background: rgba(50, 215, 75, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
}

.file-path-sub {
  font-size: 11.5px;
  color: #8e8e93;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Header actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  color: #d1d1d6;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.18s ease;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.tool-btn.active {
  background: rgba(10, 132, 255, 0.25);
  color: #409cff;
  border-color: rgba(10, 132, 255, 0.4);
}

.save-btn {
  background: #0a84ff;
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 14px rgba(10, 132, 255, 0.35);
}

.save-btn:hover:not(:disabled) {
  background: #0071e3;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.font-size-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 2px;
}

.icon-tool-btn {
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

.icon-tool-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.font-indicator {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  padding: 0 4px;
  color: #8e8e93;
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

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
  font-size: 12.5px;
  border-bottom: 1px solid rgba(255, 69, 58, 0.25);
}

/* Workspace */
.editor-workspace {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  background: #13141a;
}

.editor-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 12px;
  text-align: center;
  color: #8e8e93;
  font-size: 14px;
}

.editor-loading i {
  font-size: 32px;
  color: #0a84ff;
}

.editor-pane {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  padding: 16px 12px 16px 16px;
  background: rgba(0, 0, 0, 0.2);
  color: #545663;
  font-family: "Space Mono", monospace;
  font-size: 12.5px;
  line-height: 1.6;
  text-align: right;
  user-select: none;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.code-textarea {
  flex: 1;
  height: 100%;
  padding: 16px 18px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: #e4e4e9;
  font-family: "Space Mono", "Fira Code", monospace;
  line-height: 1.6;
  tab-size: 2;
  white-space: pre;
  overflow-y: auto;
}

/* Markdown Preview Pane */
.preview-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding: 18px 24px;
  background: #1a1b23;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #8e8e93;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.markdown-body {
  font-size: 14.5px;
  line-height: 1.7;
  color: #d1d1d6;
}

.markdown-body h1 { font-size: 22px; margin: 16px 0 10px; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; }
.markdown-body h2 { font-size: 18px; margin: 14px 0 8px; color: #ffffff; }
.markdown-body h3 { font-size: 15px; margin: 12px 0 6px; color: #ffffff; }
.markdown-body p { margin-bottom: 12px; }
.markdown-body code { background: rgba(255, 255, 255, 0.12); padding: 2px 6px; border-radius: 5px; font-family: "Space Mono", monospace; font-size: 13px; color: #ff9f0a; }
.markdown-body blockquote { margin: 12px 0; padding: 6px 14px; border-left: 3.5px solid #0a84ff; background: rgba(10, 132, 255, 0.08); border-radius: 0 8px 8px 0; color: #a1a1a6; }
.markdown-body li { margin-left: 20px; list-style-type: disc; }
.markdown-body a { color: #409cff; text-decoration: underline; }

/* Footer */
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px;
  background: rgba(20, 21, 28, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11.5px;
  color: #8e8e93;
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tip-shortcut {
  color: #636366;
}

.tip-shortcut strong {
  color: #a1a1a6;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .editor-mask { padding: 0; }
  .editor-window { width: 100vw; height: 100vh; border-radius: 0; }
  .editor-workspace.split-view { flex-direction: column; }
  .preview-pane { border-left: none; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .status-right { display: none; }
}
</style>
