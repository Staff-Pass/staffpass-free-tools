import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
