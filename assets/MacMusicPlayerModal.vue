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

const audioRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.85);
const isMuted = ref(false);
const isLoop = ref(false);
const isShuffle = ref(false);
const showPlaylist = ref(false);

const currentItem = computed(() => {
  if (props.items.length && props.index >= 0 && props.index < props.items.length) {
    return props.items[props.index];
  }
  return props.file ? { name: fileName(props.file.key), url: rawPath(props.file.key), file: props.file } : null;
});

const songTitle = computed(() => {
  const name = currentItem.value?.name || "音乐播放器";
  return name.replace(/\.(mp3|flac|wav|ogg|m4a|aac|opus)$/i, "");
});

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
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function togglePlay() {
  if (!audioRef.value) return;
  if (audioRef.value.paused) {
    audioRef.value.play().catch(() => {});
    isPlaying.value = true;
  } else {
    audioRef.value.pause();
    isPlaying.value = false;
  }
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime;
    duration.value = audioRef.value.duration || 0;
  }
}

function onSeek(e) {
  const targetTime = Number(e.target.value);
  if (audioRef.value) {
    audioRef.value.currentTime = targetTime;
    currentTime.value = targetTime;
  }
}

function prevSong() {
  if (props.items.length > 1) {
    const nextIdx = (props.index - 1 + props.items.length) % props.items.length;
    emit("change", nextIdx);
  }
}

function nextSong() {
  if (props.items.length > 1) {
    let nextIdx = 0;
    if (isShuffle.value) {
      nextIdx = Math.floor(Math.random() * props.items.length);
    } else {
      nextIdx = (props.index + 1) % props.items.length;
    }
    emit("change", nextIdx);
  }
}

function onEnded() {
  if (isLoop.value && audioRef.value) {
    audioRef.value.currentTime = 0;
    audioRef.value.play();
  } else {
    nextSong();
  }
}

function onVolumeChange(e) {
  const val = Number(e.target.value);
  volume.value = val;
  if (audioRef.value) {
    audioRef.value.volume = val;
    audioRef.value.muted = val === 0;
    isMuted.value = val === 0;
  }
}

function toggleMute() {
  if (!audioRef.value) return;
  isMuted.value = !isMuted.value;
  audioRef.value.muted = isMuted.value;
}

watch(() => props.visible, (val) => {
  if (!val && audioRef.value) {
    audioRef.value.pause();
    isPlaying.value = false;
  }
});

watch(() => currentItem.value, () => {
  if (audioRef.value) {
    audioRef.value.currentTime = 0;
    if (props.visible) {
      audioRef.value.play().catch(() => {});
      isPlaying.value = true;
    }
  }
});
</script>

<template>
  <MacWindow
    v-if="visible"
    :title="songTitle"
    icon="ph-music-notes-fill"
    :visible="visible"
    :width="780"
    :height="460"
    :initial-x="180"
    :initial-y="100"
    :z-index="32"
    :is-active="true"
    @close="emit('close')"
  >
    <template #titlebar-right>
      <div class="music-top-actions">
        <span class="lossless-badge">Hi-Res Lossless</span>
        <button class="tool-btn" :class="{ active: showPlaylist }" type="button" title="播放列表" @click="showPlaylist = !showPlaylist">
          <i class="ph ph-playlist-bold"></i>
        </button>
      </div>
    </template>

    <div class="music-window-body">
      <!-- Hidden Audio Element -->
      <audio
        ref="audioRef"
        :src="currentItem?.url"
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      ></audio>

      <!-- Main Stage -->
      <div class="music-stage" :class="{ 'with-playlist': showPlaylist }">
        <!-- 1. Vinyl Record Turntable Animation Column -->
        <div class="vinyl-turntable-box">
          <div class="turntable-base">
            <!-- Tone Arm -->
            <div class="tone-arm" :class="{ 'is-playing': isPlaying }"></div>
            
            <!-- Vinyl Disc -->
            <div class="vinyl-disc" :class="{ 'is-spinning': isPlaying }">
              <div class="vinyl-grooves"></div>
              <div class="vinyl-center-label">
                <i class="ph ph-music-notes-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Track Info & Controls Column -->
        <div class="music-info-panel">
          <div class="track-header">
            <span class="album-tag">天才猫高保真曲库</span>
            <h2 class="track-name" :title="songTitle">{{ songTitle }}</h2>
            <div class="audio-specs">
              <span class="spec-chip"><i class="ph ph-broadcast-bold"></i> 48kHz / 24bit</span>
              <span class="spec-chip"><i class="ph ph-wave-sine-bold"></i> 立体声</span>
            </div>
          </div>

          <!-- Dynamic Equalizer Visualizer Bars -->
          <div class="equalizer-bars" :class="{ 'is-active': isPlaying }">
            <span v-for="i in 18" :key="i" class="eq-bar" :style="{ animationDelay: `${(i * 0.08).toFixed(2)}s` }"></span>
          </div>

          <!-- Progress Slider -->
          <div class="progress-section">
            <input
              type="range"
              class="music-slider"
              min="0"
              :max="duration || 100"
              step="0.1"
              :value="currentTime"
              @input="onSeek"
            />
            <div class="time-row">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- Transport Buttons -->
          <div class="music-controls-row">
            <button class="m-ctrl-btn" :class="{ active: isShuffle }" type="button" title="随机播放" @click="isShuffle = !isShuffle">
              <i class="ph ph-shuffle-bold"></i>
            </button>

            <button class="m-ctrl-btn" type="button" title="上一首" @click="prevSong">
              <i class="ph ph-skip-back-fill"></i>
            </button>

            <button class="m-play-btn" type="button" :title="isPlaying ? '暂停 (Space)' : '播放 (Space)'" @click="togglePlay">
              <i class="ph" :class="isPlaying ? 'ph-pause-fill' : 'ph-play-fill'"></i>
            </button>

            <button class="m-ctrl-btn" type="button" title="下一首" @click="nextSong">
              <i class="ph ph-skip-forward-fill"></i>
            </button>

            <button class="m-ctrl-btn" :class="{ active: isLoop }" type="button" title="单曲循环" @click="isLoop = !isLoop">
              <i class="ph ph-repeat-bold"></i>
            </button>
          </div>

          <!-- Volume & Download -->
          <div class="music-footer-row">
            <div class="vol-box">
              <button class="m-mini-btn" type="button" @click="toggleMute">
                <i class="ph" :class="isMuted || volume === 0 ? 'ph-speaker-x-fill' : 'ph-speaker-high-fill'"></i>
              </button>
              <input
                type="range"
                class="vol-slider"
                min="0"
                max="1"
                step="0.05"
                :value="isMuted ? 0 : volume"
                @input="onVolumeChange"
              />
            </div>

            <a class="m-mini-btn" :href="currentItem?.url" download title="下载无损原曲">
              <i class="ph ph-download-simple-bold"></i>
            </a>
          </div>
        </div>

        <!-- 3. Playlist Drawer -->
        <div v-if="showPlaylist" class="playlist-sidebar">
          <header class="pl-header">
            <h4>播放列表 ({{ items.length }})</h4>
          </header>
          <div class="pl-list">
            <div
              v-for="(item, idx) in items"
              :key="item.name + idx"
              class="pl-item"
              :class="{ active: index === idx }"
              @click="emit('change', idx)"
            >
              <div class="pl-icon">
                <i class="ph" :class="index === idx && isPlaying ? 'ph-speaker-high-fill' : 'ph-music-notes-simple'"></i>
              </div>
              <span class="pl-name" :title="item.name">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.music-window-body {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 80% 20%, rgba(250, 35, 59, 0.18), rgba(20, 21, 28, 0.95) 70%);
  display: flex;
  overflow: hidden;
  color: #f2f2f7;
}

