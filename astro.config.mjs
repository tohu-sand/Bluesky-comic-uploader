// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  prefetch: true,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@modules': '/src/modules',
        '@stores': '/src/stores',
        '@workers': '/src/workers',
        '@hooks': '/src/hooks',
        '@styles': '/src/styles',
        '@utils': '/src/modules/utils'
      }
    }
  }
});
