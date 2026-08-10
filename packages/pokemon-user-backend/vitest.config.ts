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
    coverage: {
      provider: 'v8',
      enabled: true,
      reportsDirectory: '../../coverage/packages/pokemon-user-backend',
      // Bootstrap, wiring, and migrations are exercised by e2e/Tilt, not unit tests
      exclude: ['src/main.ts', 'src/migrations/**', '**/*.module.ts'],
      // No `include` here on purpose: Vitest 4 measures coverage only over
      // files actually loaded by the test run, so thresholds apply just to
      // what's under test (currently ProfilesService) rather than the whole
      // src tree. Deciding whether untested files (e.g. PokemonService,
      // controllers) should count against these thresholds repo-wide is a
      // step-8 CI decision, not this phase's.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
