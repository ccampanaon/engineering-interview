# CLAUDE.md — Pokémon Team Builder (Chorus interview)

## Status

> Rule: update this section in every phase's closing commit.

**Exists right now (through phase 8, wrap-up — implementation order complete):**
- Nx 22 + pnpm monorepo; four packages: `pokemon-ui` (React 19 + Vite + Emotion),
  `pokemon-ui-e2e` (Playwright), `pokemon-user-backend` (NestJS 11 + MikroORM 7),
  `pokemon-user-backend-e2e` (Jest + axios)
- Tilt dev environment: k8s Postgres 16 (`admin/admin`, db `pokemon`), backend in
  k8s via Docker, frontend as local Vite dev server, migrations auto-run by Tilt
- Plumbing (phase 1): unified MikroORM config, Vite `/api` proxy → :3000
- Entities (phase 2): `Pokemon`, `Profile` in `src/modules/database/entities/`
- Migrations (phase 3): `Migration20260810040842_schema` (3 tables, DDL matches
  `schema:create --dump` verbatim, drops `some_entity`) and
  `Migration20260810040850_seed_pokemon` (150 rows, English display names from
  PokeAPI `pokemon-species/{1..150}`, uuids fixed at authoring time); no `down()`
  on either (reset path = wiped volume); verified from wiped PVC via `tilt up`
- Read path (phase 4): `GET /api/pokemon`, `GET /api/profiles` — thin controllers,
  services return bare DTOs (`PokemonDto`, `ProfileDto`); profiles query uses
  `strategy: 'joined'` to avoid N+1 on the pokemon collection
- Write path (phase 5): `POST /api/profiles` (body `{ name }`), `PUT
  /api/profiles/:profileId/pokemon` (body: array of ≤6 pokemon ids, full replace);
  all validation hand-rolled in `ProfilesService` (see Architecture decisions);
  `profiles.service.spec.ts` is the first backend spec — 19 cases covering the
  validation ladder, transaction usage, and replace semantics
- Quality gate: `pnpm verify` (= `nx run-many -t typecheck lint test`); backend
  vitest config unified in `vitest.config.ts` (the `test` block in `vite.config.ts`
  is gone — vitest ignores it when `vitest.config.ts` exists) with v8 coverage
  always on, thresholds 80/80/80 lines/statements/functions, 70 branches;
  `passWithNoTests` removed now that a real spec exists, but `coverage.include`
  deliberately left unset — thresholds apply only to files the test suite
  actually loads (currently `ProfilesService` + entities), not the whole `src`
  tree; phase 8 resolved the repo-wide question left open here: CI runs the
  same `pnpm verify` as the hook, unchanged, so thresholds stay scoped as
  configured rather than expanding to cover untested files like
  `PokemonService` or the controllers;
  pre-commit hook `.githooks/pre-commit` runs `pnpm verify`, activated per-clone
  by the root `prepare` script (`git config core.hooksPath .githooks`); no e2e
  and no AI review in the hook
- Frontend (phase 6): `app.tsx` replaces NxWelcome — fetches `/api/pokemon`
  and `/api/profiles` on mount (independent loading/error states per fetch);
  profile create (`POST /api/profiles`) and select; pokemon grid virtualized
  via `react-virtuoso` (`virtualized-pokemon-grid.tsx` + `pokemon-card.tsx`,
  `spinner.tsx` for loading); selecting a profile seeds a local `draft` array
  from its persisted team, toggling pokemon mutates only the draft (capped at
  6 client-side) and never the source `profiles` state; submit
  (`PUT /api/profiles/:id/pokemon`) writes the server's response back into
  `profiles` and `draft`; the Save button's dirty check (`sameTeam`) compares
  `draft` vs the persisted team **as sets, not arrays** — team order isn't
  persisted (see Architecture decisions), so toggling a pokemon off then back
  on must read as unchanged even though it lands at the end of the array
- Test cleanup (phase 7): `app.spec.tsx` rewritten — 2 cases (renders fetched
  pokemon + profiles; shows an error message when `/api/pokemon` fails);
  `VirtualizedPokemonGrid` is mocked out since `react-virtuoso` needs real
  browser layout (`ResizeObserver`, `offsetParent`) that jsdom doesn't provide
  and would render zero rows regardless of data — the mock lets the test
  target what `App` actually owns, not react-virtuoso's rendering; backend e2e
  spec (`pokemon-user-backend.spec.ts`) replaced with 2 cases against a live
  backend (`GET /api/pokemon` returns all 150, `GET /api/profiles` returns an
  array) — this project only exposes an `e2e` target (no `test`), so it's
  excluded from `pnpm verify` and CI by construction, not by an exclude rule
