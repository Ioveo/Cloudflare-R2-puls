<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

const props = defineProps({
  visible: Boolean,
  items: { type: Array, default: () => [] },
  index: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "change"]);

const audioRef = ref(null);
const videoRef = ref(null);
const videoContainerRef = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const playbackRate = ref(1);
const showPlaylist = ref(false);
const loopMode = ref("all");
const isFullscreen = ref(false);
const showVideoControls = ref(true);
const speedMenuOpen = ref(false);
const hoverSeekTime = ref(null);
const hoverSeekPos = ref(0);

let hideControlsTimer = null;

const currentItem = computed(() => props.items[props.index] || null);

const isAudio = computed(() => {
  if (!currentItem.value) return false;
  const name = (currentItem.value.name || currentItem.value.key || "").toLowerCase();
  const type = (currentItem.value.file?.httpMetadata?.contentType || "").toLowerCase();
  return type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac|opus|wma|aiff|alac)$/i.test(name);
});

const isVideo = computed(() => {
  if (!currentItem.value) return false;
  const name = (currentItem.value.name || currentItem.value.key || "").toLowerCase();
  const type = (currentItem.value.file?.httpMetadata?.contentType || "").toLowerCase();
  return type.startsWith("video/") || /\.(mp4|webm|mkv|mov|m4v|avi|flv|wmv|3gp)$/i.test(name);
});

const extTag = computed(() => {
  if (!currentItem.value) return "MEDIA";
  const ext = (currentItem.value.name || "").split(".").pop();
  return ext ? ext.toUpperCase() : "MEDIA";
});

