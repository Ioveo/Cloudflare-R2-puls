<script setup>
import { ref } from "vue";

defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "upload", "upload-software", "createFolder"]);

const camera = ref(null);
const media = ref(null);
const files = ref(null);
const softwareInput = ref(null);

// Software Upload Form state
const isSoftwareMode = ref(false);
const selectedSoftwareFile = ref(null);
const softwareForm = ref({
  title: "",
  version: "v1.0.0",
  category: "utilities",
  platform: "macOS (Apple Silicon & Intel)",
  summary: "",
  featuresText: "",
  installGuide: "",
});

function close() {
  isSoftwareMode.value = false;
  selectedSoftwareFile.value = null;
  emit("update:modelValue", false);
}

function handleFileInput(inputRef) {
  inputRef?.click();
}

function onFileChange(e) {
  if (!e.target.files?.length) return;
  close();
  emit("upload", e.target);
}

function handleSoftwareFileSelect(e) {
  if (!e.target.files?.length) return;
  const file = e.target.files[0];
  selectedSoftwareFile.value = file;

  // Auto-parse filename
  let base = file.name.replace(/\.[a-zA-Z0-9_\.]*$/, "");
  let version = "v1.0.0";
  const verMatch = base.match(/[vV]?(\d+\.\d+(\.\d+)?)/);
  if (verMatch) version = `v${verMatch[1]}`;

  let title = base
    .replace(/[vV]?\d+\.\d+(\.\d+)?.*$/, "")
    .replace(/[_\-]+(mac|macos|win|windows|x64|arm64|universal|crack|patch|setup|installer)/gi, " ")
    .replace(/[_\-\.]+/g, " ")
    .trim();
  if (!title) title = base;

  let platform = "macOS (Apple Silicon & Intel)";
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".msi")) platform = "Windows (x64)";
  else if (lower.endsWith(".apk")) platform = "Android";
  else if (lower.endsWith(".ipa")) platform = "iOS";

  let category = "utilities";
  if (lower.includes("adobe") || lower.includes("photo") || lower.includes("sketch") || lower.includes("figma")) category = "design";
  else if (lower.includes("office") || lower.includes("notion") || lower.includes("word") || lower.includes("wps")) category = "productivity";
  else if (lower.includes("code") || lower.includes("git") || lower.includes("idea") || lower.includes("dev")) category = "developer";
  else if (lower.includes("vlc") || lower.includes("video") || lower.includes("music") || lower.includes("player")) category = "entertainment";
  else if (lower.includes("clash") || lower.includes("vpn") || lower.includes("net")) category = "network";

  softwareForm.value = {
    title,
    version,
    category,
    platform,
    summary: `${title} 官方完整安装包，直连高速下载。`,
    featuresText: "极速云端直连下载\n经过完整兼容性校验\n支持断点续传",
    installGuide: platform.includes("macOS")
      ? "1. 双击打开 DMG 镜像包；\n2. 将应用图标拖入 Applications 应用程序文件夹；\n3. 如提示损坏请在终端运行: sudo xattr -rd com.apple.quarantine /Applications/应用名.app"
      : "1. 双击运行安装程序；\n2. 按照屏幕提示完成安装向导。",
  };

  isSoftwareMode.value = true;
}

function submitSoftwareUpload() {
  if (!selectedSoftwareFile.value) return;
  const meta = {
    title: softwareForm.value.title,
    version: softwareForm.value.version,
    category: softwareForm.value.category,
    platform: softwareForm.value.platform,
    summary: softwareForm.value.summary,
    features: softwareForm.value.featuresText.split("\n").map(s => s.trim()).filter(Boolean),
    installGuide: softwareForm.value.installGuide,
    updatedAt: new Date().toISOString(),
  };

  const file = selectedSoftwareFile.value;
  close();
  emit("upload-software", { file, metadata: meta, targetFolder: "软件/" });
}

function handleCreateFolder() {
  close();
  emit("createFolder");
}
</script>

