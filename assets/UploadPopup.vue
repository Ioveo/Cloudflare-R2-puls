<script setup>
defineProps({ modelValue: Boolean });
const emit = defineEmits(["update:modelValue", "upload", "createFolder"]);
</script>

<template>
  <div class="popup">
    <Transition name="fade">
      <button v-if="modelValue" class="popup-modal" type="button" aria-label="关闭上传面板" @click="emit('update:modelValue', false)"></button>
    </Transition>
    <Transition name="slide-up">
      <section v-if="modelValue" class="popup-content" aria-label="新建或上传">
        <div class="popup-header">
          <strong>新建或上传</strong>
          <button type="button" title="关闭" @click="emit('update:modelValue', false)">×</button>
        </div>
        <div class="button-grid">
          <button type="button" @click="$refs.camera.click()">
            <span class="action-icon"><i class="ph ph-camera"></i></span>
            <span>拍照上传</span>
            <input ref="camera" type="file" accept="image/*" capture="camera" hidden @change="emit('upload', $event.target)" />
          </button>
          <button type="button" @click="$refs.media.click()">
            <span class="action-icon"><i class="ph ph-images"></i></span>
            <span>图片与视频</span>
            <input ref="media" type="file" accept="image/*,video/*" multiple hidden @change="emit('upload', $event.target)" />
          </button>
          <button type="button" @click="$refs.files.click()">
            <span class="action-icon"><i class="ph ph-file-arrow-up"></i></span>
            <span>选择文件</span>
            <input ref="files" type="file" multiple hidden @change="emit('upload', $event.target)" />
          </button>
          <button type="button" @click="emit('createFolder')">
            <span class="action-icon"><i class="ph ph-folder-plus"></i></span>
            <span>新建文件夹</span>
          </button>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.popup-modal { position:fixed; inset:0; z-index:90; width:100%; height:100%; background:rgba(29,29,31,.35); backdrop-filter:blur(12px); }
.popup-content { position:fixed; right:50%; bottom:28px; z-index:91; width:min(510px,calc(100% - 32px)); overflow:hidden; color:#1d1d1f; border:1px solid rgba(255,255,255,.9); border-radius:16px; background:rgba(255,255,255,.88); box-shadow:0 22px 55px rgba(29,29,31,.24),inset 0 1px #fff; backdrop-filter:blur(24px) saturate(150%); transform:translateX(50%); }
.popup-header { display:flex; align-items:center; justify-content:space-between; padding:17px 18px 12px; }
.popup-header strong { font-size:15px; }
.popup-header button { width:28px; height:28px; color:#6e6e73; border-radius:8px; background:transparent; font-size:21px; transition:color .18s,background .18s; cursor:pointer; }
.popup-header button:hover { color:#0071e3; background:rgba(10,132,255,.1); }
.button-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; padding:6px 12px 15px; }
.button-grid button { display:grid; gap:8px; place-items:center; min-height:108px; padding:10px 6px; color:#515156; border:1px solid transparent; border-radius:11px; background:transparent; font-size:11px; transition:color .18s,background .18s,border-color .18s,transform .18s; cursor:pointer; }
.button-grid button:hover { color:#0071e3; border-color:rgba(10,132,255,.15); background:rgba(10,132,255,.08); transform:translateY(-2px); }
.action-icon { display:grid; width:37px; height:37px; place-items:center; color:#fff; border:1px solid rgba(255,255,255,.5); border-radius:11px; background:#0a84ff; box-shadow:0 6px 14px rgba(10,132,255,.18),inset 0 1px rgba(255,255,255,.3); font-size:20px; line-height:1; }

@media (prefers-color-scheme: dark) {
  .popup-modal { background:rgba(0,0,0,.6); }
  .popup-content { color:#f2f2f7; border-color:rgba(255,255,255,.15); background:rgba(30,30,36,.92); box-shadow:0 22px 55px rgba(0,0,0,.6),inset 0 1px rgba(255,255,255,.12); }
  .popup-header button { color:#98989d; }
  .popup-header button:hover { color:#409cff; background:rgba(10,132,255,.2); }
  .button-grid button { color:#a1a1a6; }
  .button-grid button:hover { color:#409cff; border-color:rgba(10,132,255,.3); background:rgba(10,132,255,.15); }
}

@media(max-width:520px) {
  .popup-content { bottom:16px; }
  .button-grid { grid-template-columns:repeat(2,1fr); }
  .button-grid button { min-height:82px; }
}
</style>
