<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  activeWidgets: { type: Array, default: () => ["weather", "clock", "notes"] },
  storagePercent: { type: Number, default: 0 },
  totalBytes: { type: Number, default: 0 },
  totalFiles: { type: Number, default: 0 },
});

const emit = defineEmits(["remove-widget", "open-app"]);

// 1. Clock Widget Logic
const hourDeg = ref(0);
const minDeg = ref(0);
const secDeg = ref(0);
const timeStr = ref("");
const dateStr = ref("");

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  secDeg.value = ((s + ms / 1000) / 60) * 360;
  minDeg.value = ((m + s / 60) / 60) * 360;
  hourDeg.value = (((h % 12) + m / 60) / 12) * 360;

  timeStr.value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  dateStr.value = `${days[now.getDay()]} · ${now.getMonth() + 1}月${now.getDate()}日`;
}

// 2. Memo Quick Notes Logic
const stickyNote = ref(localStorage.getItem("mac-sticky-note") || "💡 天才猫 R2 灵感便签\n- 欢迎使用 macOS 原生云桌面！\n- 所有便签与小组件均实时保存至本地。\n- 随时在桌面自由记录与规划。");
const isSavedTip = ref(false);

function onStickyInput(e) {
  stickyNote.value = e.target.value;
  localStorage.setItem("mac-sticky-note", stickyNote.value);
  isSavedTip.value = true;
  setTimeout(() => { isSavedTip.value = false; }, 1500);
}

// 3. Mini Calculator Logic
const miniCalcDisplay = ref("0");
const miniCalcEq = ref("");
const miniCalcOp = ref(null);
const miniCalcPrev = ref(null);

function miniCalcDigit(d) {
  if (miniCalcDisplay.value === "0" || miniCalcOp.value === "=") {
    miniCalcDisplay.value = String(d);
    if (miniCalcOp.value === "=") miniCalcOp.value = null;
  } else {
    miniCalcDisplay.value += String(d);
  }
}

function miniCalcAction(op) {
  const val = parseFloat(miniCalcDisplay.value);
  if (op === "C") {
    miniCalcDisplay.value = "0";
    miniCalcEq.value = "";
    miniCalcOp.value = null;
    miniCalcPrev.value = null;
    return;
  }
  if (op === "=") {
    if (miniCalcOp.value && miniCalcPrev.value !== null) {
      let res = 0;
      if (miniCalcOp.value === "+") res = miniCalcPrev.value + val;
      if (miniCalcOp.value === "-") res = miniCalcPrev.value - val;
      if (miniCalcOp.value === "×") res = miniCalcPrev.value * val;
      if (miniCalcOp.value === "÷") res = val !== 0 ? miniCalcPrev.value / val : 0;
      miniCalcEq.value = `${miniCalcPrev.value} ${miniCalcOp.value} ${val} =`;
      miniCalcDisplay.value = String(res);
      miniCalcOp.value = "=";
      miniCalcPrev.value = null;
    }
    return;
  }
  miniCalcPrev.value = val;
  miniCalcOp.value = op;
  miniCalcEq.value = `${val} ${op}`;
  miniCalcDisplay.value = "0";
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

let clockTimer = null;

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 100);
});

onUnmounted(() => {
  clearInterval(clockTimer);
});
</script>

