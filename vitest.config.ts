import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['src/**/*.test.ts','shared/**/*.test.ts','server/**/*.test.ts','scripts/**/*.test.ts','deployment/**/*.test.ts'],environment:'node',testTimeout:20_000,hookTimeout:20_000}});
