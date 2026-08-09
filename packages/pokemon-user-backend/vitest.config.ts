import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Single source of truth for backend tests: when this file exists, vitest
// ignores the `test` block in vite.config.ts entirely.
export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,mts}'],
    reporters: ['default'],
    // TODO: when the first backend spec lands, remove passWithNoTests and add
    // coverage.include: ['src/**/*.ts'] so untested files count against the
    // thresholds (Vitest 4 measures only files loaded by tests by default)
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      reportsDirectory: '../../coverage/packages/pokemon-user-backend',
      // Bootstrap, wiring, and migrations are exercised by e2e/Tilt, not unit tests
      exclude: ['src/main.ts', 'src/migrations/**', '**/*.module.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
