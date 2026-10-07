const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4177', browserName: 'chromium', channel: 'chrome', serviceWorkers: 'block', headless: true },
  webServer: { command: 'node tests/frontend-server.cjs', url: 'http://127.0.0.1:4177', reuseExistingServer: true }
});