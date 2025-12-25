const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:3500',
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log('CYPRESS LOG:', message);
          return null;
        }
      });
    }
  },
});
