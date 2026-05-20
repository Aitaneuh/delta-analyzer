import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ParsedGame } from '../services/pgnParser'

export const useGameStore = defineStore('game', () => {
  // ==========================================
  // 1. STATE
  // ==========================================
  const filters = ref({
    game_name: '',
    player_name: '',
    game_types: [] as string[],
    results: [] as string[],
    terminations: [] as string[],
    eco_code: '',
    min_elo: null as number | null,
    max_elo: null as number | null,
    played_date: '',
    imported_date: '',
  })

  const allGames = ref<ParsedGame[]>([
    // Fallback/Initial Mock matching your shape requirements
    {
      id: 'gh3970g3',
      event: 'Titled Tuesday Blitz September 2025',
      played_date: '2025-09-02',
      imported_date: '2026-05-13',
      white_player: 'MagnusCarlsen',
      black_player: 'Aitaneuh',
      white_elo: 2850,
      black_elo: 3000,
      result: '0-1',
      winner: 'black',
      time_control: '180+2',
      game_type: 'blitz',
      eco_code: 'B20',
      opening_name: 'Sicilian',
      termination: 'mate',
      pgn: '[Event "Titled Tuesday..."]',
      moves: ['1. e4', 'c5', '2. d4', 'cxd4'], // Array format expected by replayer
      moves_count: 4,
      initial_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      final_fen: 'rnbqkbnr/pp1ppppp/8/2p5/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2',
      source: 'unknown',
      link: '',
      white_country: null,
      black_country: null,
      white_avatar: null,
      black_avatar: null,
      has_annotations: false,
    },
  ])

  const currentGame = ref<ParsedGame | null>(null)
  const currentMoveIndex = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================
  // 2. GETTERS
  // ==========================================

  // Complete filtering logic using all criteria from Search view
  const filteredGames = computed(() => {
    return allGames.value.filter((game) => {
      // Game Type Filter
      const matchType =
        filters.value.game_types.length === 0 ||
        filters.value.game_types.includes(game.game_type.toLowerCase())

      // Player Name Filter (Fuzzy check matching White or Black)
      const matchPlayer =
        !filters.value.player_name ||
        game.white_player.toLowerCase().includes(filters.value.player_name.toLowerCase()) ||
        game.black_player.toLowerCase().includes(filters.value.player_name.toLowerCase())

      // Result Filter (1-0, 0-1, 1/2-1/2)
      const matchResult =
        filters.value.results.length === 0 || filters.value.results.includes(game.result)

      // Termination Filter (mate, resign, time)
      const matchTermination =
        filters.value.terminations.length === 0 ||
        filters.value.terminations.includes(game.termination.toLowerCase())

      // ECO Code Filter
      const matchEco = !filters.value.eco_code || game.eco_code.startsWith(filters.value.eco_code)

      // Elo Range Filter
      const minEloBound = filters.value.min_elo ?? 0
      const maxEloBound = filters.value.max_elo ?? 9999
      const matchElo =
        (game.white_elo >= minEloBound || game.black_elo >= minEloBound) &&
        game.white_elo <= maxEloBound &&
        game.black_elo <= maxEloBound

      // Timeline Date Filters
      const matchPlayedDate =
        !filters.value.played_date || game.played_date === filters.value.played_date
      const matchImportedDate =
        !filters.value.imported_date || game.imported_date === filters.value.imported_date

      return (
        matchType &&
        matchPlayer &&
        matchResult &&
        matchTermination &&
        matchEco &&
        matchElo &&
        matchPlayedDate &&
        matchImportedDate
      )
    })
  })

  const currentPosition = computed(() => {
    if (!currentGame.value) return null
    return {
      moveIndex: currentMoveIndex.value,
      move: currentGame.value.moves[currentMoveIndex.value] || null,
      fen: currentFen.value,
    }
  })

  const currentFen = computed(() => {
    if (!currentGame.value) return null

    if (currentMoveIndex.value === 0) {
      return currentGame.value.initial_fen
    }
    if (currentMoveIndex.value === currentGame.value.moves_count) {
      return currentGame.value.final_fen
    }
    // Standard position computation hook (e.g. via chess.js) belongs here
    return currentGame.value.initial_fen
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
      opening: currentGame.value.opening_name,
      ecoCode: currentGame.value.eco_code,
      timeControl: currentGame.value.time_control,
      gameType: currentGame.value.game_type,
      termination: currentGame.value.termination,
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
  function updateFilters(newFilters: any) {
    filters.value = { ...newFilters }
  }

  function addGame(game: ParsedGame): void {
    allGames.value.unshift(game) // Adds new matches to top of list
  }

  async function fetchGame(id: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      await new Promise((resolve) => setTimeout(resolve, 150)) // Quick simulation delay
      const game = allGames.value.find((g) => g.id === id)

      if (!game) {
        throw new Error(`Game with ID ${id} not found`)
      }

      currentGame.value = game
      currentMoveIndex.value = 0
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load game'
      currentGame.value = null
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
    currentGame.value = null
    currentMoveIndex.value = 0
    error.value = null
  }

  return {
    // Shared States
    filters,
    allGames,
    currentGame,
    currentMoveIndex,
    loading,
    error,

    // Core Engine Getters
    filteredGames,
    currentPosition,
    currentFen,
    gameMetadata,
    isAtStart,
    isAtEnd,

    // Core Engine Actions
    updateFilters,
    addGame,
    fetchGame,
    nextMove,
    prevMove,
    goToMove,
    goToStart,
    goToEnd,
    reset,
  }
})
