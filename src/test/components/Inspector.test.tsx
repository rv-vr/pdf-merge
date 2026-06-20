import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Inspector } from '@/components/app/Inspector';
import type { PlacedField } from '@/types';

const baseField: PlacedField = {
  id: 'f1',
  fieldName: 'name',
  x: 10,
  y: 20,
  page: 1,
  font: 'Helvetica',
  fontSize: 14,
  color: '#000000',
  isBold: false,
  isItalic: false,
  width: 30,
  align: 'left',
  visible: true,
};

const baseProps = {
  selectedField: undefined,
  selectedFields: [] as PlacedField[],
  primaryField: undefined,
  selectedFieldCount: 0,
  onUpdate: vi.fn(),
  onCommit: vi.fn(),
  onUpdateCommit: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
  onMoveSelectedToFront: vi.fn(),
  onMoveSelectedToBack: vi.fn(),
  onMoveFieldForward: vi.fn(),
  onMoveFieldBackward: vi.fn(),
  onAutoFitWidth: vi.fn(),
};

describe('Inspector', () => {
  it('renders empty state when no field selected', () => {
    render(<Inspector {...baseProps} />);
    expect(screen.getByText('No field selected')).toBeInTheDocument();
  });

  it('renders single-field inspector', () => {
    render(<Inspector {...baseProps}
      selectedField={baseField}
      primaryField={baseField}
      selectedFieldCount={1}
    />);
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Position & size')).toBeInTheDocument();
  });

  it('renders multi-select inspector', () => {
    const fields = [
      { ...baseField, id: 'f1' },
      { ...baseField, id: 'f2', fieldName: 'email' },
    ];
    render(<Inspector {...baseProps}
      selectedField={baseField}
      selectedFields={fields}
      primaryField={baseField}
      selectedFieldCount={2}
    />);
    expect(screen.getByText('2 fields selected')).toBeInTheDocument();
  });

  it('shows duplicate and delete buttons for single field', () => {
    render(<Inspector {...baseProps}
      selectedField={baseField}
      primaryField={baseField}
      selectedFieldCount={1}
    />);
    const deleteBtn = document.querySelector('.lucide-trash2');
    const copyBtn = document.querySelector('.lucide-copy');
    expect(deleteBtn).toBeTruthy();
    expect(copyBtn).toBeTruthy();
  });

  it('shows layer order section for single field', () => {
    render(<Inspector {...baseProps}
      selectedField={baseField}
      primaryField={baseField}
      selectedFieldCount={1}
    />);
    expect(screen.getByText('Layer order')).toBeInTheDocument();
  });
});
