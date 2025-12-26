/* eslint-disable no-undef */
/// <reference types="cypress" />

describe('EmailList fetch call debug', () => {
  beforeEach(() => {
    // Set all required localStorage keys to bypass Google login
    
    const token = 'paste here';

    const user = {
      name: 'Test User',
      email: 'testuser@example.com',
      picture: '',
      sub: 'test-user-id'
    };
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('gMaelstrom_authedUser', JSON.stringify({ accessToken: token, user }));
      }
    });
  });

  it('captures fetchEmails and cy.task logs on load', () => {
    // Spy on fetch requests to Gmail API
    cy.intercept('GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages*').as('gmailMessages');
    cy.intercept('POST', 'https://gmail.googleapis.com/batch').as('gmailBatch');

    // Wait for grid to render
    cy.get('.MuiDataGrid-root').should('exist');

    // Wait for all fetches to complete (arbitrary wait for demo, can be improved)
    cy.wait(['@gmailMessages', '@gmailBatch'], { timeout: 10000 });
    cy.wait(1000); // Let all requests fire

    // Count the number of fetches
    cy.get('@gmailMessages.all').then(messagesCalls => {
      cy.task('log', `GMAIL_MESSAGES_CALLS: ${messagesCalls.length}`);
    });
    cy.get('@gmailBatch.all').then(batchCalls => {
      cy.task('log', `GMAIL_BATCH_CALLS: ${batchCalls.length}`);
    });

    // Capture window.__EMAILGRID_DEBUG__ and robust logs
    cy.wait(1000); // Ensure logs are set before reading
    cy.window().then(win => {
      cy.task('log', `EMAILGRID_DEBUG: ${JSON.stringify(win.__EMAILGRID_DEBUG__)}`);
      cy.task('log', `[EmailList] PAGINATION_DEBUG: ${JSON.stringify(win.__EMAILGRID_PAGINATION_DEBUG__)}`);
      cy.task('log', `[EmailList] PAGINATION_TRIGGER: ${JSON.stringify(win.__EMAILGRID_PAGINATION_TRIGGER__)}`);
      // Robust: print the last cypressLog message if present
      if (win.__EMAILGRID_LAST_LOG__) {
        cy.task('log', `[EmailList] LAST_LOG: ${win.__EMAILGRID_LAST_LOG__}`);
      }
    });
  });
});
