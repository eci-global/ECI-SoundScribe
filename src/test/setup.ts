
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL constructor properly
const OriginalURL = global.URL;

// Create a proper mock constructor function
function MockedURL(url: string, base?: string) {
  return new OriginalURL(url, base || 'http://localhost');
}

// Add static methods and properties
MockedURL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
MockedURL.revokeObjectURL = vi.fn();
MockedURL.prototype = OriginalURL.prototype;
MockedURL.canParse = OriginalURL.canParse;
MockedURL.parse = OriginalURL.parse;

global.URL = MockedURL as any;
