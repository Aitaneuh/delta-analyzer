<script setup lang="ts">
import { computed, ref } from 'vue'
import { count, percent, ratio } from '@/services/stats'

export interface Bar {
  key: string
  label: string
  value: number
}

const props = defineProps<{ bars: Bar[]; label: string; unit?: string }>()

const MAX_AXIS_LABELS = 8
const hovered = ref<number | null>(null)

const max = computed(() => Math.max(1, ...props.bars.map((bar) => bar.value)))
const total = computed(() => props.bars.reduce((sum, bar) => sum + bar.value, 0))
const labelEvery = computed(() => Math.max(1, Math.ceil(props.bars.length / MAX_AXIS_LABELS)))

const tooltip = computed(() => {
  const bar = hovered.value === null ? null : props.bars[hovered.value]
  if (!bar) return null
  const center = ((hovered.value! + 0.5) / props.bars.length) * 100
  return {
    bar,
    share: percent(ratio(bar.value, total.value)),
    style: center > 50 ? { right: `${100 - center}%` } : { left: `${center}%` },
  }
})
</script>

<template>
  <div>
    <div class="relative" @pointerleave="hovered = null">
      <div
        class="flex items-end gap-0.5 h-36 border-b border-gray-700"
        role="img"
        :aria-label="label"
      >
        <div
          v-for="(bar, index) in bars"
          :key="bar.key"
          class="flex-1 h-full flex items-end min-w-0"
          @pointerenter="hovered = index"
        >
          <div
            class="w-full rounded-t-[4px] transition-opacity"
            :class="hovered !== null && hovered !== index ? 'opacity-50' : ''"
            :style="{
              height: `${(bar.value / max) * 100}%`,
              minHeight: bar.value ? '2px' : '0',
              backgroundColor: '#3987e5',
            }"
          ></div>
        </div>
      </div>

      <div
        v-if="tooltip"
        class="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded border border-gray-700 bg-[#0d0f12] px-2 py-1 text-xs"
        :style="tooltip.style"
      >
        <span class="text-gray-400">{{ tooltip.bar.label }}</span>
        <strong class="block text-gray-100"
          >{{ count(tooltip.bar.value) }} {{ unit ?? 'games' }}</strong
        >
        <span class="text-gray-400">{{ tooltip.share }}</span>
      </div>
    </div>

    <div class="flex gap-0.5 mt-1 text-[10px] text-gray-500" aria-hidden="true">
      <div v-for="(bar, index) in bars" :key="bar.key" class="flex-1 min-w-0 text-center">
        <span v-if="index % labelEvery === 0" class="inline-block whitespace-nowrap">{{
          bar.label
        }}</span>
      </div>
    </div>

    <!-- A table ignores the 1px size of sr-only, so a wrapper hides it -->
    <div class="sr-only">
      <table>
        <caption>
          {{
            label
          }}
        </caption>
        <tr v-for="bar in bars" :key="bar.key">
          <th scope="row">{{ bar.label }}</th>
          <td>{{ bar.value }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>