<template>
  <div class="desktop-widgets-column">
    <!-- 🌤️ Widget 1: Weather (天气) -->
    <div v-if="activeWidgets.includes('weather')" class="mac-widget-card weather-widget" @dblclick="emit('open-app', 'weather')">
      <button class="widget-remove-btn" title="从桌面移除小组件" @click.stop="emit('remove-widget', 'weather')">×</button>
      <div class="weather-top">
        <div>
          <span class="weather-city">广州 / 智能气象</span>
          <h2 class="weather-deg">28°</h2>
        </div>
        <div class="weather-icon-bubble">
          <i class="ph ph-sun-dim-fill"></i>
        </div>
      </div>
      <div class="weather-bottom">
        <span class="weather-condition">晴朗 · 空气优</span>
        <span class="weather-range">最高 32° 最低 25° · 湿度 68%</span>
      </div>
    </div>

    <!-- 🕒 Widget 2: Apple Analog Clock (模拟时钟) -->
    <div v-if="activeWidgets.includes('clock')" class="mac-widget-card clock-widget" @dblclick="emit('open-app', 'clock')">
      <button class="widget-remove-btn" title="从桌面移除小组件" @click.stop="emit('remove-widget', 'clock')">×</button>
      <div class="clock-dial">
        <!-- 12 Markers -->
        <span v-for="n in 12" :key="n" class="dial-mark" :style="{ transform: `rotate(${n * 30}deg)` }"></span>

        <!-- Hour, Minute, Second Hands -->
        <div class="hand hand-hour" :style="{ transform: `rotate(${hourDeg}deg)` }"></div>
        <div class="hand hand-min" :style="{ transform: `rotate(${minDeg}deg)` }"></div>
        <div class="hand hand-sec" :style="{ transform: `rotate(${secDeg}deg)` }"></div>
        <div class="clock-center-pin"></div>
      </div>
      <div class="clock-info">
        <span class="clock-city">北京时间 (CST)</span>
        <strong class="clock-digital font-mono">{{ timeStr }}</strong>
        <span class="clock-date">{{ dateStr }}</span>
      </div>
    </div>

    <!-- 📝 Widget 3: Sticky Notes (桌面灵感便签) -->
    <div v-if="activeWidgets.includes('notes')" class="mac-widget-card notes-widget" @dblclick="emit('open-app', 'notes')">
      <button class="widget-remove-btn" title="从桌面移除小组件" @click.stop="emit('remove-widget', 'notes')">×</button>
      <div class="widget-header">
        <div class="widget-title">
          <i class="ph ph-note-pencil-fill"></i>
          <span>桌面备忘录</span>
        </div>
        <span class="save-status-badge" :class="{ 'is-saved': isSavedTip }">
          <i class="save-dot"></i> {{ isSavedTip ? '已自动保存' : '实时同步中' }}
        </span>
      </div>
      <textarea
        :value="stickyNote"
        class="sticky-textarea"
        placeholder="在此快速记录想法，自动永久保存在本地..."
        @input="onStickyInput"
      ></textarea>
    </div>

    <!-- 🧮 Widget 4: Mini Calculator (桌面计算器) -->
    <div v-if="activeWidgets.includes('calculator')" class="mac-widget-card calc-widget" @dblclick="emit('open-app', 'calculator')">
      <button class="widget-remove-btn" title="从桌面移除小组件" @click.stop="emit('remove-widget', 'calculator')">×</button>
      <div class="widget-header">
        <div class="widget-title">
          <i class="ph ph-calculator-fill"></i>
          <span>极速计算器</span>
        </div>
      </div>
      <div class="mini-calc-screen">
        <span class="mini-calc-eq">{{ miniCalcEq }}</span>
        <span class="mini-calc-val">{{ miniCalcDisplay }}</span>
      </div>
      <div class="mini-calc-keys">
        <button class="m-key fn" @click="miniCalcAction('C')">C</button>
        <button class="m-key op" @click="miniCalcAction('÷')">÷</button>
        <button class="m-key op" @click="miniCalcAction('×')">×</button>
        <button class="m-key op" @click="miniCalcAction('-')">−</button>

        <button class="m-key num" @click="miniCalcDigit(7)">7</button>
        <button class="m-key num" @click="miniCalcDigit(8)">8</button>
        <button class="m-key num" @click="miniCalcDigit(9)">9</button>
        <button class="m-key op" @click="miniCalcAction('+')">+</button>

        <button class="m-key num" @click="miniCalcDigit(4)">4</button>
        <button class="m-key num" @click="miniCalcDigit(5)">5</button>
        <button class="m-key num" @click="miniCalcDigit(6)">6</button>
        <button class="m-key op eq" @click="miniCalcAction('=')">=</button>

        <button class="m-key num zero" @click="miniCalcDigit(0)">0</button>
        <button class="m-key num" @click="miniCalcDigit(1)">1</button>
        <button class="m-key num" @click="miniCalcDigit(2)">2</button>
        <button class="m-key num" @click="miniCalcDigit(3)">3</button>
      </div>
    </div>

    <!-- 📊 Widget 5: Storage Monitor (R2 存储监控) -->
    <div v-if="activeWidgets.includes('storage')" class="mac-widget-card storage-widget" @dblclick="emit('open-app', 'settings')">
      <button class="widget-remove-btn" title="从桌面移除小组件" @click.stop="emit('remove-widget', 'storage')">×</button>
      <div class="widget-header">
        <div class="widget-title">
          <i class="ph ph-hard-drives-fill"></i>
          <span>Cloudflare R2 存储</span>
        </div>
      </div>
      <div class="storage-widget-body">
        <div class="storage-gauge">
          <div class="gauge-ring">
            <strong>{{ formatBytes(totalBytes) }}</strong>
            <span>已用容量</span>
          </div>
        </div>
        <div class="storage-meta">
          <div class="meta-row">
            <span>对象总数</span>
            <strong>{{ totalFiles }} 项</strong>
          </div>
          <div class="meta-row">
            <span>存储状态</span>
            <span class="status-active-badge">● 极速直连</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-widgets-column {
  position: absolute;
  top: 48px;
  left: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 6;
  pointer-events: auto;
  user-select: none;
}

