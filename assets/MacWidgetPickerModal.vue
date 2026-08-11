<script setup>
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  activeWidgets: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "toggle-widget"]);

const availableWidgets = [
  {
    id: "weather",
    name: "智能天气预报",
    category: "天气与环境",
    icon: "ph-sun-dim-fill",
    color: "#ff9500",
    desc: "在桌面实时显示当前气温、空气质量、湿度与最高/最低温预警。",
  },
  {
    id: "clock",
    name: "模拟指针时钟",
    category: "时间与效率",
    icon: "ph-clock-countdown-fill",
    color: "#0a84ff",
    desc: "1:1 Apple 经典瑞士机械指针表盘，配合动态秒针与数字公历时间。",
  },
  {
    id: "notes",
    name: "桌面便签备忘录",
    category: "办公与记录",
    icon: "ph-note-pencil-fill",
    color: "#ffd60a",
    desc: "在桌面随时随手记录待办与想法，输入即自动持久化保存到本地。",
  },
  {
    id: "calculator",
    name: "极速桌面计算器",
    category: "工具与计算",
    icon: "ph-calculator-fill",
    color: "#ff9f0a",
    desc: "随时在桌面进行快速四则运算、汇率与数字核算，免去频繁弹窗。",
  },
  {
    id: "storage",
    name: "R2 存储监控仪表",
    category: "系统与云盘",
    icon: "ph-hard-drives-fill",
    color: "#30d158",
    desc: "实时监控 Cloudflare R2 对象存储已用空间、文件总数与直连健康度。",
  },
];
</script>

<template>
  <MacWindow
    v-if="visible"
    title="小组件库 (Desktop Widgets Gallery)"
    icon="ph-squares-four-fill"
    :visible="visible"
    :width="680"
    :height="460"
    :initial-x="180"
    :initial-y="80"
    :z-index="45"
    :is-active="true"
    @close="emit('close')"
  >
    <div class="widget-gallery-body">
      <div class="gallery-header">
        <div>
          <h3>自定义桌面小组件</h3>
          <p>点击「添加至桌面」或「移除」即可即时同步至桌面壁纸，所有配置将自动保存。</p>
        </div>
      </div>

      <div class="widget-cards-grid">
        <div
          v-for="item in availableWidgets"
          :key="item.id"
          class="widget-tile-card"
          :class="{ 'is-added': activeWidgets.includes(item.id) }"
        >
          <div class="tile-icon-box" :style="{ background: item.color }">
            <i class="ph" :class="item.icon"></i>
          </div>

          <div class="tile-info">
            <span class="tile-category">{{ item.category }}</span>
            <strong class="tile-name">{{ item.name }}</strong>
            <p class="tile-desc">{{ item.desc }}</p>
          </div>

          <button
            class="tile-toggle-btn"
            :class="{ 'btn-remove': activeWidgets.includes(item.id) }"
            type="button"
            @click="emit('toggle-widget', item.id)"
          >
            <i class="ph" :class="activeWidgets.includes(item.id) ? 'ph-minus' : 'ph-plus'"></i>
            <span>{{ activeWidgets.includes(item.id) ? '从桌面移除' : '添加至桌面' }}</span>
          </button>
        </div>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.widget-gallery-body {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #14151b;
  overflow-y: auto;
}

[data-theme="light"] .widget-gallery-body {
  background: #fbfbfd;
}

.gallery-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}

.gallery-header p {
  margin: 4px 0 16px;
  font-size: 12px;
  color: #8e8e93;
}

.widget-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

.widget-tile-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: all 0.16s ease;
}

.widget-tile-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.22);
}

.widget-tile-card.is-added {
  border-color: rgba(10, 132, 255, 0.4);
  background: rgba(10, 132, 255, 0.08);
}

[data-theme="light"] .widget-tile-card {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

[data-theme="light"] .widget-tile-card.is-added {
  background: rgba(10, 132, 255, 0.05);
  border-color: #0a84ff;
}

.tile-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 20px;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tile-category {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #8e8e93;
}

.tile-name {
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin: 2px 0 4px;
}

.tile-desc {
  font-size: 11.5px;
  line-height: 1.45;
  color: #a1a1a6;
  margin: 0 0 14px;
}

[data-theme="light"] .tile-desc {
  color: #636366;
}

.tile-toggle-btn {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: #0a84ff;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tile-toggle-btn:hover {
  background: #0071e3;
  transform: scale(1.02);
}

.tile-toggle-btn.btn-remove {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
  border: 1px solid rgba(255, 69, 58, 0.3);
}

.tile-toggle-btn.btn-remove:hover {
  background: #ff453a;
  color: #ffffff;
}
</style>
