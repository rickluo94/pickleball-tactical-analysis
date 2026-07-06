import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        tacticalAnalysis: resolve(__dirname, 'tactical-analysis.html'),
        quiz: resolve(__dirname, 'quiz.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        resultBerserker: resolve(__dirname, 'result-berserker.html'),
        resultPaladin: resolve(__dirname, 'result-paladin.html'),
        resultMage: resolve(__dirname, 'result-mage.html'),
        resultAssassin: resolve(__dirname, 'result-assassin.html'),
        resultDruid: resolve(__dirname, 'result-druid.html'),
      },
    },
  },
});
