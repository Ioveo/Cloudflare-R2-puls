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
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const playbackRate = ref(1);
const isMinimized = ref(false);
const loopMode = ref("all"); // 'all', 'one', 'off'

const currentItem = computed(() => props.items[props.index] || null);
const isAudio = computed(() => {
  if (!currentItem.value) return false;
  const name = currentItem.value.name || currentItem.value.key || "";
  const type = currentItem.value.file?.httpMetadata?.contentType || "";
  return type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|m4a|aac|opus)$/i.test(name);
});

const isVideo = computed(() => {
  if (!currentItem.value) return false;
  const name = currentItem.value.name || currentItem.value.key || "";
  const type = currentItem.value.file?.httpMetadata?.contentType || "";
  return type.startsWith("video/") || /\.(mp4|webm|mkv|mov|m4v|avi)$/i.test(name);
});

const extTag = computed(() => {
  if (!currentItem.value) return "";
  const ext = (currentItem.value.name || "").split(".").pop();
  return ext ? ext.toUpperCase() : "MEDIA";
});

const activeMediaEl = computed(() => (isAudio.value ? audioRef.value : videoRef.value));

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const padM = String(m).padStart(2, "0");
  const padS = String(s).padStart(2, "0");
  return `${padM}:${padS}`;
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

function onSeek(e) {
  const el = activeMediaEl.value;
  if (!el) return;
  const targetTime = Number(e.target.value);
  el.currentTime = targetTime;
  currentTime.value = targetTime;
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

function changeSpeed() {
  const rates = [1, 1.25, 1.5, 2, 0.75];
  const idx = rates.indexOf(playbackRate.value);
  const nextRate = rates[(idx + 1) % rates.length];
  playbackRate.value = nextRate;
  if (activeMediaEl.value) {
    activeMediaEl.value.playbackRate = nextRate;
  }
}

function toggleLoop() {
  const modes = ["all", "one", "off"];
  loopMode.value = modes[(modes.indexOf(loopMode.value) + 1) % modes.length];
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
  isMinimized.value = false;
  emit("close");
}

function onKeydown(e) {
  if (!props.visible) return;
  if (e.key === "Escape" && !isMinimized.value) close();
  else if (e.key === " ") { e.preventDefault(); togglePlay(); }
  else if (e.key === "ArrowLeft") prev();
  else if (e.key === "ArrowRight") next();
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
    <div v-if="visible && currentItem" class="media-container" :class="{ 'is-minimized': isMinimized }">
      <!-- Fullscreen / Large Modal Mask -->
      <div v-if="!isMinimized" class="media-mask" @click.self="close">
        <header class="media-header">
          <div class="media-info">
            <span class="media-badge">{{ extTag }}</span>
            <span class="media-title">{{ currentItem.name }}</span>
            <span v-if="items.length > 1" class="media-counter">{{ index + 1 }} / {{ items.length }}</span>
          </div>
          <div class="media-actions">
            <button v-if="isAudio" class="header-btn" type="button" title="最小化浮动播放器" @click="isMinimized = true">
              <i class="ph ph-arrows-in-line-down"></i>
            </button>
            <a class="header-btn" :href="currentItem.url" download title="下载媒体文件">
              <i class="ph ph-download-simple"></i>
            </a>
            <button class="header-btn close-btn" type="button" title="关闭 (Esc)" @click="close">
              <i class="ph ph-x"></i>
            </button>
          </div>
        </header>

        <main class="media-body">
          <!-- AUDIO PLAYER VIEW -->
          <div v-if="isAudio" class="audio-view">
            <div class="vinyl-wrapper">
              <div class="vinyl-disc" :class="{ spinning: isPlaying }">
                <div class="vinyl-grooves"></div>
                <div class="vinyl-center">
                  <div class="vinyl-dot"></div>
                </div>
              </div>
            </div>

            <div class="audio-details">
              <h2>{{ currentItem.name }}</h2>
              <p class="audio-subtitle">流媒体实时高保真播放</p>

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
                  <i v-if="loopMode === 'one'" class="ph ph-repeat-once"></i>
                  <i v-else-if="loopMode === 'all'" class="ph ph-repeat"></i>
                  <i v-else class="ph ph-shuffle"></i>
                </button>

                <button class="ctrl-btn" type="button" title="上一首 (←)" @click="prev">
                  <i class="ph ph-skip-back"></i>
                </button>

                <button class="ctrl-btn main-play" type="button" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
                  <i :class="['ph', isPlaying ? 'ph-pause' : 'ph-play']"></i>
                </button>

                <button class="ctrl-btn" type="button" title="下一首 (→)" @click="next">
                  <i class="ph ph-skip-forward"></i>
                </button>

                <div class="volume-box">
                  <button class="ctrl-btn sub" type="button" title="静音切换" @click="toggleMute">
                    <i :class="['ph', isMuted || volume === 0 ? 'ph-speaker-x' : 'ph-speaker-high']"></i>
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

          <!-- VIDEO PLAYER VIEW -->
          <div v-else-if="isVideo" class="video-view">
            <div class="video-wrapper">
              <video
                ref="videoRef"
                :src="currentItem.url"
                controls
                autoplay
                playsinline
                @timeupdate="onTimeUpdate"
                @loadedmetadata="onLoadedMetadata"
                @ended="onEnded"
                @play="onPlay"
                @pause="onPause"
              ></video>
            </div>
            <div class="video-subbar">
              <button class="speed-btn" type="button" title="切换播放倍速" @click="changeSpeed">
                {{ playbackRate }}x 倍速
              </button>
              <button v-if="items.length > 1" class="nav-chip" type="button" @click="prev">
                <i class="ph ph-caret-left"></i> 上一个
              </button>
              <button v-if="items.length > 1" class="nav-chip" type="button" @click="next">
                下一个 <i class="ph ph-caret-right"></i>
              </button>
            </div>
          </div>
        </main>
      </div>

      <!-- MINIMIZED BOTTOM-RIGHT DOCK PLAYER (for Audio) -->
      <div v-else class="mini-dock">
        <div class="mini-disc" :class="{ spinning: isPlaying }" @click="isMinimized = false">
          <i class="ph ph-music-notes"></i>
        </div>
        <div class="mini-info" @click="isMinimized = false">
          <strong class="mini-title">{{ currentItem.name }}</strong>
          <span class="mini-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        </div>
        <div class="mini-controls">
          <button class="mini-btn" type="button" @click="togglePlay">
            <i :class="['ph', isPlaying ? 'ph-pause' : 'ph-play']"></i>
          </button>
          <button class="mini-btn" type="button" title="展开界面" @click="isMinimized = false">
            <i class="ph ph-arrows-out-line-up"></i>
          </button>
          <button class="mini-btn close" type="button" title="关闭播放器" @click="close">
            <i class="ph ph-x"></i>
          </button>
        </div>
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

.media-container.is-minimized {
  inset: auto;
  bottom: 24px;
  right: 24px;
  width: auto;
  height: auto;
}

.media-mask {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: rgba(12, 13, 16, 0.94);
  backdrop-filter: blur(32px) saturate(180%);
  color: #fff;
  animation: fade-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.media-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
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
  background: rgba(10, 132, 255, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.media-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-counter {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
}

.media-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 20px;
  text-decoration: none;
  border: 0;
  cursor: pointer;
  transition: all 0.18s;
}

.header-btn:hover {
  color: #fff;
  background: rgba(10, 132, 255, 0.6);
  transform: scale(1.05);
}

.header-btn.close-btn:hover {
  background: rgba(255, 69, 58, 0.6);
}

.media-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

/* Audio Player Stylings */
.audio-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
  max-width: 460px;
  padding: 36px 30px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5), inset 0 1px rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
}

.vinyl-wrapper {
  position: relative;
  width: 180px;
  height: 180px;
  display: grid;
  place-items: center;
}

.vinyl-disc {
  position: relative;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2a30 0%, #111115 70%, #050508 100%);
  border: 4px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.1);
  display: grid;
  place-items: center;
  transition: transform 0.3s;
}

