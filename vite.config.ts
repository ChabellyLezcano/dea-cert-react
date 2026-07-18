/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) {
              return 'vendor-react';
            }
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/quiz/data/*/exams/**',
        'src/study/data/**',
        'src/types/**',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
    },
  },
});
