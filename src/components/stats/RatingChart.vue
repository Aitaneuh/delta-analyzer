<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { GAME_TYPE_COLORS, gameTypeLabel, monthLabel } from '@/services/stats'

const props = defineProps<{ history: { game_type: string; month: string; rating: number }[] }>()

const HEIGHT = 180
const PLOT_TOP = 8
const PLOT_BOTTOM = HEIGHT - 20
const LEFT = 40

const container = ref<HTMLElement | null>(null)
const width = ref(600)
const hovered = ref<number | null>(null)
let observer: ResizeObserver | null = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = entry.contentRect.width
  })
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => observer?.disconnect())

const months = computed(() => [...new Set(props.history.map((point) => point.month))].sort())

const scale = computed(() => {
  const ratings = props.history.map((point) => point.rating)
  const low = Math.floor((Math.min(...ratings) - 50) / 100) * 100
  const high = Math.ceil((Math.max(...ratings) + 50) / 100) * 100
  const step = Math.max(100, Math.ceil((high - low) / 4 / 100) * 100)
  const ticks: number[] = []
  for (let value = low; value <= high; value += step) ticks.push(value)
  return { low, high: Math.max(high, low + 100), ticks }
})

const xAt = (index: number) =>
  LEFT +
  (months.value.length < 2 ? 0.5 : index / (months.value.length - 1)) * (width.value - LEFT - 8)
const yAt = (rating: number) =>
  PLOT_TOP +
  (1 - (rating - scale.value.low) / (scale.value.high - scale.value.low)) * (PLOT_BOTTOM - PLOT_TOP)

const series = computed(() =>
  Object.keys(GAME_TYPE_COLORS).flatMap((mode) => {
    const points = props.history
      .filter((point) => point.game_type === mode)
      .map((point) => ({
        ...point,
        x: xAt(months.value.indexOf(point.month)),
        y: yAt(point.rating),
      }))
    if (!points.length) return []
    return [
      {
        mode,
        color: GAME_TYPE_COLORS[mode]!,
        points,
        path: `M${points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('L')}`,
        latest: points[points.length - 1]!.rating,
      },
    ]
  }),
)

const xTicks = computed(() => {
  const every = Math.max(
    1,
    Math.ceil(months.value.length / Math.max(2, Math.floor(width.value / 70))),
  )
  return months.value.flatMap((month, index) =>
    index % every === 0 ? [{ x: xAt(index), label: monthLabel(month) }] : [],
  )
})

const tooltip = computed(() => {
  if (hovered.value === null) return null
  const month = months.value[hovered.value]
  if (!month) return null
  const x = xAt(hovered.value)
  return {
    x,
    month: monthLabel(month),
    values: series.value.flatMap((line) => {
      const point = line.points.find((item) => item.month === month)
      return point ? [{ mode: line.mode, color: line.color, rating: point.rating }] : []
    }),
    style: x > width.value / 2 ? { right: `${width.value - x + 8}px` } : { left: `${x + 8}px` },
  }
})

function handleMove(event: PointerEvent) {
  if (!container.value || months.value.length === 0) return
  const bounds = container.value.getBoundingClientRect()
  const span = width.value - LEFT - 8
  const ratio = (event.clientX - bounds.left - LEFT) / span
  hovered.value = Math.min(
    months.value.length - 1,
    Math.max(0, Math.round(ratio * (months.value.length - 1))),
  )
}
</script>

<template>
  <div>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-300">
      <li v-for="line in series" :key="line.mode" class="flex items-center gap-1.5">
        <span class="h-0.5 w-4 rounded" :style="{ backgroundColor: line.color }"></span>
        {{ gameTypeLabel(line.mode) }} <span class="text-gray-500">{{ line.latest }}</span>
      </li>
    </ul>

    <div
      ref="container"
      class="relative touch-pan-y select-none"
      :style="{ height: `${HEIGHT}px` }"
      @pointermove="handleMove"
      @pointerleave="hovered = null"
    >
      <svg
        :width="width"
        :height="HEIGHT"
        class="block overflow-visible"
        role="img"
        aria-label="Average rating per month"
      >
        <g v-for="tick in scale.ticks" :key="tick">
          <line :x1="LEFT" :x2="width" :y1="yAt(tick)" :y2="yAt(tick)" stroke="#2c2f35" />
          <text
            :x="LEFT - 6"
            :y="yAt(tick) + 3"
            text-anchor="end"
            class="fill-gray-500 text-[10px]"
          >
            {{ tick }}
          </text>
        </g>
        <text
          v-for="tick in xTicks"
          :key="tick.label"
          :x="tick.x"
          :y="HEIGHT - 4"
          text-anchor="middle"
          class="fill-gray-500 text-[10px]"
        >
          {{ tick.label }}
        </text>

        <line
          v-if="tooltip"
          :x1="tooltip.x"
          :x2="tooltip.x"
          :y1="PLOT_TOP"
          :y2="PLOT_BOTTOM"
          stroke="#6b7280"
        />

        <g v-for="line in series" :key="line.mode">
          <path
            :d="line.path"
            fill="none"
            :stroke="line.color"
            stroke-width="2"
            stroke-linejoin="round"
          />
          <circle
            v-for="point in line.points"
            v-show="line.points.length === 1 || tooltip?.month === monthLabel(point.month)"
            :key="point.month"
            :cx="point.x"
            :cy="point.y"
            r="4"
            :fill="line.color"
            stroke="#1a1d21"
            stroke-width="2"
          />
        </g>
      </svg>

      <div
        v-if="tooltip && tooltip.values.length"
        class="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded border border-gray-700 bg-[#0d0f12] px-2 py-1 text-xs"
        :style="tooltip.style"
      >
        <span class="text-gray-400">{{ tooltip.month }}</span>
        <span
          v-for="value in tooltip.values"
          :key="value.mode"
          class="flex items-center gap-1.5 text-gray-100"
        >
          <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: value.color }"></span>
          {{ gameTypeLabel(value.mode) }} <strong>{{ value.rating }}</strong>
        </span>
      </div>
    </div>

    <!-- A table ignores the 1px size of sr-only, so a wrapper hides it -->
    <div class="sr-only">
      <table>
        <caption>
          Average rating per month
        </caption>
        <tr v-for="point in history" :key="`${point.game_type}-${point.month}`">
          <th scope="row">{{ gameTypeLabel(point.game_type) }} {{ point.month }}</th>
          <td>{{ point.rating }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>