const fileSizeText = computed(() => {
  if (!currentItem.value?.file?.size) return "";
  const size = currentItem.value.file.size;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let s = size;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(1)} ${units[i]}`;
});

const activeMediaEl = computed(() => (isAudio.value ? audioRef.value : videoRef.value));

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function togglePlay() {
  const el = activeMediaEl.value;
  if (!el) return;
  if (isPlaying.value) {
    el.pause();
  } else {
    el.play().catch(console.warn);
  }
}

function prev() {
  if (props.items.length <= 1) return;
  const nextIdx = (props.index - 1 + props.items.length) % props.items.length;
  emit("change", nextIdx);
}

function next() {
  if (props.items.length <= 1) return;
  const nextIdx = (props.index + 1) % props.items.length;
  emit("change", nextIdx);
}

function playTrack(idx) {
  emit("change", idx);
}

function onSeek(e) {
  const el = activeMediaEl.value;
  if (!el) return;
  const targetTime = Number(e.target.value);
  el.currentTime = targetTime;
  currentTime.value = targetTime;
}

function onHoverSeek(e) {
  if (!duration.value) return;
  const targetEl = e.currentTarget || e.target;
  const rect = targetEl.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, offsetX / rect.width));
  hoverSeekTime.value = formatTime(pct * duration.value);
  hoverSeekPos.value = offsetX;
}

function onVolumeChange(e) {
  const val = Number(e.target.value);
  volume.value = val;
  if (activeMediaEl.value) {
    activeMediaEl.value.volume = val;
    isMuted.value = val === 0;
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value;
  if (activeMediaEl.value) {
    activeMediaEl.value.muted = isMuted.value;
  }
}

function setSpeed(rate) {
  playbackRate.value = rate;
  speedMenuOpen.value = false;
  if (activeMediaEl.value) {
    activeMediaEl.value.playbackRate = rate;
  }
}

function toggleLoop() {
  const modes = ["all", "one", "off"];
  loopMode.value = modes[(modes.indexOf(loopMode.value) + 1) % modes.length];
}

function toggleFullscreen() {
  if (!videoContainerRef.value) return;
  if (!document.fullscreenElement) {
    videoContainerRef.value.requestFullscreen().then(() => { isFullscreen.value = true; }).catch(console.warn);
  } else {
    document.exitFullscreen().then(() => { isFullscreen.value = false; }).catch(console.warn);
  }
}

async function togglePiP() {
  if (!videoRef.value) return;
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoRef.value.requestPictureInPicture();
    }
  } catch (err) {
    console.warn("PiP error", err);
  }
}

function onMouseMoveVideo() {
  showVideoControls.value = true;
  clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(() => {
    if (isPlaying.value && !speedMenuOpen.value) {
      showVideoControls.value = false;
    }
  }, 3000);
}

function onEnded() {
  isPlaying.value = false;
  if (loopMode.value === "one") {
    const el = activeMediaEl.value;
    if (el) {
      el.currentTime = 0;
      el.play();
    }
  } else if (loopMode.value === "all") {
    next();
  }
}

function onTimeUpdate() {
  const el = activeMediaEl.value;
  if (el) {
    currentTime.value = el.currentTime;
    duration.value = el.duration || 0;
  }
}

function onLoadedMetadata() {
  const el = activeMediaEl.value;
  if (el) {
    duration.value = el.duration || 0;
    el.volume = volume.value;
    el.playbackRate = playbackRate.value;
    el.play().then(() => { isPlaying.value = true; }).catch(() => { isPlaying.value = false; });
  }
}

function onPlay() { isPlaying.value = true; }
function onPause() { isPlaying.value = false; }

function close() {
  if (audioRef.value) audioRef.value.pause();
  if (videoRef.value) videoRef.value.pause();
  isPlaying.value = false;
  showPlaylist.value = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  emit("close");
}

function onKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape") close();
  else if (e.key === " ") { e.preventDefault(); togglePlay(); }
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "ArrowRight") next();
  else if (e.key === "f" || e.key === "F") { if (isVideo.value) toggleFullscreen(); }
}

watch(() => props.index, () => {
  currentTime.value = 0;
  isPlaying.value = false;
});

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <Transition name="fade">
    <div v-if="visible && currentItem" class="media-container">
      <!-- Fullscreen / Large Modal Mask -->
      <div class="media-mask" @click.self="close">
        <main class="media-body">
          <!-- AUDIO PLAYER VIEW -->
          <div v-if="isAudio" class="audio-view">
            <!-- Audio Header Bar -->
            <header class="audio-header">
              <div class="media-info">
                <span class="media-badge">{{ extTag }}</span>
                <span class="media-title">{{ currentItem.name }}</span>
                <span v-if="fileSizeText" class="file-size-badge">{{ fileSizeText }}</span>
              </div>
              <div class="media-actions">
                <button v-if="items.length > 1" class="header-btn" :class="{ active: showPlaylist }" type="button" title="播放列表" @click="showPlaylist = !showPlaylist">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0l6 4-6 4v-8z"/></svg>
                </button>
                <a class="header-btn" :href="currentItem.url" download title="下载媒体文件">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                </a>
                <button class="header-btn close-btn" type="button" title="关闭 (Esc)" @click="close">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
            </header>

            <div class="ambient-glow"></div>
            
            <!-- Vinyl Album Artwork -->
            <div class="vinyl-wrapper">
              <div class="vinyl-disc" :class="{ spinning: isPlaying }">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-center">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  <div class="vinyl-dot"></div>
                </div>
              </div>
              
              <!-- Realtime Animated Soundwave Equalizer -->
              <div class="eq-waves" :class="{ active: isPlaying }">
                <span class="eq-bar bar-1"></span>
                <span class="eq-bar bar-2"></span>
                <span class="eq-bar bar-3"></span>
                <span class="eq-bar bar-4"></span>
                <span class="eq-bar bar-5"></span>
              </div>
            </div>

            <div class="audio-details">
              <h2 class="audio-name" :title="currentItem.name">{{ currentItem.name }}</h2>
              <p class="audio-subtitle">
                <span class="quality-tag">Hi-Fi Audio</span>
                <span>网盘高保真音频流</span>
              </p>

              <!-- Progress Bar -->
              <div class="progress-box">
                <input
                  type="range"
                  class="seek-bar"
                  min="0"
                  :max="duration || 100"
                  step="0.1"
                  :value="currentTime"
                  @input="onSeek"
                />
                <div class="time-labels">
                  <span>{{ formatTime(currentTime) }}</span>
                  <span>{{ formatTime(duration) }}</span>
                </div>
              </div>

              <!-- Main Control Bar -->
              <div class="audio-controls">
                <button class="ctrl-btn sub" type="button" :title="'循环模式: ' + loopMode" @click="toggleLoop">
                  <span v-if="loopMode === 'one'" class="active-icon">🔂</span>
                  <span v-else-if="loopMode === 'all'" class="active-icon">🔁</span>
                  <span v-else>🔀</span>
                </button>

                <button class="ctrl-btn" type="button" title="上一首 (←)" @click="prev">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>

                <button class="ctrl-btn main-play" type="button" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
                  <svg v-if="!isPlaying" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                </button>

                <button class="ctrl-btn" type="button" title="下一首 (→)" @click="next">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
                </button>

                <div class="volume-box">
                  <button class="ctrl-btn sub" type="button" title="静音切换" @click="toggleMute">
                    <svg v-if="!isMuted && volume > 0" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  </button>
                  <input
                    type="range"
                    class="vol-bar"
                    min="0"
                    max="1"
                    step="0.05"
                    :value="isMuted ? 0 : volume"
                    @input="onVolumeChange"
                  />
                </div>
              </div>
            </div>

            <!-- Hidden Audio Element -->
            <audio
              ref="audioRef"
              :src="currentItem.url"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @ended="onEnded"
              @play="onPlay"
              @pause="onPause"
            ></audio>
          </div>

          <!-- CINEMA Bilibili / YouTube STYLE OVERLAY VIDEO PLAYER VIEW -->
          <div v-else-if="isVideo" class="video-view">
            <div
              ref="videoContainerRef"
              class="video-cinema-frame"
              :class="{ 'controls-hidden': !showVideoControls && isPlaying }"
              @mousemove="onMouseMoveVideo"
              @mouseleave="showVideoControls = false"
            >
              <!-- Integrated Glass Top Header -->
              <header class="video-overlay-header" @click.stop>
                <div class="media-info">
                  <span class="media-badge">{{ extTag }}</span>
                  <span class="media-title">{{ currentItem.name }}</span>
                  <span v-if="fileSizeText" class="file-size-badge">{{ fileSizeText }}</span>
                  <span v-if="items.length > 1" class="media-counter">{{ index + 1 }} / {{ items.length }}</span>
                </div>
                <div class="media-actions">
                  <button v-if="items.length > 1" class="cinema-top-btn" :class="{ active: showPlaylist }" type="button" title="播放列表" @click="showPlaylist = !showPlaylist">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 10h12v2H4zm0-4h12v2H4zm0 8h8v2H4zm10 0l6 4-6 4v-8z"/></svg>
                  </button>
                  <a class="cinema-top-btn" :href="currentItem.url" download title="下载视频">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  </a>
                  <button class="cinema-top-btn close-btn" type="button" title="关闭 (Esc)" @click="close">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              </header>

              <!-- Video Screen -->
              <video
                ref="videoRef"
                class="cinema-video"
                :src="currentItem.url"
                autoplay
                playsinline
                @click="togglePlay"
                @dblclick="toggleFullscreen"
                @timeupdate="onTimeUpdate"
                @loadedmetadata="onLoadedMetadata"
                @ended="onEnded"
                @play="onPlay"
                @pause="onPause"
              ></video>

              <!-- Center Big Play Indicator Overlay -->
              <Transition name="scale-fade">
                <div v-if="!isPlaying" class="center-play-overlay" @click="togglePlay">
                  <div class="big-play-btn">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </Transition>

              <!-- Integrated Bottom Overlay Cinema Control Bar -->
              <div class="video-overlay-bar" @click.stop>
                <!-- Interactive Timeline Scrubber -->
                <div class="video-seeker-container" @mousemove="onHoverSeek" @mouseleave="hoverSeekTime = null">
                  <span v-if="hoverSeekTime" class="seek-tooltip" :style="{ left: hoverSeekPos + 'px' }">{{ hoverSeekTime }}</span>
                  <input
                    type="range"
                    class="video-seek-input"
                    min="0"
                    :max="duration || 100"
                    step="0.1"
                    :value="currentTime"
                    @input="onSeek"
                  />
                  <div class="seek-progress" :style="{ width: (duration ? (currentTime / duration) * 100 : 0) + '%' }"></div>
                </div>

                <div class="cinema-controls-row">
                  <div class="left-ctrls">
                    <button class="cinema-btn" type="button" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
                      <svg v-if="!isPlaying" viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      <svg v-else viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </button>
                    <button v-if="items.length > 1" class="cinema-btn" type="button" title="上一个视频" @click="prev">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </button>
                    <button v-if="items.length > 1" class="cinema-btn" type="button" title="下一个视频" @click="next">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
                    </button>

                    <div class="time-display">
                      <span>{{ formatTime(currentTime) }}</span>
                      <span class="sep">/</span>
                      <span class="total">{{ formatTime(duration) }}</span>
                    </div>
                  </div>

                  <div class="right-ctrls">
                    <!-- Speed Menu -->
                    <div class="speed-menu-wrapper">
                      <button class="cinema-pill-btn" type="button" @click="speedMenuOpen = !speedMenuOpen">
                        {{ playbackRate }}x 倍速
                      </button>
                      <Transition name="fade">
                        <div v-if="speedMenuOpen" class="speed-dropdown">
                          <button v-for="rate in [2.0, 1.5, 1.25, 1.0, 0.75, 0.5]" :key="rate" class="speed-option" :class="{ active: playbackRate === rate }" @click="setSpeed(rate)">
                            {{ rate }}x {{ rate === 1.0 ? '(正常)' : '' }}
                          </button>
                        </div>
                      </Transition>
                    </div>

                    <!-- Volume Control -->
                    <div class="volume-slider-group">
                      <button class="cinema-btn" type="button" title="静音切换" @click="toggleMute">
                        <svg v-if="!isMuted && volume > 0" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                      </button>
                      <input
                        type="range"
                        class="cinema-vol-bar"
                        min="0"
                        max="1"
                        step="0.05"
                        :value="isMuted ? 0 : volume"
                        @input="onVolumeChange"
                      />
                    </div>

                    <!-- PiP -->
                    <button class="cinema-btn" type="button" title="画中画模式" @click="togglePiP">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 11h-8v6h8v-6zm4-8H1c-.55 0-1 .45-1 1v16c0 .55.45 1 1 1h22c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zm-2 16H3V5h18v14z"/></svg>
                    </button>

                    <!-- Fullscreen -->
                    <button class="cinema-btn" type="button" :title="isFullscreen ? '退出全屏' : '全屏模式 (F)'" @click="toggleFullscreen">
                      <svg v-if="!isFullscreen" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PLAYLIST SIDE DRAWER -->
          <Transition name="slide-left">
            <aside v-if="showPlaylist" class="playlist-drawer">
              <header class="playlist-header">
                <h3>播放列表 ({{ items.length }})</h3>
                <button class="icon-close" type="button" @click="showPlaylist = false">×</button>
              </header>
              <ul class="playlist-items">
                <li
                  v-for="(item, idx) in items"
                  :key="item.file?.key || idx"
                  class="playlist-item"
                  :class="{ active: idx === index }"
                  @click="playTrack(idx)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  <span class="track-name">{{ item.name }}</span>
                </li>
              </ul>
            </aside>
          </Transition>
        </main>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.media-container {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.media-mask {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 12, 0.95);
  backdrop-filter: blur(40px) saturate(200%);
  color: #fff;
  animation: fade-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.media-body {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}

/* Audio Header & View */
.audio-view {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 500px;
  padding: 36px 36px 40px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 32px;
  background: rgba(28, 28, 38, 0.65);
  box-shadow: 0 40px 90px rgba(0, 0, 0, 0.7), inset 0 1px rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(30px);
}

.audio-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.media-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.media-badge {
  padding: 3px 8px;
  border-radius: 6px;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.file-size-badge {
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  font-size: 11px;
  font-family: ui-monospace, monospace;
}

.media-title {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.media-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 0;
  cursor: pointer;
  transition: all 0.18s;
}

.header-btn:hover {
  color: #fff;
  background: rgba(10, 132, 255, 0.7);
  transform: scale(1.06);
}

.header-btn.close-btn:hover {
  background: rgba(255, 69, 58, 0.8);
}

.ambient-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(10, 132, 255, 0.4) 0%, rgba(94, 92, 230, 0.2) 50%, transparent 75%);
  filter: blur(45px);
  pointer-events: none;
  z-index: 0;
}

.vinyl-wrapper {
  position: relative;
  width: 190px;
  height: 190px;
  display: grid;
  place-items: center;
  z-index: 1;
}

.vinyl-disc {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, #2c2c34 0%, #15151c 65%, #08080c 100%);
  border: 4px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
  transition: transform 0.3s;
}

.vinyl-disc.spinning {
  animation: spin 9s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-grooves {
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.09);
}

.vinyl-center {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 16px rgba(10, 132, 255, 0.5);
  color: #fff;
}

.vinyl-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #111115;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);
}

/* EQ Waveform */
.eq-waves {
  position: absolute;
  bottom: -10px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 24px;
}

.eq-bar {
  width: 4px;
  height: 6px;
  border-radius: 2px;
  background: #0a84ff;
  transition: height 0.2s ease;
}

.eq-waves.active .bar-1 { animation: eq 0.6s ease-in-out infinite alternate; }
.eq-waves.active .bar-2 { animation: eq 0.8s ease-in-out 0.1s infinite alternate; }
.eq-waves.active .bar-3 { animation: eq 0.5s ease-in-out 0.2s infinite alternate; }
.eq-waves.active .bar-4 { animation: eq 0.9s ease-in-out 0.15s infinite alternate; }
.eq-waves.active .bar-5 { animation: eq 0.7s ease-in-out 0.25s infinite alternate; }

@keyframes eq {
  0% { height: 4px; }
  100% { height: 22px; background: #5e5ce6; }
}

.audio-details {
  position: relative;
  width: 100%;
  text-align: center;
  z-index: 1;
}

.audio-name {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-subtitle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 24px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.quality-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(10, 132, 255, 0.2);
  color: #0a84ff;
  font-weight: 600;
}

.progress-box {
  width: 100%;
  margin-bottom: 22px;
}

.seek-bar {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.15);
  accent-color: #0a84ff;
  cursor: pointer;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

.audio-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.ctrl-btn {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 0;
  cursor: pointer;
  transition: all 0.18s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.08);
}

.ctrl-btn.sub {
  width: 38px;
  height: 38px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.active-icon {
  color: #0a84ff;
  font-size: 18px;
}

.ctrl-btn.main-play {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #0a84ff, #0071e3);
  color: #fff;
  box-shadow: 0 10px 28px rgba(10, 132, 255, 0.45);
}

.ctrl-btn.main-play:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 34px rgba(10, 132, 255, 0.6);
}

.volume-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.vol-bar {
  width: 60px;
  height: 4px;
  accent-color: #0a84ff;
  cursor: pointer;
}

/* CINEMA Bilibili / YouTube STYLE OVERLAY VIDEO PLAYER */
.video-view {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.video-cinema-frame {
  position: relative;
  width: 92vw;
  max-width: 1440px;
  height: 86vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 35px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.cinema-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}

/* Video Header Top Overlay */
.video-overlay-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.3) 70%, transparent 100%);
  z-index: 25;
  transition: opacity 0.3s ease;
}

.cinema-top-btn {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 0;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.18s;
}

.cinema-top-btn:hover {
  background: rgba(10, 132, 255, 0.8);
  transform: scale(1.08);
}

.cinema-top-btn.close-btn:hover {
  background: rgba(255, 69, 58, 0.85);
}

/* Center Play Overlay */
.center-play-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
  cursor: pointer;
  z-index: 10;
}

.big-play-btn {
  display: grid;
  width: 80px;
  height: 80px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a84ff, #5e5ce6);
  color: #fff;
  box-shadow: 0 14px 40px rgba(10, 132, 255, 0.65);
  transition: transform 0.2s ease;
}

.big-play-btn svg {
  margin-left: 4px;
}

.center-play-overlay:hover .big-play-btn {
  transform: scale(1.15);
}

/* Cinema Custom Bottom Overlay Control Bar */
.video-overlay-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 20;
  padding: 24px 24px 18px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 65%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.video-cinema-frame.controls-hidden .video-overlay-bar,
.video-cinema-frame.controls-hidden .video-overlay-header {
  opacity: 0;
  pointer-events: none;
}

/* Seeker Input with Tooltip */
.video-seeker-container {
  position: relative;
  width: 100%;
  height: 12px;
  display: flex;
  align-items: center;
}

.video-seek-input {
  position: absolute;
  width: 100%;
  height: 6px;
  opacity: 0;
  z-index: 5;
  cursor: pointer;
}

.seek-progress {
  position: absolute;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #0a84ff, #5e5ce6);
  box-shadow: 0 0 12px rgba(10, 132, 255, 0.8);
  pointer-events: none;
}

.video-seeker-container::before {
  content: "";
  position: absolute;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.25);
}

.seek-tooltip {
  position: absolute;
  top: -34px;
  transform: translateX(-50%);
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.92);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
}

.cinema-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.left-ctrls, .right-ctrls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cinema-btn {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 0;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.18s;
}

.cinema-btn:hover {
  background: rgba(10, 132, 255, 0.8);
  transform: scale(1.08);
}

.time-display {
  font-size: 13.5px;
  font-weight: 650;
  color: #fff;
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 6px;
}

.time-display .sep { color: rgba(255, 255, 255, 0.45); }
.time-display .total { color: rgba(255, 255, 255, 0.6); }

/* Speed Menu */
.speed-menu-wrapper {
  position: relative;
}

.cinema-pill-btn {
  padding: 7px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.18s;
}

.cinema-pill-btn:hover {
  background: rgba(10, 132, 255, 0.85);
}

.speed-dropdown {
  position: absolute;
  bottom: 46px;
  right: 0;
  width: 110px;
  padding: 6px;
  border-radius: 14px;
  background: rgba(20, 20, 28, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.speed-option {
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  font-weight: 600;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.speed-option:hover {
  background: rgba(10, 132, 255, 0.25);
  color: #0a84ff;
}

.speed-option.active {
  background: #0a84ff;
  color: #fff;
}

.volume-slider-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cinema-vol-bar {
  width: 70px;
  height: 4px;
  accent-color: #0a84ff;
  cursor: pointer;
}

/* Playlist Drawer */
.playlist-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 340px;
  background: rgba(18, 18, 24, 0.96);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(30px);
  display: flex;
  flex-direction: column;
  z-index: 35;
  box-shadow: -15px 0 35px rgba(0,0,0,0.6);
}

.playlist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.playlist-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.icon-close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 22px;
  cursor: pointer;
}

.playlist-items {
  list-style: none;
  margin: 0;
  padding: 10px;
  overflow-y: auto;
  flex: 1;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.playlist-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.playlist-item.active {
  background: rgba(10, 132, 255, 0.25);
  color: #0a84ff;
  font-weight: 600;
}

.track-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(100%); }

.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.2s ease; }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: scale(0.85); }
</style>
