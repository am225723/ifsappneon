import { defineConfig } from 'vitest/config'

// Vitest configuration kept separate from vite.config.js so the unit tests run
// in a lightweight Node environment without the React/Vite build plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/lib/**/*.js', 'src/utils/**/*.js'],
    },
  },
})
