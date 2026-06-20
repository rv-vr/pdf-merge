import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportDialog } from '@/components/app/ExportDialog';

describe('ExportDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    csvHeaders: ['name', 'email'],
    csvRows: [{ name: 'Alice', email: 'a@b.com' }],
    pdfFile: new File([''], 'template.pdf'),
    filenameColumn: 'name',
    onFilenameColumnChange: vi.fn(),
    isProcessing: false,
    processingProgress: { current: 0, total: 0 },
    processingMessage: '',
    onDownloadCombined: vi.fn(),
    onDownloadZip: vi.fn(),
  };

  it('renders config view by default', () => {
    render(<ExportDialog {...baseProps} />);
    expect(screen.getByText('Export merged PDFs')).toBeInTheDocument();
  });

  it('shows document count', () => {
    render(<ExportDialog {...baseProps} />);
    expect(screen.getByText(/1 documents/)).toBeInTheDocument();
  });

  it('renders processing state', () => {
    render(<ExportDialog {...baseProps}
      isProcessing={true}
      processingProgress={{ current: 2, total: 5 }}
      processingMessage="Rendering…"
    />);
    expect(screen.getByText('2 of 5 merged')).toBeInTheDocument();
  });

  it('renders done state', () => {
    render(<ExportDialog {...baseProps}
      isProcessing={false}
      processingProgress={{ current: 3, total: 3 }}
    />);
    expect(screen.getByText('Export complete')).toBeInTheDocument();
  });

  it('renders format option buttons', () => {
    render(<ExportDialog {...baseProps} />);
    expect(screen.getByText('Single combined PDF')).toBeInTheDocument();
    expect(screen.getByText('ZIP of separate PDFs')).toBeInTheDocument();
  });

  it('shows filename column selector for ZIP mode', () => {
    render(<ExportDialog {...baseProps} />);
    expect(screen.getByText('Filename column')).toBeInTheDocument();
  });
});
