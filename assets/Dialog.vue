<script setup>
defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue"]);
</script>
<template><Transition name="fade"><div v-if="modelValue" class="dialog-mask" @click.self="emit('update:modelValue', false)"><section class="dialog-container" role="dialog" aria-modal="true"><slot></slot></section></div></Transition></template>
<style>
.dialog-mask { position:fixed; inset:0; z-index:40; display:grid; place-items:center; padding:20px; background:rgba(29,29,31,.22); backdrop-filter:blur(9px); }.dialog-container { width:min(340px,100%); overflow:hidden; border:1px solid rgba(255,255,255,.88); border-radius:14px; background:rgba(255,255,255,.84); box-shadow:0 22px 55px rgba(29,29,31,.19),inset 0 1px #fff; backdrop-filter:blur(24px) saturate(150%); }.context-header { padding:15px 16px 12px; overflow:hidden; color:#8e8e93; border-bottom:1px solid rgba(60,60,67,.1); text-overflow:ellipsis; white-space:nowrap; font-family:ui-monospace,"SF Mono",monospace; font-size:10px; }.context-actions { padding:6px; }.context-actions>* { display:block; width:100%; padding:10px; color:#3a3a3c; border-radius:8px; background:transparent; text-align:left; font-size:13px; transition:color .18s,background .18s; }.context-actions>*:hover { color:#0071e3; background:rgba(10,132,255,.1); }.context-actions .danger { color:#d70015; }.context-actions .danger:hover { color:#d70015; background:rgba(215,0,21,.08); }
</style>
