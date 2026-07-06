# iRead Games Audit: Bugs, Feature Gaps, And Recommended Changes

Scanned on: 2026-06-17

Phase 1 implementation started on: 2026-06-17
Phase 2 implementation started on: 2026-06-17
Phase 3 implementation started on: 2026-06-17
Phase 5 implementation started on: 2026-06-17
Phase 6 implementation started on: 2026-06-17
Competition replay/timeout pass started on: 2026-06-17

This audit began as a discussion document. Phase 1 fixes have now been applied for the server storage/id flow, book/date API parameters, guarded result updates, uppercase word-search responses, fragile Vite-internal imports, and `.env` ignores. Phase 2 restored TypeScript and Jest as usable quality gates. Phase 3 tightened competition result lifecycle, timer endings, and menu entry points.
Phase 4 was intentionally skipped after the calendar challenge flow was removed. Phase 5A has started with Think Word and Word Explorer gameplay polish.
Phase 6 excludes leaderboard/competition ranking and admin vocabulary/analytics hooks because those will be handled from the iRead platform, not this games app.
The latest competition pass temporarily disables Intellect Link entry points and tightens Think Word, Bee Genius, and Word Explorer competition challenge replay, timer, save, and timeout behavior.

## Phase 1 Status

Completed:

- Replaced the single global storage instance with cached storage per book id plus a general storage instance for dictionary-only routes.
- Added storage readiness handling so routes await book-word initialization before serving story-word games.
- Required book ids only on story-word routes instead of blocking every API route globally.
- Passed `id` and optional `date` from classic/daily game pages and calendar pages into the relevant API calls.
- Guarded result updates on the client and server so missing result ids do not call the external update endpoint.
- Normalized word-search puzzle words to uppercase in server responses.
- Removed private `node_modules/vite/...` imports from Strands and Word Search code.
- Added `.env` to `.gitignore`.

Still open:

- `git ls-files .env` shows `.env` is currently tracked. It still needs to be removed from the Git index with `git rm --cached .env` when you are ready, without deleting the local file.

Verification after Phase 1:

- `npm run build` passes.
- `npm run check` failed at the end of Phase 1, then was fixed in Phase 2.

## Phase 2 Status

Completed:

- Switched TypeScript module resolution to Vite-compatible bundler resolution.
- Added local declarations for untyped runtime packages.
- Fixed strict TypeScript errors across menu links, game tiles, word-search styles, Strands types, server startup, and calendar/page API shapes.
- Added `npm test`.
- Scoped Jest discovery to real tests under `client/src`, so setup files and stale duplicate tests are not treated as suites.
- Updated the active game config test to match the current store shape and current game config.

Verification after Phase 2:

- `npm run check` passes.
- `npm test` passes.
- `npm run build` passes.
- Local HTTP smoke checks for `http://localhost:5153` and `http://localhost:5153/?id=1` return `200`.

## Phase 3 Status

Completed:

- Changed main menu calendar challenge entries into competition challenge entries.
- Limited `/api/save-result` usage to competition challenge starts from the main menu.
- Normal daily challenge buttons now navigate directly without creating iRead game results.
- Competition starts now require a book id and require a created result id before navigation.
- Competition routes carry `competition=true` in the query string.
- Think Word competition result updates now use explicit win/loss completion instead of treating the last word index as completed.
- Word Explorer daily and competition timers now end the game on time up and save `completed: false` for competition mode.
- Daily Bee Genius timer now runs, ends cleanly on time up, and saves competition updates only when a result id exists.
- Daily Intellect Link competition mode now saves progress safely and marks incomplete on time up; completion remains conservative until the puzzle target-word contract is fixed.
- Timed game-end screens show a Finish action back to the main menu.

Verification after Phase 3:

- `npm run check` passes.
- `npm test` passes.
- `npm run build` passes.

## Phase 4 Status

Skipped by product decision:

