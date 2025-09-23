describe('Recording Upload Flow', () => {
  beforeEach(() => {
    // Setup test environment
    cy.visit('/')
    
    // Mock authentication for faster testing
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })
    
    cy.visit('/dashboard')
  })

  it('should allow user to upload an audio file', () => {
    // Click upload button
    cy.get('[data-testid="upload-fab"]').click()
    
    // Upload modal should appear
    cy.get('[data-testid="upload-modal"]').should('be.visible')
    
    // Fill in recording details
    cy.get('[data-testid="recording-title-input"]').type('Test Sales Call')
    cy.get('[data-testid="recording-description-input"]').type('Test call with prospect about new product')
    
    // Upload test file
    cy.uploadTestFile('test-audio.mp3')
    
    // Submit upload
    cy.get('[data-testid="upload-submit-button"]').click()
    
    // Modal should close
    cy.get('[data-testid="upload-modal"]').should('not.exist')
    
    // Recording should appear in list
    cy.get('[data-testid="recordings-list"]').should('contain', 'Test Sales Call')
    cy.get('[data-testid="recording-status"]').should('contain', 'uploading')
  })

  it('should process uploaded recording and show results', () => {
    // Assuming a recording already exists, wait for processing
    cy.get('[data-testid="recordings-list"]').should('be.visible')
    
    // Click on a processing recording
    cy.get('[data-testid="recording-item"]').first().click()
    
    // Wait for processing to complete
    cy.waitForProcessing()
    
    // Check that summary is generated
    cy.get('[data-testid="recording-summary"]').should('be.visible')
    cy.get('[data-testid="recording-summary"]').should('contain', 'Main Topics')
    
    // Check for coaching evaluation if it's a sales call
    cy.get('[data-testid="coaching-evaluation"]').should('be.visible')
    cy.get('[data-testid="overall-score"]').should('be.visible')
    cy.get('[data-testid="performance-criteria"]').should('be.visible')
  })

  it('should allow user to chat with recording', () => {
    // Click on a completed recording
    cy.get('[data-testid="recording-item"][data-status="completed"]').first().click()
    
    // Open chat interface
    cy.get('[data-testid="chat-button"]').click()
    cy.get('[data-testid="chat-interface"]').should('be.visible')
    
    // Send a test message
    cy.get('[data-testid="chat-input"]').type('What were the main objections raised?')
    cy.get('[data-testid="chat-send-button"]').click()
    
    // Wait for AI response
    cy.get('[data-testid="chat-messages"]').should('contain', 'objections', { timeout: 30000 })
  })

  it('should allow user to export recording to PDF', () => {
    // Click on a completed recording
    cy.get('[data-testid="recording-item"][data-status="completed"]').first().click()
    
    // Open actions menu
    cy.get('[data-testid="recording-actions-menu"]').click()
    
    // Click export PDF
    cy.get('[data-testid="export-pdf-button"]').click()
    
    // Should show success toast
    cy.get('[data-testid="toast"]').should('contain', 'Export Successful')
  })

  it('should show validation errors for invalid uploads', () => {
    // Click upload button
    cy.get('[data-testid="upload-fab"]').click()
    
    // Try to submit without title
    cy.get('[data-testid="upload-submit-button"]').click()
    
    // Should show validation error
    cy.get('[data-testid="title-error"]').should('contain', 'Title is required')
    
    // Try to submit without file
    cy.get('[data-testid="recording-title-input"]').type('Test Recording')
    cy.get('[data-testid="upload-submit-button"]').click()
    
    // Should show file error
    cy.get('[data-testid="file-error"]').should('contain', 'Please select a file')
  })

  it('should handle upload errors gracefully', () => {
    // Mock network error
    cy.intercept('POST', '**/recordings', { forceNetworkError: true }).as('uploadError')
    
    // Attempt upload
    cy.get('[data-testid="upload-fab"]').click()
    cy.get('[data-testid="recording-title-input"]').type('Test Recording')
    cy.uploadTestFile('test-audio.mp3')
    cy.get('[data-testid="upload-submit-button"]').click()
    
    // Should show error toast
    cy.get('[data-testid="toast"]').should('contain', 'Upload failed')
    cy.get('[data-testid="toast"]').should('have.class', 'destructive')
  })
})