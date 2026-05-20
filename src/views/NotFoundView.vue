<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-[#0d0f12] flex items-center justify-center px-6">
    <div class="text-center">
      <div class="mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
          class="w-24 h-24 mx-auto text-gray-700">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <h1 class="text-4xl font-light text-gray-100 mb-4 tracking-wide">
        Game Not Found
      </h1>

      <p class="text-gray-400 mb-8 max-w-md mx-auto">
        The game you're looking for doesn't exist or may have been removed.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        <button @click="goHome"
          class="flex items-center space-x-2 bg-accent hover:bg-accent-dark text-white font-medium py-2.5 px-6 rounded shadow transition text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span>Go Back Home</span>
        </button>

        <router-link to="/import"
          class="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-2.5 px-6 rounded shadow transition text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
          </svg>
          <span>Import a Game</span>
        </router-link>
      </div>

      <div class="mt-12 text-xs text-gray-600">
        Error 404 - Page not found
      </div>
    </div>
  </div>
</template>