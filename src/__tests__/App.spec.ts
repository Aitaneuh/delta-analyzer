import { describe, it, expect, vi } from 'vitest'
import { createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the navbar, the explore page and the legal links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url.startsWith('/api/me')
          ? { user: null }
          : { games: [], total: 0, page: 1, pageSize: 25 }
        return new Response(JSON.stringify(body), { status: 200 })
      }),
    )

    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Delta Analyzer')
    expect(wrapper.text()).toContain('Showing 0 games')
    expect(wrapper.text()).toContain('Sign in with Lichess')
    expect(wrapper.text()).toContain('Privacy')
  })
})
