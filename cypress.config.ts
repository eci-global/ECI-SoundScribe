import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key'
    }
  },
  component: {
    devServer: {
      framework: 'vite',
      bundler: 'vite',
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
})