.vinyl-disc.spinning {
  animation: spin 10s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-grooves {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.vinyl-center {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0a84ff, #0056b3);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);
}

.vinyl-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #111115;
}

.audio-details {
  width: 100%;
  text-align: center;
}

.audio-details h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-subtitle {
  margin: 0 0 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.progress-box {
  width: 100%;
  margin-bottom: 20px;
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
  gap: 14px;
}

.ctrl-btn {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 0;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.18s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.08);
}

.ctrl-btn.sub {
  width: 36px;
  height: 36px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
}

.ctrl-btn.main-play {
  width: 58px;
  height: 58px;
  background: #0a84ff;
  font-size: 26px;
  box-shadow: 0 8px 24px rgba(10, 132, 255, 0.4);
}

.ctrl-btn.main-play:hover {
  background: #0071e3;
  transform: scale(1.1);
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

/* Video Player Stylings */
.video-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 960px;
  height: 100%;
}

.video-wrapper {
  position: relative;
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
}

.video-wrapper video {
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 160px);
  object-fit: contain;
}

.video-subbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.speed-btn, .nav-chip {
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.18s;
}

.speed-btn:hover, .nav-chip:hover {
  background: rgba(10, 132, 255, 0.6);
}

/* Mini Bottom Dock */
.mini-dock {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-radius: 18px;
  background: rgba(20, 20, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  color: #fff;
  animation: slide-up 0.25s ease-out;
}

.mini-disc {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #0a84ff;
  display: grid;
  place-items: center;
  font-size: 18px;
  cursor: pointer;
}

.mini-disc.spinning {
  animation: spin 6s linear infinite;
}

.mini-info {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  max-width: 180px;
}

.mini-title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

.mini-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mini-btn {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 0;
  font-size: 16px;
  cursor: pointer;
}

.mini-btn:hover {
  background: rgba(10, 132, 255, 0.7);
}

.mini-btn.close:hover {
  background: rgba(255, 69, 58, 0.7);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
