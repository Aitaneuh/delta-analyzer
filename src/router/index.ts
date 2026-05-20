import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GameDetailView from '../views/GameDetailView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes = [
  { path: '/', name: 'explore', component: HomeView },
  // { path: '/import', name: 'import', component:  },
  // { path: '/stats', name: 'stats', component:  },

  { path: '/game/:id', name: 'game-detail', component: GameDetailView },
  {
    path: '/404',
    name: 'not-found',
    component: NotFoundView,
  },
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