- Calendar challenge work is no longer needed because the calendar challenge entry points were removed/replaced with competition challenge entry points in Phase 3.
- Any remaining calendar screens are now lower-priority cleanup unless the product brings calendar history back as a separate feature.

## Phase 5 Status

Completed in Phase 5A:

- Think Word now blocks duplicate guesses before validation.
- Think Word now awards predefined-word bonus points and shows live score.
- Think Word now finalizes through `endGame` for both wins and losses, so `GameSummary` receives real metrics.
- Think Word summary now stores the actual win/loss flag and uses per-session hint counts instead of lifetime hint totals.
- Think Word stats and achievements UI are reachable from the game screen, and the stats modal now reads live store data instead of static JSON.
- Achievement checks now require a win before awarding quick-win and no-hint-win achievements.
- Classic Word Explorer now updates score for found words, applies hint deductions, awards time/difficulty completion bonuses, and shows a finish screen for both completion and time-up.
- Classic Word Explorer now disables the grid after the game ends and returns to the main menu through the preserved book id.
- Competition Word Explorer now displays the final bonus-adjusted score and disables the grid after completion or timeout.
- Word Explorer word-list layout now uses responsive width instead of fixed `30rem`, reducing mobile overflow risk.

Still open for later Phase 5 passes:

- Bee Genius server-side letter/center validation, pangram bonus, and stronger daily progress model.
- Intellect Link/Strands real puzzle contract, spangram support, puzzle-aware validation, hints, and completion.
- Daily Think Word duplicate prevention and scoring cleanup.
- Deterministic daily Word Explorer generation and broader daily/date semantics.
- More route-level smoke tests for game payloads and result lifecycle.

Verification after Phase 5A:

- `npm run check` passes.
- `npm test` passes.
- `npm run build` passes.

## Phase 6 Status

Completed:

- Added a global display settings control with persisted dark mode and colorblind mode toggles.
- Added light, dark, and colorblind-safe CSS variables for the app shell, Think Word tiles, Bee Genius center tile, and Word Explorer highlights.
- Updated Think Word tiles and keyboard colors to use accessibility-aware variables.
- Made Think Word tiles and keyboard more responsive on mobile.
- Made Bee Genius board size responsive and dark-mode friendly.
- Made Intellect Link board tiles scale with the available board width.
- Reduced mobile header overlap across active game pages by moving back buttons into responsive page headers and allowing toolbars to wrap.
- Renamed visible "Strands" gameplay labels to Intellect Link where users see them.
- Replaced stale Help content with game-aware Classic, Daily, and Competition tabs for Think Word, Word Explorer, Bee Genius, and Intellect Link.
- Removed local tutorial references to leaderboard/ranking/admin-style features that now belong to the iRead platform.
- Fixed duplicate hint counting in Think Word summaries.
- Removed completion confetti from Daily Word Explorer time-up endings.

Out of scope by product decision:

- Leaderboard/competition ranking.
- Admin vocabulary and analytics hooks.

Verification after Phase 6:

- `npm run check` passes.
- `npm test` passes.
- `npm run build` passes.
- Local HTTP smoke checks for `http://localhost:5153` and `http://localhost:5153/?id=1` return `200`.
- In-app browser visual QA was attempted, but the browser runtime failed before opening because the local helper process is being loaded as ESM and cannot call `require`.

## Competition Replay/Timeout Pass

Completed:

- Disabled all Intellect Link menu entry points for now.
- Added a same-day local competition attempt lock for Think Word, Bee Genius, and Word Explorer competition buttons.
- Kept `/api/save-result` usage limited to competition starts from the main menu.
- Competition route guards now redirect back to the menu if a result id is missing, preventing unsavable direct-route runs.
- Think Word competition now has a visible 5-minute timer.
- Think Word competition saves learned words separately from guesses.
- Think Word, Bee Genius, and Word Explorer competition timeouts now save the result before redirecting to the games menu.
- Terminal competition states now close the iRead result with `completed: true`, while in-progress autosaves still use `completed: false`.
- Bee Genius competition now saves an aggregate word list across the whole pack instead of only the currently visible hive.
- Word Explorer competition keeps its 5-minute timer and now awaits result saving before timeout redirect.

