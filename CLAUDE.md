# CLAUDE.md — Pokémon Team Builder (Chorus interview)

## Status

> Rule: update this section in every phase's closing commit.

**Exists right now (starter scaffolding only — no feature code yet):**
- Nx 22 + pnpm monorepo; four packages: `pokemon-ui` (React 19 + Vite + Emotion),
  `pokemon-ui-e2e` (Playwright), `pokemon-user-backend` (NestJS 11 + MikroORM 7),
  `pokemon-user-backend-e2e` (Jest + axios)
- Tilt dev environment: k8s Postgres 16 (`admin/admin`, db `pokemon`), backend in
  k8s via Docker, frontend as local Vite dev server, migrations auto-run by Tilt
- Placeholder code: `SomeEntity` + its migration, `GET /api/hello`, NxWelcome UI
- `LLM_TRANSCRIPT.md` at repo root

**Does NOT exist yet (do not reference or edit as if it did):**
- `Pokemon` / `Profile` entities, any real migration, seed data
- Any real API endpoint (`/api/pokemon`, `/api/profiles`, …)
- Any real UI (app.tsx still renders NxWelcome)
- Vite `/api` proxy; unified MikroORM config (still duplicated CLI vs runtime)
- GitHub Actions workflows, `docs/transcripts/`, `.claude/agents/code-reviewer.md`

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
- **Definition of done**: lint and tests pass (`nx run-many -t lint test`) before
  any task is called finished.

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
| Create blank migration | `pnpm mikro-orm migration:create` (run in `packages/pokemon-user-backend/`) |
| Run migrations | `pnpm mikro-orm migration:up` (same dir; Tilt also auto-runs on migration changes) |
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
- `POST /api/profiles` — body `{ name }`
- `PUT /api/profiles/:profileId/pokemon` — full-replace, body: array of ≤6 pokemon ids
- Validation is **manual** in controller/service (no `class-transformer` /
  ValidationPipe): 404 unknown profile; 400 for >6 ids, duplicate ids, or unknown ids
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
