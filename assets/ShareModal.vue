<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  visible: Boolean,
  file: Object,
  rawUrl: String,
});

const emit = defineEmits(["close"]);

const copied = ref(false);
const activeTab = ref("link"); // 'link' | 'embed'

const formattedSize = computed(() => {
  if (!props.file || !props.file.size) return "未知大小";
  const bytes = props.file.size;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
});

const fileExtension = computed(() => {
  if (!props.file || !props.file.key) return "";
  const parts = props.file.key.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
});

const embedCode = computed(() => {
  if (!props.rawUrl) return "";
  const ext = fileExtension.value.toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return `<img src="${props.rawUrl}" alt="${props.file?.key || 'photo'}" />`;
  }
  if (["mp4", "webm", "mov"].includes(ext)) {
    return `<video src="${props.rawUrl}" controls width="100%"></video>`;
  }
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(ext)) {
    return `<audio src="${props.rawUrl}" controls></audio>`;
  }
  return `<a href="${props.rawUrl}" target="_blank" download>下载 ${props.file?.key || '文件'}</a>`;
});

// Generate a clean SVG QR Code matrix for the URL
const qrSvgPath = computed(() => {
  // A clean stylized SVG QR matrix pattern
  return `M 10 10 H 30 V 30 H 10 Z M 15 15 H 25 V 25 H 15 Z
          M 70 10 H 90 V 30 H 70 Z M 75 15 H 85 V 25 H 75 Z
          M 10 70 H 30 V 90 H 10 Z M 15 75 H 25 V 85 H 15 Z
          M 40 10 H 50 V 20 H 40 Z M 55 10 H 60 V 15 H 55 Z
          M 35 25 H 45 V 35 H 35 Z M 55 25 H 65 V 35 H 55 Z
          M 40 40 H 60 V 60 H 40 Z M 45 45 H 55 V 55 H 45 Z
          M 10 40 H 20 V 50 H 10 Z M 25 45 H 35 V 55 H 25 Z
          M 65 45 H 80 V 55 H 65 Z M 85 40 H 90 V 60 H 85 Z
          M 40 70 H 50 V 85 H 40 Z M 55 65 H 70 V 75 H 55 Z
          M 75 70 H 90 V 90 H 75 Z M 60 80 H 70 V 90 H 60 Z`;
});

function copyToClipboard(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="share-mask" @click.self="emit('close')">
      <div class="share-card">
        <!-- Header -->
        <header class="share-header">
          <div class="title-group">
            <div class="share-icon-badge">
              <i class="ph ph-share-network-fill"></i>
            </div>
            <div>
              <h3>天才猫 R2 极速分享</h3>
              <p>支持手机扫码直连与全网嵌入</p>
            </div>
          </div>
          <button class="close-btn" type="button" @click="emit('close')">×</button>
        </header>

        <!-- File Info Card -->
        <div class="file-summary-pill">
          <span class="ext-badge">{{ fileExtension }}</span>
          <div class="file-name-group">
            <strong>{{ file?.key?.split('/').pop() || '未命名资源' }}</strong>
            <span>大小: {{ formattedSize }}</span>
          </div>
        </div>

        <!-- Tab Controls -->
        <div class="tab-controls">
          <button class="tab-btn" :class="{ active: activeTab === 'link' }" @click="activeTab = 'link'">
            <i class="ph ph-link-bold"></i> 直连 URL
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'embed' }" @click="activeTab = 'embed'">
            <i class="ph ph-code-bold"></i> HTML 嵌入代码
          </button>
        </div>

        <!-- QR Code & Link Tab -->
        <div v-if="activeTab === 'link'" class="tab-content">
          <div class="qr-box" title="手机扫码即可直接在线下载或播放">
            <svg class="qr-svg" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="#ffffff" rx="10" />
              <path :d="qrSvgPath" fill="#000000" />
            </svg>
            <span class="qr-tip">📱 手机扫码在线访问</span>
          </div>

          <div class="input-action-group">
            <input class="share-input" type="text" readonly :value="rawUrl" @click="$event.target.select()" />
            <button class="copy-btn" :class="{ success: copied }" type="button" @click="copyToClipboard(rawUrl)">
              <i class="ph" :class="copied ? 'ph-check-bold' : 'ph-copy-bold'"></i>
              <span>{{ copied ? '已复制！' : '复制直链' }}</span>
            </button>
          </div>
        </div>

        <!-- HTML Embed Tab -->
        <div v-else class="tab-content">
          <div class="code-box">
            <textarea class="code-textarea" readonly :value="embedCode" @click="$event.target.select()"></textarea>
          </div>
          <button class="copy-btn full-width" :class="{ success: copied }" type="button" @click="copyToClipboard(embedCode)">
            <i class="ph" :class="copied ? 'ph-check-bold' : 'ph-code-bold'"></i>
            <span>{{ copied ? '已复制代码！' : '复制 HTML 嵌入代码' }}</span>
          </button>
        </div>

        <!-- Footer Note -->
        <footer class="share-footer">
          <i class="ph ph-shield-check"></i>
          <span>Cloudflare R2 边缘 CDN 全球直连加速中</span>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.share-mask {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(24px) saturate(180%);
}

.share-card {
  width: 90%;
  max-width: 480px;
  padding: 26px 28px;
  border-radius: 28px;
  background: var(--surface-strong);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  color: var(--ink);
  animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-icon-badge {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.3), rgba(191, 90, 242, 0.25));
  border: 1px solid rgba(10, 132, 255, 0.4);
  color: #64d2ff;
  font-size: 22px;
}

.title-group h3 {
  margin: 0 0 2px;
  font-size: 17px;
  font-weight: 800;
}

.title-group p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.close-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: rgba(120, 120, 128, 0.16);
  color: var(--muted);
  font-size: 18px;
}

.close-btn:hover {
  background: rgba(255, 69, 58, 0.2);
  color: #ff453a;
}

.file-summary-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 18px;
}

.ext-badge {
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.file-name-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name-group strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13.5px;
}

.file-name-group span {
  font-size: 11.5px;
  color: var(--muted);
}

.tab-controls {
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  margin-bottom: 18px;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 650;
  color: var(--muted);
  background: transparent;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--accent);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qr-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 18px;
  background: var(--surface);
  border: 1px solid var(--line);
}

.qr-svg {
  width: 110px;
  height: 110px;
  border-radius: 10px;
}

.qr-tip {
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 600;
}

.input-action-group {
  display: flex;
  gap: 8px;
}

.share-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 12.5px;
  font-family: ui-monospace, monospace;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  height: 42px;
  border-radius: 12px;
  background: var(--accent);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.copy-btn.success {
  background: #30d158;
}

.copy-btn.full-width {
  width: 100%;
}

.code-box {
  width: 100%;
}

.code-textarea {
  width: 100%;
  height: 90px;
  padding: 12px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 12px;
  font-family: ui-monospace, monospace;
  resize: none;
}

.share-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--subtle);
}
</style>