Verification after competition pass:

- `npm run check` passes.
- `npm test` passes.
- `npm run build` passes.
- Local HTTP smoke checks for `http://localhost:5153` and `http://localhost:5153/?id=1` return `200`.

## Scope

Reviewed:

- React routes, pages, stores, and game components under `client/src`
- Express routes and in-memory storage under `server`
- Shared config, types, and Drizzle schema under `shared`
- Existing Jest config and tests
- Product/user-story files under `attached_assets`
- Current build, type-check, and test behavior

## Verification Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check` | Passes | TypeScript now resolves Vite aliases and catches real strict-mode issues. |
| `npm run build` | Passes | Vite and esbuild can bundle the app, but Vite reports a large client chunk warning. |
| `npm test` | Passes | One active client config/store suite runs under Jest. |

Important: the current quality gates are useful again, but test coverage is still thin. Passing tests only cover the client game config/store basics.

## Highest Priority Bugs

### 1. Global API middleware blocks valid routes without `?id=...`

Files:

- `server/routes.ts:145`
- `server/routes.ts:149`
- `server/routes.ts:153`

`registerRoutes` installs middleware that returns `400 { error: "No ID provided" }` before all API routes if `storage` has not been initialized and the request lacks `req.query.id`.

This can block routes that do not logically need a query id, including:

- `/api/save-result`
- `/api/update-result`
- `/api/word-lengths`
- `/api/validate`
- `/api/spelling-bee/validate`
- `/api/word/:word/definition`
- calendar/history endpoints
- daily challenge endpoints that currently do not pass `id`

Why it matters:

- `MainMenu` starts daily games by posting to `/api/save-result` with `book_id` in the body, not `?id=...` in the URL.
- Difficulty selectors fetch `/api/word-lengths` without `id`.
- Several daily and calendar screens fetch API routes without `id`.

Recommended change:

- Do not use one global blocking middleware for all routes.
- Create storage per request or per book id only on routes that require story words.
- Accept `id` from query or body where appropriate.
- Return a clear error only for story-word routes that truly require a book id.

### 2. Storage initialization is asynchronous but not awaited

Files:

- `server/storage.ts:168`
- `server/storage.ts:172`
- `server/storage.ts:293`
- `server/storage.ts:301`

`new MemStorage(id)` calls `this.initializeData(this.id)` but does not await it. Routes can use storage before book words and dictionaries are loaded.

Likely effects:

- `/api/word` may return `undefined` or a stale/fallback word.
- `/api/validate` may reject valid words because `dictionary` has not been loaded yet.
- Daily challenge generation may fall back to `["HAPPY", "SMILE", "JOYFUL"]`.
- Spelling Bee and Strands can generate fallback/random puzzles because story words are unavailable at the time of the request.

Recommended change:

- Add an explicit `ready` promise on storage and await it in routes.
- Or make `createStorage(id)` async and await initialization before assigning storage.
- Add route-level error states for "book words are unavailable".

### 3. One storage singleton can lock the server to the first book id

Files:

- `server/routes.ts:145`
- `server/routes.ts:153`

The `storage` variable is scoped once inside `registerRoutes`. After the first API request with an `id`, all later users/books reuse the same storage instance.

Why it matters:

- If user A opens book 10 first, user B opening book 20 may still receive words from book 10.
- This is especially risky for an iRead integration where every game should use the current book/story vocabulary.

Recommended change:

- Store instances in a `Map<bookId, Storage>` with readiness handling.
- Or make storage stateless and pass `id` into methods that need book words.

### 4. TypeScript checking was not a working safety net

Files:

