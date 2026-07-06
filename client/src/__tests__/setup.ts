/// <reference types="jest" />

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0
} as Storage;

global.localStorage = mockLocalStorage;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock Date.now
const mockDate = new Date(2024, 1, 11);
jest.spyOn(global.Date, 'now').mockImplementation(() => mockDate.getTime());