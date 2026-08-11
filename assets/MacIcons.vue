<script setup>
import { computed } from "vue";

const props = defineProps({
  name: { type: String, required: true }, // 'finder' | 'photos' | 'cinema' | 'music' | 'xcode' | 'archive' | 'preview' | 'settings' | 'trash' | 'upload' | 'folder' | 'doc' | 'zip' | 'video' | 'audio' | 'image'
  size: { type: [Number, String], default: 48 },
  extension: { type: String, default: "" },
});

const iconSize = computed(() => (typeof props.size === "number" ? `${props.size}px` : props.size));
</script>

<template>
  <div class="mac-icon-wrapper" :style="{ width: iconSize, height: iconSize }">
    <!-- 1. 📁 macOS Finder App Icon -->
    <svg v-if="name === 'finder'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fnd-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4facfe" />
          <stop offset="100%" stop-color="#00f2fe" />
        </linearGradient>
        <linearGradient id="fnd-face" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e0f2fe" />
          <stop offset="100%" stop-color="#bae6fd" />
        </linearGradient>
        <filter id="fnd-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3" />
        </filter>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#fnd-bg)" filter="url(#fnd-shadow)" />
      <!-- Face Split -->
      <path d="M 6 26 C 6 15 15 6 26 6 L 50 6 L 50 94 L 26 94 C 15 94 6 85 6 74 Z" fill="#38bdf8" />
      <!-- Two Eyes -->
      <circle cx="34" cy="40" r="4.5" fill="#0369a1" />
      <circle cx="66" cy="40" r="4.5" fill="#0369a1" />
      <!-- Nose / Center Dividing Line -->
      <path d="M 50 24 L 50 56 Q 44 60 40 60" fill="none" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round" />
      <!-- Big Smile -->
      <path d="M 28 64 Q 50 82 72 64" fill="none" stroke="#0369a1" stroke-width="5" stroke-linecap="round" />
    </svg>

    <!-- 2. 🖼️ macOS Photos App Icon -->
    <svg v-else-if="name === 'photos'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <filter id="pht-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25" />
        </filter>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#ffffff" filter="url(#pht-shadow)" />
      <g transform="translate(50, 50)">
        <!-- 8 Colorful Petals -->
        <ellipse cx="0" cy="-22" rx="7.5" ry="15" fill="#ff2d55" opacity="0.9" />
        <ellipse cx="15.5" cy="-15.5" rx="7.5" ry="15" fill="#ff9500" opacity="0.9" transform="rotate(45)" />
        <ellipse cx="22" cy="0" rx="7.5" ry="15" fill="#ffcc00" opacity="0.9" transform="rotate(90)" />
        <ellipse cx="15.5" cy="15.5" rx="7.5" ry="15" fill="#34c759" opacity="0.9" transform="rotate(135)" />
        <ellipse cx="0" cy="22" rx="7.5" ry="15" fill="#00c7be" opacity="0.9" transform="rotate(180)" />
        <ellipse cx="-15.5" cy="15.5" rx="7.5" ry="15" fill="#007aff" opacity="0.9" transform="rotate(225)" />
        <ellipse cx="-22" cy="0" rx="7.5" ry="15" fill="#5856d6" opacity="0.9" transform="rotate(270)" />
        <ellipse cx="-15.5" cy="-15.5" rx="7.5" ry="15" fill="#af52de" opacity="0.9" transform="rotate(315)" />
        <circle cx="0" cy="0" r="6" fill="#ffffff" />
      </g>
    </svg>

    <!-- 3. 🎬 macOS QuickTime / Cinema App Icon -->
    <svg v-else-if="name === 'cinema'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="mov-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="mov-q" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#2563eb" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#mov-bg)" />
      <!-- Metallic 'Q' Logo Loop -->
      <circle cx="50" cy="46" r="25" fill="none" stroke="url(#mov-q)" stroke-width="12" />
      <path d="M 54 50 L 74 76" stroke="url(#mov-q)" stroke-width="12" stroke-linecap="round" />
      <!-- Play Triangle Center -->
      <polygon points="46,38 46,54 58,46" fill="#ffffff" />
    </svg>

    <!-- 4. 🎵 macOS Apple Music App Icon -->
    <svg v-else-if="name === 'music'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="mus-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fa233b" />
          <stop offset="100%" stop-color="#fb5c74" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#mus-bg)" />
      <!-- Double Musical Note -->
      <path d="M 68 28 L 44 34 L 44 62 C 41 60 36 60 33 62 C 28 65 28 72 32 75 C 36 78 44 76 44 69 L 44 42 L 64 37 L 64 56 C 61 54 56 54 53 56 C 48 59 48 66 52 69 C 56 72 64 70 64 63 L 64 32 Q 64 28 68 28 Z" fill="#ffffff" />
    </svg>

    <!-- 5. 💻 macOS Xcode / Code Editor App Icon -->
    <svg v-else-if="name === 'xcode'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="xc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#xc-bg)" />
      <!-- Blueprint Grid Lines -->
      <path d="M 6 35 L 94 35 M 6 65 L 94 65 M 35 6 L 35 94 M 65 6 L 65 94" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- Hammer Graphic -->
      <g transform="translate(20, 20) rotate(-25, 30, 30)">
        <rect x="25" y="15" width="10" height="42" rx="4" fill="#cbd5e1" />
        <rect x="12" y="8" width="36" height="15" rx="3" fill="#64748b" />
        <polygon points="12,12 5,16 12,20" fill="#94a3b8" />
      </g>
    </svg>

    <!-- 6. 🗜️ macOS Archive Utility App Icon -->
    <svg v-else-if="name === 'archive'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="arc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#arc-bg)" />
      <!-- Package Flaps & Zipper -->
      <rect x="18" y="24" width="64" height="52" rx="8" fill="#fef08a" />
      <rect x="44" y="24" width="12" height="52" fill="#d97706" />
      <!-- Silver Zipper Teeth -->
      <path d="M 44 30 H 56 M 44 38 H 56 M 44 46 H 56 M 44 54 H 56 M 44 62 H 56" stroke="#ffffff" stroke-width="2.5" />
      <rect x="42" y="44" width="16" height="14" rx="3" fill="#64748b" stroke="#ffffff" stroke-width="1.5" />
    </svg>

    <!-- 7. 📄 macOS Preview / Document Reader App Icon -->
    <svg v-else-if="name === 'preview'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="prv-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#prv-bg)" />
      <!-- Two overlapping photo slides -->
      <rect x="18" y="22" width="46" height="34" rx="4" fill="#ffffff" transform="rotate(-8, 41, 39)" />
      <rect x="36" y="32" width="46" height="34" rx="4" fill="#f8fafc" transform="rotate(8, 59, 49)" />
      <!-- Magnifying Glass -->
      <circle cx="48" cy="48" r="18" fill="none" stroke="#e2e8f0" stroke-width="6" />
      <line x1="61" y1="61" x2="78" y2="78" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" />
    </svg>

    <!-- 8. ⚙️ macOS System Settings App Icon -->
    <svg v-else-if="name === 'settings'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="set-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#64748b" />
          <stop offset="100%" stop-color="#334155" />
        </linearGradient>
        <linearGradient id="set-gear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f1f5f9" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#set-bg)" />
      <!-- Big Center Gear -->
      <g transform="translate(50, 50)">
        <circle cx="0" cy="0" r="26" fill="url(#set-gear)" />
        <circle cx="0" cy="0" r="12" fill="#334155" />
        <!-- Gear Teeth -->
        <rect v-for="i in 8" :key="i" x="-4" y="-32" width="8" height="10" rx="2" fill="url(#set-gear)" :transform="`rotate(${i * 45})`" />
      </g>
    </svg>

    <!-- 9. 🗑️ macOS Trash App Icon -->
    <svg v-else-if="name === 'trash'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="tr-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#tr-bg)" />
      <!-- Glass Wire Mesh Basket -->
      <path d="M 28 32 L 32 78 Q 33 84 40 84 L 60 84 Q 67 84 68 78 L 72 32 Z" fill="rgba(255,255,255,0.25)" stroke="#ffffff" stroke-width="3" />
      <ellipse cx="50" cy="32" rx="22" ry="5" fill="none" stroke="#ffffff" stroke-width="3" />
      <line x1="38" y1="36" x2="41" y2="78" stroke="#ffffff" stroke-width="2" />
      <line x1="50" y1="37" x2="50" y2="79" stroke="#ffffff" stroke-width="2" />
      <line x1="62" y1="36" x2="59" y2="78" stroke="#ffffff" stroke-width="2" />
    </svg>

    <!-- 10. ➕ Quick Upload Icon -->
    <svg v-else-if="name === 'upload'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="upl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#upl-bg)" />
      <!-- Cloud with Arrow -->
      <path d="M 50 32 L 36 46 H 45 V 64 H 55 V 46 H 64 Z" fill="#ffffff" />
      <path d="M 24 66 Q 24 58 32 58 Q 34 50 44 48 Q 50 40 60 44 Q 70 42 74 52 Q 78 56 76 66 Z" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="3" />
    </svg>

    <!-- 10.1 🧮 macOS Calculator App Icon -->
    <svg v-else-if="name === 'calculator'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="calc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3a3a3c" />
          <stop offset="100%" stop-color="#1c1c1e" />
        </linearGradient>
        <linearGradient id="calc-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff9f0a" />
          <stop offset="100%" stop-color="#f57c00" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="20" fill="url(#calc-bg)" />
      <!-- Grid 4 quadrants -->
      <rect x="14" y="14" width="32" height="32" rx="10" fill="#505050" />
      <text x="30" y="36" font-size="20" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">+</text>

      <rect x="54" y="14" width="32" height="32" rx="10" fill="url(#calc-orange)" />
      <text x="70" y="34" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">−</text>

      <rect x="14" y="54" width="32" height="32" rx="10" fill="#505050" />
      <text x="30" y="75" font-size="20" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">×</text>

      <rect x="54" y="54" width="32" height="32" rx="10" fill="url(#calc-orange)" />
      <text x="70" y="75" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">=</text>
    </svg>

    <!-- 10.2 📝 macOS Notes App Icon -->
    <svg v-else-if="name === 'notes'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="nts-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffd60a" />
          <stop offset="100%" stop-color="#ffcc00" />
        </linearGradient>
        <filter id="nts-sh">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.25" />
        </filter>
      </defs>
      <!-- Notepad Body -->
      <rect x="10" y="10" width="80" height="80" rx="14" fill="#ffffff" filter="url(#nts-sh)" />
      <!-- Yellow Header Band -->
      <path d="M 10 24 C 10 16 16 10 24 10 L 76 10 C 84 10 90 16 90 24 L 90 32 L 10 32 Z" fill="url(#nts-top)" />
      <!-- Leather Stitching / Dot Hints -->
      <circle cx="20" cy="21" r="1.5" fill="#ca8a04" />
      <circle cx="35" cy="21" r="1.5" fill="#ca8a04" />
      <circle cx="50" cy="21" r="1.5" fill="#ca8a04" />
      <circle cx="65" cy="21" r="1.5" fill="#ca8a04" />
      <circle cx="80" cy="21" r="1.5" fill="#ca8a04" />
      <!-- Ruled Horizontal Paper Lines -->
      <line x1="20" y1="44" x2="80" y2="44" stroke="#e5e5ea" stroke-width="2" />
      <line x1="20" y1="56" x2="80" y2="56" stroke="#e5e5ea" stroke-width="2" />
      <line x1="20" y1="68" x2="80" y2="68" stroke="#e5e5ea" stroke-width="2" />
      <line x1="20" y1="80" x2="60" y2="80" stroke="#e5e5ea" stroke-width="2" />
      <!-- Left Red Margin Line -->
      <line x1="28" y1="32" x2="28" y2="90" stroke="#ff453a" stroke-width="1.5" opacity="0.6" />
    </svg>

    <!-- 11.0 🖼️ macOS Pictures / Photos System Folder Icon -->
    <svg v-else-if="name === 'folder-pictures' || name === 'folder-photos'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-pic-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-pic-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-pic-b)" />
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <path d="M 8 40 C 8 36 11 32 16 32 L 84 32 C 89 32 92 36 92 40 L 92 78 C 92 84 88 88 82 88 L 18 88 C 12 88 8 84 8 78 Z" fill="url(#fld-pic-f)" />
      <!-- Photos Flower Emblem on Folder -->
      <g transform="translate(50, 60) scale(0.65)" opacity="0.95">
        <ellipse cx="0" cy="-14" rx="5" ry="10" fill="#ff2d55" />
        <ellipse cx="10" cy="-10" rx="5" ry="10" fill="#ff9500" transform="rotate(45)" />
        <ellipse cx="14" cy="0" rx="5" ry="10" fill="#ffcc00" transform="rotate(90)" />
        <ellipse cx="10" cy="10" rx="5" ry="10" fill="#34c759" transform="rotate(135)" />
        <ellipse cx="0" cy="14" rx="5" ry="10" fill="#00c7be" transform="rotate(180)" />
        <ellipse cx="-10" cy="10" rx="5" ry="10" fill="#007aff" transform="rotate(225)" />
        <ellipse cx="-14" cy="0" rx="5" ry="10" fill="#5856d6" transform="rotate(270)" />
        <ellipse cx="-10" cy="-10" rx="5" ry="10" fill="#af52de" transform="rotate(315)" />
        <circle cx="0" cy="0" r="4" fill="#ffffff" />
      </g>
    </svg>

    <!-- 11.1 🎬 macOS Movies / Videos System Folder Icon -->
    <svg v-else-if="name === 'folder-movies' || name === 'folder-videos'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-mov-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-mov-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-mov-b)" />
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <path d="M 8 40 C 8 36 11 32 16 32 L 84 32 C 89 32 92 36 92 40 L 92 78 C 92 84 88 88 82 88 L 18 88 C 12 88 8 84 8 78 Z" fill="url(#fld-mov-f)" />
      <!-- Film Clapperboard Glyph -->
      <g transform="translate(50, 60) scale(0.65)" fill="#ffffff" opacity="0.95">
        <rect x="-18" y="-14" width="36" height="28" rx="4" fill="none" stroke="#ffffff" stroke-width="3.5" />
        <polygon points="-6,-6 -6,8 8,1" fill="#ffffff" />
      </g>
    </svg>

    <!-- 11.2 🎵 macOS Music System Folder Icon -->
    <svg v-else-if="name === 'folder-music'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-mus-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-mus-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-mus-b)" />
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <path d="M 8 40 C 8 36 11 32 16 32 L 84 32 C 89 32 92 36 92 40 L 92 78 C 92 84 88 88 82 88 L 18 88 C 12 88 8 84 8 78 Z" fill="url(#fld-mus-f)" />
      <!-- Music Note Glyph -->
      <g transform="translate(50, 60) scale(0.65)" fill="#ffffff" opacity="0.95">
        <path d="M 10 -16 L -6 -12 L -6 8 C -8 6 -11 6 -13 7 C -16 9 -16 13 -14 15 C -11 17 -6 16 -6 11 L -6 -5 L 8 -8 L 8 4 C 6 2 3 2 1 3 C -2 5 -2 9 0 11 C 3 13 8 12 8 7 L 8 -13 Q 8 -16 10 -16 Z" />
      </g>
    </svg>

    <!-- 11.3 📄 macOS Documents System Folder Icon -->
    <svg v-else-if="name === 'folder-documents'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-doc-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-doc-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-doc-b)" />
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <path d="M 8 40 C 8 36 11 32 16 32 L 84 32 C 89 32 92 36 92 40 L 92 78 C 92 84 88 88 82 88 L 18 88 C 12 88 8 84 8 78 Z" fill="url(#fld-doc-f)" />
      <!-- Document Glyph -->
      <g transform="translate(50, 60) scale(0.65)" fill="#ffffff" opacity="0.95">
        <rect x="-12" y="-16" width="24" height="32" rx="3" fill="none" stroke="#ffffff" stroke-width="3" />
        <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="-6" y1="-1" x2="6" y2="-1" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
        <line x1="-6" y1="6" x2="2" y2="6" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      </g>
    </svg>

    <!-- 11.4 📥 macOS Downloads System Folder Icon -->
    <svg v-else-if="name === 'folder-downloads'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-dl-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-dl-f" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
      </defs>
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-dl-b)" />
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <path d="M 8 40 C 8 36 11 32 16 32 L 84 32 C 89 32 92 36 92 40 L 92 78 C 92 84 88 88 82 88 L 18 88 C 12 88 8 84 8 78 Z" fill="url(#fld-dl-f)" />
      <!-- Download Arrow Circle Glyph -->
      <g transform="translate(50, 60) scale(0.65)" fill="#ffffff" opacity="0.95">
        <circle cx="0" cy="0" r="16" fill="none" stroke="#ffffff" stroke-width="3" />
        <path d="M 0 -8 L 0 6 M -5 1 L 0 6 L 5 1" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
    </svg>

    <!-- 11. 📁 macOS 3D Blue Folder File Icon -->
    <svg v-else-if="name === 'folder'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="fld-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
        <linearGradient id="fld-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#0284c7" />
        </linearGradient>
        <filter id="fld-emboss">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3" />
        </filter>
      </defs>
      <!-- Back Tab -->
      <path d="M 12 28 C 12 22 17 18 24 18 L 42 18 C 47 18 50 22 53 26 L 57 30 L 82 30 C 88 30 92 34 92 40 L 92 74 C 92 80 88 84 82 84 L 18 84 C 12 84 8 80 8 74 Z" fill="url(#fld-back)" />
      <!-- White Paper Insert Hint -->
      <rect x="18" y="24" width="64" height="20" rx="3" fill="#ffffff" opacity="0.7" />
      <!-- Front Flap with Depth -->
      <path d="M 8 36 C 8 32 12 30 18 30 L 82 30 C 88 30 92 34 92 38 L 88 76 C 88 82 84 86 78 86 L 14 86 C 8 86 4 82 4 76 Z" fill="url(#fld-front)" filter="url(#fld-emboss)" />
    </svg>

    <!-- 12. 🗜️ macOS ZIP / Compressed File Document Icon -->
    <svg v-else-if="name === 'zip'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <filter id="doc-sh">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.25" />
        </filter>
      </defs>
      <!-- Folded Document Body -->
      <path d="M 20 12 C 20 8 24 6 28 6 L 62 6 L 82 26 L 82 88 C 82 92 78 94 74 94 L 28 94 C 24 94 20 92 20 88 Z" fill="#ffffff" filter="url(#doc-sh)" />
      <!-- Folded Corner -->
      <polygon points="62,6 82,26 62,26" fill="#e2e8f0" />
      <!-- Zipper Pattern Down the Middle -->
      <rect x="44" y="6" width="12" height="88" fill="#fef08a" />
      <path d="M 44 16 H 56 M 44 26 H 56 M 44 36 H 56 M 44 46 H 56 M 44 56 H 56 M 44 66 H 56 M 44 76 H 56" stroke="#b45309" stroke-width="2" />
      <!-- Extension Badge -->
      <rect x="30" y="66" width="40" height="18" rx="4" fill="#eab308" />
      <text x="50" y="79" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        {{ extension || 'ZIP' }}
      </text>
    </svg>

    <!-- 13. 📄 macOS Text / Code / SQL Document Icon -->
    <svg v-else-if="name === 'doc'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <filter id="doc-sh2">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity="0.2" />
        </filter>
      </defs>
      <!-- Folded Document Body -->
      <path d="M 20 12 C 20 8 24 6 28 6 L 62 6 L 82 26 L 82 88 C 82 92 78 94 74 94 L 28 94 C 24 94 20 92 20 88 Z" fill="#ffffff" filter="url(#doc-sh2)" />
      <!-- Folded Corner -->
      <polygon points="62,6 82,26 62,26" fill="#e2e8f0" />
      <!-- Simulated Code / Text Lines -->
      <line x1="30" y1="36" x2="70" y2="36" stroke="#94a3b8" stroke-width="3" stroke-linecap="round" />
      <line x1="30" y1="46" x2="62" y2="46" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      <line x1="30" y1="56" x2="68" y2="56" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      <!-- Extension Badge -->
      <rect x="28" y="68" width="44" height="18" rx="4" fill="#0284c7" />
      <text x="50" y="81" font-size="9.5" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        {{ (extension || 'DOC').toUpperCase() }}
      </text>
    </svg>

    <!-- 14. 🎬 macOS Video File Icon -->
    <svg v-else-if="name === 'video'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="vf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <path d="M 20 12 C 20 8 24 6 28 6 L 62 6 L 82 26 L 82 88 C 82 92 78 94 74 94 L 28 94 C 24 94 20 92 20 88 Z" fill="url(#vf-bg)" />
      <polygon points="62,6 82,26 62,26" fill="#334155" />
      <!-- Play Circle -->
      <circle cx="50" cy="52" r="16" fill="rgba(255,255,255,0.25)" stroke="#ffffff" stroke-width="2" />
      <polygon points="46,44 46,60 58,52" fill="#ffffff" />
      <rect x="28" y="72" width="44" height="16" rx="4" fill="#8b5cf6" />
      <text x="50" y="84" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        {{ (extension || 'MOV').toUpperCase() }}
      </text>
    </svg>

    <!-- 15. 🎵 macOS Audio File Icon -->
    <svg v-else-if="name === 'audio'" viewBox="0 0 100 100" class="mac-svg-icon">
      <defs>
        <linearGradient id="af-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="100%" stop-color="#e11d48" />
        </linearGradient>
      </defs>
      <path d="M 20 12 C 20 8 24 6 28 6 L 62 6 L 82 26 L 82 88 C 82 92 78 94 74 94 L 28 94 C 24 94 20 92 20 88 Z" fill="#ffffff" />
      <polygon points="62,6 82,26 62,26" fill="#fecdd3" />
      <!-- Music Note -->
      <circle cx="44" cy="54" r="8" fill="url(#af-bg)" />
      <rect x="48" y="32" width="4" height="22" fill="url(#af-bg)" />
      <path d="M 48 32 C 54 30 62 34 64 42" stroke="url(#af-bg)" stroke-width="4" fill="none" stroke-linecap="round" />
      <rect x="28" y="72" width="44" height="16" rx="4" fill="#e11d48" />
      <text x="50" y="84" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">
        {{ (extension || 'MP3').toUpperCase() }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.mac-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.mac-svg-icon {
  width: 100%;
  height: 100%;
  overflow: visible;
  display: block;
}
</style>
