// jest.setup.js
import '@testing-library/jest-dom'; // for extra DOM matchers if using @testing-library

// You can add global mocks or setup here if needed
// For example, if you need to mock environment variables for all tests:
// process.env.NEXT_PUBLIC_API_GATEWAY_URL = 'http://localhost:3000';

// This file is referenced in jest.config.js or package.json's jest section
// "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]

// If using Next.js specific features that need mocking with Jest, like next/router,
// you might add mocks here, for example:
// jest.mock('next/router', () => require('next-router-mock'));

// For the current setup, no specific global setups are immediately required by apiClient.test.js beyond what's in the test file itself.
// However, creating this file fulfills the configuration in package.json.
console.log('jest.setup.js loaded');
