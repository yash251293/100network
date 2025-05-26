// Load environment variables from .env.test or .env for testing
require('dotenv').config({ path: '.env.test' });

// Import Jest DOM extensions like .toBeInTheDocument()
import '@testing-library/jest-dom';

// Or, if you prefer to fallback to .env if .env.test is not found:
// const path = require('path');
// require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });
// if (!process.env.JWT_SECRET) { // Example check, adjust as needed
//   require('dotenv').config();
// }

// Any other global setup can go here, e.g., global mocks
// jest.mock('some-module', () => ({
//   ...jest.requireActual('some-module'),
//   someFunction: jest.fn(),
// }));
