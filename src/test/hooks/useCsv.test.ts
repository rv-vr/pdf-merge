import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCsv } from '@/hooks/useCsv';
import Papa from 'papaparse';

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn() as any,
  },
}));

describe('useCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useCsv());
    expect(result.current.csvHeaders).toEqual([]);
    expect(result.current.csvRows).toEqual([]);
    expect(result.current.csvFileName).toBe('');
    expect(result.current.filenameColumn).toBe('');
  });

  it('parses CSV and sets state on successful parse', () => {
    const mockData = [
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ];

    (Papa.parse as any).mockImplementation((_file: any, config: any) => {
      config.complete({ data: mockData });
    });

    const { result } = renderHook(() => useCsv());
    const file = new File(['name,age\nAlice,30\nBob,25'], 'data.csv', { type: 'text/csv' });
    const changeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCsvUpload(changeEvent);
    });

    expect(result.current.csvHeaders).toEqual(['name', 'age']);
    expect(result.current.csvRows).toEqual(mockData);
    expect(result.current.csvFileName).toBe('data.csv');
    expect(result.current.filenameColumn).toBe('name');
  });

  it('does nothing with empty data', () => {
    (Papa.parse as any).mockImplementation((_file: any, config: any) => {
      config.complete({ data: [] });
    });

    const { result } = renderHook(() => useCsv());
    const file = new File([''], 'empty.csv', { type: 'text/csv' });
    const changeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCsvUpload(changeEvent);
    });

    expect(result.current.csvHeaders).toEqual([]);
    expect(result.current.csvRows).toEqual([]);
    expect(result.current.csvFileName).toBe('');
  });

  it('handles no file selected', () => {
    const { result } = renderHook(() => useCsv());
    const changeEvent = {
      target: { files: [] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCsvUpload(changeEvent);
    });

    expect(result.current.csvHeaders).toEqual([]);
  });

  it('setFilenameColumn updates the column', () => {
    const { result } = renderHook(() => useCsv());
    act(() => result.current.setFilenameColumn('id'));
    expect(result.current.filenameColumn).toBe('id');
  });
});
