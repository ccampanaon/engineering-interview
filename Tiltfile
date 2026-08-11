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
    # Not `pnpm mikro-orm ...`: pnpm's exec resolution requires a package.json
    # in the invocation dir (the "importer manifest"), but packages/* has none
    # by design — all deps live in the root package.json. Invoking the CLI's
    # JS entrypoint via `node` sidesteps that, and (unlike the OS-specific
    # `.bin` shims) works unmodified under both cmd.exe and a POSIX shell —
    # cmd.exe won't run an extension-less shim or a forward-slash path
    # directly, but it resolves `node` fine and node itself accepts
    # forward-slash paths on Windows. cwd stays here so mikro-orm.config.ts
    # keeps auto-discovering via its default cwd lookup.
    cmd='node ../../node_modules/@mikro-orm/cli/cli.js migration:up',
    dir='packages/pokemon-user-backend',
    deps=[
        'packages/pokemon-user-backend/src/migrations',
        'packages/pokemon-user-backend/mikro-orm.config.ts',
    ],
    resource_deps=['pokemon-postgres'],
    labels=['database']
)

local_resource(
    'db: migration:create',
    cmd='node ../../node_modules/@mikro-orm/cli/cli.js migration:create',
    dir='packages/pokemon-user-backend',
    resource_deps=['pokemon-postgres'],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
    labels=['database']
)