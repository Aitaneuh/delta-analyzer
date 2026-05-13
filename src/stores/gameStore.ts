import type { ChessGame } from '@/types/game'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // 1. State
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

  // Your mock data (No backend for now)
  const allGames = ref<ChessGame[]>([
    {
      id: 'gh3970g3',
      event: 'Titled Tuesday Blitz September 2025',
      game_name: 'Blitz vs Magnus',
      played_date: '2025-09-02',
      imported_date: '2026-05-13',
      white_player: 'MagnusCarlsen',
      black_player: 'User123',
      white_elo: 2850,
      black_elo: 2400,
      result: '1-0',
      time_control: '180+2',
      game_type: 'blitz',
      eco_code: 'B20',
      opening: 'Sicilian',
      termination: 'mate',
      pgn: '[Event "Titled Tuesday..."]',
      moves: '1. e4 c5 2. d4 cxd4...',
    },
  ])

  // 2. Getters (Computed Filtered List)
  const filteredGames = computed(() => {
    return allGames.value.filter((game) => {
      const matchType =
        filters.value.game_types.length === 0 || filters.value.game_types.includes(game.game_type)
      const matchPlayer =
        !filters.value.player_name ||
        game.white_player.toLowerCase().includes(filters.value.player_name.toLowerCase()) ||
        game.black_player.toLowerCase().includes(filters.value.player_name.toLowerCase())

      return matchType && matchPlayer // Add more filter logic here
    })
  })

  // 3. Actions
  function updateFilters(newFilters: any) {
    filters.value = { ...newFilters }
  }

  return { filters, allGames, filteredGames, updateFilters }
})
