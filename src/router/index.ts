import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import GameDetailView from '../views/GameDetailView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import ImportView from '../views/ImportView.vue'


const routes = [
  { path: '/', name: 'explore', component: HomeView },
  { path: '/import', name: 'import', component: ImportView },
  // { path: '/stats', name: 'stats', component:  },

  { path: '/game/:id', name: 'game-detail', component: GameDetailView },
  {
    path: '/404',
    name: 'not-found',
    component: NotFoundView,
  },
  { path: '/legal', name: 'legal', component: () => import('../views/LegalNoticeView.vue') },
  { path: '/privacy', name: 'privacy', component: () => import('../views/PrivacyView.vue') },
  { path: '/terms', name: 'terms', component: () => import('../views/TermsView.vue') },
  { path: '/licenses', name: 'licenses', component: () => import('../views/LicensesView.vue') },
  { path: '/:pathMatch(.*)*', component: NotFoundView },
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
