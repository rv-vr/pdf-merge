import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from '@/hooks/useExport';

const mockPdfBytes = new Uint8Array([1, 2, 3]).buffer as ArrayBuffer;
const mockRows = [{ name: 'Alice' }];
const mockFields = [
  {
    id: 'f1',
    fieldName: 'name',
    x: 10,
    y: 20,
    page: 1,
    font: 'Helvetica' as const,
    fontSize: 14,
    color: '#000000',
    isBold: false,
    isItalic: false,
    width: 30,
    align: 'left' as const,
  },
];

describe('useExport', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useExport(null, null, [], [], '')
    );
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingProgress).toEqual({ current: 0, total: 0 });
    expect(result.current.processingMessage).toBe('');
    expect(result.current.exportDialogOpen).toBe(false);
  });

  it('openExportDialog opens the dialog', () => {
    const { result } = renderHook(() =>
      useExport(mockPdfBytes, null, mockRows, mockFields, 'name')
    );
    act(() => result.current.openExportDialog());
    expect(result.current.exportDialogOpen).toBe(true);
  });

  it('handleExportDialogChange(false) resets state', () => {
    const { result } = renderHook(() =>
      useExport(mockPdfBytes, null, mockRows, mockFields, 'name')
    );
    act(() => result.current.openExportDialog());
    expect(result.current.exportDialogOpen).toBe(true);

    act(() => result.current.handleExportDialogChange(false));
    expect(result.current.exportDialogOpen).toBe(false);
    expect(result.current.processingProgress).toEqual({ current: 0, total: 0 });
    expect(result.current.processingMessage).toBe('');
  });

  it('handleDownloadCombinedPDF is no-op when prerequisites missing', () => {
    const { result } = renderHook(() => useExport(null, null, [], [], ''));
    act(() => {
      result.current.handleDownloadCombinedPDF();
    });
    expect(result.current.isProcessing).toBe(false);
  });

  it('handleDownloadZIP is no-op when prerequisites missing', () => {
    const { result } = renderHook(() => useExport(null, null, [], [], ''));
    act(() => {
      result.current.handleDownloadZIP();
    });
    expect(result.current.isProcessing).toBe(false);
  });
});
