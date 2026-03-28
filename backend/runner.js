const { runPlaywrightTest } = require('./runner-playwright');
const { runSeleniumTest } = require('./runner-selenium');
const { runCypressTest } = require('./runner-cypress');

/**
 * Orchestrates the test execution based on engine parameter.
 */
async function runGenericTest(testId, testData, io, onUpdate = () => { }) {
  const engine = (testData.engine || 'playwright').toLowerCase();

  switch (engine) {
    case 'selenium':
      return runSeleniumTest(testId, testData, io, onUpdate);
    case 'cypress':
      return runCypressTest(testId, testData, io, onUpdate);
    case 'playwright':
    default:
      return runPlaywrightTest(testId, testData, io, onUpdate);
  }
}

module.exports = { runGenericTest };
