<script setup lang="ts">
import LegalPage from '@/components/legal/LegalPage.vue'
import { useSiteInfo } from '@/composables/useSiteInfo'

const site = useSiteInfo()
</script>

<template>
  <LegalPage title="Privacy Policy">
    <template v-if="site">
      <h2>Who is responsible</h2>
      <p>
        {{ site.operatorName }}, {{ site.operatorAddress }} is responsible for your data on this
        site. Contact: <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a
        >.
      </p>

      <h2>What is collected</h2>
      <ul>
        <li>
          <strong>Your account:</strong> when you sign in with Lichess, your Lichess ID and username
          and the dates you signed up and last signed in. No password or email address is received,
          and the access token from Lichess is revoked immediately after sign-in.
        </li>
        <li>
          <strong>Games:</strong> uploaded games and their computer analysis are published on this
          site. A game contains the names and ratings of <em>both</em> players, the date, the moves
          and a link to the original game, if any. The site also records which account uploaded each
          game; this isn't displayed.
        </li>
        <li>
          <strong>Technical data:</strong> your IP address is used briefly, in memory, to limit
          abuse. The application doesn't write it to its logs. The web server in front of the site
          may keep ordinary access logs for security for up to 14 days.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Only strictly necessary cookies are used: <code>delta_session</code> keeps you signed in (30
        days) and <code>delta_login</code> protects the sign-in process (10 minutes). There are no
        advertising or analytics cookies, so no consent banner is needed.
      </p>

      <h2>Why your data is used (legal basis)</h2>
      <ul>
        <li>
          To provide your account and publish the games you upload: performance of our agreement
          with you.
        </li>
        <li>
          To keep a public archive of chess games, including the names of opponents as they appear
          in the game record, and to protect the site from abuse: legitimate interests.
        </li>
      </ul>

      <h2>Who receives it</h2>
      <p>
        Games are public, so anyone can see them. The site is self-hosted in
        {{ site.hostingCountry }} without outside hosting or analytics providers. Your data is not
        sold. Lichess receives a request when you sign in or import games. Fonts and the chess
        engine are served by this site itself, and engine analysis runs in your browser.
      </p>

      <h2>How long it is kept</h2>
      <ul>
        <li>Sign-in sessions: up to 30 days, or until you sign out.</li>
        <li>Accounts: until you ask for your account to be erased.</li>
        <li>
          Games and analyses: <strong>permanently</strong>. Users can't delete a game once it's
          uploaded.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Depending on the law that applies to you (such as the EU GDPR or the Swiss FADP), you can
        ask for access to your data, correction, erasure, restriction, portability, and you can
        object to its use. Email
        <a :href="`mailto:${site.contactEmail}`">{{ site.contactEmail }}</a> and you'll receive a
        reply within one month.
      </p>
      <p>
        <strong>This applies even though games are permanent.</strong> If you are a player in a game
        and make a valid erasure request, including if you never used this site, your name and links
        identifying you are removed from those games and any account of yours is deleted. The
        anonymous moves stay.
      </p>
      <p>You also have the right to complain to your data protection authority.</p>
    </template>
  </LegalPage>
</template>
