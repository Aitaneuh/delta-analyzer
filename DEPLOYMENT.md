# Hosting Delta Analyzer

The stack has two containers: `app` (website and API) and `db` (PostgreSQL). The database is only reachable from inside the stack.

## 1. What you need

- A domain or subdomain pointing at your home connection (use dynamic DNS if your IP changes).
- Port 443 forwarded to a reverse proxy that provides HTTPS and forwards to the `app` port. If you already run Nginx Proxy Manager, Traefik or Caddy, use it.
- **Nothing to set up on Lichess.** Sign-in uses OAuth with PKCE, which needs no app registration or client secret.

The site must be served over HTTPS in production, because login cookies are only sent over a secure connection.

## 2. Deploy in Portainer

1. **Stacks > Add stack > Repository.** Enter the repository URL and set the compose path to `docker-compose.yml`. A private repository needs a GitHub access token.
2. Under **Environment variables**, set:

| Variable | Example | Meaning |
|---|---|---|
| `POSTGRES_PASSWORD` | long random string, letters and digits only | Database password |
| `PUBLIC_URL` | `https://chess.example.com` | The address visitors use, with no trailing slash |
| `APP_PORT` | `3000` | Port your reverse proxy forwards to |
| `TRUST_PROXY_HOPS` | `1` | Number of reverse proxies in front of the app |
| `OPERATOR_NAME` | | Your full name, shown on the legal pages |
| `OPERATOR_ADDRESS` | | Your postal address |
| `CONTACT_EMAIL` | | Address that receives legal and privacy requests |
| `HOSTING_COUNTRY` | Optional, defaults to `Switzerland` | Where the server is |
| `GOVERNING_LAW` | Optional, defaults to `Switzerland` | Law that governs the Terms |
| `SOURCE_CODE_URL` | Optional, defaults to `https://github.com/Aitaneuh/delta-analyzer` | **Public** link to this code |

3. Click **Deploy the stack**. The database tables are created on first start. Check `https://your-domain/api/health` returns `{"ok":true}`.

Only let your reverse proxy reach `APP_PORT`, for example with a firewall rule. Never publish the database port.

To update: **Stack > Pull and redeploy** with "Re-pull image and redeploy" and rebuild enabled.

## 3. Before going public: legal checklist

This is a practical checklist, not legal advice. The Privacy Policy and Terms are templates written to suit how the site really works; have them checked if the site grows or earns money.

- [ ] **Make the source code public.** Chessground, chessops and Stockfish are GPL-3, and they're delivered to visitors, so the site's code must be available under GPL-3. `LICENSE` has been added. Every copyright holder (all contributors) must agree to this license.
- [ ] Keep the public code in step with what's deployed.
- [ ] Fork `nmrugg/stockfish.js` to `Aitaneuh/stockfish.js` with **"Copy the main branch only" unticked**, so tag `v19.0.1` exists. The Open Source page links there. Under GPL you remain responsible for that source staying available.
- [ ] Fill in your real identity and a monitored email address. If publishing your home address worries you, ask a lawyer whether a business address or service can be used in your country.
- [ ] Set your reverse proxy's access logs to at most 14 days, or change that sentence in the Privacy Policy.
- [ ] Answer privacy requests within one month and illegal-content reports promptly, using the tools below.
- [ ] Encrypt backups, and apply operating-system and Docker security updates.
- [ ] Check your internet provider's terms allow hosting a public site at home.
- [ ] If visitors come from the EU, you are probably covered by the GDPR even from outside the EU. A non-EU operator can need an EU representative (Art. 27) unless the processing is occasional and low risk. Ask a lawyer if the site gains real EU traffic.

## 4. Moderation

Users can never delete a game, and the database itself refuses deletes and edits from the application. Privacy law still gives players a right to erasure, and illegal content must be removable, so you have two commands. Run them from the `app` container console in Portainer:

```sh
# Valid privacy request: replaces the name, removes identifying links, deletes the account
node server/admin.ts anonymize LichessUsername

# Illegal content: removes one game (the ID is in the game's URL)
node server/admin.ts remove GAME_ID
```

## 5. Backups

Games are permanent, so back up the database. From the `db` container, or a scheduled job on the host:

```sh
pg_dump -U delta -d delta | gzip > delta-$(date +%F).sql.gz
```

Store copies off the server. Backups can contain data you later anonymized, so limit how long you keep them (30 days is a sensible default). If you restore one, re-run any anonymizations made since it was taken.

## Local development

```sh
cp .env.example .env
npm run dev:db       # Starts PostgreSQL in Docker
npm run dev:server   # API on port 3000
npm run dev          # Website on http://localhost:5173
```
