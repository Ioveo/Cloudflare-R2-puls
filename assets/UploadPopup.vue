<script setup>
import { ref } from "vue";

defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "upload", "createFolder"]);

const camera = ref(null);
const media = ref(null);
const files = ref(null);

function close() {
  emit("update:modelValue", false);
}

function handleFileInput(inputRef) {
  close();
  inputRef?.click();
}

function onFileChange(e) {
  if (!e.target.files?.length) return;
  emit("upload", e.target);
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
      <section v-if="modelValue" class="popup-card" aria-label="新建或上传文件">
        <!-- Header -->
        <header class="popup-header">
          <div class="header-left">
            <span class="header-sparkle"><i class="ph ph-sparkle-fill"></i></span>
            <strong>新建或上传</strong>
          </div>
          <button class="popup-close-btn" type="button" title="关闭" @click="close">×</button>
        </header>

        <!-- Dynamic 4-Action Grid -->
        <div class="actions-grid">
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
            <span class="action-title">图片与视频</span>
            <span class="action-desc">批量导入</span>
            <input ref="media" type="file" accept="image/*,video/*" multiple hidden @change="onFileChange" />
          </button>

          <!-- 3. General Files -->
          <button class="action-card card-files" type="button" @click="handleFileInput(files)">
            <div class="action-icon-bubble icon-files">
              <i class="ph ph-cloud-arrow-up-bold"></i>
            </div>
            <span class="action-title">选择文件</span>
            <span class="action-desc">文档 / 任意格式</span>
            <input ref="files" type="file" multiple hidden @change="onFileChange" />
          </button>

          <!-- 4. New Folder -->
          <button class="action-card card-folder" type="button" @click="handleCreateFolder">
            <div class="action-icon-bubble icon-folder">
              <i class="ph ph-folder-plus-bold"></i>
            </div>
            <span class="action-title">新建文件夹</span>
            <span class="action-desc">分类管理</span>
          </button>
        </div>
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
  width: min(560px, calc(100% - 32px));
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28), inset 0 1px 0 #ffffff;
  backdrop-filter: blur(40px) saturate(200%);
  overflow: hidden;
  color: #1d1d1f;
  animation: popup-bounce 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-color-scheme: dark) {
  .popup-card {
    background: rgba(26, 27, 34, 0.92);
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
  padding: 18px 22px 14px;
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
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.popup-close-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: rgba(118, 118, 128, 0.12);
  color: #8e8e93;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.popup-close-btn:hover {
  background: rgba(255, 69, 58, 0.2);
  color: #ff453a;
}

/* 4-Action Grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 20px 22px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 14px;
  border-radius: 18px;
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
  transform: translateY(-4px) scale(1.03);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
}

.card-camera:hover { border-color: rgba(255, 65, 108, 0.4); background: rgba(255, 65, 108, 0.08); }
.card-media:hover { border-color: rgba(138, 43, 226, 0.4); background: rgba(138, 43, 226, 0.08); }
.card-files:hover { border-color: rgba(10, 132, 255, 0.4); background: rgba(10, 132, 255, 0.08); }
.card-folder:hover { border-color: rgba(255, 159, 10, 0.4); background: rgba(255, 159, 10, 0.08); }

/* Distinct Bubbles */
.action-icon-bubble {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  color: #ffffff;
  font-size: 24px;
  margin-bottom: 10px;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.action-card:hover .action-icon-bubble {
  transform: scale(1.12);
}

/* 1. Camera Gradient */
.icon-camera {
  background: linear-gradient(135deg, #ff416c, #ff4b2b);
  box-shadow: 0 8px 20px rgba(255, 65, 108, 0.35);
}

/* 2. Media Gradient */
.icon-media {
  background: linear-gradient(135deg, #8a2be2, #e040fb);
  box-shadow: 0 8px 20px rgba(138, 43, 226, 0.35);
}

/* 3. Files Gradient */
.icon-files {
  background: linear-gradient(135deg, #0a84ff, #00d2ff);
  box-shadow: 0 8px 20px rgba(10, 132, 255, 0.35);
}

/* 4. Folder Gradient */
.icon-folder {
  background: linear-gradient(135deg, #ff9f0a, #ffd60a);
  box-shadow: 0 8px 20px rgba(255, 159, 10, 0.35);
}

.action-title {
  font-size: 13px;
  font-weight: 700;
  color: inherit;
  margin-bottom: 2px;
}

.action-desc {
  font-size: 11px;
  color: #8e8e93;
}

@keyframes popup-bounce {
  from {
    opacity: 0;
    transform: translate(-50%, 25px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

@media (max-width: 540px) {
  .popup-card { bottom: 16px; width: calc(100% - 24px); }
  .actions-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px 14px 16px; }
  .action-card { padding: 12px 6px; }
  .action-icon-bubble { width: 42px; height: 42px; font-size: 20px; }
}
</style>
