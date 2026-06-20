import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasToolbar } from '@/components/app/CanvasToolbar';

describe('CanvasToolbar', () => {
  const baseProps = {
    isPreviewMode: false,
    csvRows: [{ name: 'Alice' }, { name: 'Bob' }],
    previewRowIndex: 0,
    totalPages: 1,
    currentPage: 1,
    zoom: 1.0,
    placedFields: [],
    canUndo: false,
    canRedo: false,
    onTogglePreview: vi.fn(),
    onPreviewRowChange: vi.fn(),
    onPageChange: vi.fn(),
    onZoomChange: vi.fn(),
    onClearAllFields: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    snapToGuides: true,
    showRulers: true,
    onSnapToGuidesChange: vi.fn(),
    onShowRulersChange: vi.fn(),
  };

  it('renders preview toggle OFF', () => {
    render(<CanvasToolbar {...baseProps} />);
    expect(screen.getByText('Preview: OFF')).toBeInTheDocument();
  });

  it('renders preview toggle ON', () => {
    render(<CanvasToolbar {...baseProps} isPreviewMode={true} />);
    expect(screen.getByText('Preview: ON')).toBeInTheDocument();
  });

  it('shows row selector in preview mode', () => {
    render(<CanvasToolbar {...baseProps} isPreviewMode={true} />);
    expect(screen.getByText('Row')).toBeInTheDocument();
  });

  it('shows zoom percentage', () => {
    render(<CanvasToolbar {...baseProps} zoom={1.5} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('shows snap and ruler buttons when not previewing', () => {
    render(<CanvasToolbar {...baseProps} />);
    // Magnet and Ruler icons should be present
    expect(document.querySelector('.lucide-magnet')).toBeTruthy();
    expect(document.querySelector('.lucide-ruler')).toBeTruthy();
  });

  it('shows field count badge', () => {
    render(<CanvasToolbar {...baseProps} placedFields={[{ id: 'f1' } as any]} />);
    expect(screen.getByText('1 field')).toBeInTheDocument();
  });

  it('shows "fields" for multiple', () => {
    render(<CanvasToolbar {...baseProps} placedFields={[{ id: 'f1' }, { id: 'f2' }] as any} />);
    expect(screen.getByText('2 fields')).toBeInTheDocument();
  });

  it('shows page navigation when multiple pages', () => {
    render(<CanvasToolbar {...baseProps} totalPages={3} currentPage={2} />);
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('shows clear button when fields exist', () => {
    render(<CanvasToolbar {...baseProps} placedFields={[{ id: 'f1' } as any]} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});
