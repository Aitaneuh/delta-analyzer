import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'
import { computePositions } from '../services/pgnParser'
import type { BoardPosition, GameSummary, ParsedGame } from '../services/pgnParser'
import { EngineStoppedError, StockfishEngine, type PositionEvaluator } from '../services/engine'
import {
  ANALYSIS_LIMITS,
  ENGINE_NAME,
  buildReport,
  evaluatePositions,
  isAnalyzable,
  type GameAnalysis,
  type PositionEval,
} from '../services/gameAnalysis'
import { getEcoOpeningName } from '../data/ecoOpenings'

const TERMINATION_LABELS: Record<string, string> = {
  mate: 'checkmate',
  resign: 'resignation',
  time: 'timeout',
}

export interface GameFilters {
  game_name: string
  player_name: string
  game_types: string[]
  results: string[]
  terminations: string[]
  eco_code: string
  // A cleared number input reports an empty string
  min_elo: number | '' | null
  max_elo: number | '' | null
  time_control_kind: '' | 'standard' | 'increment'
  played_date: string
  imported_date: string
}

export interface ImportResult {
  games: { id: string; isNew: boolean }[]
  created: number
  duplicates: number
}

interface GameListResponse {
  games: GameSummary[]
  total: number
  page: number
  pageSize: number
}

export function createEmptyFilters(): GameFilters {
  return {
    game_name: '',
    player_name: '',
    game_types: [],
    results: [],
    terminations: [],
    eco_code: '',
    min_elo: null,
    max_elo: null,
    time_control_kind: '',
    played_date: '',
    imported_date: '',
  }
}

function filtersToQuery(filters: GameFilters, page: number): string {
  const query = new URLSearchParams({ page: String(page) })
  for (const [key, value] of Object.entries(filters)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== '' && item !== null) query.append(key, String(item))
    }
  }
  return query.toString()
}

