import React from 'react';
import { Eye, EyeOff, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlacedField } from '@/types';

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface CanvasToolbarProps {
  isPreviewMode: boolean;
  csvRows: Record<string, string>[];
  previewRowIndex: number;
  totalPages: number;
  currentPage: number;
  zoom: number;
  placedFields: PlacedField[];
  onTogglePreview: () => void;
  onPreviewRowChange: (index: number) => void;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onClearAllFields: () => void;
}

export function CanvasToolbar({
  isPreviewMode,
  csvRows,
  previewRowIndex,
  totalPages,
  currentPage,
  zoom,
  placedFields,
  onTogglePreview,
  onPreviewRowChange,
  onPageChange,
  onZoomChange,
  onClearAllFields,
}: CanvasToolbarProps) {
  const currentZoomIdx = ZOOM_STEPS.indexOf(zoom);
  const canZoomOut = currentZoomIdx > 0;
  const canZoomIn = currentZoomIdx < ZOOM_STEPS.length - 1;

  return (
    <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <Button
        variant={isPreviewMode ? 'default' : 'outline'}
        size="sm"
        onClick={onTogglePreview}
        className="gap-1.5"
      >
        {isPreviewMode ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        Preview: {isPreviewMode ? 'ON' : 'OFF'}
      </Button>

      {isPreviewMode && csvRows.length > 0 && (
        <div className="flex animate-in fade-in items-center gap-1.5">
          <Separator orientation="vertical" className="h-5" />
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Row</span>
          <Button
            variant="outline"
            size="icon"
            className="size-7 shrink-0"
            disabled={previewRowIndex === 0}
            onClick={() => onPreviewRowChange(Math.max(0, previewRowIndex - 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Select
            value={String(previewRowIndex)}
            onValueChange={(val) => onPreviewRowChange(Number(val))}
          >
            <SelectTrigger className="h-7 w-44 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {csvRows.map((row, i) => {
                const firstVal = String(Object.values(row)[0] ?? '');
                const label = firstVal.length > 22 ? firstVal.slice(0, 22) + '…' : firstVal;
                return (
                  <SelectItem key={i} value={String(i)} className="text-xs">
                    {i + 1} · {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="size-7 shrink-0"
            disabled={previewRowIndex === csvRows.length - 1}
            onClick={() => onPreviewRowChange(Math.min(csvRows.length - 1, previewRowIndex + 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
          <span className="w-12 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
            {previewRowIndex + 1} / {csvRows.length}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {totalPages > 1 && (
        <>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs font-semibold tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-5" />
        </>
      )}

      <Badge variant="outline" className="gap-1 text-xs">
        {placedFields.length} field{placedFields.length !== 1 ? 's' : ''}
      </Badge>

      {placedFields.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAllFields}
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      )}

      <Separator orientation="vertical" className="h-5" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => canZoomOut && onZoomChange(ZOOM_STEPS[currentZoomIdx - 1])}
          disabled={!canZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <span className="w-11 text-center text-xs font-semibold tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => canZoomIn && onZoomChange(ZOOM_STEPS[currentZoomIdx + 1])}
          disabled={!canZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
