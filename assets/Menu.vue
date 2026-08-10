<script setup>
defineProps({ modelValue: Boolean, items: { type: Array, required: true } });
const emit = defineEmits(["update:modelValue", "click"]);
</script>
<template>
  <div class="menu"><Transition name="fade"><button v-if="modelValue" class="menu-backdrop" type="button" aria-label="关闭菜单" @click="emit('update:modelValue', false)"></button></Transition><Transition name="slide-up"><div v-if="modelValue" class="menu-content" role="menu"><button v-for="item in items" :key="item.value" type="button" :disabled="item.disabled" @click="emit('update:modelValue', false); emit('click', item.value)">{{ item.text }}</button></div></Transition></div>
</template>
<style scoped>
.menu-backdrop { position:fixed; inset:0; z-index:1; width:100%; height:100%; background:transparent; }.menu-content { position:absolute; z-index:2; top:calc(100% + 8px); right:0; width:190px; padding:6px; border:1px solid rgba(255,255,255,.9); border-radius:12px; background:rgba(255,255,255,.8); box-shadow:0 16px 38px rgba(29,29,31,.14),inset 0 1px #fff; backdrop-filter:blur(22px) saturate(150%); }.menu-content button { display:block; width:100%; padding:10px 11px; color:#3a3a3c; border-radius:8px; background:transparent; text-align:left; font-size:12px; transition:color .18s,background .18s; }.menu-content button:hover { color:#0071e3; background:rgba(10,132,255,.1); }.menu-content button:disabled { color:#b0b0b5; cursor:not-allowed; }.menu-content button:disabled:hover { background:transparent; }
</style>
