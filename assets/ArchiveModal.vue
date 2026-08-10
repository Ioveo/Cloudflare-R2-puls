<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  visible: Boolean,
  file: { type: Object, default: null },
});

const emit = defineEmits(["close"]);

const loading = ref(false);
const zipTree = ref([]);
const rawSize = ref(0);
const errorMsg = ref("");

const fileName = computed(() => {
  if (!props.file) return "";
  return props.file.key.split("/").pop() || props.file.key;
});

const extTag = computed(() => {
  const name = fileName.value;
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "ZIP";
});

function formatSize(size) {
  if (!size || isNaN(size)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let s = size;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
}

async function inspectZip() {
  if (!props.file?.url) return;
  loading.value = true;
  errorMsg.value = "";
  zipTree.value = [];
  try {
    const isZip = /\.zip$/i.test(props.file.key);
    if (!isZip || typeof window.JSZip === "undefined") {
      loading.value = false;
      return;
    }
    const res = await fetch(props.file.url);
    if (!res.ok) throw new Error("无法读取压缩包");
    const buffer = await res.arrayBuffer();
    const zip = await window.JSZip.loadAsync(buffer);
    
    const list = [];
    zip.forEach((relativePath, fileObj) => {
      list.push({
        name: relativePath,
        isDir: fileObj.dir,
        date: fileObj.date ? new Date(fileObj.date).toLocaleDateString() : "",
      });
    });
    zipTree.value = list.slice(0, 100); // Top 100 items
  } catch (err) {
    console.warn("ZIP inspection failed", err);
    errorMsg.value = "支持直接全包下载，未开启解密或加密压缩包。";
  } finally {
    loading.value = false;
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal && props.file) {
    inspectZip();
  }
});
</script>

<template>
  <Transition name="fade">
    <div v-if="visible && file" class="archive-mask" @click.self="emit('close')">
      <div class="archive-card">
        <header class="archive-header">
          <div class="archive-title-box">
            <span class="archive-badge">{{ extTag }}</span>
            <div>
              <h3>{{ fileName }}</h3>
              <p>{{ formatSize(file.file?.size) }} · 归档压缩包文件</p>
            </div>
          </div>
          <button class="close-btn" type="button" @click="emit('close')">×</button>
        </header>

        <main class="archive-body">
          <div v-if="loading" class="archive-loading">
            <div class="spinner"></div>
            <p>正在读取压缩包内部目录结构...</p>
          </div>

          <div v-else-if="zipTree.length" class="zip-list-wrapper">
            <div class="zip-list-head">
              <span>压缩包内部包含文件 (显示前 {{ zipTree.length }} 项)</span>
            </div>
            <ul class="zip-file-tree">
              <li v-for="item in zipTree" :key="item.name" class="tree-node" :class="{ 'is-folder': item.isDir }">
                <i :class="['ph', item.isDir ? 'ph-folder' : 'ph-file']"></i>
                <span class="node-name">{{ item.name }}</span>
                <span v-if="item.date" class="node-date">{{ item.date }}</span>
              </li>
            </ul>
          </div>

          <div v-else class="archive-placeholder">
            <div class="archive-big-icon">
              <i class="ph ph-package"></i>
            </div>
            <h4>已识别 {{ extTag }} 压缩归档文件</h4>
            <p>{{ errorMsg || '点击下方按钮即可一键全速下载此压缩包文件。' }}</p>
          </div>
        </main>

        <footer class="archive-footer">
          <button class="secondary-btn" type="button" @click="emit('close')">关闭</button>
          <a class="primary-download-btn" :href="file.url" download>
            <i class="ph ph-download-simple"></i> 一键下载全包 ({{ formatSize(file.file?.size) }})
          </a>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.archive-mask {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(12, 12, 16, 0.75);
  backdrop-filter: blur(20px);
  animation: fade-in 0.25s ease-out;
}

.archive-card {
  width: 100%;
  max-width: 580px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

@media (prefers-color-scheme: dark) {
  .archive-card {
    background: rgba(26, 26, 32, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f2f2f7;
  }
}

.archive-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.1);
}

.archive-title-box {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.archive-badge {
  padding: 8px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff9500, #ff5e00);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(255, 149, 0, 0.3);
}

.archive-title-box h3 {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-title-box p {
  margin: 0;
  font-size: 12px;
  color: #8e8e93;
}

.close-btn {
  background: transparent;
  border: 0;
  font-size: 26px;
  color: #8e8e93;
  cursor: pointer;
}

.archive-body {
  padding: 20px 24px;
  overflow-y: auto;
  min-height: 200px;
  flex: 1;
}

.archive-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #8e8e93;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(10, 132, 255, 0.2);
  border-top-color: #0a84ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.archive-placeholder {
  text-align: center;
  padding: 24px 0;
}

.archive-big-icon {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  margin: 0 auto 16px;
  border-radius: 20px;
  background: rgba(255, 149, 0, 0.12);
  color: #ff9500;
  font-size: 38px;
}

.archive-placeholder h4 {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
}

.archive-placeholder p {
  margin: 0;
  font-size: 13px;
  color: #8e8e93;
}

.zip-list-head {
  font-size: 12px;
  font-weight: 600;
  color: #8e8e93;
  margin-bottom: 10px;
}

.zip-file-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(60, 60, 67, 0.1);
  border-radius: 12px;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  font-size: 13px;
  border-bottom: 1px solid rgba(60, 60, 67, 0.06);
}

.tree-node:last-child {
  border-bottom: none;
}

.tree-node i {
  color: #0a84ff;
  font-size: 17px;
}

.tree-node.is-folder i {
  color: #ff9500;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-date {
  font-size: 11px;
  color: #8e8e93;
  font-variant-numeric: tabular-nums;
}

.archive-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(60, 60, 67, 0.04);
  border-top: 1px solid rgba(60, 60, 67, 0.1);
}

.secondary-btn {
  padding: 10px 18px;
  border-radius: 10px;
  background: rgba(118, 118, 128, 0.12);
  color: inherit;
  font-weight: 600;
  font-size: 13px;
  border: 0;
  cursor: pointer;
}

.primary-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff9500, #ff5e00);
  color: #fff;
  font-weight: 650;
  font-size: 13px;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(255, 149, 0, 0.35);
  transition: transform 0.18s, box-shadow 0.18s;
}

.primary-download-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(255, 149, 0, 0.45);
}
</style>
