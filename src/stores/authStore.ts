import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../services/api'

export interface User {
  id: string
  username: string
}

export function signInUrl(returnTo: string): string {
  return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const ready = ref(false)

  async function fetchUser(): Promise<void> {
    try {
      user.value = (await api<{ user: User | null }>('/api/me')).user
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function signOut(): Promise<void> {
    await api('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, ready, fetchUser, signOut }
})
