<script setup>
import { computed } from "vue";

const props = defineProps({
  progress: { type: Number, required: true },
  fileName: { type: String, default: "" },
  queueCount: { type: Number, default: 0 },
  speedText: { type: String, default: "" },
});

const progressStyle = computed(() => ({ "--progress": `${Math.min(Math.max(props.progress, 0), 100) * 3.6}deg` }));
</script>

<template>
  <aside class="upload-progress" role="status" aria-live="polite">
    <div class="progress-visual" :style="progressStyle" aria-hidden="true">
      <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
      <div class="progress-core"><i class="ph ph-cloud-arrow-up"></i><strong>{{ Math.round(progress) }}%</strong></div>
    </div>
    <div class="progress-copy">
      <span class="eyebrow">传输中 {{ speedText ? `· ${speedText}` : '' }}</span>
      <strong :title="fileName">{{ fileName || '正在准备文件' }}</strong>
      <small v-if="queueCount">队列中还有 {{ queueCount }} 个文件</small>
      <small v-else>正在校验并写入 R2</small>
    </div>
    <div class="transfer-bars" aria-hidden="true"><i></i><i></i><i></i></div>
  </aside>
</template>

<style scoped>
.upload-progress { position:fixed; right:30px; bottom:110px; z-index:60; display:grid; grid-template-columns:64px minmax(150px,1fr) 26px; gap:14px; align-items:center; width:min(410px,calc(100vw - 32px)); padding:12px 13px 12px 12px; overflow:hidden; color:#1d1d1f; border:1px solid rgba(255,255,255,.9); border-radius:16px; background:rgba(255,255,255,.88); box-shadow:0 20px 45px rgba(29,29,31,.2),inset 0 1px #fff; backdrop-filter:blur(24px) saturate(150%); animation:slide-up 0.25s ease-out; }
@media (prefers-color-scheme: dark) {
  .upload-progress { color:#f2f2f7; border-color:rgba(255,255,255,.15); background:rgba(30,30,35,.88); box-shadow:0 20px 45px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.1); }
  .progress-visual::before { background:rgba(35,35,42,.95); }
  .progress-copy small { color:#a1a1a6; }
}
.upload-progress::before { position:absolute; inset:0; z-index:-1; content:""; background:linear-gradient(90deg,rgba(10,132,255,.05),transparent 48%); }
.progress-visual { position:relative; display:grid; width:62px; height:62px; place-items:center; border-radius:50%; background:conic-gradient(#0a84ff var(--progress),rgba(60,60,67,.12) 0); transition:background .25s ease; }
.progress-visual::before { position:absolute; inset:4px; content:""; border-radius:inherit; background:rgba(255,255,255,.92); }
.progress-core { position:relative; z-index:1; display:grid; gap:1px; place-items:center; color:#0a84ff; }
.progress-core i { font-size:17px; animation:lift 1.4s ease-in-out infinite; }
.progress-core strong { font-size:11px; font-variant-numeric:tabular-nums; }
.orbit { position:absolute; inset:-4px; border:1px solid transparent; border-top-color:rgba(10,132,255,.46); border-radius:50%; }
.orbit-one { animation:spin 2.5s linear infinite; }
.orbit-two { inset:-8px; border-top-color:transparent; border-right-color:rgba(10,132,255,.18); animation:spin 4s linear infinite reverse; }
.progress-copy { display:grid; min-width:0; gap:3px; }
.eyebrow { color:#0a84ff; font-size:10px; font-weight:650; letter-spacing:.08em; }
.progress-copy strong { overflow:hidden; font-size:13px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
.progress-copy small { color:#6e6e73; font-size:11px; }
.transfer-bars { display:grid; gap:4px; }
.transfer-bars i { display:block; width:18px; height:2px; border-radius:999px; background:#0a84ff; animation:transfer 1.1s ease-in-out infinite; }
.transfer-bars i:nth-child(2) { animation-delay:.15s; }
.transfer-bars i:nth-child(3) { animation-delay:.3s; }
@keyframes spin { to { transform:rotate(360deg); } }
@keyframes lift { 50% { transform:translateY(-3px); } }
@keyframes transfer { 50% { opacity:.22; transform:translateX(6px); } }
@media(max-width:720px) { .upload-progress { right:16px; bottom:16px; } }
</style>
