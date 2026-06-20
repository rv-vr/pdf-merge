import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: () => null,
}));

// ResizeObserver polyfill for shadcn components (Select, Slider, etc.)
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
