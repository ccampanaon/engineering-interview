# CLAUDE.md — Pokémon Team Builder (Chorus interview)

## Status

> Rule: update this section in every phase's closing commit.

**Exists right now (through phase 5, write path):**
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
  tree; making untested files (e.g. `PokemonService`, controllers) count against
  the thresholds repo-wide is a phase 8 CI decision, not this phase's;
  pre-commit hook `.githooks/pre-commit` runs `pnpm verify`, activated per-clone
  by the root `prepare` script (`git config core.hooksPath .githooks`); no e2e
  and no AI review in the hook
- Placeholder code: `GET /api/hello`, NxWelcome UI
- `LLM_TRANSCRIPT.md` + `docs/transcripts/` (01–03), `.claude/agents/code-reviewer.md`

**Does NOT exist yet (do not reference or edit as if it did):**
- Any real UI (app.tsx still renders NxWelcome)
- Test cleanup (phase 7: `app.spec.tsx` rewrite, backend e2e spec replacement)
- GitHub Actions workflows (phase 8; will reuse `pnpm verify`)

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
