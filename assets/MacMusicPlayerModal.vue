<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  file: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
  storageId: { type: String, default: "default" },
  zIndex: { type: Number, default: 42 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "change", "focus"]);

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
  const name = currentItem.value?.name || "音乐";
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

function formatTime(sec) {
  if (!sec || isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const target = Number(e.target.value);
  if (audioRef.value) {
    audioRef.value.currentTime = target;
    currentTime.value = target;
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

function handleKeydown(e) {
  if (!props.visible) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    togglePlay();
  }
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

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <MacWindow
    v-if="visible"
    :title="songTitle"
    icon="ph-music-notes-fill"
    :visible="visible"
    :width="820"
    :height="480"
    :initial-x="180"
    :initial-y="90"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <template #titlebar-right>
      <div class="apple-music-header">
        <span class="lossless-chip">Hi-Res Lossless · 24bit/48kHz</span>
        <button class="am-hdr-btn" :class="{ active: showPlaylist }" type="button" title="播放列表" @click="showPlaylist = !showPlaylist">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        </button>
      </div>
    </template>

    <div class="apple-music-stage">
      <!-- Hidden Audio -->
      <audio
        ref="audioRef"
        :src="currentItem?.url"
        preload="metadata"
        @timeupdate="onTimeUpdate"
        @ended="onEnded"
        @play="isPlaying = true"
        @pause="isPlaying = false"
      ></audio>

      <!-- Main Stage Flex Grid -->
      <div class="am-main-grid">
        <!-- 1. Left: 3D High-End Vinyl Turntable -->
        <div class="turntable-wrapper">
          <div class="turntable-chassis">
            <!-- Pivot & Metallic Tone Arm -->
            <div class="tone-arm-assembly" :class="{ 'arm-playing': isPlaying }">
              <div class="arm-pivot"></div>
              <div class="arm-metal-bar"></div>
              <div class="arm-headshell"></div>
            </div>

            <!-- Rotating Vinyl Record -->
            <div class="vinyl-platter" :class="{ 'vinyl-spinning': isPlaying }">
              <div class="vinyl-outer-groove"></div>
              <div class="vinyl-inner-groove"></div>
              <!-- Center Album Cover -->
              <div class="vinyl-album-label">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="#ffffff">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Center: Track Meta & Apple Music Transport Controls -->
        <div class="am-track-panel">
          <!-- Track Info -->
          <div class="am-meta-header">
            <span class="am-studio-pill">Apple Music 官方高保真</span>
            <h2 class="am-song-title" :title="songTitle">{{ songTitle }}</h2>
            <p class="am-artist-name">天才猫音乐工坊 · 空间音频</p>
          </div>

          <!-- Dynamic Audio Wave Equalizer -->
          <div class="am-equalizer-wrap" :class="{ 'is-active': isPlaying }">
            <span v-for="i in 24" :key="i" class="eq-column" :style="{ animationDelay: `${(i * 0.05).toFixed(2)}s` }"></span>
          </div>

          <!-- Scrubber Timeline -->
          <div class="am-scrubber-box">
            <input
              type="range"
              class="am-range-slider"
              min="0"
              :max="duration || 100"
              step="0.1"
              :value="currentTime"
              @input="onSeek"
            />
            <div class="am-time-labels">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>
          </div>

          <!-- Transport Buttons (All solid inline SVGs) -->
          <div class="am-transport-row">
            <!-- Shuffle -->
            <button class="am-btn-secondary" :class="{ active: isShuffle }" type="button" title="随机播放" @click="isShuffle = !isShuffle">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>

            <!-- Prev -->
            <button class="am-btn-primary" type="button" title="上一首" @click="prevSong">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <!-- Main Play / Pause Circle -->
            <button class="am-btn-play-circle" type="button" :title="isPlaying ? '暂停 (Space)' : '播放 (Space)'" @click="togglePlay">
              <svg v-if="!isPlaying" viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>

            <!-- Next -->
            <button class="am-btn-primary" type="button" title="下一首" @click="nextSong">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            <!-- Repeat -->
            <button class="am-btn-secondary" :class="{ active: isLoop }" type="button" title="单曲循环" @click="isLoop = !isLoop">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
            </button>
          </div>

          <!-- Volume Bar & Download Button -->
          <div class="am-footer-bar">
            <div class="am-vol-group">
              <button class="am-mini-btn" type="button" @click="toggleMute">
                <svg v-if="isMuted || volume === 0" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </button>
              <input
                type="range"
                class="am-vol-slider"
                min="0"
                max="1"
                step="0.05"
                :value="isMuted ? 0 : volume"
                @input="onVolumeChange"
              />
            </div>

            <a class="am-download-link" :href="currentItem?.url" download title="下载无损原曲">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
              </svg>
              <span>下载原音频</span>
            </a>
          </div>
        </div>

        <!-- 3. Right: Playlist Drawer -->
        <div v-if="showPlaylist" class="am-playlist-drawer">
          <div class="drawer-header">
            <h4>当前队列 ({{ items.length }})</h4>
          </div>
          <div class="drawer-scroll">
            <div
              v-for="(item, idx) in items"
              :key="item.name + idx"
              class="queue-row"
              :class="{ active: index === idx }"
              @click="emit('change', idx)"
            >
              <div class="row-num">
                <span v-if="index !== idx">{{ idx + 1 }}</span>
                <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
              </div>
              <span class="row-title" :title="item.name">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.apple-music-stage {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 75% 25%, rgba(250, 45, 85, 0.22), rgba(18, 19, 26, 0.96) 65%);
  color: #f2f2f7;
  overflow: hidden;
  user-select: none;
}

[data-theme="light"] .apple-music-stage {
  background: radial-gradient(circle at 75% 25%, rgba(250, 45, 85, 0.15), rgba(246, 246, 248, 0.96) 65%);
  color: #1d1d1f;
}

.apple-music-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lossless-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fa2d55;
  border: 1px solid rgba(250, 45, 85, 0.3);
}

.am-hdr-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.14s ease;
}

