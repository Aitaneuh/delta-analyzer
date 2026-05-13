import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // { path: '/', name: 'search', component:  },
  // { path: '/import', name: 'import', component:  },
  // { path: '/stats', name: 'stats', component:  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
})

export default router
