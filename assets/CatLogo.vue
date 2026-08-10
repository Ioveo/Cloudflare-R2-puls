<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isWinking = ref(false);
const isHovered = ref(false);
let winkTimer = null;

function triggerRandomWink() {
  winkTimer = setInterval(() => {
    if (Math.random() > 0.4 && !isWinking.value) {
      isWinking.value = true;
      setTimeout(() => {
        isWinking.value = false;
      }, 350);
    }
  }, 4000);
}

onMounted(() => {
  triggerRandomWink();
});

onUnmounted(() => {
  if (winkTimer) clearInterval(winkTimer);
});
</script>

<template>
  <div 
    class="cat-logo-wrapper"
    :class="{ 'is-hovered': isHovered, 'is-winking': isWinking }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Glowing Halo Background -->
    <div class="cat-halo"></div>

    <!-- Cat Avatar Container -->
    <div class="cat-avatar-box">
      <svg class="cat-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradients -->
          <linearGradient id="catHeadGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#2c2c2e" />
            <stop offset="100%" stop-color="#111113" />
          </linearGradient>

          <linearGradient id="earInnerGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff3b30" />
            <stop offset="100%" stop-color="#0a84ff" />
          </linearGradient>

          <linearGradient id="visorGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#0a84ff" />
            <stop offset="50%" stop-color="#5e5ce6" />
            <stop offset="100%" stop-color="#bf5af2" />
          </linearGradient>

          <linearGradient id="eyeIrisGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#64d2ff" />
            <stop offset="100%" stop-color="#0a84ff" />
          </linearGradient>

          <!-- Glow Filters -->
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Outer Cat Ears -->
        <!-- Left Ear -->
        <path class="cat-ear ear-left" d="M 22 40 L 12 12 C 12 12 36 20 40 32 Z" fill="url(#catHeadGrad)" stroke="#3a3a3c" stroke-width="2" />
        <path class="cat-ear-inner ear-left-inner" d="M 24 36 L 16 17 C 16 17 33 24 36 31 Z" fill="url(#earInnerGrad)" opacity="0.85" />

        <!-- Right Ear -->
        <path class="cat-ear ear-right" d="M 78 40 L 88 12 C 88 12 64 20 60 32 Z" fill="url(#catHeadGrad)" stroke="#3a3a3c" stroke-width="2" />
        <path class="cat-ear-inner ear-right-inner" d="M 76 36 L 84 17 C 84 17 67 24 64 31 Z" fill="url(#earInnerGrad)" opacity="0.85" />

        <!-- Cat Head Main Shape -->
        <path class="cat-head-base" d="M 20 50 C 20 28 80 28 80 50 C 80 75 70 85 50 85 C 30 85 20 75 20 50 Z" fill="url(#catHeadGrad)" stroke="#48484a" stroke-width="2" />

        <!-- Cyber Glasses / Genius Smart Visor -->
        <rect class="cat-visor" x="22" y="42" width="56" height="18" rx="9" fill="url(#visorGrad)" opacity="0.9" filter="url(#neonGlow)" />
        <path class="visor-glint" d="M 26 44 L 40 44 L 32 58 L 26 58 Z" fill="#ffffff" opacity="0.45" />

        <!-- Animated Eyes behind/over Visor -->
        <!-- Left Eye -->
        <g class="cat-eye eye-left-group">
          <ellipse cx="36" cy="51" rx="5" ry="6" fill="#0b0b0e" />
          <ellipse cx="36" cy="51" rx="3.5" ry="4.5" fill="url(#eyeIrisGrad)" />
          <circle cx="34.5" cy="49" r="1.5" fill="#ffffff" />
        </g>

        <!-- Right Eye (Normal or Winking) -->
        <g class="cat-eye eye-right-group">
          <template v-if="!isWinking">
            <ellipse cx="64" cy="51" rx="5" ry="6" fill="#0b0b0e" />
            <ellipse cx="64" cy="51" rx="3.5" ry="4.5" fill="url(#eyeIrisGrad)" />
            <circle cx="62.5" cy="49" r="1.5" fill="#ffffff" />
          </template>
          <!-- Wink Arc -->
          <path v-else class="wink-arc" d="M 59 52 Q 64 47 69 52" stroke="#64d2ff" stroke-width="3.5" stroke-linecap="round" fill="none" />
        </g>

        <!-- Cat Whiskers -->
        <!-- Left Whiskers -->
        <line class="whisker w-l1" x1="8" y1="58" x2="22" y2="60" stroke="#64d2ff" stroke-width="1.8" stroke-linecap="round" opacity="0.75" />
        <line class="whisker w-l2" x1="10" y1="66" x2="23" y2="65" stroke="#bf5af2" stroke-width="1.8" stroke-linecap="round" opacity="0.75" />

        <!-- Right Whiskers -->
        <line class="whisker w-r1" x1="92" y1="58" x2="78" y2="60" stroke="#64d2ff" stroke-width="1.8" stroke-linecap="round" opacity="0.75" />
        <line class="whisker w-r2" x1="90" y1="66" x2="77" y2="65" stroke="#bf5af2" stroke-width="1.8" stroke-linecap="round" opacity="0.75" />

        <!-- Cute Cat Nose & Mouth -->
        <polygon points="50,65 47,62 53,62" fill="#ff375f" />
        <path d="M 47 67 Q 50 71 50 67 Q 50 71 53 67" stroke="#8e8e93" stroke-width="1.8" stroke-linecap="round" fill="none" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.cat-logo-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  cursor: pointer;
}

.cat-halo {
  position: absolute;
  inset: 2px;
  border-radius: 14px;
  background: radial-gradient(circle, rgba(10, 132, 255, 0.4) 0%, rgba(191, 90, 242, 0.2) 60%, transparent 100%);
  filter: blur(8px);
  opacity: 0.6;
  transition: all 0.35s ease;
  animation: halo-pulse 3s infinite ease-in-out;
}

.cat-avatar-box {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  display: grid;
  place-items: center;
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cat-svg {
  width: 36px;
  height: 36px;
  overflow: visible;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Hover Animations */
.cat-logo-wrapper:hover .cat-halo {
  opacity: 1;
  filter: blur(12px);
  transform: scale(1.15);
}

.cat-logo-wrapper:hover .cat-avatar-box {
  transform: translateY(-2px) scale(1.06);
  border-color: rgba(10, 132, 255, 0.6);
  box-shadow: 0 12px 28px rgba(10, 132, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.cat-logo-wrapper:hover .cat-svg {
  transform: scale(1.08) rotate(-3deg);
}

.cat-logo-wrapper:hover .ear-left {
  animation: ear-wiggle-left 0.6s infinite ease-in-out alternate;
}

.cat-logo-wrapper:hover .ear-right {
  animation: ear-wiggle-right 0.6s infinite 0.1s ease-in-out alternate;
}

.cat-logo-wrapper:hover .whisker {
  animation: whisker-shake 0.8s infinite ease-in-out alternate;
}

/* Keyframes */
@keyframes halo-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.95); }
  50% { opacity: 0.85; transform: scale(1.05); }
}

@keyframes ear-wiggle-left {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-8deg); }
}

@keyframes ear-wiggle-right {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(8deg); }
}

@keyframes whisker-shake {
  0% { transform: translateY(0px); }
  100% { transform: translateY(-1.5px); }
}

.visor-glint {
  animation: glint-sweep 2.5s infinite linear;
}

@keyframes glint-sweep {
  0% { transform: translateX(-15px); opacity: 0.2; }
  50% { opacity: 0.7; }
  100% { transform: translateX(35px); opacity: 0.2; }
}
</style>
