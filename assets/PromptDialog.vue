<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  modelValue: Boolean,
  mode: { type: String, default: "input" },
  title: { type: String, default: "" },
  message: { type: String, default: "" },
  initialValue: { type: String, default: "" },
  confirmText: { type: String, default: "确定" },
  cancelText: { type: String, default: "取消" },
  error: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue", "submit"]);
const value = ref("");
const username = ref("");
const password = ref("");
const input = ref(null);

watch(() => props.modelValue, (visible) => {
  if (!visible) return;
  value.value = props.initialValue;
  username.value = "";
  password.value = "";
  nextTick(() => input.value?.focus());
});

function close() { emit("update:modelValue", false); }
function submit() {
  if (props.mode === "confirm") return emit("submit", true);
  if (props.mode === "login") return emit("submit", { username: username.value.trim(), password: password.value });
  emit("submit", value.value.trim());
}
</script>

<template>
  <Transition name="fade">
    <div v-if="modelValue" class="prompt-mask" @click.self="close">
      <form class="prompt-dialog" role="dialog" aria-modal="true" @submit.prevent="submit">
        <div class="prompt-icon"><i class="ph" :class="mode === 'login' ? 'ph-lock-key' : mode === 'confirm' ? 'ph-warning' : 'ph-pencil-simple'" /></div>
        <h2>{{ title }}</h2>
        <p v-if="message">{{ message }}</p>
        <template v-if="mode === 'login'">
          <label class="prompt-field"><span>用户名</span><input ref="input" v-model="username" autocomplete="username" required /></label>
          <label class="prompt-field"><span>密码</span><input v-model="password" type="password" autocomplete="current-password" required /></label>
        </template>
        <label v-else-if="mode === 'input'" class="prompt-field"><span class="sr-only">输入内容</span><input ref="input" v-model="value" :placeholder="initialValue || '请输入内容'" required /></label>
        <p v-if="error" class="prompt-error"><i class="ph ph-warning-circle" />{{ error }}</p>
        <div class="prompt-actions"><button type="button" class="prompt-button secondary" @click="close">{{ cancelText }}</button><button type="submit" class="prompt-button primary">{{ confirmText }}</button></div>
      </form>
    </div>
  </Transition>
</template>

<style scoped>
.prompt-mask { position:fixed; inset:0; z-index:80; display:grid; place-items:center; padding:20px; background:rgba(29,29,31,.28); backdrop-filter:blur(18px) saturate(125%); }.prompt-dialog { width:min(390px,100%); padding:24px; color:#1d1d1f; border:1px solid rgba(255,255,255,.92); border-radius:22px; background:rgba(255,255,255,.82); box-shadow:0 28px 70px rgba(29,29,31,.2),inset 0 1px #fff; backdrop-filter:blur(28px) saturate(155%); animation:prompt-in .22s cubic-bezier(.2,.8,.2,1) both; }.prompt-icon { display:grid; width:42px; height:42px; place-items:center; margin-bottom:14px; color:#fff; border-radius:13px; background:#0a84ff; box-shadow:0 8px 18px rgba(10,132,255,.24),inset 0 1px rgba(255,255,255,.45); font-size:21px; }.prompt-dialog h2 { margin:0; font-size:19px; letter-spacing:0; }.prompt-dialog p { margin:8px 0 18px; color:#6e6e73; font-size:13px; line-height:1.5; }.prompt-field { display:grid; gap:7px; margin-top:12px; color:#6e6e73; font-size:12px; }.prompt-field input { width:100%; height:42px; padding:0 12px; color:#1d1d1f; border:1px solid rgba(60,60,67,.16); border-radius:11px; outline:0; background:rgba(255,255,255,.74); box-shadow:inset 0 1px 2px rgba(29,29,31,.04); }.prompt-field input:focus { border-color:rgba(10,132,255,.65); box-shadow:0 0 0 4px rgba(10,132,255,.12); }.prompt-error { display:flex; gap:6px; align-items:center; margin:12px 0 0!important; color:#d70015!important; font-size:12px!important; }.prompt-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:22px; }.prompt-button { min-width:76px; height:38px; padding:0 15px; border-radius:10px; font-size:13px; font-weight:650; transition:transform .16s,background .16s,box-shadow .16s; }.prompt-button:active { transform:scale(.97); }.prompt-button.secondary { color:#515156; background:rgba(118,118,128,.12); }.prompt-button.secondary:hover { background:rgba(118,118,128,.2); }.prompt-button.primary { color:#fff; background:#0a84ff; box-shadow:0 7px 15px rgba(10,132,255,.2),inset 0 1px rgba(255,255,255,.3); }.prompt-button.primary:hover { background:#0071e3; }.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; } @keyframes prompt-in { from { opacity:0; transform:translateY(10px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
</style>