<template>
  <div class="popup-wrapper">
    <Transition name="fade">
      <div v-if="modelValue" class="popup-backdrop" @click="close"></div>
    </Transition>

    <Transition name="slide-up">
      <section v-if="modelValue" class="popup-card" :class="{ 'is-wide': isSoftwareMode }" aria-label="新建或上传文件">
        <!-- Header -->
        <header class="popup-header">
          <div class="header-left">
            <span class="header-sparkle"><i class="ph ph-sparkle-fill"></i></span>
            <strong>{{ isSoftwareMode ? '发布软件并填写简介' : '新建或上传' }}</strong>
          </div>
          <button class="popup-close-btn" type="button" title="关闭" @click="close">×</button>
        </header>

        <!-- View 1: 5-Action Grid -->
        <div v-if="!isSoftwareMode" class="actions-grid">
          <!-- 1. Camera -->
          <button class="action-card card-camera" type="button" @click="handleFileInput(camera)">
            <div class="action-icon-bubble icon-camera">
              <i class="ph ph-camera-bold"></i>
            </div>
            <span class="action-title">拍照上传</span>
            <span class="action-desc">相机直传</span>
            <input ref="camera" type="file" accept="image/*" capture="camera" hidden @change="onFileChange" />
          </button>

          <!-- 2. Media -->
          <button class="action-card card-media" type="button" @click="handleFileInput(media)">
            <div class="action-icon-bubble icon-media">
              <i class="ph ph-images-bold"></i>
            </div>
            <span class="action-title">图片视频</span>
            <span class="action-desc">批量导入</span>
            <input ref="media" type="file" accept="image/*,video/*" multiple hidden @change="onFileChange" />
          </button>

          <!-- 3. Software Package with Notes/Summary -->
          <button class="action-card card-software" type="button" @click="handleFileInput(softwareInput)">
            <div class="action-icon-bubble icon-software">
              <i class="ph ph-app-store-logo-bold"></i>
            </div>
            <span class="action-title">发布软件</span>
            <span class="action-desc">带简介/DMG/EXE</span>
            <input ref="softwareInput" type="file" accept=".dmg,.pkg,.exe,.msi,.apk,.ipa,.zip,.deb,.appimage" hidden @change="handleSoftwareFileSelect" />
          </button>

          <!-- 4. General Files -->
          <button class="action-card card-files" type="button" @click="handleFileInput(files)">
            <div class="action-icon-bubble icon-files">
              <i class="ph ph-cloud-arrow-up-bold"></i>
            </div>
            <span class="action-title">选择文件</span>
            <span class="action-desc">文档/任意格式</span>
            <input ref="files" type="file" multiple hidden @change="onFileChange" />
          </button>

          <!-- 5. New Folder -->
          <button class="action-card card-folder" type="button" @click="handleCreateFolder">
            <div class="action-icon-bubble icon-folder">
              <i class="ph ph-folder-plus-bold"></i>
            </div>
            <span class="action-title">新建文件夹</span>
            <span class="action-desc">分类管理</span>
          </button>
        </div>

        <!-- View 2: Software Metadata & Notes Form -->
        <form v-else class="software-upload-form" @submit.prevent="submitSoftwareUpload">
          <div class="file-picked-badge">
            <i class="ph ph-package-fill"></i>
            <span class="file-name">{{ selectedSoftwareFile?.name }}</span>
            <span class="file-size">({{ ((selectedSoftwareFile?.size || 0) / (1024 * 1024)).toFixed(1) }} MB)</span>
          </div>

          <div class="form-grid-2">
            <div class="field-item">
              <label>🏷️ 软件名称 (Title)</label>
              <input v-model="softwareForm.title" type="text" required placeholder="如 Final Cut Pro" />
            </div>
            <div class="field-item">
              <label>🔢 版本号 (Version)</label>
              <input v-model="softwareForm.version" type="text" required placeholder="如 v10.8.1" />
            </div>
          </div>

          <div class="form-grid-2">
            <div class="field-item">
              <label>🗂️ 所属分类 (Category)</label>
              <select v-model="softwareForm.category">
                <option value="design">🎨 设计创意</option>
                <option value="productivity">⚡ 效率办公</option>
                <option value="developer">💻 开发工具</option>
                <option value="utilities">🛠️ 系统工具</option>
                <option value="entertainment">🎬 影音娱乐</option>
                <option value="network">🌐 网络通讯</option>
                <option value="mobile">📱 移动专属</option>
              </select>
            </div>
            <div class="field-item">
              <label>💻 适用平台与架构 (Platform)</label>
              <input v-model="softwareForm.platform" type="text" placeholder="如 macOS (Apple Silicon M系列)" />
            </div>
          </div>

          <div class="field-item">
            <label>📝 一句话亮点简介 (Summary)</label>
            <input v-model="softwareForm.summary" type="text" placeholder="如 Apple 旗舰级非线性视频剪辑生产力神器" />
          </div>

          <div class="field-item">
            <label>🌟 核心功能亮点 (每行一条)</label>
            <textarea v-model="softwareForm.featuresText" rows="2" placeholder="支持 8K ProRes 实时剪辑&#10;全新 AI 智能对象跟踪"></textarea>
          </div>

          <div class="field-item">
            <label>🔑 安装与激活指南 / 终端指令 / 备忘</label>
            <textarea v-model="softwareForm.installGuide" rows="3" placeholder="1. 打开 DMG 拖入 Applications&#10;2. 如提示损坏请在终端运行: sudo xattr -rd com.apple.quarantine /Applications/xxx.app"></textarea>
          </div>

          <div class="form-actions">
            <button class="form-back-btn" type="button" @click="isSoftwareMode = false">上一步</button>
            <button class="form-submit-btn" type="submit">
              <i class="ph ph-upload-simple-bold"></i>
              <span>立即上传并发布到软件库</span>
            </button>
          </div>
        </form>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  width: 100%;
  height: 100%;
  background: rgba(10, 12, 18, 0.45);
  backdrop-filter: blur(16px) saturate(140%);
  animation: fade-in 0.2s ease-out;
}