- Wrap-up (phase 8): `.github/workflows/ci.yml` — triggers on `pull_request`
  and `push` to `main`; `actions/checkout` → `pnpm/action-setup` (version read
  from root `package.json`'s `packageManager` field, not pinned in the
  workflow) → `actions/setup-node` with `node-version-file: '.nvmrc'` and
  `cache: 'pnpm'` → `pnpm install --frozen-lockfile` → `pnpm verify`; runs the
  literal `pnpm verify` script rather than a separately-typed `nx run-many`
  invocation, so the workflow and the pre-commit hook can never drift apart;
  deliberately typecheck+lint+test, **not** +build — `vite build` transpiles
  through esbuild without type-checking, so swapping `typecheck` for `build`
  (as originally sketched below in Implementation order) would have dropped
  real type-checking from CI while adding a step that can't substitute for it;
  no deploy, no matrix, no caching beyond the standard `setup-node` pnpm cache
- Placeholder code: `GET /api/hello`
- `LLM_TRANSCRIPT.md` + `docs/transcripts/` (01–10, index rows/commit SHAs not
  yet fully backfilled — see session notes), `.claude/agents/code-reviewer.md`

**Does NOT exist yet:**
- Nothing outstanding from the phase 1–8 implementation order. The two e2e
  packages (`pokemon-ui-e2e` Playwright, `pokemon-user-backend-e2e` live-backend
  Jest) are deliberately outside `pnpm verify`/CI — both need a running stack,
  which is a design choice (see above), not a gap.

## Stack & conventions

- **Frontend** `packages/pokemon-ui` — React 19, Vite, port **4200**.
  Styling: **Emotion only** (`@emotion/styled` / css prop; `jsxImportSource` is set).
  Never Tailwind, Material UI, or plain CSS files. Local React state only — no
  redux/zustand/react-query/router/form libraries.
- **Backend** `packages/pokemon-user-backend` — NestJS 11, port **3000**, global
  prefix `/api`. Feature modules under `src/modules/<name>/`; entities in
  `src/modules/database/entities/`; `.js` extensions on relative imports.
- **ORM** MikroORM 7 (PostgreSQL driver), decorators from
  `@mikro-orm/decorators/legacy`, `UnderscoreNamingStrategy` (snake_case columns),
  uuid PKs via `crypto.randomUUID()`. Migrations are **hand-written SQL** in
  `src/migrations/` (blank `migration:create`, fill in `addSql`); `snapshot: false`.
- **Dependencies**: add to the **root** `package.json` only; no new dependencies
  without demonstrated need.
- **Definition of done**: `pnpm verify` (typecheck + lint + unit tests; coverage
  thresholds on the backend) passes before any task is called finished.

## Commands

| Purpose | Command |
|---|---|
| Full dev environment | `tilt up` (stop: `tilt down`) |
| Serve both apps without Tilt | `pnpm start` |
| Serve frontend only | `nx run pokemon-ui:serve` |
| Serve backend only | `nx run pokemon-user-backend:serve` |
| Rebuild backend image under Tilt | trigger `backend: build if changed` in Tilt UI (manual!) or `nx build pokemon-user-backend` |
| Unit tests | `nx test pokemon-ui` / `nx test pokemon-user-backend` |
| Lint | `nx run-many -t lint` |
| Quality gate (typecheck + lint + unit tests; also runs on pre-commit) | `pnpm verify` |
| Create blank migration | `node ../../node_modules/@mikro-orm/cli/cli.js migration:create` (run in `packages/pokemon-user-backend/`; not `pnpm mikro-orm ...` — pnpm's exec resolution needs a package.json in that dir, and packages/* deliberately has none; not the `.bin` shim either — cmd.exe on Windows won't execute it) |
| Run migrations | `node ../../node_modules/@mikro-orm/cli/cli.js migration:up` (same dir/caveat; Tilt also auto-runs on migration changes) |
| Seed data | no separate command — seeding is a data migration, runs with `migration:up` |
| Export session transcript | `/export` in Claude Code → save to `docs/transcripts/<nn>-<phase>.md`, index in `LLM_TRANSCRIPT.md` |

