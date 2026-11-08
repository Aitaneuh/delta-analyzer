# Delta Analyzer

Like [ballchasing.com](https://ballchasing.com), but for chess. Upload your games, replay them move by move and analyze them with Stockfish.

## Features

- **Sign in with Lichess**, no password or app registration needed
- **Import games** from your Lichess account or from PGN text and files, with duplicates detected automatically
- **Replay** on an interactive board, using the arrow keys: ← → to step through moves, ↑ ↓ to jump to the first or last move
- **Computer analysis** with Stockfish running in the browser: eval bar, winning-chances graph, best-move arrow, marked inaccuracies, mistakes and blunders, and accuracy per player
- **Explore** every uploaded game, filtered by player, event, game type, result, termination, ECO code, Elo, time control and date
- **Opening names** for all 500 ECO codes
- **Permanent, shareable games:** every uploaded game is public and can't be deleted by users

## Tech stack

| Part | Tools |
|---|---|
| Frontend | Vue 3, TypeScript, Pinia, Vue Router, Tailwind CSS |
| Chess | chessground, chessops, Stockfish (WebAssembly) |
| Backend | Node.js, Fastify |
| Database | PostgreSQL |
| Hosting | Docker Compose |

## Running it locally

You need Node.js 24 and Docker.

```sh
npm install
cp .env.example .env
npm run dev:db       # Starts PostgreSQL in Docker
npm run dev:server   # API on port 3000
npm run dev          # Website on http://localhost:5173
```

The database tables are created automatically when the server starts.

## Useful commands

| Command | What it does |
|---|---|
| `npm run test:unit` | Runs the unit tests |
| `npm run type-check` | Checks the TypeScript types |
| `npm run lint` | Lints the code and applies automatic fixes |
| `npm run format` | Formats `src/` |
| `npm run build` | Type-checks and builds the website |

## Hosting

The site ships as a two-container Docker stack, ready to deploy from Portainer. See [DEPLOYMENT.md](DEPLOYMENT.md) for the setup, the checklist to complete before going public, moderation and backups.

## License

[GNU General Public License v3.0 or later](LICENSE). Delta Analyzer includes Stockfish, chessground and chessops, which are also GPL-licensed.