.popup-card {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  z-index: 91;
  width: min(640px, calc(100% - 32px));
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28), inset 0 1px 0 #ffffff;
  backdrop-filter: blur(40px) saturate(200%);
  overflow: hidden;
  color: #1d1d1f;
  animation: popup-bounce 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.popup-card.is-wide {
  width: min(680px, calc(100% - 32px));
}

@media (prefers-color-scheme: dark) {
  .popup-card {
    background: rgba(26, 27, 34, 0.94);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    color: #f2f2f7;
  }
}

/* Header */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.08);
}

@media (prefers-color-scheme: dark) {
  .popup-header { border-bottom-color: rgba(255, 255, 255, 0.08); }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-sparkle {
  color: #0a84ff;
  font-size: 15px;
}

.popup-header strong {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.popup-close-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(118, 118, 128, 0.12);
  color: #8e8e93;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.popup-close-btn:hover {
  background: rgba(255, 69, 58, 0.2);
  color: #ff453a;
}

/* 5-Action Grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  padding: 16px 16px 20px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 6px 12px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  background: rgba(0, 0, 0, 0.025);
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .action-card {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.06);
  }
}

.action-card:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.card-camera:hover { border-color: rgba(255, 65, 108, 0.4); background: rgba(255, 65, 108, 0.08); }
.card-media:hover { border-color: rgba(138, 43, 226, 0.4); background: rgba(138, 43, 226, 0.08); }
.card-software:hover { border-color: rgba(0, 122, 255, 0.4); background: rgba(0, 122, 255, 0.08); }
.card-files:hover { border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.08); }
.card-folder:hover { border-color: rgba(255, 159, 10, 0.4); background: rgba(255, 159, 10, 0.08); }

.action-icon-bubble {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: #ffffff;
  font-size: 22px;
  margin-bottom: 8px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.action-card:hover .action-icon-bubble {
  transform: scale(1.1);
}

.icon-camera {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  box-shadow: 0 6px 16px rgba(255, 65, 108, 0.35);
}

.icon-media {
  background: linear-gradient(135deg, #8a2be2, #e040fb);
  box-shadow: 0 6px 16px rgba(138, 43, 226, 0.35);
}

.icon-software {
  background: linear-gradient(135deg, #007aff, #0051d5);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.35);
}

.icon-files {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.icon-folder {
  background: linear-gradient(135deg, #ff9f0a, #f57c00);
  box-shadow: 0 6px 16px rgba(255, 159, 10, 0.35);
}

.action-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 2px;
  white-space: nowrap;
}

.action-desc {
  font-size: 10px;
  color: #8e8e93;
  white-space: nowrap;
}

/* Software Upload Form */
.software-upload-form {
  padding: 16px 20px 20px;
  overflow-y: auto;
}

.file-picked-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  font-size: 12px;
  font-weight: 600;
}
.file-picked-badge .file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-picked-badge .file-size {
  color: #8e8e93;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field-item {
  margin-bottom: 12px;
}
.field-item label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}
:root.dark .field-item label,
@media (prefers-color-scheme: dark) {
  .field-item label { color: #94a3b8; }
}

.field-item input,
.field-item select,
.field-item textarea {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
:root.dark .field-item input,
:root.dark .field-item select,
:root.dark .field-item textarea,
@media (prefers-color-scheme: dark) {
  .field-item input,
  .field-item select,
  .field-item textarea {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.3);
    color: #ffffff;
  }
}
.field-item input:focus,
.field-item select:focus,
.field-item textarea:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.form-back-btn {
  padding: 8px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.form-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #007aff, #0051d5);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.35);
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes popup-bounce {
  0% { opacity: 0; transform: translate(-50%, 40px) scale(0.96); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
</style>
