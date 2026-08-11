<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  storageId: { type: String, default: "default" },
  zIndex: { type: Number, default: 40 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "change", "focus"]);

const videoRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const playbackRate = ref(1);
const showControls = ref(true);
const isPip = ref(false);
let hideTimer = null;

const currentItem = computed(() => {
  if (props.items.length && props.index >= 0 && props.index < props.items.length) {
    return props.items[props.index];
  }
  return props.file ? { name: fileName(props.file.key), url: rawPath(props.file.key), file: props.file } : null;
});

const videoTitle = computed(() => currentItem.value?.name || "QuickTime 播放器");

function fileName(key) {
  return key ? key.split("/").filter(Boolean).pop() || key : "";
}

function rawPath(key) {
  if (!key) return "";
  const path = `/raw/${key}`;
  return props.storageId === "default" ? path : `${path}?storage=${encodeURIComponent(props.storageId)}`;
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(remM).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play().catch(() => {});
    isPlaying.value = true;
  } else {
    videoRef.value.pause();
    isPlaying.value = false;
  }
}

function onTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
    duration.value = videoRef.value.duration || 0;
  }
}

function onSeek(e) {
  const target = Number(e.target.value);
  if (videoRef.value) {
    videoRef.value.currentTime = target;
    currentTime.value = target;
  }
}

function seekRelative(sec) {
  if (!videoRef.value) return;
  videoRef.value.currentTime = Math.max(0, Math.min(duration.value, videoRef.value.currentTime + sec));
}

function setPlaybackRate(rate) {
  playbackRate.value = rate;
  if (videoRef.value) {
    videoRef.value.playbackRate = rate;
  }
}

function toggleMute() {
  if (!videoRef.value) return;
  isMuted.value = !isMuted.value;
  videoRef.value.muted = isMuted.value;
}

function onVolumeChange(e) {
  const val = Number(e.target.value);
  volume.value = val;
  if (videoRef.value) {
    videoRef.value.volume = val;
    videoRef.value.muted = val === 0;
    isMuted.value = val === 0;
  }
}

async function togglePiP() {
  if (!videoRef.value) return;
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      isPip.value = false;
    } else {
      await videoRef.value.requestPictureInPicture();
      isPip.value = true;
    }
  } catch (err) {
    console.warn("PiP not supported or failed", err);
  }
}

function prevVideo() {
  if (props.items.length > 1) {
    const nextIdx = (props.index - 1 + props.items.length) % props.items.length;
    emit("change", nextIdx);
  }
}

function nextVideo() {
  if (props.items.length > 1) {
    const nextIdx = (props.index + 1) % props.items.length;
    emit("change", nextIdx);
  }
}

function onUserActivity() {
  showControls.value = true;
  clearTimeout(hideTimer);
  if (isPlaying.value) {
    hideTimer = setTimeout(() => {
      showControls.value = false;
    }, 2500);
  }
}

function handleKeydown(e) {
  if (!props.visible) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    togglePlay();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    seekRelative(-5);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    seekRelative(5);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    volume.value = Math.min(1, volume.value + 0.1);
    if (videoRef.value) videoRef.value.volume = volume.value;
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    volume.value = Math.max(0, volume.value - 0.1);
    if (videoRef.value) videoRef.value.volume = volume.value;
  } else if (e.key.toLowerCase() === "m") {
    toggleMute();
  } else if (e.key === "Escape") {
    emit("close");
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    onUserActivity();
  } else if (videoRef.value) {
    videoRef.value.pause();
    isPlaying.value = false;
  }
});

watch(() => currentItem.value, () => {
  if (videoRef.value) {
    videoRef.value.currentTime = 0;
    if (props.visible) {
      videoRef.value.play().catch(() => {});
      isPlaying.value = true;
    }
  }
});

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
  clearTimeout(hideTimer);
});
</script>

