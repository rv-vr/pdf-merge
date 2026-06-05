import React from 'react';
import type { RefObject } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import {
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Move,
  FileText,
  FileUp,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PlacedField } from '@/types';
import { cn } from '@/lib/utils';

function getFieldStyle(field: PlacedField, zoom: number): React.CSSProperties {
  return {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: '1.2em',
    lineHeight: '1.2em',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '0.4em',
    paddingRight: '0.4em',
    gap: '0.3em',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    color: field.color,
    fontFamily:
      field.font === 'Helvetica'
        ? 'sans-serif'
        : field.font === 'Courier'
        ? 'monospace'
        : 'serif',
    fontSize: `${Math.max(8, field.fontSize * 0.9 * zoom)}px`,
    fontWeight: field.isBold ? 'bold' : 'normal',
    fontStyle: field.isItalic ? 'italic' : 'normal',
  };
}

interface EditorCanvasProps {
  pdfBytes: ArrayBuffer | null;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  pdfDimensions: { width: number; height: number };
  placedFields: PlacedField[];
  selectedFieldId: string | null;
  isPreviewMode: boolean;
  previewRowIndex: number;
  csvRows: Record<string, string>[];
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onTogglePreview: () => void;
  onPreviewRowChange: (index: number) => void;
  onSelectField: (id: string | null) => void;
  onClearAllFields: () => void;
  onFieldMouseDown: (e: React.MouseEvent, field: PlacedField) => void;
  onFieldTouchStart: (e: React.TouchEvent, field: PlacedField) => void;
  onResizeMouseDown: (e: React.MouseEvent, field: PlacedField) => void;
  onResizeTouchStart: (e: React.TouchEvent, field: PlacedField) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function EditorCanvas({
  pdfBytes,
  // pdfDoc: _pdfDoc,
  totalPages,
  currentPage,
  pdfDimensions,
  placedFields,
  selectedFieldId,
  isPreviewMode,
  previewRowIndex,
  csvRows,
  zoom,
  onPageChange,
  onZoomChange,
  onTogglePreview,
  onPreviewRowChange,
  onSelectField,
  onClearAllFields,
  onFieldMouseDown,
  onFieldTouchStart,
  onResizeMouseDown,
  onResizeTouchStart,
  canvasRef,
  containerRef,
}: EditorCanvasProps) {
  const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const currentZoomIdx = ZOOM_STEPS.indexOf(zoom);
  const canZoomOut = currentZoomIdx > 0;
  const canZoomIn = currentZoomIdx < ZOOM_STEPS.length - 1;

  const handleZoomOut = () => {
    if (canZoomOut) onZoomChange(ZOOM_STEPS[currentZoomIdx - 1]);
  };
  const handleZoomIn = () => {
    if (canZoomIn) onZoomChange(ZOOM_STEPS[currentZoomIdx + 1]);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Canvas Header */}
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        {/* Preview toggle */}
        <Button
          variant={isPreviewMode ? 'default' : 'outline'}
          size="sm"
          onClick={onTogglePreview}
          className="gap-1.5"
        >
          {isPreviewMode ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          Preview: {isPreviewMode ? 'ON' : 'OFF'}
        </Button>

        {/* Row selector (preview mode) */}
        {isPreviewMode && csvRows.length > 0 && (
          <div className="flex animate-in fade-in items-center gap-1.5">
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs font-medium text-muted-foreground">Row</span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={previewRowIndex === 0}
              onClick={() => onPreviewRowChange(Math.max(0, previewRowIndex - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="min-w-18 text-center text-xs font-semibold tabular-nums">
              {previewRowIndex + 1} / {csvRows.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={previewRowIndex === csvRows.length - 1}
              onClick={() => onPreviewRowChange(Math.min(csvRows.length - 1, previewRowIndex + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="flex-1" />

        {/* Page navigation */}
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

        {/* Field count + clear */}
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

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleZoomOut}
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
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas Workspace */}
      <div
        className="flex flex-1 items-start justify-center overflow-auto bg-muted/30 p-8"
        onMouseDown={() => !isPreviewMode && onSelectField(null)}
      >
        {pdfBytes ? (
          <div
            ref={containerRef}
            className="relative inline-block select-none rounded-sm border border-border bg-white shadow-2xl dark:bg-slate-900"
            style={{
              width: pdfDimensions.width ? `${pdfDimensions.width / 1.5}px` : 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Rendered PDF canvas */}
            <canvas ref={canvasRef} className="block h-auto w-full" />

            {/* Grid overlay in edit mode */}
            {!isPreviewMode && (
              <div
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'linear-gradient(hsl(var(--ring)/0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--ring)/0.06) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
            )}

            {/* Drag Overlay Layer */}
            <div className="absolute inset-0 z-10 cursor-crosshair overflow-hidden">
              {placedFields
                .filter((field) => field.page === currentPage)
                .map((field) => {
                  const isSelected = field.id === selectedFieldId;
                  const displayVal =
                    isPreviewMode && csvRows[previewRowIndex]
                      ? csvRows[previewRowIndex][field.fieldName] || ''
                      : `{{${field.fieldName}}}`;

                  return (
                    <div
                      key={field.id}
                      style={getFieldStyle(field, zoom)}
                      onMouseDown={(e) => onFieldMouseDown(e, field)}
                      onTouchStart={(e) => onFieldTouchStart(e, field)}
                      className={cn(
                        'absolute z-20 flex rounded border bg-white/15 shadow-md transition-all select-none dark:bg-slate-900/15 active:cursor-grabbing',
                        isPreviewMode
                          ? 'cursor-default pointer-events-none'
                          : 'cursor-grab',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-slate-200 hover:border-primary/50 hover:shadow-lg dark:border-slate-700'
                      )}
                    >
                      {!isPreviewMode && (
                        <Move
                          className="shrink-0 opacity-40"
                          style={{ width: '0.9em', height: '0.9em' }}
                        />
                      )}
                      <span className="flex-1 truncate leading-none select-none">
                        {displayVal || (
                          <span className="text-xs italic text-slate-400">empty</span>
                        )}
                      </span>

                      {/* Resize grip */}
                      {isSelected && !isPreviewMode && (
                        <div
                          onMouseDown={(e) => onResizeMouseDown(e, field)}
                          onTouchStart={(e) => onResizeTouchStart(e, field)}
                          className="absolute bottom-0 right-0 top-0 flex w-2.5 cursor-ew-resize items-center justify-center rounded-r border-l border-slate-200 bg-slate-50/50 text-[7px] font-bold text-slate-400 select-none hover:bg-primary/20 active:bg-primary/40 dark:border-slate-800 dark:bg-slate-800/50"
                          title="Drag to resize field width"
                        >
                          ⋮
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex h-full w-full max-w-lg flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold">No PDF Template Loaded</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Upload your PDF document template and a CSV dataset to get started placing fields.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById('pdf-upload')?.click()}
              className="gap-2"
            >
              <FileUp className="size-4" />
              Upload PDF Template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
