import { defineConfig } from '@playwright/test';

const port = Number(process.env.TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL, browserName: 'chromium' },
  webServer: { command: `npm run dev -- --port ${port}`, url: baseURL, reuseExistingServer: !process.env.CI },
});