<template>
  <MacWindow
    v-if="visible"
    :title="videoTitle"
    icon="ph-film-strip-fill"
    :visible="visible"
    :width="880"
    :height="540"
    :initial-x="140"
    :initial-y="60"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <template #titlebar-right>
      <div class="qt-header-actions">
        <span class="qt-tag">QuickTime 4K</span>
        <button v-if="items.length > 1" class="qt-hdr-btn" type="button" title="上一个视频" @click="prevVideo">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        </button>
        <button v-if="items.length > 1" class="qt-hdr-btn" type="button" title="下一个视频" @click="nextVideo">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
      </div>
    </template>

    <div class="quicktime-stage" @mousemove="onUserActivity" @click="onUserActivity">
      <!-- Native Video Frame -->
      <video
        ref="videoRef"
        class="quicktime-video-el"
        :src="currentItem?.url"
        playsinline
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @ended="nextVideo"
        @click="togglePlay"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      ></video>

      <!-- Center Big Play Button (Paused State) -->
      <Transition name="fade">
        <div v-if="!isPlaying" class="qt-center-play" @click="togglePlay">
          <div class="qt-play-disc">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </Transition>

      <!-- 1:1 macOS Sequoia Frosted Glass Transport HUD -->
      <Transition name="hud-fade">
        <div v-show="showControls || !isPlaying" class="qt-glass-hud">
          <!-- Top Scrub Timeline -->
          <div class="qt-timeline-row">
            <span class="hud-time-txt">{{ formatTime(currentTime) }}</span>
            <div class="slider-wrapper">
              <input
                type="range"
                class="qt-hud-range"
                min="0"
                :max="duration || 100"
                step="0.1"
                :value="currentTime"
                @input="onSeek"
              />
            </div>
            <span class="hud-time-txt">{{ formatTime(duration) }}</span>
          </div>

          <!-- Bottom Action Controls -->
          <div class="qt-hud-controls">
            <!-- Left Side: Transport buttons -->
            <div class="hud-left-group">
              <!-- Rewind 5s -->
              <button class="hud-icon-btn" type="button" title="后退 5 秒" @click="seekRelative(-5)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.2 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
                </svg>
              </button>

              <!-- Main Play / Pause Circle -->
              <button class="hud-main-play-btn" type="button" :title="isPlaying ? '暂停 (Space)' : '播放 (Space)'" @click="togglePlay">
                <svg v-if="!isPlaying" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              </button>

              <!-- Forward 5s -->
              <button class="hud-icon-btn" type="button" title="快进 5 秒" @click="seekRelative(5)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M11.5 8c2.65 0 5.05 1 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.2-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.03 6.85 8 11.5 8z"/>
                </svg>
              </button>

              <!-- Volume Pill -->
              <div class="hud-vol-pill">
                <button class="hud-vol-btn" type="button" :title="isMuted ? '取消静音 (M)' : '静音 (M)'" @click="toggleMute">
                  <svg v-if="isMuted || volume === 0" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </button>
                <input
                  type="range"
                  class="hud-vol-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="isMuted ? 0 : volume"
                  @input="onVolumeChange"
                />
              </div>
            </div>

            <!-- Right Side: Speed, PiP, Download -->
            <div class="hud-right-group">
              <!-- Playback Speed Badge -->
              <label class="hud-speed-pill" title="播放倍速">
                <select :value="playbackRate" @change="setPlaybackRate(Number($event.target.value))">
                  <option :value="0.5">0.5x</option>
                  <option :value="0.75">0.75x</option>
                  <option :value="1">1.0x 正常</option>
                  <option :value="1.25">1.25x</option>
                  <option :value="1.5">1.5x</option>
                  <option :value="2">2.0x</option>
                </select>
              </label>

              <!-- PiP Button -->
              <button class="hud-icon-btn" type="button" title="画中画 (PiP)" @click="togglePiP">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
                </svg>
              </button>

              <!-- Download Button -->
              <a class="hud-icon-btn" :href="currentItem?.url" download title="下载原视频">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </MacWindow>
</template>

<style scoped>
.quicktime-stage {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

.quicktime-video-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
  background: #000000;
}

/* Center Play Button */
.qt-center-play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
  z-index: 10;
}

.qt-play-disc {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(10, 132, 255, 0.95);
  color: #ffffff;
  box-shadow: 0 12px 35px rgba(10, 132, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(16px);
  transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.qt-center-play:hover .qt-play-disc {
  transform: scale(1.1);
}

/* 1:1 macOS Glass Transport HUD */
.qt-glass-hud {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: min(720px, calc(100% - 32px));
  padding: 14px 20px;
  border-radius: 20px;
  background: rgba(26, 27, 34, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(40px) saturate(220%);
  color: #f2f2f7;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 20;
}

[data-theme="light"] .qt-glass-hud {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22), inset 0 1px 0 #ffffff;
  color: #1d1d1f;
}

/* Timeline */
.qt-timeline-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-time-txt {
  font-size: 11.5px;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
  width: 46px;
  text-align: center;
}

.slider-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
}

.qt-hud-range {
  width: 100%;
  height: 5px;
  border-radius: 3px;
  accent-color: #0a84ff;
  cursor: pointer;
  outline: none;
}

/* Controls */
.qt-hud-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hud-left-group, .hud-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.12s ease;
}

.hud-icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

[data-theme="light"] .hud-icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.hud-main-play-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #0a84ff;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(10, 132, 255, 0.45);
  transition: transform 0.14s ease;
}

.hud-main-play-btn:hover {
  transform: scale(1.08);
}

.hud-vol-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .hud-vol-pill {
  background: rgba(0, 0, 0, 0.05);
}

.hud-vol-btn {
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.hud-vol-slider {
  width: 65px;
  height: 4px;
  accent-color: #0a84ff;
  cursor: pointer;
}

.hud-speed-pill {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

[data-theme="light"] .hud-speed-pill {
  background: rgba(0, 0, 0, 0.05);
}

.hud-speed-pill select {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11.5px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

/* Header actions */
.qt-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qt-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 5px;
  background: #0a84ff;
  color: #ffffff;
}

.qt-hdr-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.qt-hdr-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.hud-fade-enter-active, .hud-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.hud-fade-enter-from, .hud-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
