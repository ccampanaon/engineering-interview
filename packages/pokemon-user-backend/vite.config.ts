import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  build: {
    ssr: true,
    outDir: './dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rolldownOptions: {
      input: 'src/main.ts',
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
      external: [
        /^@nestjs\//,
        /^@mikro-orm\//,
        'reflect-metadata',
        'rxjs',
        /^rxjs\//,
        'pg',
        'pg-native',
        /^class-validator/,
        /^class-transformer/,
        'express',
        /^node:.*/,
        'tslib',
      ],
    },
  },
  ssr: {
    noExternal: true,
  },
});