## Scope discipline

Build **only** the application requirements. No auth, pagination, or extra
features unless explicitly asked for while building.

## Architecture decisions (made by me, follow these)

**Database**
- `pokemon`: `id` uuid PK, `pokedex_number` int unique, `name` string
- `profile`: `id` uuid PK, `name` string (deliberately **not** unique; UI keys off id)
- `profile_pokemon`: implicit `@ManyToMany` pivot — **no entity class**. Composite
  PK `(profile_id, pokemon_id)`, FKs with on-delete cascade. Modeled as
  unidirectional owning-side `@ManyToMany` on `Profile` with explicit
  `pivotTable: 'profile_pokemon'`; no inverse side on `Pokemon`.

**Behavior**
- First 150 pokemon stored locally in Postgres; frontend gets data only via backend
- A profile holds 0–6 unique pokemon; team ordering is not persisted
- Team submit **replaces** the whole team (`collection.set(...)` + flush, in a transaction)
- Frontend caps selection at 6; backend independently validates

**API** (bare arrays/objects, no response envelope)
- `GET /api/pokemon` — all 150 from the DB
- `GET /api/profiles` — each profile includes its team as pokemon ids (no detail endpoint)
- `POST /api/profiles` — body `{ name }`; name is stored **verbatim, never
  trimmed** — only checked for missing/non-string/empty-or-whitespace (400).
  201 + the created `ProfileDto` (`pokemon: []`)
- `PUT /api/profiles/:profileId/pokemon` — full-replace via
  `profile.pokemon.set(...)` on a deliberately un-populated collection (an
  uninitialized `Collection`'s `set()` wipes+reinserts the pivot rows at flush
  instead of diffing a loaded snapshot — matches full-replace and skips a join
  query), inside `em.transactional(...)`. 200 + the updated `ProfileDto`
- Validation is **manual** in `ProfilesService` (no `class-transformer` /
  ValidationPipe), ladder order for the PUT body: not-an-array → non-uuid/
  non-string element → >6 ids → duplicate ids (case-insensitive — ids are
  lower-cased first since Postgres `uuid` compares that way) → profile not
  found (404; a malformed `profileId` is rejected the same way, before the
  transaction opens, no query) → unknown pokemon id (400). Generic 400s name
  the rule violated (`"pokemon must not contain duplicate ids"`); the
  unknown-id 400 additionally names the offending id(s), since that's
  DB-derived information the caller can't otherwise get
- `GET /api/hello` stays as smoke/health endpoint

**Seeding**
- Two hand-written migrations: schema (create 3 tables + `drop table if exists
  "some_entity"`), then data (150 static rows, ids fixed at authoring time)

**Config & tooling**
- `mikro-orm.config.ts` is the single source of truth; `DbModule` imports it
  (fallback if dual-loading fights: shared `entities.ts` barrel)
- Vite dev proxy `/api` → `http://localhost:3000`; frontend calls relative paths;
  **no CORS**
- Keep `Migration20260506031559.ts` (may be recorded in `mikro_orm_migrations`);
  delete `some.entity.ts` and `nx-welcome.tsx`; rewrite `app.spec.tsx`; replace
  the broken backend e2e spec
- Preserve Nx package structure and Tilt/k8s topology; no shared Nx library

**Implementation order**
1. Plumbing: unify MikroORM config + Vite proxy (verify `/api/hello` via :4200)
2. Entities: `Pokemon`, `Profile`
3. Migrations: schema, then seed (verify from wiped volume via `tilt up`)
4. Read path: `GET /api/pokemon`, `GET /api/profiles`
5. Write path: `POST /api/profiles`, `PUT .../pokemon` + service unit tests
6. Frontend: list → profile create/select → selection → submit
7. Test cleanup: `app.spec.tsx`, backend e2e spec
8. Wrap-up: minimal GitHub Actions (lint + test + build), transcript upkeep

## Git rules

- Conventional commits
- One feature per commit
- Stage explicitly — never `git add .`
- Never push; I push manually
- Every session is exported to `docs/transcripts/` and indexed in
  `LLM_TRANSCRIPT.md` before its closing commit

## Review

Before any commit, run the code-reviewer subagent
(`.claude/agents/code-reviewer.md`) and address critical findings.