export const useGameStore = defineStore('game', () => {
  // ==========================================
  // 1. STATE
  // ==========================================
  const filters = ref<GameFilters>(createEmptyFilters())

  const games = ref<GameSummary[]>([])
  const totalGames = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const listLoading = ref(false)
  const listError = ref<string | null>(null)
  let latestListRequest = 0

  const currentGame = ref<ParsedGame | null>(null)
  const currentPositions = ref<BoardPosition[]>([])
  const currentMoveIndex = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAnalyzing = ref(false)
  const analysisError = ref<string | null>(null)
  const analysisHidden = ref(false) // Hides the eval bar, arrow, move marks and stats
  const liveEvals = ref<PositionEval[]>([]) // Results so far while an analysis is running
  let activeEngine: PositionEvaluator | null = null

  // ==========================================
  // 2. GETTERS
  // ==========================================
  const totalPages = computed(() => Math.max(1, Math.ceil(totalGames.value / pageSize.value)))

  const currentPosition = computed(() => currentPositions.value[currentMoveIndex.value] ?? null)

  const currentFen = computed(() => currentPosition.value?.fen ?? null)

  const canAnalyze = computed(() => {
    const game = currentGame.value
    return !!game && game.moves_count > 0 && isAnalyzable(game.pgn)
  })

  const currentEvals = computed(() => currentGame.value?.analysis?.evals ?? liveEvals.value)

  const currentEval = computed(() => {
    if (analysisHidden.value) return null
    return currentEvals.value[currentMoveIndex.value] ?? null
  })

  const analysisReport = computed(() => {
    if (analysisHidden.value || !currentGame.value || currentEvals.value.length === 0) return null
    return buildReport(currentGame.value.moves, currentPositions.value, currentEvals.value)
  })

  const gameMetadata = computed(() => {
    if (!currentGame.value) return null
    return {
      white: currentGame.value.white_player,
      black: currentGame.value.black_player,
      whiteElo: currentGame.value.white_elo,
      blackElo: currentGame.value.black_elo,
      result: currentGame.value.result,
      winner: currentGame.value.winner,
      date: currentGame.value.played_date,
      opening: currentGame.value.opening_name ?? getEcoOpeningName(currentGame.value.eco_code),
      ecoCode: currentGame.value.eco_code,
      timeControl: currentGame.value.time_control,
      gameType: currentGame.value.game_type,
      termination: TERMINATION_LABELS[currentGame.value.termination_type ?? ''] ?? null,
      source: currentGame.value.source,
      link: currentGame.value.link,
    }
  })

  const isAtStart = computed(() => currentMoveIndex.value === 0)
  const isAtEnd = computed(() => {
    if (!currentGame.value) return true
    return currentMoveIndex.value >= currentGame.value.moves_count
  })

  // ==========================================
  // 3. ACTIONS
  // ==========================================
  async function fetchGames(): Promise<void> {
    const request = ++latestListRequest
    listLoading.value = true
    listError.value = null

    try {
      const result = await api<GameListResponse>(
        `/api/games?${filtersToQuery(filters.value, page.value)}`,
      )
      if (request !== latestListRequest) return // A newer search has replaced this one
      games.value = result.games
      totalGames.value = result.total
      pageSize.value = result.pageSize
    } catch (err) {
      if (request === latestListRequest) {
        listError.value = err instanceof Error ? err.message : 'Could not load games.'
      }
    } finally {
      if (request === latestListRequest) listLoading.value = false
    }
  }

  function updateFilters(newFilters: GameFilters): Promise<void> {
    filters.value = { ...newFilters }
    page.value = 1
    return fetchGames()
  }

  function goToPage(newPage: number): Promise<void> {
    page.value = Math.min(totalPages.value, Math.max(1, newPage))
    return fetchGames()
  }

  function importPgn(pgn: string): Promise<ImportResult> {
    return api<ImportResult>('/api/games', {
      method: 'POST',
      body: { pgn, accept_permanent: true },
    })
  }

  function importFromLichess(max: number): Promise<ImportResult> {
    return api<ImportResult>('/api/lichess/import', {
      method: 'POST',
      body: { max, accept_permanent: true },
    })
  }

  function cancelAnalysis(): void {
    activeEngine?.terminate()
    activeEngine = null
    isAnalyzing.value = false
    liveEvals.value = []
  }

  async function startAnalysis(
    createEvaluator: () => PositionEvaluator = () => new StockfishEngine(),
  ): Promise<void> {
    const game = currentGame.value
    if (!game || isAnalyzing.value || !canAnalyze.value) return

    const engine = createEvaluator()
    activeEngine = engine
    isAnalyzing.value = true
    analysisHidden.value = false
    analysisError.value = null
    liveEvals.value = []

    try {
      await evaluatePositions(currentPositions.value, engine, (evaluation) => {
        liveEvals.value.push(evaluation)
      })

      // The server keeps the first analysis of each game and returns whichever it has
      game.analysis = await api<GameAnalysis>(`/api/games/${game.id}/analysis`, {
        method: 'PUT',
        body: { engine: ENGINE_NAME, depth: ANALYSIS_LIMITS.depth, evals: liveEvals.value },
      })
    } catch (err) {
      if (!(err instanceof EngineStoppedError)) {
        analysisError.value = err instanceof Error ? err.message : 'The analysis failed.'
      }
    } finally {
      // A newer run may have replaced this one after it was cancelled
      if (activeEngine === engine) {
        engine.terminate()
        activeEngine = null
        isAnalyzing.value = false
        liveEvals.value = []
      }
    }
  }

  async function fetchGame(id: string): Promise<void> {
    cancelAnalysis()
    analysisError.value = null
    loading.value = true
    error.value = null

    try {
      const game = await api<ParsedGame>(`/api/games/${encodeURIComponent(id)}`)
      currentPositions.value = computePositions(game.pgn)
      currentGame.value = game
      currentMoveIndex.value = 0
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load game'
      currentGame.value = null
      currentPositions.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  function nextMove(): void {
    if (!currentGame.value) return
    if (currentMoveIndex.value < currentGame.value.moves_count) {
      currentMoveIndex.value++
    }
  }

  /************ Move Engine Traversal controllers ************/
  function prevMove(): void {
    if (currentMoveIndex.value > 0) {
      currentMoveIndex.value--
    }
  }

  function goToMove(index: number): void {
    if (!currentGame.value) return
    if (index >= 0 && index <= currentGame.value.moves_count) {
      currentMoveIndex.value = index
    }
  }

  function goToStart(): void {
    currentMoveIndex.value = 0
  }

  function goToEnd(): void {
    if (!currentGame.value) return
    currentMoveIndex.value = currentGame.value.moves_count
  }

  function reset(): void {
    cancelAnalysis()
    currentGame.value = null
    currentPositions.value = []
    currentMoveIndex.value = 0
    error.value = null
  }

  return {
    // Shared States
    filters,
    games,
    totalGames,
    page,
    pageSize,
    listLoading,
    listError,
    currentGame,
    currentMoveIndex,
    loading,
    error,
    isAnalyzing,
    analysisError,
    analysisHidden,

    // Core Engine Getters
    totalPages,
    currentPosition,
    currentFen,
    gameMetadata,
    isAtStart,
    isAtEnd,
    canAnalyze,
    currentEvals,
    currentEval,
    analysisReport,

    // Core Engine Actions
    fetchGames,
    updateFilters,
    goToPage,
    importPgn,
    importFromLichess,
    startAnalysis,
    cancelAnalysis,
    fetchGame,
    nextMove,
    prevMove,
    goToMove,
    goToStart,
    goToEnd,
    reset,
  }
})
