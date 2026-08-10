<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  visible: Boolean,
  file: Object,
  rawUrl: String,
});

const emit = defineEmits(["close"]);

const copied = ref(false);
const activeTab = ref("link"); // 'link' | 'secure' | 'embed'

// Secure Share Options
const shareExpiry = ref("24h"); // '1h' | '24h' | '7d' | 'forever'
const pinCode = ref("8888");
const customNote = ref("");

const formattedSize = computed(() => {
  if (!props.file || !props.file.size) return "未知大小";
  const bytes = props.file.size;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
});

const fileExtension = computed(() => {
  if (!props.file || !props.file.key) return "FILE";
  const parts = props.file.key.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
});

const fileNameDisplay = computed(() => {
  if (!props.file || !props.file.key) return "未命名资源";
  return props.file.key.split("/").filter(Boolean).pop() || "未命名资源";
});

const fullDirectUrl = computed(() => {
  if (!props.rawUrl) return "";
  try {
    return new URL(props.rawUrl, window.location.origin).href;
  } catch {
    return props.rawUrl;
  }
});

const qrImageUrl = computed(() => {
  if (!fullDirectUrl.value) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(fullDirectUrl.value)}`;
});

const embedCode = computed(() => {
  if (!props.rawUrl) return "";
  const ext = fileExtension.value.toLowerCase();
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return `<img src="${fullDirectUrl.value}" alt="${fileNameDisplay.value}" />`;
  }
  if (["mp4", "webm", "mov"].includes(ext)) {
    return `<video src="${fullDirectUrl.value}" controls width="100%"></video>`;
  }
  if (["mp3", "wav", "ogg", "flac", "m4a"].includes(ext)) {
    return `<audio src="${fullDirectUrl.value}" controls></audio>`;
  }
  return `<a href="${fullDirectUrl.value}" target="_blank" download>下载 ${fileNameDisplay.value}</a>`;
});

const expiryText = computed(() => {
  switch (shareExpiry.value) {
    case "1h": return "1 小时有效";
    case "24h": return "24 小时有效";
    case "7d": return "7 天有效";
    default: return "永久有效";
  }
});

const secureShareText = computed(() => {
  return `📦【天才猫 R2 专属安全分享】\n文件名称：${fileNameDisplay.value} (${formattedSize.value})\n下载直链：${fullDirectUrl.value}\n🔑 访问提取码：${pinCode.value || "无"}\n⏳ 有效期：${expiryText.value}${customNote.value ? `\n💬 附言：${customNote.value}` : ""}\n（手机相机扫码或浏览器访问链接即可高速直连下载）`;
});

function generateRandomPin() {
  pinCode.value = Math.floor(1000 + Math.random() * 9000).toString();
}

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
              <h3>天才猫 R2 智能分享</h3>
              <p>支持直链直达、密码加密保护与 HTML 嵌入</p>
            </div>
          </div>
          <button class="close-btn" type="button" aria-label="关闭" @click="emit('close')">×</button>
        </header>

        <!-- File Info Card -->
        <div class="file-summary-pill">
          <span class="ext-badge">{{ fileExtension }}</span>
          <div class="file-name-group">
            <strong :title="fileNameDisplay">{{ fileNameDisplay }}</strong>
            <span>大小: {{ formattedSize }}</span>
          </div>
        </div>

        <!-- Tab Controls -->
        <div class="tab-controls">
          <button class="tab-btn" :class="{ active: activeTab === 'link' }" @click="activeTab = 'link'">
            <i class="ph ph-link-bold"></i> 直连 URL
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'secure' }" @click="activeTab = 'secure'">
            <i class="ph ph-lock-key-bold"></i> 🔒 加密与限时分享
          </button>
          <button class="tab-btn" :class="{ active: activeTab === 'embed' }" @click="activeTab = 'embed'">
            <i class="ph ph-code-bold"></i> HTML 嵌入
          </button>
        </div>

        <!-- Tab 1: QR Code & Link Tab -->
        <div v-if="activeTab === 'link'" class="tab-content">
          <div class="qr-box" title="手机扫码即可直接在线下载或播放">
            <img class="qr-svg" :src="qrImageUrl" alt="分享二维码" loading="lazy" />
            <span class="qr-tip">📱 手机扫码直连访问</span>
          </div>

          <div class="input-action-group">
            <input class="share-input" type="text" readonly :value="fullDirectUrl" aria-label="分享直链" @click="$event.target.select()" />
            <button class="copy-btn" :class="{ success: copied }" type="button" @click="copyToClipboard(fullDirectUrl)">
              <i class="ph" :class="copied ? 'ph-check-bold' : 'ph-copy-bold'"></i>
              <span>{{ copied ? '已复制！' : '复制直链' }}</span>
            </button>
          </div>
        </div>

        <!-- Tab 2: Secure Password & Expiry Tab -->
        <div v-else-if="activeTab === 'secure'" class="tab-content secure-content">
          <div class="secure-form-grid">
            <div class="form-row">
              <label><i class="ph ph-clock"></i> 有效期</label>
              <div class="expiry-chips">
                <button type="button" :class="{ selected: shareExpiry === '1h' }" @click="shareExpiry = '1h'">1小时</button>
                <button type="button" :class="{ selected: shareExpiry === '24h' }" @click="shareExpiry = '24h'">24小时</button>
                <button type="button" :class="{ selected: shareExpiry === '7d' }" @click="shareExpiry = '7d'">7天</button>
                <button type="button" :class="{ selected: shareExpiry === 'forever' }" @click="shareExpiry = 'forever'">永久</button>
              </div>
            </div>

            <div class="form-row">
              <label><i class="ph ph-key"></i> 访问提取码</label>
              <div class="pin-input-group">
                <input v-model="pinCode" type="text" class="pin-input" maxlength="8" placeholder="提取码 (如 8888)" />
                <button type="button" class="pin-rand-btn" title="随机生成提取码" @click="generateRandomPin">
                  <i class="ph ph-shuffle"></i> 随机生成
                </button>
              </div>
            </div>

            <div class="form-row">
              <label><i class="ph ph-chat-text"></i> 分享附言 (可选)</label>
              <input v-model="customNote" type="text" class="note-input" placeholder="例如：请在周五前下载确认" />
            </div>
          </div>

          <div class="preview-share-card">
            <div class="preview-header">
              <span class="preview-badge"><i class="ph ph-shield-check"></i> 安全加密卡片预览</span>
            </div>
            <pre class="preview-text">{{ secureShareText }}</pre>
          </div>

          <button class="copy-btn full-width" :class="{ success: copied }" type="button" @click="copyToClipboard(secureShareText)">
            <i class="ph" :class="copied ? 'ph-check-bold' : 'ph-copy-bold'"></i>
            <span>{{ copied ? '已复制加密分享口令！' : '一键复制完整加密分享文案' }}</span>
          </button>
        </div>

        <!-- Tab 3: HTML Embed Tab -->
        <div v-else class="tab-content">
          <div class="code-box">
            <textarea class="code-textarea" readonly :value="embedCode" aria-label="HTML嵌入代码" @click="$event.target.select()"></textarea>
          </div>
          <button class="copy-btn full-width" :class="{ success: copied }" type="button" @click="copyToClipboard(embedCode)">
            <i class="ph" :class="copied ? 'ph-check-bold' : 'ph-code-bold'"></i>
            <span>{{ copied ? '已复制代码！' : '复制 HTML 嵌入代码' }}</span>
          </button>
        </div>

        <!-- Footer Note -->
        <footer class="share-footer">
          <i class="ph ph-shield-check"></i>
          <span>天才猫 R2 专属全速 CDN 节点分发 · 零流量限制</span>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.share-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 17, 23, 0.65);
  backdrop-filter: blur(18px) saturate(160%);
  animation: fade-in 0.2s ease-out;
}

.share-card {
  width: min(520px, 100%);
  padding: 24px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  color: #1d1d1f;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.25), inset 0 1px 0 #ffffff;
  backdrop-filter: blur(30px) saturate(180%);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: scale-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-color-scheme: dark) {
  .share-card {
    background: rgba(28, 29, 36, 0.92);
    color: #f2f2f7;
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
}

/* Header */
.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-icon-badge {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #ffffff;
  font-size: 20px;
  box-shadow: 0 6px 16px rgba(10, 132, 255, 0.3);
}

.share-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.share-header p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #8e8e93;
}

.close-btn {
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

.close-btn:hover {
  background: rgba(255, 69, 58, 0.18);
  color: #ff453a;
}

/* File Summary Pill */
.file-summary-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

@media (prefers-color-scheme: dark) {
  .file-summary-pill {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.ext-badge {
  padding: 4px 8px;
  border-radius: 6px;
  background: #0a84ff;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.file-name-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-name-group strong {
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name-group span {
  font-size: 11px;
  color: #8e8e93;
}

/* Tab Controls */
.tab-controls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(118, 118, 128, 0.12);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #8e8e93;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #0a84ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .tab-btn.active {
    background: rgba(255, 255, 255, 0.16);
    color: #409cff;
  }
}

/* Content */
.tab-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.qr-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.qr-svg {
  width: 140px;
  height: 140px;
  border-radius: 8px;
}

.qr-tip {
  font-size: 11.5px;
  font-weight: 600;
  color: #515156;
}

.input-action-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.share-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(60, 60, 67, 0.18);
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  font-size: 13px;
  outline: none;
}

@media (prefers-color-scheme: dark) {
  .share-input {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: none;
  background: #0a84ff;
  color: #ffffff;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.25);
  white-space: nowrap;
}

.copy-btn:hover {
  background: #0071e3;
  transform: translateY(-1px);
}

.copy-btn.success {
  background: #32d74b;
  box-shadow: 0 4px 12px rgba(50, 215, 75, 0.3);
}

.copy-btn.full-width {
  width: 100%;
}

/* Secure Share Form */
.secure-content {
  width: 100%;
  align-items: stretch;
}

.secure-form-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row label {
  font-size: 12px;
  font-weight: 650;
  color: #8e8e93;
  display: flex;
  align-items: center;
  gap: 4px;
}

.expiry-chips {
  display: flex;
  gap: 6px;
}

.expiry-chips button {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.expiry-chips button.selected {
  background: rgba(10, 132, 255, 0.18);
  border-color: #0a84ff;
  color: #0a84ff;
  font-weight: 700;
}

.pin-input-group {
  display: flex;
  gap: 8px;
}

.pin-input {
  width: 130px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(60, 60, 67, 0.18);
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.1em;
  outline: none;
}

.pin-rand-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(60, 60, 67, 0.16);
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pin-rand-btn:hover {
  background: rgba(10, 132, 255, 0.12);
  color: #0a84ff;
}

.note-input {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(60, 60, 67, 0.18);
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  font-size: 12.5px;
  outline: none;
}

@media (prefers-color-scheme: dark) {
  .pin-input, .note-input {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

.preview-share-card {
  border-radius: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

@media (prefers-color-scheme: dark) {
  .preview-share-card {
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
  }
}

.preview-header {
  margin-bottom: 6px;
}

.preview-badge {
  font-size: 11px;
  font-weight: 700;
  color: #32d74b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-text {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-all;
  color: #515156;
}

@media (prefers-color-scheme: dark) {
  .preview-text { color: #a1a1a6; }
}

/* Code box */
.code-box {
  width: 100%;
}

.code-textarea {
  width: 100%;
  height: 90px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(60, 60, 67, 0.18);
  background: rgba(0, 0, 0, 0.05);
  color: inherit;
  font-family: "Space Mono", monospace;
  font-size: 12px;
  resize: none;
  outline: none;
}

@media (prefers-color-scheme: dark) {
  .code-textarea {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.12);
  }
}

/* Footer */
.share-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  color: #8e8e93;
}
</style>
