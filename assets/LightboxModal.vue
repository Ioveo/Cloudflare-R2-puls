<script setup>
import { computed, onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "change"]);

const currentItem = computed(() => props.items[props.index] || null);

function prev() {
  if (props.items.length <= 1) return;
  const nextIndex = (props.index - 1 + props.items.length) % props.items.length;
  emit("change", nextIndex);
}

function next() {
  if (props.items.length <= 1) return;
  const nextIndex = (props.index + 1) % props.items.length;
  emit("change", nextIndex);
}

function onKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape") emit("close");
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "ArrowRight") next();
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Transition name="fade">
    <div v-if="visible && currentItem" class="lightbox-mask" @click.self="emit('close')">
      <!-- Top header bar -->
      <header class="lightbox-header">
        <div class="lightbox-info">
          <span class="lightbox-title">{{ currentItem.name }}</span>
          <span v-if="items.length > 1" class="lightbox-counter">{{ index + 1 }} / {{ items.length }}</span>
        </div>
        <div class="lightbox-actions">
          <a class="lightbox-btn" :href="currentItem.url" download :title="'下载 (' + currentItem.name + ')'">
            <i class="ph ph-download-simple"></i>
          </a>
          <a class="lightbox-btn" :href="currentItem.url" target="_blank" rel="noopener" title="在新标签页打开原图">
            <i class="ph ph-arrow-square-out"></i>
          </a>
          <button class="lightbox-btn close-btn" type="button" title="关闭 (Esc)" @click="emit('close')">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </header>

      <!-- Center content -->
      <div class="lightbox-body" @click.self="emit('close')">
        <button v-if="items.length > 1" class="nav-btn prev-btn" type="button" title="上一张 (←)" @click="prev">
          <i class="ph ph-caret-left"></i>
        </button>

        <div class="lightbox-media">
          <img :src="currentItem.url" :alt="currentItem.name" />
        </div>

        <button v-if="items.length > 1" class="nav-btn next-btn" type="button" title="下一张 (→)" @click="next">
          <i class="ph ph-caret-right"></i>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 15, 0.92);
  backdrop-filter: blur(28px) saturate(180%);
  color: #fff;
  animation: fade-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.lightbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.lightbox-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.lightbox-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-counter {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  font-variant-numeric: tabular-nums;
}

.lightbox-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lightbox-btn {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 20px;
  transition: color 0.18s, background 0.18s, transform 0.18s;
  text-decoration: none;
  border: 0;
  cursor: pointer;
}

.lightbox-btn:hover {
  color: #fff;
  background: rgba(10, 132, 255, 0.6);
  transform: scale(1.05);
}

.lightbox-btn.close-btn:hover {
  background: rgba(255, 69, 58, 0.6);
}

.lightbox-body {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  overflow: hidden;
}

.lightbox-media {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-height: calc(100vh - 104px);
}

.lightbox-media img {
  max-width: 90vw;
  max-height: calc(100vh - 120px);
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
  animation: zoom-in 0.22s ease-out;
}

.nav-btn {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 26px;
  cursor: pointer;
  z-index: 10;
  transition: background 0.2s, transform 0.2s, color 0.2s;
  margin: 0 16px;
}

.nav-btn:hover {
  color: #fff;
  background: rgba(10, 132, 255, 0.7);
  transform: scale(1.1);
}

@keyframes zoom-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 640px) {
  .lightbox-header { padding: 0 14px; }
  .nav-btn { width: 42px; height: 42px; font-size: 20px; margin: 0 6px; }
}
</style>