.am-hdr-btn:hover, .am-hdr-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fa2d55;
}

/* Main Grid */
.am-main-grid {
  display: flex;
  height: 100%;
  padding: 24px 28px;
  gap: 28px;
  align-items: center;
}

/* 3D Vinyl Turntable */
.turntable-wrapper {
  width: 230px;
  height: 230px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.turntable-chassis {
  position: relative;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: #121318;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), inset 0 2px 4px rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
}

/* Tone Arm Assembly */
.tone-arm-assembly {
  position: absolute;
  top: 10px;
  right: 14px;
  width: 24px;
  height: 100px;
  transform-origin: 18px 8px;
  transform: rotate(-32deg);
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 8;
  pointer-events: none;
}

.tone-arm-assembly.arm-playing {
  transform: rotate(6deg);
}

.arm-pivot {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, #e2e8f0, #64748b);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.arm-metal-bar {
  position: absolute;
  top: 8px;
  right: 7px;
  width: 4px;
  height: 78px;
  border-radius: 2px;
  background: linear-gradient(to right, #94a3b8, #cbd5e1, #64748b);
  box-shadow: 1px 2px 5px rgba(0, 0, 0, 0.4);
}

.arm-headshell {
  position: absolute;
  bottom: 0;
  right: 2px;
  width: 14px;
  height: 20px;
  border-radius: 3px;
  background: #334155;
  border: 1px solid #64748b;
  transform: rotate(18deg);
}

/* Vinyl Platter */
.vinyl-platter {
  position: relative;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, #1c1d24, #0b0b0e 25%, #2a2b36 50%, #0b0b0e 75%, #1c1d24);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
}

.vinyl-platter.vinyl-spinning {
  animation: spin-record 10s linear infinite;
}

.vinyl-outer-groove {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.vinyl-inner-groove {
  position: absolute;
  inset: 34px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.06);
}

.vinyl-album-label {
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fa2d55, #ff6482);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 15px rgba(250, 45, 85, 0.45);
}

/* Track Panel */
.am-track-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.am-studio-pill {
  font-size: 11px;
  font-weight: 700;
  color: #fa2d55;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.am-song-title {
  margin: 2px 0 2px;
  font-size: 20px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.am-artist-name {
  margin: 0;
  font-size: 12.5px;
  color: #8e8e93;
}

/* Wave Equalizer */
.am-equalizer-wrap {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 24px;
  margin: 2px 0;
}

.eq-column {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to top, #fa2d55, #ff7597);
  opacity: 0.35;
  transition: height 0.2s ease;
}

.am-equalizer-wrap.is-active .eq-column {
  opacity: 1;
  animation: eq-active 0.75s ease-in-out infinite alternate;
}

/* Scrubber */
.am-scrubber-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.am-range-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  accent-color: #fa2d55;
  cursor: pointer;
  outline: none;
}

.am-time-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8e8e93;
  font-family: -apple-system, BlinkMacSystemFont, monospace;
}

/* Transport Row */
.am-transport-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 4px 0;
}

.am-btn-primary, .am-btn-secondary {
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.14s ease;
}

.am-btn-primary {
  width: 38px;
  height: 38px;
}

.am-btn-primary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.am-btn-secondary {
  width: 32px;
  height: 32px;
  opacity: 0.75;
}

.am-btn-secondary:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.am-btn-secondary.active {
  color: #fa2d55;
  opacity: 1;
}

.am-btn-play-circle {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #fa2d55;
  color: #ffffff;
  box-shadow: 0 8px 25px rgba(250, 45, 85, 0.5);
  cursor: pointer;
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.am-btn-play-circle:hover {
  transform: scale(1.08);
}

/* Footer Bar */
.am-footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.am-vol-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.am-mini-btn {
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: #8e8e93;
  cursor: pointer;
  padding: 0;
}

.am-mini-btn:hover {
  color: #ffffff;
}

.am-vol-slider {
  width: 80px;
  height: 4px;
  accent-color: #fa2d55;
  cursor: pointer;
}

.am-download-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  text-decoration: none;
  font-size: 11.5px;
  font-weight: 500;
  transition: all 0.14s ease;
}

.am-download-link:hover {
  background: rgba(250, 45, 85, 0.2);
  color: #fa2d55;
}

/* Playlist Drawer */
.am-playlist-drawer {
  width: 220px;
  height: 100%;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #8e8e93;
}

.drawer-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.queue-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.queue-row:hover, .queue-row.active {
  background: rgba(250, 45, 85, 0.15);
  color: #fa2d55;
}

.row-num {
  width: 16px;
  display: grid;
  place-items: center;
  font-size: 11px;
  color: #8e8e93;
}

.queue-row.active .row-num {
  color: #fa2d55;
}

.row-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes spin-record {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes eq-active {
  0% { height: 3px; }
  100% { height: 22px; }
}
</style>
