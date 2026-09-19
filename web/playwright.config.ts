import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    colorScheme: 'dark',
  },
  webServer: {
    command: 'python3 -m http.server 4321 --directory dist',
    url: 'http://127.0.0.1:4321/es/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
