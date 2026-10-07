// Suite e2e Playwright. Séparée de `npm test` (test/*.test.mjs, node --test) à dessein :
// voir CLAUDE.md — Playwright pilote le harnais de dev (index.html), qui monte le même bundle
// que le web part SPFx ; il doit avoir été construit au préalable (npm run build).
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT || 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `node scripts/serve-e2e.js`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(PORT) }
  }
});