- `tsconfig.json:8`
- `tsconfig.json:9`
- `tsconfig.json:23`
- `tsconfig.json:24`
- `tsconfig.json:25`

Status: fixed in Phase 2.

Before Phase 2, `npm run check` failed with many alias resolution errors for `@/...` and `@shared/...` while using `module` and `moduleResolution` set to `NodeNext`.

Confirmed failure groups:

- `@/...` and `@shared/...` imports not resolved by `tsc`
- NodeNext extension errors on relative imports like `./tile`
- missing declaration packages for `cors`, `word-list-json`, and `canvas-confetti`
- invalid `Link` props in `MainMenu`
- invalid toast variant `"success"` in Strands
- Framer Motion prop typing issue in `LetterTile`

Recommended change:

- Decide whether this project wants browser/Vite-style TypeScript config or NodeNext.
- Common route: split configs into `tsconfig.client.json`, `tsconfig.server.json`, and optionally `tsconfig.test.json`.
- Keep Vite aliases, but make `tsc` understand them reliably.
- Add missing `@types/*` packages or local declarations where necessary.

### 5. Tests were present but broken

Files:

- `package.json:6`
- `jest.config.cjs:9`
- `client/__tests__/game.test.ts:13`
- `client/src/__tests__/game.test.ts:9`
- `client/src/__tests__/setup.ts:1`

Status: partially fixed in Phase 2.

Problems found during audit:

- `package.json` has no `test` script.
- `npx jest --runInBand` fails.
- `client/__tests__/game.test.ts` imports `../config/game.config`, which does not exist from that folder.
- Both game tests reset `stats` with an old/incomplete shape.
- `client/src/__tests__/setup.ts` is picked up as a test suite and fails because it contains no tests.
- Test expectations disagree with current client config, for example expecting 3-letter words while `client/src/config/game.config.ts` starts at 4 letters.

Recommended change:

- Add broader smoke tests for route payloads and core game utilities.
- Decide whether tests should use `client/src/config/game.config.ts` or `shared/config.ts`.

## Game-Specific Bugs And Risks

### Think Word

Files:

- `client/src/pages/game.tsx`
- `client/src/pages/daily-challenge.tsx`
- `client/src/lib/game.ts`
- `client/src/components/game/board.tsx`

Issues:

- Duplicate guesses are not blocked, despite the backlog requiring this.
- `GameSummary` usually has no data because pages call `incrementWins` or `incrementLosses`, but do not call `endGame`.
- Classic scoring is mostly disabled because `addToScore(guessScore)` is commented out.
- Daily challenge scoring adds points when a story word is guessed and again when it is correct, which can double-count.
- Daily challenge `completed` is based on `currentWordIndex === challengeData.words.length - 1`, not whether the final word was actually solved.
- Daily challenge fetch ignores `date` from calendar links.
- Classic `/api/word` fetch ignores `id`, so it depends on prior global storage initialization.
- Hint button appears only on the last row, but score/summary penalties are not consistently applied to final metrics.

Recommended changes:

- Add duplicate-guess prevention before validation.
- Centralize end-of-game handling through `useGameStore.endGame`.
- Make scoring rules consistent and visible.
- Pass `id` and `date` through all Think Word API calls.
- Add a typed daily-challenge state model instead of scattered booleans and index checks.

### Bee Genius

Files:

- `client/src/pages/spelling-bee.tsx`
- `client/src/pages/daily-spelling-bee.tsx`
- `server/storage.ts:438`

Issues:

- Classic Bee Genius score updates are commented out for most valid words.
- Daily Bee Genius timer is displayed but the timer logic is commented out.
- Daily Bee Genius shows completion UI only when `timeLeft == 0`, but `timeLeft` never changes.
- Switching daily Bee Genius games resets `foundWords`, so progress per game is lost from the UI and update payload.
- Daily Bee Genius always sends `completed: false`.
- Pangram detection is not implemented. The story `baseWord` is treated as special, but there is no "uses all letters" rule or pangram bonus.
- Server validation only checks dictionary validity. It does not validate that the word can be formed from the current puzzle letters or contains the center letter.
- `getDailySpellingBeeChallenge` can get stuck if it needs more unique candidate words than exist for the book.
- Letter-filling loops can become unsafe if no valid additional letters are available.

