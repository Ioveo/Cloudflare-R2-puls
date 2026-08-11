<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  storageId: { type: String, default: "default" },
});

const emit = defineEmits(["close", "change"]);

const videoRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const playbackRate = ref(1);
const showControls = ref(true);
const isPip = ref(false);
let hideControlsTimer = null;

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

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, "0")}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function togglePlay() {
  if (!videoRef.value) return;
  if (videoRef.value.paused) {
    videoRef.value.play();
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
  const targetTime = Number(e.target.value);
  if (videoRef.value) {
    videoRef.value.currentTime = targetTime;
    currentTime.value = targetTime;
  }
}

function seekRelative(seconds) {
  if (!videoRef.value) return;
  videoRef.value.currentTime = Math.max(0, Math.min(duration.value, videoRef.value.currentTime + seconds));
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
  clearTimeout(hideControlsTimer);
  if (isPlaying.value) {
    hideControlsTimer = setTimeout(() => {
      showControls.value = false;
    }, 2800);
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
  clearTimeout(hideControlsTimer);
});
</script>

<template>
  <MacWindow
    v-if="visible"
    :title="videoTitle"
    icon="ph-film-strip-fill"
    :visible="visible"
    :width="840"
    :height="520"
    :initial-x="160"
    :initial-y="80"
    :z-index="30"
    :is-active="true"
    @close="emit('close')"
  >
    <template #titlebar-right>
      <div class="qt-top-tools">
        <span class="qt-quality-tag">4K HD</span>
        <button v-if="items.length > 1" class="tool-btn" type="button" title="上一个 (←)" @click="prevVideo">
          <i class="ph ph-caret-left-bold"></i>
        </button>
        <button v-if="items.length > 1" class="tool-btn" type="button" title="下一个 (→)" @click="nextVideo">
          <i class="ph ph-caret-right-bold"></i>
        </button>
      </div>
    </template>

    <div class="quicktime-container" @mousemove="onUserActivity" @click="onUserActivity">
      <!-- Video Element -->
      <video
        ref="videoRef"
        class="quicktime-video"
        :src="currentItem?.url"
        playsinline
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @ended="nextVideo"
        @click="togglePlay"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      ></video>

      <!-- Center Big Play Button (when paused) -->
      <Transition name="fade">
        <div v-if="!isPlaying" class="big-play-overlay" @click="togglePlay">
          <div class="play-orb">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86a1 1 0 0 0-1.5.86z" />
            </svg>
          </div>
        </div>
      </Transition>

      <!-- Floating macOS Glass Transport Controls -->
      <Transition name="fade">
        <div v-show="showControls || !isPlaying" class="qt-transport-bar">
          <!-- Timeline Slider -->
          <div class="qt-progress-row">
            <span class="time-lbl">{{ formatTime(currentTime) }}</span>
            <input
              type="range"
              class="qt-slider"
              min="0"
              :max="duration || 100"
              step="0.1"
              :value="currentTime"
              @input="onSeek"
            />
            <span class="time-lbl">{{ formatTime(duration) }}</span>
          </div>

          <!-- Action Buttons Row -->
          <div class="qt-actions-row">
            <!-- Left Group -->
            <div class="qt-action-left">
              <button class="qt-btn" type="button" title="后退 5 秒" @click="seekRelative(-5)">
                <i class="ph ph-arrow-counter-clockwise-bold"></i>
              </button>
              <button class="qt-btn play-toggle-btn" type="button" :title="isPlaying ? '暂停 (Space)' : '播放 (Space)'" @click="togglePlay">
                <i class="ph" :class="isPlaying ? 'ph-pause-fill' : 'ph-play-fill'"></i>
              </button>
              <button class="qt-btn" type="button" title="快进 5 秒" @click="seekRelative(5)">
                <i class="ph ph-arrow-clockwise-bold"></i>
              </button>

              <!-- Volume Control -->
              <div class="qt-volume-wrap">
                <button class="qt-btn" type="button" :title="isMuted ? '取消静音 (M)' : '静音 (M)'" @click="toggleMute">
                  <i class="ph" :class="isMuted || volume === 0 ? 'ph-speaker-x-fill' : (volume > 0.5 ? 'ph-speaker-high-fill' : 'ph-speaker-low-fill')"></i>
                </button>
                <input
                  type="range"
                  class="volume-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="isMuted ? 0 : volume"
                  @input="onVolumeChange"
                />
              </div>
            </div>

            <!-- Right Group -->
            <div class="qt-action-right">
              <!-- Playback Speed -->
              <div class="speed-select-badge">
                <select :value="playbackRate" @change="setPlaybackRate(Number($event.target.value))">
                  <option :value="0.5">0.5x</option>
                  <option :value="0.75">0.75x</option>
                  <option :value="1">1.0x 正常</option>
                  <option :value="1.25">1.25x</option>
                  <option :value="1.5">1.5x</option>
                  <option :value="2">2.0x</option>
                </select>
              </div>

              <!-- Picture in Picture -->
              <button class="qt-btn" type="button" title="画中画模式" @click="togglePiP">
                <i class="ph ph-picture-in-picture-bold"></i>
              </button>

              <!-- Download Button -->
              <a class="qt-btn" :href="currentItem?.url" download title="下载原视频">
                <i class="ph ph-download-simple-bold"></i>
              </a>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </MacWindow>
</template>

<style scoped>
.quicktime-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.quicktime-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
}

.big-play-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.play-orb {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: rgba(10, 132, 255, 0.9);
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(10, 132, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);
  transition: transform 0.15s ease;
}

.big-play-overlay:hover .play-orb {
  transform: scale(1.1);
}

/* Floating Glass Transport Bar */
.qt-transport-bar {
  position: absolute;
  bottom: 16px;
  left: 20px;
  right: 20px;
  padding: 12px 18px;
  border-radius: 18px;
  background: rgba(20, 21, 28, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(35px) saturate(200%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #f2f2f7;
}

.qt-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-lbl {
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
  width: 44px;
}

.qt-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  accent-color: #0a84ff;
  cursor: pointer;
}

.qt-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qt-action-left, .qt-action-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qt-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.12s ease;
  text-decoration: none;
}

.qt-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.play-toggle-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 18px;
}

.qt-volume-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.volume-slider {
  width: 60px;
  height: 3px;
  accent-color: #0a84ff;
  cursor: pointer;
}

.speed-select-badge {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 600;
}

.speed-select-badge select {
  border: none;
  background: transparent;
  color: inherit;
  outline: none;
  font-size: 11px;
  cursor: pointer;
}

.qt-top-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qt-quality-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: #0a84ff;
  color: #ffffff;
}

.tool-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
}

.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
