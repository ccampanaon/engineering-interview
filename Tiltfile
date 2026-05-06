# Pokemon Interview — Tilt dev environment
#
# Prerequisites:
#   - Docker Desktop with Kubernetes enabled (or any local k8s cluster)
#   - tilt (https://docs.tilt.dev/install.html)
#
# Usage:
#   tilt up     — start everything
#   tilt down   — tear down all resources
#
# Services:
#   Postgres  → localhost:5432  (admin/admin, db: pokemon)  [k8s]
#   Backend   → localhost:3000/api                          [k8s + docker]
#   Frontend  → localhost:4200                              [local vite dev server]

watch_settings(ignore=['.nx/**', 'packages/**/vite.config.ts.timestamp-*.mjs'])

include('./tilt/postgres/Tiltfile')
include('./packages/pokemon-user-backend/Tiltfile')
include('./packages/pokemon-ui/Tiltfile')

local_resource(
    'db: migration:up',
    cmd=[
        'bash', '-c',
        'cd packages/pokemon-user-backend && pnpm mikro-orm migration:up'
    ],
    resource_deps=['pokemon-postgres'],
    labels=['database']
)

local_resource(
    'db: migration:create',
    cmd=[
        'bash', '-c',
        'cd packages/pokemon-user-backend && pnpm mikro-orm migration:create'
    ],
    resource_deps=['pokemon-postgres'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['database']
)