Recommended changes:

- Track found words per daily game index.
- Implement countdown, timeout, and completion rules.
- Add server-side puzzle-aware validation.
- Add pangram detection and bonus scoring.
- Guard daily generation against too few candidate words.

### Intellect Link / Strands

Files:

- `client/src/pages/strands.tsx:12`
- `client/src/components/strands/board.tsx:6`
- `client/src/pages/daily-strands.tsx:13`
- `client/src/lib/strands.ts`
- `server/storage.ts:615`
- `server/storage.ts:686`
- `server/storage.ts:742`

Issues:

- `strands.tsx` and `components/strands/board.tsx` import from Vite internal `node_modules` paths. These imports are unused and unsafe.
- Strands uses `variant: "success"` in toasts, but the toast component only defines `default` and `destructive`.
- Classic Strands does not pass `themedWords` to `Board`, so themed/revealed word highlighting cannot work as intended.
- Server `validateStrandsWord` accepts any dictionary word of length 3+ and always returns `isSpangram: false`.
- Puzzle validation is not tied to the selected puzzle id, themed words, spangram, or path positions.
- Daily Strands returns random letter grids only. It does not return themed words, word positions, spangram, or target word list, so true completion is impossible.
- Daily Strands fetch ignores `date` and `id`.
- `const query = useQuerys()` runs at module scope in `daily-strands.tsx`, which is fragile and should be inside the component.
- Many debug `console.log` calls remain in `client/src/lib/strands.ts`, `components/strands/board.tsx`, and `server/storage.ts`.

Recommended changes:

- Remove unsafe Vite internal imports.
- Add a real Strands puzzle contract: `id`, `theme`, `letters`, `themedWords`, `wordPositions`, `spangram`, `expiresAt`.
- Validate selected paths and words against the current puzzle.
- Implement spangram detection, completion, score, hints, and daily progress.

### Word Explorer

Files:

- `client/src/pages/word-search.tsx`
- `client/src/pages/daily-word-search.tsx`
- `client/src/pages/word-search-comp.tsx`
- `client/src/pages/word-search-calendar.tsx`
- `client/src/components/word-search/grid.tsx`
- `server/routes.ts:416`
- `server/routes.ts:514`

Issues:

- Classic Word Explorer has score updates commented out, so score can stay at 0.
- Daily Word Explorer displays a timer but never decrements `timeLeft`.
- Daily Word Explorer completion bonus uses full remaining time because the timer is static.
- Daily Word Explorer fetches `id` and `competition`, but not `date`.
- Word Search Calendar fetches by `date`, but not `id`, so it can be blocked by global middleware or generate from empty book words.
- Competition Word Explorer calls `startGame()` inside an effect that also depends on `timeLeft`, so it re-runs every second.
- Competition Word Explorer marks `completed: true` when time runs out, even if the player did not find all words.
- Competition score uses `setScore(score + points)` instead of a functional state update, which can lose points during rapid updates.
- `word-search-comp.tsx` imports from a Vite internal `node_modules` path.
- Classic `/api/word-search` does not uppercase placed words, while daily does. Mixed-case book words can make selection matching inconsistent.
- WordSearchGrid has fixed `w-[30rem]` word-list width, which can overflow on mobile.
- Diagonal highlight math uses expressions like `(length - 20) * gap`, which can produce suspicious negative sizing.

Recommended changes:

- Make time, score, found words, and completion a single reducer/state model.
- Normalize all word search words to uppercase on the server.
- Use deterministic date/book seeding for daily puzzles.
- Fix competition lifecycle and result completion semantics.
- Improve WordSearchGrid responsiveness and simplify highlight geometry.