.mac-widget-card {
  position: relative;
  width: 220px;
  border-radius: 18px;
  padding: 14px;
  background: rgba(25, 26, 34, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(35px) saturate(190%);
  color: #f2f2f7;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  overflow: hidden;
}

.mac-widget-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.mac-widget-card:hover .widget-remove-btn {
  opacity: 1;
}

[data-theme="light"] .mac-widget-card {
  background: rgba(255, 255, 255, 0.72);
  color: #1d1d1f;
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.12), inset 0 1px 0 #ffffff;
}

.widget-remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  border: none;
  font-size: 13px;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
  z-index: 10;
}

.widget-remove-btn:hover {
  background: #ff453a;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
}

.widget-title i {
  color: #ffcc00;
  font-size: 15px;
}

/* Weather Widget */
.weather-widget {
  background: linear-gradient(145deg, rgba(30, 80, 160, 0.7), rgba(15, 35, 75, 0.7));
  border-color: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.weather-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.weather-city {
  font-size: 11.5px;
  font-weight: 600;
  opacity: 0.85;
}

.weather-deg {
  font-size: 34px;
  font-weight: 300;
  margin: 2px 0 0;
  line-height: 1;
}

.weather-icon-bubble {
  font-size: 34px;
  color: #ffcc00;
  filter: drop-shadow(0 4px 10px rgba(255, 204, 0, 0.5));
}

.weather-bottom {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.weather-condition {
  font-size: 12px;
  font-weight: 600;
}

.weather-range {
  font-size: 10.5px;
  opacity: 0.75;
}

/* Clock Widget */
.clock-widget {
  display: flex;
  align-items: center;
  gap: 14px;
}

.clock-dial {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #0f1015;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

[data-theme="light"] .clock-dial {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.15);
}

.dial-mark {
  position: absolute;
  top: 2px;
  left: 50%;
  width: 1.5px;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  transform-origin: 50% 34px;
}

.hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: 50% 100%;
  border-radius: 2px;
}

.hand-hour {
  width: 3px;
  height: 20px;
  background: #ffffff;
  margin-left: -1.5px;
}

.hand-min {
  width: 2px;
  height: 28px;
  background: #0a84ff;
  margin-left: -1px;
}

.hand-sec {
  width: 1px;
  height: 32px;
  background: #ff9f0a;
  margin-left: -0.5px;
}

.clock-center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ff9f0a;
  transform: translate(-50%, -50%);
}

.clock-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.clock-city {
  font-size: 11px;
  opacity: 0.75;
}

.clock-digital {
  font-size: 16px;
  font-weight: 700;
  color: #0a84ff;
}

.clock-date {
  font-size: 11px;
  opacity: 0.85;
}

/* Notes Sticky Widget */
.notes-widget {
  background: rgba(35, 34, 25, 0.75);
  border-color: rgba(255, 204, 0, 0.3);
}

[data-theme="light"] .notes-widget {
  background: rgba(255, 250, 220, 0.85);
  border-color: rgba(210, 180, 0, 0.3);
}

.save-status-badge {
  font-size: 10px;
  color: #8e8e93;
  display: flex;
  align-items: center;
  gap: 4px;
}

.save-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #34c759;
}

.save-status-badge.is-saved {
  color: #34c759;
  font-weight: 600;
}

.sticky-textarea {
  width: 100%;
  height: 85px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 12px;
  line-height: 1.45;
  resize: none;
  outline: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Mini Calc Widget */
.mini-calc-screen {
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 8px;
  border-radius: 8px;
  text-align: right;
  margin-bottom: 8px;
}

.mini-calc-eq {
  font-size: 9.5px;
  color: #8e8e93;
  display: block;
  min-height: 12px;
}

.mini-calc-val {
  font-size: 18px;
  font-weight: 400;
  font-family: monospace;
}

.mini-calc-keys {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.m-key {
  height: 24px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  cursor: pointer;
  background: #3a3a3c;
  color: #ffffff;
  transition: filter 0.1s ease;
}

.m-key:active {
  filter: brightness(1.25);
}

.m-key.op {
  background: #ff9f0a;
}

.m-key.fn {
  background: #636366;
}

.m-key.zero {
  grid-column: span 1;
}

/* Storage Widget */
.storage-widget-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.storage-gauge {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 4px solid #0a84ff;
  display: grid;
  place-items: center;
  box-shadow: 0 0 12px rgba(10, 132, 255, 0.4);
}

.gauge-ring {
  text-align: center;
}

.gauge-ring strong {
  font-size: 10.5px;
  display: block;
  line-height: 1.1;
}

.gauge-ring span {
  font-size: 8.5px;
  color: #8e8e93;
}

.storage-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
}

.status-active-badge {
  color: #34c759;
  font-weight: 600;
}
</style>
