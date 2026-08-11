<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
  files: { type: Array, default: () => [] },
  folders: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "select-file", "select-folder", "launch-app"]);

const query = ref("");
const selectedIndex = ref(0);
const inputRef = ref(null);

const apps = [
  { id: "finder", name: "访达 (Finder)", type: "app", icon: "ph-folder-simple-star-fill" },
  { id: "photos", name: "照片图库 (Photos)", type: "app", icon: "ph-image-square-fill" },
  { id: "cinema", name: "影院 (Cinema)", type: "app", icon: "ph-film-strip-fill" },
  { id: "music", name: "音乐唱片机 (Music)", type: "app", icon: "ph-music-notes-fill" },
  { id: "editor", name: "代码工坊 (Xcode / TextEdit)", type: "app", icon: "ph-code-fill" },
  { id: "archive", name: "归档解压 (Archive)", type: "app", icon: "ph-package-fill" },
  { id: "doc", name: "文档阅读器 (Preview)", type: "app", icon: "ph-file-text-fill" },
];

const searchResults = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return apps;

  const matchedApps = apps.filter((a) => a.name.toLowerCase().includes(q));
  const matchedFolders = props.folders
    .filter((f) => f.toLowerCase().includes(q))
    .slice(0, 5)
    .map((f) => ({ id: f, name: f.split("/").filter(Boolean).pop() || f, type: "folder", raw: f }));
  const matchedFiles = props.files
    .filter((f) => f.key.toLowerCase().includes(q))
    .slice(0, 15)
    .map((f) => ({ id: f.key, name: f.key.split("/").filter(Boolean).pop() || f.key, type: "file", raw: f }));

  return [...matchedApps, ...matchedFolders, ...matchedFiles];
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    query.value = "";
    selectedIndex.value = 0;
    nextTick(() => inputRef.value?.focus());
  }
});

watch(searchResults, () => {
  selectedIndex.value = 0;
});

function handleKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (searchResults.value.length) {
      selectedIndex.value = (selectedIndex.value + 1) % searchResults.value.length;
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (searchResults.value.length) {
      selectedIndex.value = (selectedIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = searchResults.value[selectedIndex.value];
    if (item) chooseItem(item);
  }
}

function chooseItem(item) {
  emit("close");
  if (item.type === "app") {
    emit("launch-app", item.id);
  } else if (item.type === "folder") {
    emit("select-folder", item.raw);
  } else if (item.type === "file") {
    emit("select-file", item.raw);
  }
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="spotlight-mask" @click.self="emit('close')">
      <div class="spotlight-window">
        <!-- Input Row -->
        <div class="spotlight-input-row">
          <i class="ph ph-magnifying-glass"></i>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Spotlight 聚焦搜索文件、应用程序与目录..."
            aria-label="Spotlight 搜索"
          />
        </div>

        <!-- Results List -->
        <div v-if="searchResults.length" class="spotlight-results">
          <div
            v-for="(item, idx) in searchResults"
            :key="item.id + idx"
            class="spotlight-row"
            :class="{ selected: selectedIndex === idx }"
            @click="chooseItem(item)"
          >
            <div class="row-icon">
              <i class="ph" :class="item.type === 'app' ? item.icon : (item.type === 'folder' ? 'ph-folder-fill' : 'ph-file-fill')"></i>
            </div>
            <div class="row-content">
              <strong>{{ item.name }}</strong>
              <span>{{ item.type === 'app' ? '应用程序' : (item.type === 'folder' ? '目录路径' : item.raw?.key) }}</span>
            </div>
            <kbd v-if="selectedIndex === idx">↵ 打开</kbd>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.spotlight-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  justify-content: center;
  padding-top: 14vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px) saturate(160%);
  animation: fade-in 0.15s ease-out;
}

.spotlight-window {
  width: min(640px, calc(100% - 32px));
  height: fit-content;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: rgba(30, 31, 38, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 35px 90px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(45px) saturate(220%);
  overflow: hidden;
  color: #f2f2f7;
  animation: spot-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

[data-theme="light"] .spotlight-window {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 35px 90px rgba(0, 0, 0, 0.25), inset 0 1px 0 #ffffff;
  color: #1d1d1f;
}

.spotlight-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .spotlight-input-row {
  border-bottom-color: rgba(60, 60, 67, 0.08);
}

.spotlight-input-row i {
  font-size: 22px;
  color: #0a84ff;
}

.spotlight-input-row input {
  flex: 1;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 16px;
  font-weight: 500;
  outline: none;
}

.spotlight-results {
  overflow-y: auto;
  max-height: 380px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spotlight-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.spotlight-row.selected, .spotlight-row:hover {
  background: #0a84ff;
  color: #ffffff;
}

.row-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 18px;
  flex-shrink: 0;
}

.spotlight-row.selected .row-icon {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.row-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row-content strong {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-content span {
  font-size: 11px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spotlight-row kbd {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.25);
}

@keyframes spot-in {
  from { opacity: 0; transform: translateY(-15px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
