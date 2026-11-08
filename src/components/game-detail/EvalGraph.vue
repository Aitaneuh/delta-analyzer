<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  GRADE_SYMBOLS,
  formatEval,
  whiteWinPercent,
  type MoveGrade,
  type MoveReport,
  type PositionEval,
} from '@/services/gameAnalysis'

const props = defineProps<{
  evals: PositionEval[]
  reports: MoveReport[]
  moves: string[]
  currentMoveIndex: number
}>()

const emit = defineEmits<{
  goToMove: [index: number]
}>()

const HEIGHT = 128
const PLOT_BOTTOM = HEIGHT - 16
const GRADE_COLORS: Record<MoveGrade, string> = {
  inaccuracy: '#fab219',
  mistake: '#ec835a',
  blunder: '#f0524f',
}
const LEGEND: MoveGrade[] = ['inaccuracy', 'mistake', 'blunder']

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

const lastIndex = computed(() => Math.max(1, props.moves.length))
const xAt = (index: number) => (index / lastIndex.value) * width.value
const yAt = (index: number) =>
  PLOT_BOTTOM * (1 - whiteWinPercent(props.evals[index]?.cp ?? 0) / 100)

const points = computed(() =>
  props.evals.map((_, index) => `${xAt(index).toFixed(1)},${yAt(index).toFixed(1)}`),
)
const linePath = computed(() => (points.value.length ? `M${points.value.join('L')}` : ''))
const areaPath = computed(() => {
  if (!points.value.length) return ''
  const end = xAt(points.value.length - 1).toFixed(1)
  return `${linePath.value}L${end},${PLOT_BOTTOM}L0,${PLOT_BOTTOM}Z`
})

const gradedMoves = computed(() =>
  props.reports.flatMap((report, index) =>
    report.grade ? [{ index: index + 1, color: GRADE_COLORS[report.grade] }] : [],
  ),
)

// A label every 10 moves, thinned out on narrow screens
const ticks = computed(() => {
  const step = width.value < 480 ? 20 : 10
  const result: { x: number; label: number }[] = []
  for (let move = step; (move - 1) * 2 + 1 <= props.moves.length; move += step) {
    result.push({ x: xAt((move - 1) * 2 + 1), label: move })
  }
  return result
})

function moveLabel(index: number): string {
  if (index === 0) return 'Start'
  const number = Math.ceil(index / 2)
  return `${number}${index % 2 ? '.' : '...'} ${props.moves[index - 1]}`
}

const tooltip = computed(() => {
  if (hovered.value === null) return null
  const evaluation = props.evals[hovered.value]
  if (!evaluation) return null

  const grade = props.reports[hovered.value - 1]?.grade
  const x = xAt(hovered.value)
  return {
    x,
    value: formatEval(evaluation),
    move: moveLabel(hovered.value),
    grade: grade ? `${GRADE_SYMBOLS[grade]} ${grade}` : null,
    style: x > width.value / 2 ? { right: `${width.value - x + 8}px` } : { left: `${x + 8}px` },
  }
})

function indexFromPointer(event: PointerEvent): number {
  const bounds = container.value!.getBoundingClientRect()
  const ratio = (event.clientX - bounds.left) / bounds.width
  return Math.min(props.evals.length - 1, Math.max(0, Math.round(ratio * lastIndex.value)))
}

function handleMove(event: PointerEvent) {
  if (props.evals.length) hovered.value = indexFromPointer(event)
}

function handleClick(event: PointerEvent) {
  if (props.evals.length) emit('goToMove', indexFromPointer(event))
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2">
      <h4 class="text-xs font-semibold text-gray-400">White's winning chances</h4>
      <ul class="flex flex-wrap gap-x-3 text-[11px] text-gray-400">
        <li v-for="grade in LEGEND" :key="grade" class="flex items-center gap-1 capitalize">
          <span
            class="h-2 w-2 rounded-full"
            :style="{ backgroundColor: GRADE_COLORS[grade] }"
          ></span>
          {{ GRADE_SYMBOLS[grade] }} {{ grade }}
        </li>
      </ul>
    </div>

    <div
      ref="container"
      class="relative cursor-pointer touch-pan-y select-none"
      :style="{ height: `${HEIGHT}px` }"
      @pointermove="handleMove"
      @pointerleave="hovered = null"
      @pointerup="handleClick"
    >
      <svg
        :width="width"
        :height="HEIGHT"
        class="block overflow-visible"
        role="img"
        aria-label="White's winning chances after each move"
      >
        <line
          :x1="0"
          :x2="width"
          :y1="PLOT_BOTTOM / 2"
          :y2="PLOT_BOTTOM / 2"
          stroke="#374151"
          stroke-dasharray="3 3"
        />
        <line :x1="0" :x2="width" :y1="PLOT_BOTTOM" :y2="PLOT_BOTTOM" stroke="#374151" />

        <path :d="areaPath" fill="#e5e7eb" fill-opacity="0.16" />
        <path :d="linePath" fill="none" stroke="#e5e7eb" stroke-width="2" stroke-linejoin="round" />

        <line
          :x1="xAt(currentMoveIndex)"
          :x2="xAt(currentMoveIndex)"
          y1="0"
          :y2="PLOT_BOTTOM"
          stroke="var(--accent-color)"
          stroke-width="2"
        />

        <circle
          v-for="mark in gradedMoves"
          :key="mark.index"
          :cx="xAt(mark.index)"
          :cy="yAt(mark.index)"
          r="4"
          :fill="mark.color"
          stroke="#1a1d21"
          stroke-width="2"
        />

        <line
          v-if="tooltip"
          :x1="tooltip.x"
          :x2="tooltip.x"
          y1="0"
          :y2="PLOT_BOTTOM"
          stroke="#9ca3af"
        />

        <text
          v-for="tick in ticks"
          :key="tick.label"
          :x="tick.x"
          :y="HEIGHT - 3"
          text-anchor="middle"
          class="fill-gray-500 text-[10px]"
        >
          {{ tick.label }}
        </text>
      </svg>

      <div
        v-if="tooltip"
        class="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded border border-gray-700 bg-[#0d0f12] px-2 py-1 text-xs"
        :style="tooltip.style"
      >
        <strong class="text-gray-100">{{ tooltip.value }}</strong>
        <span class="ml-2 text-gray-400">{{ tooltip.move }}</span>
        <span v-if="tooltip.grade" class="block capitalize text-gray-300">{{ tooltip.grade }}</span>
      </div>
    </div>
  </div>
</template>
