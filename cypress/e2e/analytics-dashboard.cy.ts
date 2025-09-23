describe('Analytics Dashboard', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })
    
    // Mock recordings data with coaching evaluations
    cy.intercept('GET', '**/recordings*', {
      fixture: 'recordings-with-coaching.json'
    }).as('getRecordings')
    
    cy.visit('/dashboard')
    cy.wait('@getRecordings')
  })

  it('should display analytics overview', () => {
    // Navigate to analytics view (assuming it's a tab or separate section)
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Check key metrics are displayed
    cy.get('[data-testid="total-calls-metric"]').should('be.visible')
    cy.get('[data-testid="average-score-metric"]').should('be.visible')
    cy.get('[data-testid="high-performers-metric"]').should('be.visible')
    cy.get('[data-testid="need-coaching-metric"]').should('be.visible')
  })

  it('should show performance trend chart', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Check trend chart is rendered
    cy.get('[data-testid="performance-trend-chart"]').should('be.visible')
    cy.get('[data-testid="performance-trend-chart"] .recharts-line').should('exist')
  })

  it('should display score distribution', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Check score distribution chart
    cy.get('[data-testid="score-distribution-chart"]').should('be.visible')
    cy.get('[data-testid="score-distribution-chart"] .recharts-bar').should('exist')
  })

  it('should show criteria performance breakdown', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Check individual criteria are displayed
    cy.get('[data-testid="criteria-performance"]').should('be.visible')
    cy.get('[data-testid="talk-time-ratio"]').should('be.visible')
    cy.get('[data-testid="objection-handling"]').should('be.visible')
    cy.get('[data-testid="value-articulation"]').should('be.visible')
    cy.get('[data-testid="active-listening"]').should('be.visible')
  })

  it('should display top improvement areas', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Check improvement areas list
    cy.get('[data-testid="improvement-areas"]').should('be.visible')
    cy.get('[data-testid="improvement-item"]').should('have.length.at.least', 1)
    
    // Check priority badges
    cy.get('[data-testid="improvement-priority"]').should('exist')
  })

  it('should allow time range filtering', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Change time range
    cy.get('[data-testid="time-range-selector"]').click()
    cy.get('[data-value="7d"]').click()
    
    // Charts should update (we can't easily test the data change, but can verify re-render)
    cy.get('[data-testid="performance-trend-chart"]').should('be.visible')
    
    // Try 90 days
    cy.get('[data-testid="time-range-selector"]').click()
    cy.get('[data-value="90d"]').click()
    
    cy.get('[data-testid="performance-trend-chart"]').should('be.visible')
  })

  it('should handle empty analytics data', () => {
    // Mock empty recordings response
    cy.intercept('GET', '**/recordings*', { body: [] }).as('getEmptyRecordings')
    
    cy.visit('/dashboard')
    cy.wait('@getEmptyRecordings')
    
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Should show empty state or zero metrics
    cy.get('[data-testid="total-calls-metric"]').should('contain', '0')
    cy.get('[data-testid="average-score-metric"]').should('contain', '0')
  })

  it('should refresh analytics data', () => {
    cy.get('[data-testid="analytics-tab"]').click()
    
    // Click refresh button
    cy.get('[data-testid="refresh-analytics"]').click()
    
    // Should show loading state briefly
    cy.get('[data-testid="refresh-analytics"] .animate-spin').should('exist')
    
    // Then return to normal state
    cy.get('[data-testid="refresh-analytics"] .animate-spin', { timeout: 5000 }).should('not.exist')
  })
})