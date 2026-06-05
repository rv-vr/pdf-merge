import type { PlacedField as BaseField } from '@/lib/pdfMerger';

export interface PlacedField extends BaseField {
  align?: 'left' | 'center' | 'right';
}

export type { BaseField };
