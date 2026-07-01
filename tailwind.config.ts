import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './tactical-analysis.html', './quiz.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
