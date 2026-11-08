<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
import { useSiteInfo } from '@/composables/useSiteInfo'

const site = useSiteInfo()
</script>

<template>
  <LegalPage title="Terms of Service">
    <template v-if="site">
      <h2>The service</h2>
      <p>
        Delta Analyzer lets you upload, browse and analyze chess games. By using the site, you
        accept these terms. You must be at least 16, or have a parent's or guardian's permission, to
        sign in and upload games.
      </p>

      <h2>Uploaded games are public and permanent</h2>
      <p>
        <strong>Once a game is uploaded, it can't be deleted or edited.</strong> Every uploaded game
        and its analysis are publicly visible. Please only upload a game if you accept this.
      </p>
      <p>
        The operator may only change or remove a game when required by law, such as for a valid
        privacy request or illegal content, as described in the
        <router-link to="/privacy">Privacy Policy</router-link>.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Only upload games you have the right to share.</li>
        <li>
          Don't put anything illegal, abusive or private in a game, including in its player names,
          event name or comments.
        </li>
        <li>Don't attack, overload or try to bypass the protections of the site.</li>
      </ul>

      <h2>Permission to publish</h2>
      <p>
        You keep any rights you have in what you upload. You give the operator a free, worldwide,
        permanent licence to store, display and analyze it as part of this site.
      </p>

      <h2>Computer analysis</h2>
      <p>
        Analysis is produced automatically by a chess engine in visitors' browsers. It may be wrong
        and shouldn't be used as proof that someone cheated.
      </p>

      <h2>No warranty</h2>
      <p>
        This is a free service provided as is. It may be interrupted, changed or stopped at any
        time. Permanent means that users can't delete games; it isn't a guarantee that the service
        will always be available. To the extent permitted by law, the operator isn't liable for
        indirect losses or loss of data. Nothing here limits liability that can't legally be limited
        or your mandatory consumer rights.
      </p>

      <h2>Open source</h2>
      <p>
        The site's source code is available under the GNU GPL. See
        <router-link to="/licenses">Open source licenses</router-link>.
      </p>

      <h2>Governing law and contact</h2>
      <p>
        These terms are governed by the law of {{ site.governingLaw }}, without removing protections
        given by the law of the country where you live. Questions:
        <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a
        >.
      </p>
    </template>
  </LegalPage>
</template>
