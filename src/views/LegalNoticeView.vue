<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
import { useSiteInfo } from '@/composables/useSiteInfo'

const site = useSiteInfo()
</script>

<template>
  <LegalPage title="Legal Notice">
    <template v-if="site">
      <h2>Site operator</h2>
      <p>
        {{ site.operatorName }}<br />
        <span class="whitespace-pre-line">{{ site.operatorAddress }}</span
        ><br />
        Email: <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a>
      </p>
      <p>The operator is responsible for the content of this site.</p>

      <h2>Hosting</h2>
      <p>This site is hosted on a privately operated server in {{ site.hostingCountry }}.</p>

      <h2>Report illegal content or a privacy request</h2>
      <p>
        To report illegal content, or to make a request about your personal data, email
        <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a
        >. Please include the link to the game and explain the reason for your request. Every report
        is reviewed, and you'll receive a reply.
      </p>

      <h2>User content</h2>
      <p>
        Chess games on this site are uploaded by users. Delta Analyzer is not affiliated with
        Lichess, Chess.com or the Stockfish project.
      </p>
    </template>
  </LegalPage>
</template>
