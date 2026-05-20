<template>
  <nav class="navbar p-5 flex top-0 z-0 bg-zinc-950">
    <div class="logo">
      <router-link to="/" class="logo-link">
        <img
          src="/images/delta_analyzer_logo_white_red.png"
          alt="Delta Analyzer logo"
          width="30"
          height="30"
        />
        <span>Delta <span class="accent">Analyzer</span></span>
      </router-link>
    </div>
    <ul>
      <li><router-link to="/">Explore</router-link></li>
      <li><router-link to="/import">Import</router-link></li>
      <li><router-link to="/stats">Statistics</router-link></li>
    </ul>
    <div class="nav-right-placeholder"></div>
  </nav>
</template>

<script setup></script>

<style scoped>
ul {
  display: flex;
  list-style: none;
  gap: 150px;
  margin: 0 auto;
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
  flex: 1;
}

.logo-link {
  display: flex;
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

.nav-right-placeholder {
  flex: 1;
}

.router-link-active {
  border-bottom: 2px solid var(--accent-color);
}
</style>
