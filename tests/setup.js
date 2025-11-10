// Jest setup file for Page Monitor to n8n extension tests

// Add TextEncoder/TextDecoder polyfills for JSDOM
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock chrome extension APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  }
};

// Mock console methods if needed
global.console = {
  ...console,
  log: jest.fn(console.log),
  warn: jest.fn(console.warn),
  error: jest.fn(console.error)
};
