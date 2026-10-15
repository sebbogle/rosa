import { defineConfig } from '@playwright/test';

const ROSA = 'http://localhost:4300';

export default defineConfig({
  testDir: './flows',
  outputDir: './test-output',
  webServer: {
    command: 'npx ng serve --port 4300',
    cwd: '..',
    env: { NG_APP_GOOGLE_CLIENT_ID: 'rosa-e2e.apps.googleusercontent.com' },
    url: ROSA,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: ROSA,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'wide',
      grepInvert: /@narrow/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'narrow',
      grepInvert: /@wide/,
      use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
});
