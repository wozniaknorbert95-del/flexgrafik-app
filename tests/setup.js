// Jest setup file
// Note: Jest provides `jest` as a global in this context.

// Mock fetch for Ollama integration tests
global.fetch = jest.fn();

// Mock console methods to reduce noise during tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
