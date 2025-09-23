/// <reference types="cypress" />

// Custom commands for SoundScribe E2E testing

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth')
  cy.get('[data-testid="email-input"]').type(email)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-button"]').click()
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard')
  cy.get('[data-testid="user-profile"]').should('be.visible')
})

Cypress.Commands.add('uploadTestFile', (fileName: string) => {
  // Create a test audio file blob
  cy.fixture(fileName, 'base64').then(fileContent => {
    const blob = Cypress.Blob.base64StringToBlob(fileContent, 'audio/mpeg')
    const file = new File([blob], fileName, { type: 'audio/mpeg' })
    
    // Trigger file upload
    cy.get('[data-testid="file-upload-input"]').then(input => {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      input[0].files = dataTransfer.files
      
      // Trigger change event
      cy.wrap(input).trigger('change', { force: true })
    })
  })
})

Cypress.Commands.add('waitForProcessing', () => {
  // Wait for upload to complete
  cy.get('[data-testid="upload-progress"]', { timeout: 30000 }).should('not.exist')
  
  // Wait for processing status
  cy.get('[data-testid="recording-status"]').should('contain', 'processing')
  
  // Wait for completion (this could take a while in real scenarios)
  cy.get('[data-testid="recording-status"]', { timeout: 120000 }).should('contain', 'completed')
})

// Override default commands for better error handling
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  return originalFn(url, {
    ...options,
    failOnStatusCode: false,
    onBeforeLoad: (win) => {
      // Mock console methods to reduce noise in tests
      win.console.warn = () => {}
      win.console.error = () => {}
    }
  })
})