<template>
  <nav class="navbar p-5 flex flex-wrap items-center gap-x-6 gap-y-3 top-0 z-0 bg-zinc-950">
    <div class="logo">
      <router-link to="/" class="logo-link">
        <img :src="logoUrl" alt="Delta Analyzer logo" width="30" height="30" />
        <span>Delta <span class="text-accent">Analyzer</span></span>
      </router-link>
    </div>
    <ul>
      <li><router-link to="/">Explore</router-link></li>
      <li><router-link to="/import">Import</router-link></li>
    </ul>
    <div class="account">
      <template v-if="auth.ready">
        <template v-if="auth.user">
          <span class="username" :title="auth.user.username">{{ auth.user.username }}</span>
          <button type="button" class="account-action" @click="auth.signOut()">Sign out</button>
        </template>
        <a v-else :href="signInHref" class="account-action">Sign in with Lichess</a>
      </template>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { signInUrl, useAuthStore } from '@/stores/authStore'

const logoUrl = '/images/delta_analyzer_logo_white_red.png'

const auth = useAuthStore()
const route = useRoute()
const signInHref = computed(() => signInUrl(route.fullPath))
</script>

<style scoped>
ul {
  display: flex;
  list-style: none;
  gap: clamp(1.5rem, 10vw, 150px);
  margin: 0;
  align-items: center;
}

ul a {
  color: var(--text-color);
  text-decoration: none;
}

span {
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.logo {
  flex: 1 1 auto;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: 300ms;
}

.logo-link:hover {
  opacity: 0.8;
}

.logo .router-link-active {
  border-bottom: none;
}

.account {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  font-size: 14px;
}

.username {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
  letter-spacing: 0;
}

.account-action {
  color: #9ca3af;
  cursor: pointer;
  text-decoration: underline;
  white-space: nowrap;
}

.account-action:hover {
  color: var(--text-color);
}

.router-link-active {
  border-bottom: 2px solid var(--accent-color);
}

/* From tablet up, equal-width side columns keep the links centered in the bar. */
@media (min-width: 900px) {
  .logo,
  .account {
    flex: 1 1 0;
  }

  .account {
    justify-content: flex-end;
  }
}
</style>