[data-theme="light"] .music-window-body {
  background: radial-gradient(circle at 80% 20%, rgba(250, 35, 59, 0.12), rgba(245, 245, 247, 0.95) 70%);
  color: #1d1d1f;
}

.music-stage {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px 32px;
}

/* Vinyl Turntable */
.vinyl-turntable-box {
  width: 240px;
  height: 240px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.turntable-base {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: #111115;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
}

.tone-arm {
  position: absolute;
  top: 10px;
  right: 15px;
  width: 18px;
  height: 90px;
  border-right: 4px solid #94a3b8;
  border-top: 4px solid #94a3b8;
  border-top-right-radius: 12px;
  transform-origin: top right;
  transform: rotate(-30deg);
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 5;
}

.tone-arm.is-playing {
  transform: rotate(6deg);
}

.vinyl-disc {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #18181c, #0a0a0d, #25252c, #0a0a0d, #18181c);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
}

.vinyl-disc.is-spinning {
  animation: spin-vinyl 12s linear infinite;
}

.vinyl-grooves {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.vinyl-center-label {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fa233b, #fb5c74);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 26px;
  box-shadow: 0 4px 12px rgba(250, 35, 59, 0.4);
}

/* Info Panel */
.music-info-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.album-tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #fa233b;
  letter-spacing: 0.5px;
}

.track-name {
  margin: 2px 0 6px;
  font-size: 20px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-specs {
  display: flex;
  gap: 8px;
}

.spec-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 10.5px;
  color: #8e8e93;
}

/* Equalizer Bars */
.equalizer-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 24px;
}

.eq-bar {
  width: 3px;
  height: 4px;
  border-radius: 2px;
  background: #fa233b;
  opacity: 0.4;
  transition: height 0.2s ease;
}

.equalizer-bars.is-active .eq-bar {
  opacity: 1;
  animation: eq-bounce 0.8s ease-in-out infinite alternate;
}

/* Slider */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.music-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  accent-color: #fa233b;
  cursor: pointer;
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #8e8e93;
  font-family: monospace;
}

/* Controls */
.music-controls-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 6px 0;
}

.m-ctrl-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.m-ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.m-ctrl-btn.active {
  color: #fa233b;
}

.m-play-btn {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #fa233b;
  color: #ffffff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(250, 35, 59, 0.4);
  transition: transform 0.15s ease;
}

.m-play-btn:hover {
  transform: scale(1.08);
}

.music-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vol-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vol-slider {
  width: 70px;
  height: 3px;
  accent-color: #fa233b;
  cursor: pointer;
}

.m-mini-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
}

/* Playlist Sidebar */
.playlist-sidebar {
  width: 220px;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pl-header h4 {
  margin: 0;
  font-size: 12px;
  color: #8e8e93;
}

.pl-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pl-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11.5px;
  transition: background 0.12s ease;
}

.pl-item:hover, .pl-item.active {
  background: rgba(250, 35, 59, 0.15);
  color: #fa233b;
}

.pl-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lossless-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: #fa233b;
  color: #ffffff;
}

.music-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
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

@keyframes spin-vinyl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes eq-bounce {
  0% { height: 4px; }
  100% { height: 22px; }
}
</style>
