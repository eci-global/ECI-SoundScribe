// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login via Supabase
       * @example cy.login('user@example.com', 'password')
       */
      login(email: string, password: string): Chainable<Element>
      
      /**
       * Custom command to upload a test file
       * @example cy.uploadTestFile('test-audio.mp3')
       */
      uploadTestFile(fileName: string): Chainable<Element>
      
      /**
       * Custom command to wait for processing to complete
       * @example cy.waitForProcessing()
       */
      waitForProcessing(): Chainable<Element>
    }
  }
}