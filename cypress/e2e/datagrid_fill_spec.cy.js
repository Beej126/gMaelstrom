/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable no-undef */
/// <reference types="cypress" />

describe('DataGrid fills vertical space', () => {
  beforeEach(() => {
    // Set all required localStorage keys to bypass Google login
    // Replace with a real token and user profile for your test account
    const token = '';
    const user = {
      name: 'Test User',
      email: 'testuser@example.com',
      picture: '',
      sub: 'test-user-id'
    };
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('gMaelstrom_accessToken', token);
        win.localStorage.setItem('gMaelstrom_isAuthenticated', 'true');
        win.localStorage.setItem('gMaelstrom_user', JSON.stringify(user));
      }
    });
  });

  it('should fill the client vertical space, show the footer, and not show vertical scrollbars or overflow', () => {

    // Wait for grid to render
    cy.get('.MuiDataGrid-root').should('exist');

    // Wait for window.__EMAILGRID_DEBUG__ to be set, then log it
    cy.window().should((win) => {
      expect(win.__EMAILGRID_DEBUG__, 'EMAILGRID_DEBUG should be set').to.exist;
    });
    cy.window().then(win => {
      cy.task('log', `EMAILGRID_DEBUG: ${JSON.stringify(win.__EMAILGRID_DEBUG__)}`);
    });

    // Check grid height is close to its parent container (not the whole viewport)
    cy.get('.MuiDataGrid-root').parent().then($parent => {
      const parentRect = $parent[0].getBoundingClientRect();
      cy.get('.MuiDataGrid-root').then($grid => {
        const gridRect = $grid[0].getBoundingClientRect();
        // Should not overflow the parent container
        expect(gridRect.bottom).to.be.at.most(parentRect.bottom);
        // Should be close to full height of parent (allowing for header/footer)
        expect(gridRect.height).to.be.closeTo(parentRect.height, 2 * 70);
      });
    });

    // Assert no vertical scrollbar on grid
    cy.get('.MuiDataGrid-root').then($grid => {
      const el = $grid[0];
      expect(el.scrollHeight).to.be.lte(el.clientHeight);
    });

    // Assert no visible scrollbar (CSS computed style)
    cy.get('.MuiDataGrid-root').should($grid => {
      const style = getComputedStyle($grid[0]);
      expect(style.overflowY === 'hidden' || style.overflowY === 'clip' || style.overflowY === 'visible').to.be.true;
    });

    // Assert no partial row at the bottom
    cy.window().then(win => {
      const debug = win.__EMAILGRID_DEBUG__;
      if (debug && debug.virtualScrollerHeight && debug.rowHeight) {
        const rowsVisible = debug.virtualScrollerHeight / debug.rowHeight;
        expect(Number.isInteger(rowsVisible), 'No partial row at bottom').to.be.true;
      }
    });

    // Assert the DataGrid footer is visible
    cy.get('.MuiDataGrid-footerContainer').should('be.visible');

    // Assert the grid does not overflow its parent
    cy.get('.MuiDataGrid-root').parent().then($parent => {
      const parentRect = $parent[0].getBoundingClientRect();
      cy.get('.MuiDataGrid-root').then($grid => {
        const gridRect = $grid[0].getBoundingClientRect();
        expect(gridRect.bottom).to.be.at.most(parentRect.bottom);
      });
    });
  });
});
