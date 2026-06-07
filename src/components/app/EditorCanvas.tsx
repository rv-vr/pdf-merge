import React from 'react';
import type { RefObject } from 'react';
import { Document, Page } from 'react-pdf';
import { FileText, FileUp, GripVerticalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlacedField } from '@/types';
import { cn } from '@/lib/utils';
import { CanvasToolbar } from '@/components/app/CanvasToolbar';
import { Skeleton } from '@/components/ui/skeleton';

function fontFamilyFor(font: PlacedField['font']): string {
  if (font === 'Arimo') return 'Arimo, Arial, sans-serif';
  if (font === 'Tinos') return 'Tinos, "Times New Roman", serif';
  if (font === 'Carlito') return 'Carlito, Calibri, sans-serif';
  if (font === 'EB Garamond') return '"EB Garamond", Garamond, serif';
  if (font === 'Inter') return 'Inter, Helvetica, "Helvetica Neue", Arial, sans-serif';
  if (font === 'Lora') return 'Lora, Georgia, serif';
  if (font === 'Open Sans') return '"Open Sans", Tahoma, Verdana, sans-serif';
  if (font === 'Courier') return '"Courier New", Courier, monospace';
  if (font === 'Times-Roman') return '"Times New Roman", Times, Georgia, serif';
  return 'Helvetica, "Helvetica Neue", Arial, sans-serif';
}

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

  const align = field.align ?? 'left';

  if (isPreviewMode) {
    return {
      ...base,
      color: field.color,
      fontFamily: fontFamilyFor(field.font),
      fontSize: `${Math.max(8, field.fontSize * zoom)}px`,
      fontWeight: field.isBold ? 'bold' : 'normal',
      fontStyle: field.isItalic ? 'italic' : 'normal',
      textAlign: align,
      justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
    };
  }

  return {
    ...base,
    fontSize: `${Math.max(8, field.fontSize * 0.75 * zoom)}px`,
    fontFamily: fontFamilyFor(field.font),
    fontWeight: field.isBold ? 'bold' : 'normal',
    fontStyle: field.isItalic ? 'italic' : 'normal',
  };
}

function PdfPageSkeleton({ width, height }: { width: number; height: number }) {
  const w = width || 600;
  const h = height || Math.round(w * 1.414);
  return (
    <div style={{ width: w, height: h }} className="flex flex-col gap-3 bg-white p-8">
      <Skeleton className="h-5 w-2/3 bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-4/5 bg-zinc-100" />
      <Skeleton className="mt-2 h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-3/4 bg-zinc-100" />
      <Skeleton className="mt-2 h-24 w-full bg-zinc-100" />
      <Skeleton className="mt-2 h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-5/6 bg-zinc-100" />
    </div>
  );
}

interface PdfPageWithFadeProps {
  pageNumber: number;
  scale: number;
  pdfDimensions: { width: number; height: number };
  onLoadSuccess: (page: { width: number; height: number }) => void;
}

function PdfPageWithFade({ pageNumber, scale, pdfDimensions, onLoadSuccess }: PdfPageWithFadeProps) {
  const [rendered, setRendered] = React.useState(false);
  return (
    <div className="relative">
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onLoadSuccess}
        onRenderSuccess={() => setRendered(true)}
        loading={<PdfPageSkeleton width={pdfDimensions.width} height={pdfDimensions.height} />}
      />
      {/* Skeleton cover fades out once canvas is painted */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-500',
          rendered ? 'opacity-0' : 'opacity-100'
        )}
      >
        <PdfPageSkeleton width={pdfDimensions.width} height={pdfDimensions.height} />
      </div>
    </div>
  );
}

