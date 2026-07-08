describe('Quarterly Review Platform UX and Flows', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173')
  })

  it('loads the landing page with premium aesthetic', () => {
    cy.get('body').should('be.visible')
    // We expect a title or a sign-in button
    cy.contains(/Staff Quarterly Review|Sign In/i).should('be.visible')
  })

  it('is responsive on mobile', () => {
    cy.viewport('iphone-x')
    cy.visit('http://localhost:5173')
    cy.get('body').should('be.visible')
    cy.contains(/Staff Quarterly Review|Sign In/i).should('be.visible')
  })
})
