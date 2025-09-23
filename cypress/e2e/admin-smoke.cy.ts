describe('Admin portal smoke', () => {
  const routes = [
    '/admin',
    '/admin/library',
    '/admin/org/users',
    '/admin/analytics',
  ];

  routes.forEach((path) => {
    it(`visits ${path} and sees admin chrome`, () => {
      cy.visit(path);
      // Top bar label exists for both authed and unauth states
      cy.contains('ADMINISTRATION');
      // Sidebar navigation renders
      cy.get('[role="navigation"][aria-label="Admin navigation"]');
    });
  });
});