interface EditorCanvasProps {
  pdfBytes: ArrayBuffer | null;
  totalPages: number;
  currentPage: number;
  pdfDimensions: { width: number; height: number };
  placedFields: PlacedField[];
  selectedFieldId: string | null;
  isPreviewMode: boolean;
  previewRowIndex: number;
  csvRows: Record<string, string>[];
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onTogglePreview: () => void;
  onPreviewRowChange: (index: number) => void;
  onSelectField: (id: string | null) => void;
  onClearAllFields: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFieldMouseDown: (e: React.MouseEvent, field: PlacedField) => void;
  onFieldTouchStart: (e: React.TouchEvent, field: PlacedField) => void;
  onResizeMouseDown: (e: React.MouseEvent, field: PlacedField) => void;
  onResizeTouchStart: (e: React.TouchEvent, field: PlacedField) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  onLoadSuccess: (totalPages: number) => void;
  onPageRenderSuccess: (width: number, height: number) => void;
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
  canUndo,
  canRedo,
  onPageChange,
  onZoomChange,
  onTogglePreview,
  onPreviewRowChange,
  onSelectField,
  onClearAllFields,
  onUndo,
  onRedo,
  onFieldMouseDown,
  onFieldTouchStart,
  onResizeMouseDown,
  onResizeTouchStart,
  containerRef,
  onLoadSuccess,
  onPageRenderSuccess,
}: EditorCanvasProps) {
  const memoizedFile = React.useMemo(() => {
    return pdfBytes ? pdfBytes.slice(0) : null;
  }, [pdfBytes]);


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
        canUndo={canUndo}
        canRedo={canRedo}
        onTogglePreview={onTogglePreview}
        onPreviewRowChange={onPreviewRowChange}
        onPageChange={onPageChange}
        onZoomChange={onZoomChange}
        onClearAllFields={onClearAllFields}
        onUndo={onUndo}
        onRedo={onRedo}
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
              width: pdfDimensions.width ? `${pdfDimensions.width}px` : 'auto',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Rendered PDF canvas using react-pdf */}
            <Document
              file={memoizedFile}
              onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
              loading={<PdfPageSkeleton width={pdfDimensions.width} height={pdfDimensions.height} />}
            >
              <PdfPageWithFade
                key={currentPage}
                pageNumber={currentPage}
                scale={zoom}
                pdfDimensions={pdfDimensions}
                onLoadSuccess={(page) => onPageRenderSuccess(page.width, page.height)}
              />
            </Document>

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
            <div className="absolute inset-0 z-10 overflow-visible">
              {placedFields.flatMap((field) => {
                if (field.page !== currentPage) return [];
                const isSelected = field.id === selectedFieldId;
                const displayVal =
                  isPreviewMode && csvRows[previewRowIndex]
                    ? csvRows[previewRowIndex][field.fieldName] || ''
                    : `{{${field.fieldName}}}`;

                const align = field.align ?? 'left';

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
                      'absolute z-20 flex items-center overflow-visible whitespace-nowrap select-none rounded transition-colors',
                      isPreviewMode
                        ? 'pointer-events-none cursor-default bg-transparent'
                        : cn(
                            'cursor-grab active:cursor-grabbing',
                            'bg-white/90 border pl-2 pr-8 shadow-sm',
                            isSelected
                              ? 'border-primary shadow-primary/20'
                              : 'border-zinc-300 hover:border-primary/60'
                          )
                    )}
                  >
                    {/* Label chip — floating above field box
                    {!isPreviewMode && (
                      <div className="pointer-events-none absolute -top-5 left-0 flex items-center gap-0.5 rounded-sm bg-zinc-900 px-1.5 py-0.75 text-[9px] font-medium leading-none text-white select-none dark:bg-zinc-100 dark:text-zinc-900">
                        <Tag style={{ width: '0.65em', height: '0.65em' }} />
                        <span>{field.fieldName}</span>
                      </div>
                    )} */}

                    {/* Text content */}
                    <div
                      className={cn(
                        'flex-1 overflow-hidden',
                        !isPreviewMode && (
                          align === 'right' ? 'text-right' :
                          align === 'center' ? 'text-center' :
                          'text-left'
                        )
                      )}
                      style={!isPreviewMode ? { color: field.color } : undefined}
                    >
                      <span className="truncate leading-none">
                        {displayVal || (
                          <span className="italic opacity-30">empty</span>
                        )}
                      </span>
                    </div>

                    {/* Resize grip */}
                    {!isPreviewMode && (
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
                        className={cn(
                          'absolute bottom-0 right-0 top-0 flex w-5 cursor-ew-resize items-center justify-center rounded-r select-none transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
                            : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300 active:bg-zinc-400'
                        )}
                        aria-label="Drag to resize field width"
                        title="Drag to resize field width"
                      >
                        <GripVerticalIcon className="size-3" />
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