## Cross-Cutting Product Gaps From Backlog Files

Backlog sources reviewed:

- Wordle clone backlog
- Spelling Bee backlog
- Strands user stories
- US-18 difficulty selection
- US-19 hint before last guess
- US-24 dictionary integration
- US-25 daily challenge with multiple words

Feature gaps:

1. Duplicate guess prevention
   - Required by Wordle backlog.
   - Missing in Think Word and daily Think Word.

2. Daily determinism
   - Backlog expects daily words/puzzles to be stable for a date.
   - Current daily flows often ignore `date`, use random generation, or cache only briefly.

3. Global same-daily challenge behavior
   - Required for Wordle-style sharing.
   - Current book-specific iRead vocabulary complicates this. The product needs to decide if "global" means global by date, by book, by class, or by user cohort.

4. Dictionary and hint integration
   - Definition hint exists for Think Word, but route can be blocked by missing id.
   - Hints are inconsistent across modes.
   - Spelling Bee and Strands need puzzle-aware validation, not only dictionary validation.

5. Multiple-word daily packs
   - Present in some pages, but progress, score, completion, and date handling are not reliable.

6. Stats and progress tracking
   - Stats modal now reads live local game-store data after Phase 5A.
   - Achievements are local store only and not persisted.
   - Calendars mostly show placeholder completion data.

7. Leaderboards and competition
   - Backlogs mention leaderboards.
   - Leaderboard/ranking UI is out of scope for this games app and will be handled by the iRead platform.

8. Accessibility settings
   - Dark mode and colorblind mode toggles were added in Phase 6.
   - Remaining accessibility work should focus on deeper keyboard/focus QA and screen-reader labeling.

9. Admin/config features
   - Backlogs mention admin word list updates and analytics.
   - Admin vocabulary and analytics hooks are out of scope for this games app and will be handled by the iRead platform.

10. Social sharing
    - Some share buttons exist.
    - Share text should be made consistent across all modes and avoid spoilers by default.

## Data, Config, And Security Concerns

### Two conflicting game config files

Files:

- `client/src/config/game.config.ts`
- `shared/config.ts`

There are two separate `GameConfig` objects with different rules and scoring values.

Examples:

- Client config has word length min 4 and max guesses all 6.
- Shared config has word length min 3 and different max guesses.
- Tests disagree with the client config.

Recommended change:

- Make `shared/config.ts` the source of truth, or explicitly separate "classic Think Word" config from shared multi-game config.
- Update tests and pages accordingly.

### `.env` is present

Files:

- `.env`
- `.gitignore`

Phase 1 added `.env` to `.gitignore`. A follow-up check with `git ls-files .env` shows it is currently tracked by Git.

Recommended change:

- Confirm whether `.env` is already tracked by Git. If tracked, remove it from the index safely without deleting the local file.

### CORS config is overly broad

File:

- `server/index.ts`

The server uses `origin: "*"` with `credentials: true`.

Why it matters:

- Browsers do not allow wildcard origin for credentialed requests.
- The intended iRead/cookie behavior should be explicit.

Recommended change:

- Configure allowed origins from env.
- Avoid credentialed wildcard CORS.

### Hardcoded iRead API URL in frontend

File:

- `client/src/components/game/main-menu.tsx:103`

The frontend hardcodes `https://api.iread.education` for `user_authenticated`, while server routes use `process.env.IREAD_API`.

Recommended change:

- Use one environment-driven API base.
- Prefer server proxying for credentialed iRead calls if same-site/cookie behavior requires it.

## UI And UX Risks

1. Mobile layout risk
   - Phase 6 made the Bee Genius board, Think Word board/keyboard, Word Explorer word list, Intellect Link board, and active game headers more responsive.
   - Remaining risk is visual QA across more real devices and calendar/archive pages.

