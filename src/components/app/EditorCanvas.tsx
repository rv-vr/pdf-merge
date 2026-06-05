import React from 'react';
import type { RefObject } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';
import { Move, FileText, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlacedField } from '@/types';
import { cn } from '@/lib/utils';
import { CanvasToolbar } from '@/components/app/CanvasToolbar';

function getFieldStyle(
  field: PlacedField,
  zoom: number,
  isPreviewMode: boolean
): React.CSSProperties {
  const base: React.CSSProperties = {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
  };

  if (isPreviewMode) {
    return {
      ...base,
      color: field.color,
      fontFamily:
        field.font === 'Helvetica'
          ? 'sans-serif'
          : field.font === 'Courier'
          ? 'monospace'
          : 'serif',
      fontSize: `${Math.max(8, field.fontSize * zoom)}px`,
      fontWeight: field.isBold ? 'bold' : 'normal',
      fontStyle: field.isItalic ? 'italic' : 'normal',
    };
  }

  return {
    ...base,
    fontSize: `${Math.max(8, field.fontSize * 0.75 * zoom)}px`,
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
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CanvasToolbar
        isPreviewMode={isPreviewMode}
        csvRows={csvRows}
        previewRowIndex={previewRowIndex}
        totalPages={totalPages}
        currentPage={currentPage}
        zoom={zoom}
        placedFields={placedFields}
        onTogglePreview={onTogglePreview}
        onPreviewRowChange={onPreviewRowChange}
        onPageChange={onPageChange}
        onZoomChange={onZoomChange}
        onClearAllFields={onClearAllFields}
      />

      {/* Canvas Workspace */}
      <div
        role="none"
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

            {/* Field overlay layer */}
            <div className="absolute inset-0 z-10 overflow-hidden">
              {placedFields.flatMap((field) => {
                  if (field.page !== currentPage) return [];
                  const isSelected = field.id === selectedFieldId;
                  const displayVal =
                    isPreviewMode && csvRows[previewRowIndex]
                      ? csvRows[previewRowIndex][field.fieldName] || ''
                      : `{{${field.fieldName}}}`;

                  return [(
                    <div
                      key={field.id}
                      role="button"
                      tabIndex={isPreviewMode ? -1 : 0}
                      aria-disabled={isPreviewMode || undefined}
                      style={getFieldStyle(field, zoom, isPreviewMode)}
                      onMouseDown={(e) => onFieldMouseDown(e, field)}
                      onTouchStart={(e) => onFieldTouchStart(e, field)}
                      className={cn(
                        'absolute z-20 flex items-center overflow-hidden whitespace-nowrap select-none rounded transition-shadow',
                        isPreviewMode
                          ? 'pointer-events-none cursor-default bg-transparent'
                          : cn(
                              'cursor-grab active:cursor-grabbing',
                              'bg-zinc-900/85 text-white dark:bg-zinc-100 dark:text-zinc-900',
                              'pl-1 pr-3 shadow-sm',
                              isSelected
                                ? 'ring-2 ring-primary ring-offset-1 ring-offset-white/50 dark:ring-offset-zinc-900/50'
                                : 'hover:bg-zinc-950/90 dark:hover:bg-white/95'
                            )
                      )}
                    >
                      {!isPreviewMode && (
                        <Move
                          className="mr-0.5 shrink-0 opacity-50"
                          style={{ width: '0.85em', height: '0.85em' }}
                        />
                      )}
                      <span className="truncate leading-none">
                        {displayVal || (
                          <span className="italic opacity-40">empty</span>
                        )}
                      </span>

                      {/* Resize grip */}
                      {isSelected && !isPreviewMode && (
                        <button
                          type="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            onResizeMouseDown(e, field);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            onResizeTouchStart(e, field);
                          }}
                          className="absolute bottom-0 right-0 top-0 flex w-2.5 cursor-ew-resize items-center justify-center rounded-r bg-white/20 text-[7px] font-bold text-white/70 select-none hover:bg-white/40 active:bg-white/60 dark:bg-zinc-900/20 dark:text-zinc-900/70 dark:hover:bg-zinc-900/40"
                          aria-label="Drag to resize field width"
                          title="Drag to resize field width"
                        >
                          ⋮
                        </button>
                      )}
                    </div>
                  )];
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
