<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
import { useSiteInfo } from '@/composables/useSiteInfo'

const site = useSiteInfo()

const components = [
  {
    name: 'Stockfish 19 (stockfish.js build)',
    license: 'GPL-3.0',
    url: 'https://github.com/Aitaneuh/stockfish.js/tree/v19.0.1',
  },
  {
    name: 'Chessground (chess board)',
    license: 'GPL-3.0-or-later',
    url: 'https://github.com/lichess-org/chessground',
  },
  {
    name: 'chessops (chess rules and PGN)',
    license: 'GPL-3.0-or-later',
    url: 'https://github.com/niklasf/chessops',
  },
  {
    name: 'Lichess chess-openings (ECO opening names)',
    license: 'CC0-1.0',
    url: 'https://github.com/lichess-org/chess-openings',
  },
  {
    name: 'JetBrains Mono (font)',
    license: 'OFL-1.1',
    url: 'https://github.com/JetBrains/JetBrainsMono',
  },
  { name: 'Vue, Vue Router, Pinia', license: 'MIT', url: 'https://github.com/vuejs' },
  { name: 'Fastify', license: 'MIT', url: 'https://github.com/fastify/fastify' },
]
</script>

<template>
  <LegalPage title="Open Source Licenses">
    <template v-if="site">
      <h2>Delta Analyzer</h2>
      <p>
        Delta Analyzer is free software, licensed under the
        <a href="/licenses/GPL-3.0.txt">GNU General Public License, version 3 or later</a>. It comes
        with no warranty. The complete source code is available at
        <a :href="site.sourceCodeUrl" rel="noopener noreferrer">{{ site.sourceCodeUrl }}</a
        >.
      </p>

      <h2>Third-party software</h2>
      <ul>
        <li v-for="item in components" :key="item.name">
          <a :href="item.url" rel="noopener noreferrer">{{ item.name }}</a> ({{ item.license }})
        </li>
      </ul>
      <p>The chess piece images are by Colin M.L. Burnett, distributed with Chessground.</p>
    </template>
  </LegalPage>
</template>
