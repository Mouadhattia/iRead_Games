# iRead Games Project Overview

Scanned on: 2026-06-17

## Purpose

iRead Games is a TypeScript React game application connected to the wider iRead project. It provides several word-based games that use book/story vocabulary from the iRead API and store game results back to the iRead backend.

The current codebase is a Vite React app with an Express API server. It is not a Next.js app.

## Main Stack

- Frontend: React 18, TypeScript, Vite, Wouter, TanStack Query, Zustand
- UI: Tailwind CSS, shadcn/Radix components, lucide-react icons, framer-motion
- Backend: Express, TypeScript, tsx in development, esbuild for production bundle
- Data and validation: Drizzle schema files, Zod, word-list-json, external iRead API, dictionaryapi.dev for definitions
- Tests: Jest and ts-jest config exist, with game tests under `client/src/__tests__` and `client/__tests__`

## Project Structure

```text
client/
  index.html
  src/
    App.tsx                  Route definitions
    main.tsx                 React entry point and QueryClient provider
    components/              Game, shared, word-search, spelling-bee, strands, and UI components
    pages/                   Routed page components for all games
    lib/                     Zustand stores, game utilities, query client, strands logic
    config/                  Client-side game config
    data/                    Local JSON result/data files
    hooks/                   Toast and responsive helpers

server/
  index.ts                   Express setup, CORS, logging, Vite/static serving
  routes.ts                  API routes for all game modes
  storage.ts                 In-memory storage, iRead API word hydration, dictionary helpers
  words.ts                   Word scoring/predefined word helpers
  db.ts                      Database wiring
  vite.ts                    Development Vite middleware and production static serving

shared/
  config.ts                  Shared game rules and scoring config
  schema.ts                  Drizzle PostgreSQL schema
  types.ts                   Shared Strands/grid/progress types

attached_assets/             User-story and backlog reference text files
dist/                        Built output
```

## App Routes

Routes are defined in `client/src/App.tsx`.

| Route | Screen |
| --- | --- |
| `/` | Main menu |
| `/game` | Classic Think Word |
| `/daily-challenge` | Daily Think Word challenge |
| `/challenge-calendar` | Think Word calendar |
| `/spelling-bee` | Classic Bee Genius |
| `/daily-spelling-bee` | Daily Bee Genius |
| `/spelling-bee-calendar` | Bee Genius calendar |
| `/strands` | Classic Intellect Link/Strands |
| `/daily-strands` | Daily Intellect Link/Strands |
| `/strands-calendar` | Strands calendar |
| `/word-search` | Classic Word Explorer |
| `/daily-word-search` | Daily Word Explorer |
| `/word-search-calendar` | Word Explorer calendar |
| `/word-search-comp` | Word Explorer competition challenge |

The main menu preserves the book/story query parameter with URLs like `/?id=<book_id>`.

## Game Modes

### Think Word

Wordle-style guessing game.

- Main page: `client/src/pages/game.tsx`
- Daily page: `client/src/pages/daily-challenge.tsx`
- Shared components: `client/src/components/game/*`
- Store and guess logic: `client/src/lib/game.ts`
- Key APIs: `/api/word`, `/api/validate`, `/api/daily-challenge`, `/api/save-result`, `/api/update-result`

### Bee Genius

Spelling Bee-style word formation game using a center letter and outer letters.

- Main page: `client/src/pages/spelling-bee.tsx`
- Daily page: `client/src/pages/daily-spelling-bee.tsx`
- Components: `client/src/components/spelling-bee/*`
- Key APIs: `/api/word`, `/api/spelling-bee/validate`, `/api/daily-spelling-bee`

### Intellect Link / Strands

Grid-based word-linking game using themed words and word paths.

- Main page: `client/src/pages/strands.tsx`
- Daily page: `client/src/pages/daily-strands.tsx`
- Components: `client/src/components/strands/*`
- Store and grid logic: `client/src/lib/strands.ts`
- Key APIs: `/api/strands/puzzle`, `/api/strands/daily`, `/api/strands/validate`, `/api/strands/progress`

### Word Explorer

Word search grid game with classic, daily, and competition variants.

- Main page: `client/src/pages/word-search.tsx`
- Daily page: `client/src/pages/daily-word-search.tsx`
- Competition page: `client/src/pages/word-search-comp.tsx`
- Grid component: `client/src/components/word-search/grid.tsx`
- Key APIs: `/api/word-search`, `/api/daily-word-search`, `/api/update-result`

