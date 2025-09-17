import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@components': path.resolve(rootDir, 'src/components'),
      '@layouts': path.resolve(rootDir, 'src/layouts'),
      '@modules': path.resolve(rootDir, 'src/modules'),
      '@stores': path.resolve(rootDir, 'src/stores'),
      '@workers': path.resolve(rootDir, 'src/workers'),
      '@hooks': path.resolve(rootDir, 'src/hooks'),
      '@styles': path.resolve(rootDir, 'src/styles'),
      '@utils': path.resolve(rootDir, 'src/modules/utils')
    }
  }
});
