import { defineConfig } from 'windicss/helpers';

export default defineConfig({
  extract: {
    include: ['src/**/*.{js,jsx,tsx,html}'],
    exclude: ['node_modules', '.git'],
  },
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // Example premium color
        secondary: '#10B981',
      },
    },
  },
});
