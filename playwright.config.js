const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5191', viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5191', reuseExistingServer: false },
});
