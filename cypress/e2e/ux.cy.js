describe('Quarterly Review Platform UX and Flows', () => {
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    cy.visit(baseUrl);
  });

  it('loads the landing page with premium aesthetic', () => {
    cy.get('body').should('be.visible');
    cy.contains(/Staff Quarterly Review|Access Workspace|Register Account/i).should('be.visible');
  });

  it('can activate demo mode when auth is unavailable', () => {
    cy.contains(/Development Bypass|Platform Owner|Team Leader/i).should('be.visible');
  });

  it('is responsive on mobile', () => {
    cy.viewport('iphone-x');
    cy.visit(baseUrl);
    cy.get('body').should('be.visible');
    cy.contains(/Staff Quarterly Review|Access Workspace|Register Account/i).should('be.visible');
  });
});
