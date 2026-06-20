import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('renders upload screen by default', () => {
    render(<App />);
    expect(screen.getByText('PDF Merge')).toBeInTheDocument();
    expect(screen.getByText(/Upload a template/i)).toBeInTheDocument();
  });
});
