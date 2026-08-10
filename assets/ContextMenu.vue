<script setup>
defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  title: { type: String, default: "" },
  actions: { type: Array, default: () => [] },
});
const emit = defineEmits(["close", "select"]);
</script>

<template>
  <div v-if="visible" class="context-layer" @contextmenu.stop.prevent>
    <button class="context-backdrop" type="button" aria-label="关闭菜单" @click="emit('close')"></button>
    <div class="context-menu" :style="{ left: `${x}px`, top: `${y}px` }" role="menu" @click.stop>
      <div class="context-title" :title="title">{{ title || "文件操作" }}</div>
      <button v-for="action in actions" :key="action.id" class="context-action" :class="{ danger: action.danger }" :disabled="action.disabled" type="button" role="menuitem" @click="emit('select', action.id)">
        <i class="ph" :class="action.icon" aria-hidden="true"></i><span>{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.context-layer { position:fixed; inset:0; z-index:50; }
.context-backdrop { position:absolute; inset:0; width:100%; height:100%; cursor:default; background:transparent; }
.context-menu { position:absolute; width:218px; padding:6px; overflow:hidden; border:1px solid rgba(255,255,255,.92); border-radius:13px; background:rgba(255,255,255,.84); box-shadow:0 18px 45px rgba(29,29,31,.18),inset 0 1px #fff; backdrop-filter:blur(25px) saturate(155%); animation:context-in .16s ease-out both; }
.context-title { padding:8px 10px 7px; overflow:hidden; color:#8e8e93; border-bottom:1px solid rgba(60,60,67,.1); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.context-action { display:flex; align-items:center; gap:10px; width:100%; min-height:36px; padding:8px 10px; color:#3a3a3c; border-radius:8px; background:transparent; text-align:left; font-size:12px; transition:color .15s,background .15s,transform .15s; }
.context-action i { width:19px; color:#6e6e73; font-size:17px; text-align:center; }
.context-action:hover { color:#0071e3; background:rgba(10,132,255,.1); transform:translateX(2px); }
.context-action:hover i { color:#0071e3; }
.context-action:disabled { color:#b0b0b5; cursor:not-allowed; }
.context-action:disabled:hover { background:transparent; transform:none; }
.context-action.danger { color:#d70015; }
.context-action.danger i { color:#d70015; }
.context-action.danger:hover { background:rgba(215,0,21,.08); }

@media (prefers-color-scheme: dark) {
  .context-menu { border-color:rgba(255,255,255,.14); background:rgba(32,32,38,.88); box-shadow:0 18px 45px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.1); }
  .context-title { color:#98989d; border-bottom-color:rgba(255,255,255,.1); }
  .context-action { color:#f2f2f7; }
  .context-action i { color:#98989d; }
  .context-action:hover { color:#409cff; background:rgba(10,132,255,.18); }
  .context-action:hover i { color:#409cff; }
  .context-action.danger { color:#ff453a; }
  .context-action.danger i { color:#ff453a; }
  .context-action.danger:hover { background:rgba(255,69,58,.15); }
}

@keyframes context-in { from { opacity:0; transform:scale(.96) translateY(-3px); } to { opacity:1; transform:scale(1) translateY(0); } }
</style>