## Backend Data Flow

1. The frontend receives or preserves an iRead book/story id through the `id` query parameter.
2. `server/routes.ts` initializes storage with `createStorage(id)`.
3. `server/storage.ts` fetches book words from:

```text
${process.env.IREAD_API}/reader/get_book_games/:id
```

4. Storage uppercases and groups story words by length, while also loading `word-list-json` as a general dictionary.
5. Game endpoints generate puzzles, validate submitted words, return definitions, and proxy result saves/updates to the iRead API.
6. Result writes use:

```text
POST ${process.env.IREAD_API}/reader/game-result
PUT  ${process.env.IREAD_API}/reader/game-result/:id
```

## API Summary

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/word-lengths` | Available word lengths |
| GET | `/api/word` | Current story word for a requested length |
| POST | `/api/validate` | Validate Think Word guesses |
| GET | `/api/word/:word/definition` | Fetch hint definition |
| GET | `/api/daily-challenge` | Daily Think Word pack |
| GET | `/api/daily-challenges/past` | Past Think Word challenges |
| POST | `/api/save-result` | Create iRead game result |
| POST | `/api/update-result` | Update iRead game result |
| GET | `/api/refresh` | Refresh daily story words |
| POST | `/api/spelling-bee/validate` | Validate Bee Genius word |
| GET | `/api/daily-spelling-bee` | Daily Bee Genius pack |
| GET | `/api/daily-spelling-bee/past` | Past Bee Genius challenges |
| GET | `/api/strands/puzzle` | Generate Strands puzzle |
| GET | `/api/strands/daily` | Daily Strands puzzles |
| POST | `/api/strands/validate` | Validate Strands word |
| GET | `/api/strands/progress/:userId/:puzzleId` | Read Strands progress |
| POST | `/api/strands/progress` | Save Strands progress |
| GET | `/api/strands/daily/past` | Past Strands challenges |
| GET | `/api/word-search` | Generate Word Explorer puzzle |
| GET | `/api/daily-word-search` | Generate daily Word Explorer puzzle |

## Environment

Expected local environment variables:

```text
IREAD_API=<iRead API base URL>
DATABASE_URL=<PostgreSQL URL, required by drizzle.config.ts>
PORT=<optional server port, defaults to 5153>
```

Do not commit `.env` values.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm start
npm run db:push
```

Notes:

- `npm run dev` starts `tsx server/index.ts`.
- The server listens on `PORT` or `5153`.
- `npm run build` builds the Vite client to `dist/public` and bundles the Express server to `dist`.
- `npm run check` runs TypeScript checking.
- `jest.config.cjs` exists, but `package.json` currently does not define an `npm test` script.

## Implementation Notes

- The repository already had uncommitted changes at scan time. Avoid broad refactors or reset commands unless specifically requested.
- `README.md` appears stale/truncated compared with the current code and scripts.
- Several app flows depend on preserving the `id` query parameter. When adding new screens or API calls that need story words, pass or preserve `id`.
- `client/src/components/game/main-menu.tsx` currently disables some calendar/classic Strands links through `isDisabled = true`, although routes still exist.
- There are two game config files: `client/src/config/game.config.ts` and `shared/config.ts`. Confirm the intended source of truth before changing scoring or rules.
- Active storage is in-memory (`MemStorage`) even though Drizzle schema files exist for PostgreSQL.
- `server/storage.ts` imports Strands grid generation through the client alias (`@/lib/strands.ts`). Changes to aliases or build tooling can affect server builds.
- `client/src/pages/strands.tsx` contains an import from a Vite internal `node_modules` path. Revisit this if TypeScript or build checks fail.
- Some score updates are currently commented out in game pages. Confirm desired scoring behavior before changing user-facing score totals.

## Suggested Workflow For Updates

1. Start with the target game mode page under `client/src/pages`.
2. Trace shared state in `client/src/lib/game.ts` or `client/src/lib/strands.ts`.
3. Check the matching API in `server/routes.ts`.
4. If story/book vocabulary is involved, confirm the `id` query parameter is preserved.
5. Run `npm run check` after TypeScript changes.
6. For UI changes, run the app with `npm run dev` and test the affected route in the browser.
