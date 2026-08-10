<script setup>
import { onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(["close"]);

function onKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="hotkeys-mask" @click.self="emit('close')">
      <div class="hotkeys-card">
        <header class="hotkeys-header">
          <div class="header-title">
            <i class="ph ph-keyboard"></i>
            <span>FlareDrive 全快捷键指南</span>
          </div>
          <button class="close-icon-btn" type="button" @click="emit('close')">×</button>
        </header>

        <div class="hotkeys-grid">
          <div class="hotkey-item">
            <div class="key-combo"><kbd>⌘</kbd><kbd>K</kbd> / <kbd>Ctrl</kbd><kbd>K</kbd></div>
            <div class="key-desc">Spotlight 聚合搜索</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>?</kbd></div>
            <div class="key-desc">打开此快捷键帮助</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>Esc</kbd></div>
            <div class="key-desc">关闭弹窗 / 退出全屏</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>←</kbd> / <kbd>→</kbd></div>
            <div class="key-desc">幻灯片/曲目 上张/下张</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>+</kbd> / <kbd>-</kbd></div>
            <div class="key-desc">大图预览 放大 / 缩小</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>R</kbd></div>
            <div class="key-desc">大图 90° 旋转</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>0</kbd></div>
            <div class="key-desc">重置 100% 原始尺寸</div>
          </div>

          <div class="hotkey-item">
            <div class="key-combo"><kbd>Space</kbd></div>
            <div class="key-desc">音视频 播放 / 暂停</div>
          </div>
        </div>

        <footer class="hotkeys-footer">
          <span>支持 macOS ⌘ Command 与 Windows Ctrl 组合键</span>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.hotkeys-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(24px) saturate(180%);
}

.hotkeys-card {
  width: 90%;
  max-width: 520px;
  padding: 24px 28px;
  border-radius: 26px;
  background: var(--surface-strong);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
  color: var(--ink);
  animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.hotkeys-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
}

.header-title i {
  font-size: 24px;
  color: var(--accent);
}

.close-icon-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: rgba(120, 120, 128, 0.16);
  color: var(--muted);
  font-size: 18px;
  transition: all 0.2s ease;
}

.close-icon-btn:hover {
  background: rgba(255, 69, 58, 0.2);
  color: #ff453a;
}

.hotkeys-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  margin-bottom: 20px;
}

.hotkey-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
}

.key-combo {
  display: flex;
  gap: 4px;
}

kbd {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(120, 120, 128, 0.2);
  border: 1px solid var(--line);
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-weight: 800;
  color: var(--ink);
}

.key-desc {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--muted);
}

.hotkeys-footer {
  text-align: center;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--subtle);
}
</style>