2. Disabled links are still rendered as `Link` with invalid href
   - `MainMenu` uses `href={undefined}` for disabled links.
   - This is a TypeScript error and can be a runtime/accessibility issue.

3. Stats and calendar screens look available but are placeholders
   - Several stats buttons have handlers commented out.
   - Calendar completion data is always false from the server.
   - Spelling Bee calendar shows "Coming soon" and `0 days`.

4. Audio/confetti lifecycle
   - `Confetti` creates `new Audio(...)` during render and plays automatically.
   - Autoplay can be blocked by browsers and there is no cleanup if the component unmounts early.

## Recommended Change Plan

### Phase 1: Stabilize core app flow

Goal: make the app reliably open a book, start games, fetch words, save results, and pass basic checks.

Changes:

- Fix API id handling and storage initialization.
- Remove single global storage lock.
- Pass `id` and `date` consistently from routes/pages.
- Guard all `result.id` updates.
- Normalize story words to uppercase in all server puzzle responses.
- Remove Vite internal imports.
- Add `.env` to `.gitignore` and handle secrets safely.

### Phase 2: Restore quality gates

Goal: make `npm run check` and tests useful before feature work.

Changes:

- Split/fix TypeScript configs for client, server, and tests.
- Add missing type declarations/packages.
- Fix Jest test discovery and duplicate/stale tests.
- Add `npm test`.
- Add smoke tests for core game utilities and route payloads.

### Phase 3: Fix scoring, completion, and result lifecycle

Goal: game state should match what users see and what iRead receives.

Changes:

- Use one scoring utility per mode.
- Call `endGame` or equivalent completion logic consistently.
- Fix timers in daily Word Explorer and daily Bee Genius.
- Track found words per daily sub-game/puzzle.
- Update iRead results only when there is a valid result id.
- Use correct `completed` semantics.

### Phase 4: Finish daily and calendar behavior

Goal: daily challenge links and calendars should work predictably.

Changes:

- Honor `date` query params.
- Generate deterministic puzzles for date plus book/cohort.
- Persist and fetch completion status from iRead results or backend storage.
- Prevent replay if product requires it.
- Show real historical data in calendars.

### Phase 5: Feature completion by mode

Think Word:

- Duplicate guess prevention
- Live stats and achievements
- Consistent hint penalties and final summary
- Spoiler-free share text

Bee Genius:

- Server-side letter/center validation
- Pangram detection and bonus
- Per-game daily progress
- Timer and completion flow

Strands:

- Real themed puzzle contract
- Spangram support
- Puzzle-aware validation
- Hints and completion
- Daily puzzle target words

Word Explorer:

- Score updates in classic mode
- Timer fixes in daily mode
- Competition scoring/results semantics
- Responsive grid/list layout
- Deterministic daily generation

### Phase 6: Product polish

Changes:

- Dark mode toggle
- Colorblind mode toggle
- Better mobile layout
- Consistent tutorial/help content by mode
- Leaderboard/competition ranking is out of scope here and belongs to the iRead platform.
- Admin vocabulary/analytics hooks are out of scope here and belong to the iRead platform.

## Suggested First Discussion Decisions

Before implementation, decide these:

1. Should game vocabulary be global, per book, per user, per class, or a mix by mode?
2. Should daily puzzles be deterministic by date only, or by date plus book id?
3. Should the source of truth for game config be `shared/config.ts`?
4. Should result saving always happen through the server, or can the client call iRead directly?
5. Which game mode should be stabilized first: Think Word, Bee Genius, Word Explorer, or Strands?

## My Recommended Starting Point

Start with Phase 1 and Think Word/Word Explorer API stabilization:

1. Fix API id/storage initialization.
2. Pass `id` consistently.
3. Normalize server word casing.
4. Restore TypeScript checks enough to catch real mistakes.

This gives every game mode a safer foundation before changing gameplay rules.
