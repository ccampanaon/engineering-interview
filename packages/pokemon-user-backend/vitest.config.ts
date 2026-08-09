import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: __dirname,
    // TODO: remove when the first backend spec lands
    passWithNoTests: true,
  },
  plugins: [],
});
