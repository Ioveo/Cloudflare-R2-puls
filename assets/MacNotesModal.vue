<script setup>
import { ref, onMounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  zIndex: { type: Number, default: 41 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "focus"]);

const notes = ref(JSON.parse(localStorage.getItem("mac-user-notes") || "[]"));
const activeIndex = ref(0);

if (notes.value.length === 0) {
  notes.value = [
    { id: 1, title: "欢迎使用备忘录", body: "这是您的 macOS 原生灵感备忘录。支持自动实时本地保存、多便签切换与富文本记录。", time: new Date().toLocaleTimeString() },
    { id: 2, title: "待办事项 (To-Do)", body: "- [x] 体验 1:1 macOS 桌面风格\n- [x] 测试 R2 云存储超大文件秒传\n- [x] 照片壁纸一键设置\n- [ ] 探索更多好玩的功能", time: new Date().toLocaleTimeString() },
  ];
}

function saveNotes() {
  localStorage.setItem("mac-user-notes", JSON.stringify(notes.value));
}

function createNote() {
  const newNote = {
    id: Date.now(),
    title: "新备忘录",
    body: "",
    time: new Date().toLocaleTimeString(),
  };
  notes.value.unshift(newNote);
  activeIndex.value = 0;
  saveNotes();
}

function deleteNote(idx) {
  notes.value.splice(idx, 1);
  if (notes.value.length === 0) {
    createNote();
  } else {
    activeIndex.value = Math.max(0, activeIndex.value - 1);
  }
  saveNotes();
}

function onBodyInput(e) {
  const text = e.target.value;
  const firstLine = text.split("\n")[0] || "新备忘录";
  notes.value[activeIndex.value].title = firstLine.slice(0, 20);
  notes.value[activeIndex.value].body = text;
  notes.value[activeIndex.value].time = new Date().toLocaleTimeString();
  saveNotes();
}
</script>

<template>
  <MacWindow
    v-if="visible"
    title="备忘录 (Notes)"
    icon="ph-note-pencil-fill"
    :visible="visible"
    :width="640"
    :height="440"
    :initial-x="180"
    :initial-y="100"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <template #titlebar-right>
      <div class="notes-titlebar-tools">
        <span class="notes-auto-save-pill">
          <i class="dot-live"></i> 已实时本地存储
        </span>
        <button class="notes-new-btn" type="button" title="新建备忘录 (⌘N)" @click="createNote">
          <i class="ph ph-note-pencil-bold"></i>
          <span>新建便签</span>
        </button>
      </div>
    </template>

    <div class="notes-layout">
      <!-- Left Sidebar Note List -->
      <aside class="notes-list-pane">
        <div
          v-for="(note, idx) in notes"
          :key="note.id"
          class="note-card-item"
          :class="{ active: activeIndex === idx }"
          @click="activeIndex = idx"
        >
          <div class="note-card-header">
            <strong>{{ note.title || '无标题' }}</strong>
            <button class="note-del-btn" title="删除便签" @click.stop="deleteNote(idx)">
              <i class="ph ph-trash"></i>
            </button>
          </div>
          <span class="note-card-time">{{ note.time }}</span>
          <p class="note-card-preview">{{ note.body ? note.body.slice(0, 35) : '无附加文本' }}</p>
        </div>
      </aside>

      <!-- Right Editor Area -->
      <main class="notes-editor-pane">
        <textarea
          :value="notes[activeIndex]?.body"
          placeholder="在此键入您的灵感或备忘内容..."
          class="notes-textarea"
          @input="onBodyInput"
        ></textarea>
      </main>
    </div>
  </MacWindow>
</template>

<style scoped>
.notes-layout {
  display: flex;
  height: 100%;
  background: #1e1e24;
}

[data-theme="light"] .notes-layout {
  background: #fbfbfd;
}

.notes-list-pane {
  width: 220px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

[data-theme="light"] .notes-list-pane {
  border-right-color: rgba(0, 0, 0, 0.1);
  background: #f2f2f7;
}

.note-card-item {
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  border: 1px solid transparent;
}

.note-card-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.note-card-item.active {
  background: #ffcc00;
  color: #1c1c1e;
  box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
}

.note-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.note-card-header strong {
  font-size: 12.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-del-btn {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 13px;
}

.note-del-btn:hover {
  opacity: 1;
}

.note-card-time {
  font-size: 10.5px;
  opacity: 0.7;
  display: block;
  margin-top: 2px;
}

.note-card-preview {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.notes-textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.notes-titlebar-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notes-auto-save-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #34c759;
  background: rgba(52, 199, 89, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.dot-live {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 6px #34c759;
}

.notes-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 6px;
  background: #ffcc00;
  color: #1c1c1e;
  font-size: 11.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 204, 0, 0.4);
}
</style>
