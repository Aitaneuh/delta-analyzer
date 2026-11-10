import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, api } from '../services/api'
import type { GlobalStats, PlayerStats } from '../services/stats'

export interface StatsQuery {
  player: string
  gameType: string
  eloBand: string
}

export const useStatsStore = defineStore('stats', () => {
  const global = ref<GlobalStats | null>(null)
  const player = ref<PlayerStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const notFound = ref(false)
  let latestRequest = 0

  /** Loads the global or a player's statistics. Results of superseded requests are dropped. */
  async function load(query: StatsQuery): Promise<void> {
    const request = ++latestRequest
    loading.value = true
    error.value = null
    notFound.value = false

    const params = new URLSearchParams()
    if (query.gameType) params.set('game_type', query.gameType)

    try {
      if (query.player) {
        const result = await api<PlayerStats>(
          `/api/stats/players/${encodeURIComponent(query.player)}?${params}`,
        )
        if (request === latestRequest) player.value = result
      } else {
        if (query.eloBand) params.set('elo_band', query.eloBand)
        const result = await api<GlobalStats>(`/api/stats?${params}`)
        if (request === latestRequest) global.value = result
      }
    } catch (err) {
      if (request !== latestRequest) return
      if (query.player) player.value = null
      if (err instanceof ApiError && err.status === 404) notFound.value = true
      else error.value = err instanceof Error ? err.message : 'Could not load statistics.'
    } finally {
      if (request === latestRequest) loading.value = false
    }
  }

  async function suggestPlayers(prefix: string): Promise<string[]> {
    if (prefix.trim().length < 2) return []
    try {
      const result = await api<{ players: string[] }>(
        `/api/stats/players?q=${encodeURIComponent(prefix.trim())}`,
      )
      return result.players
    } catch {
      return [] // Suggestions are optional
    }
  }

  return { global, player, loading, error, notFound, load, suggestPlayers }
})
