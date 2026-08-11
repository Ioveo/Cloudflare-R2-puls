<script setup>
import { ref } from "vue";
import MacWindow from "./MacWindow.vue";

const props = defineProps({
  visible: { type: Boolean, default: false },
  zIndex: { type: Number, default: 42 },
  isActive: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "focus"]);

const display = ref("0");
const equation = ref("");
const awaitingOperand = ref(false);
const prevValue = ref(null);
const operator = ref(null);

function clearAll() {
  display.value = "0";
  equation.value = "";
  awaitingOperand.value = false;
  prevValue.value = null;
  operator.value = null;
}

function toggleSign() {
  if (display.value === "0") return;
  display.value = display.value.startsWith("-") ? display.value.slice(1) : `-${display.value}`;
}

function inputPercent() {
  display.value = String(parseFloat(display.value) / 100);
}

function inputDigit(digit) {
  if (awaitingOperand.value || display.value === "0") {
    display.value = String(digit);
    awaitingOperand.value = false;
  } else {
    display.value += String(digit);
  }
}

function inputDot() {
  if (awaitingOperand.value) {
    display.value = "0.";
    awaitingOperand.value = false;
    return;
  }
  if (!display.value.includes(".")) {
    display.value += ".";
  }
}

function performOp(nextOp) {
  const inputValue = parseFloat(display.value);
  if (prevValue.value === null) {
    prevValue.value = inputValue;
  } else if (operator.value) {
    const current = prevValue.value || 0;
    let result = 0;
    if (operator.value === "+") result = current + inputValue;
    if (operator.value === "-") result = current - inputValue;
    if (operator.value === "×") result = current * inputValue;
    if (operator.value === "÷") result = inputValue !== 0 ? current / inputValue : "Error";
    display.value = String(result);
    prevValue.value = result;
  }
  awaitingOperand.value = true;
  operator.value = nextOp;
}

function calculate() {
  if (!operator.value || prevValue.value === null) return;
  const inputValue = parseFloat(display.value);
  const current = prevValue.value;
  let result = 0;
  if (operator.value === "+") result = current + inputValue;
  if (operator.value === "-") result = current - inputValue;
  if (operator.value === "×") result = current * inputValue;
  if (operator.value === "÷") result = inputValue !== 0 ? current / inputValue : "Error";
  display.value = String(result);
  equation.value = `${current} ${operator.value} ${inputValue} =`;
  prevValue.value = null;
  operator.value = null;
  awaitingOperand.value = true;
}
</script>

<template>
  <MacWindow
    v-if="visible"
    title="计算器 (Calculator)"
    icon="ph-calculator-fill"
    :visible="visible"
    :width="280"
    :height="400"
    :initial-x="220"
    :initial-y="120"
    :z-index="zIndex"
    :is-active="isActive"
    @focus="emit('focus')"
    @close="emit('close')"
  >
    <div class="calc-body">
      <!-- Screen Display -->
      <div class="calc-screen">
        <span class="calc-eq">{{ equation }}</span>
        <span class="calc-val">{{ display }}</span>
      </div>

      <!-- Keypad -->
      <div class="calc-grid">
        <button class="calc-btn fn" type="button" @click="clearAll">AC</button>
        <button class="calc-btn fn" type="button" @click="toggleSign">±</button>
        <button class="calc-btn fn" type="button" @click="inputPercent">%</button>
        <button class="calc-btn op" type="button" @click="performOp('÷')">÷</button>

        <button class="calc-btn num" type="button" @click="inputDigit(7)">7</button>
        <button class="calc-btn num" type="button" @click="inputDigit(8)">8</button>
        <button class="calc-btn num" type="button" @click="inputDigit(9)">9</button>
        <button class="calc-btn op" type="button" @click="performOp('×')">×</button>

        <button class="calc-btn num" type="button" @click="inputDigit(4)">4</button>
        <button class="calc-btn num" type="button" @click="inputDigit(5)">5</button>
        <button class="calc-btn num" type="button" @click="inputDigit(6)">6</button>
        <button class="calc-btn op" type="button" @click="performOp('-')">−</button>

        <button class="calc-btn num" type="button" @click="inputDigit(1)">1</button>
        <button class="calc-btn num" type="button" @click="inputDigit(2)">2</button>
        <button class="calc-btn num" type="button" @click="inputDigit(3)">3</button>
        <button class="calc-btn op" type="button" @click="performOp('+')">+</button>

        <button class="calc-btn num zero" type="button" @click="inputDigit(0)">0</button>
        <button class="calc-btn num" type="button" @click="inputDot">.</button>
        <button class="calc-btn op eq" type="button" @click="calculate">=</button>
      </div>
    </div>
  </MacWindow>
</template>

<style scoped>
.calc-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  background: #1c1c1e;
  gap: 10px;
}

[data-theme="light"] .calc-body {
  background: #f2f2f7;
}

.calc-screen {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 8px 12px;
  height: 72px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

[data-theme="light"] .calc-screen {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
}

.calc-eq {
  font-size: 11px;
  color: #8e8e93;
  min-height: 14px;
}

.calc-val {
  font-size: 32px;
  font-weight: 300;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

[data-theme="light"] .calc-val {
  color: #000000;
}

.calc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex: 1;
}

.calc-btn {
  display: grid;
  place-items: center;
  border-radius: 50px;
  border: none;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: filter 0.1s ease, transform 0.05s ease;
  user-select: none;
}

.calc-btn:active {
  transform: scale(0.94);
}

.calc-btn.num {
  background: #505050;
  color: #ffffff;
}

[data-theme="light"] .calc-btn.num {
  background: #e5e5ea;
  color: #000000;
}

.calc-btn.zero {
  grid-column: span 2;
  border-radius: 26px;
  padding-left: 20px;
  justify-content: flex-start;
}

.calc-btn.fn {
  background: #a5a5a5;
  color: #000000;
}

.calc-btn.op {
  background: #ff9f0a;
  color: #ffffff;
  font-size: 22px;
}

.calc-btn.op:hover {
  filter: brightness(1.15);
}
</style>
