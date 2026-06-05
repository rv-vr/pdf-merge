import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';
import {
  generateCombinedPDF,
  generateZIP,
} from '@/lib/pdfMerger';
import type { BaseField } from '@/types';
import type { PlacedField } from '@/types';
import { NavBar } from '@/components/app/NavBar';
import { UploadScreen } from '@/components/app/UploadScreen';
import { FieldsSidebar } from '@/components/app/FieldsSidebar';
import { EditorCanvas } from '@/components/app/EditorCanvas';
import { Inspector } from '@/components/app/Inspector';
import { ExportDialog } from '@/components/app/ExportDialog';
import { TooltipProvider } from '@/components/ui/tooltip';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs';

export default function App() {
  // View state
  const [view, setView] = useState<'upload' | 'editor'>('upload');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // File loading states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // CSV states
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');

  // Placement states
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [previewRowIndex, setPreviewRowIndex] = useState<number>(0);

  // Filename configuration
  const [filenameColumn, setFilenameColumn] = useState<string>('');

  // Zoom state
  const [zoom, setZoom] = useState<number>(1.0);

  // Resizing states
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const resizeStartWidth = useRef<number>(0);
  const resizeStartPointerX = useRef<number>(0);

  // Keep track of last used field styling properties
  const [lastFieldProperties, setLastFieldProperties] = useState({
    font: 'Helvetica' as 'Helvetica' | 'Times-Roman' | 'Courier',
    fontSize: 14,
    color: '#000000',
    isBold: false,
    isItalic: false,
    width: 20,
    align: 'left' as 'left' | 'center' | 'right',
  });

  // Track property changes of the selected field
  useEffect(() => {
    if (!selectedFieldId) return;
    const selected = placedFields.find((f) => f.id === selectedFieldId);
    if (selected) {
      setLastFieldProperties({
        font: selected.font,
        fontSize: selected.fontSize,
        color: selected.color,
        isBold: selected.isBold,
        isItalic: selected.isItalic,
        width: selected.width,
        align: selected.align ?? 'left',
      });
    }
  }, [placedFields, selectedFieldId]);

  // Merge execution states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [processingMessage, setProcessingMessage] = useState<string>('');

  // Canvas and drag tracking refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Apply dark mode theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle keyboard nudge shortcuts for pixel-perfect alignment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFieldId) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const step = e.shiftKey ? 2.0 : 0.5;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === selectedFieldId ? { ...f, x: Math.max(0, f.x - step) } : f
          )
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === selectedFieldId ? { ...f, x: Math.min(100, f.x + step) } : f
          )
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === selectedFieldId ? { ...f, y: Math.max(0, f.y - step) } : f
          )
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === selectedFieldId ? { ...f, y: Math.min(100, f.y + step) } : f
          )
        );
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setPlacedFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
        setSelectedFieldId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId]);

  // Load PDF document proxy once when bytes change
  useEffect(() => {
    if (!pdfBytes) {
      setPdfDoc(null);
      setTotalPages(0);
      return;
    }
    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error('Error loading PDF document:', err);
      }
    };
    loadDoc();
  }, [pdfBytes]);

  // Render the PDF page onto the canvas when document, page, or zoom changes
  useEffect(() => {
    if (!pdfDoc) return;

    let activeRenderTask: ReturnType<pdfjsLib.PDFPageProxy['render']> | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1.5 * zoom });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            setPdfDimensions({ width: viewport.width, height: viewport.height });

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            };
            activeRenderTask = page.render(renderContext);
            await activeRenderTask.promise;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // Handle PDF Template Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      setPdfBytes(buffer);
      setPdfFile(file);
      setCurrentPage(1);
      setPlacedFields([]);
      setSelectedFieldId(null);
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle CSV Upload
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0] as Record<string, string>);
          setCsvHeaders(headers);
          setCsvRows(results.data as Record<string, string>[]);
          setCsvFileName(file.name);
          setFilenameColumn(headers[0] || '');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      },
    });
  };

  // Add CSV column header onto the template page
  const addFieldToPage = (header: string) => {
    const newField: PlacedField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: header,
      x: 40,
      y: 45,
      page: currentPage,
      font: lastFieldProperties.font,
      fontSize: lastFieldProperties.fontSize,
      color: lastFieldProperties.color,
      isBold: lastFieldProperties.isBold,
      isItalic: lastFieldProperties.isItalic,
      width: lastFieldProperties.width,
      align: lastFieldProperties.align,
    };

    setPlacedFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Duplicate a field
  const handleDuplicateField = (field: PlacedField) => {
    const newField: PlacedField = {
      ...field,
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(100, field.x + 2),
      y: Math.min(100, field.y + 2),
    };
    setPlacedFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Drag and Drop State Handlers
  const handleMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPreviewMode) return;

    if (selectedFieldId !== field.id) {
      setSelectedFieldId(field.id);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDraggingFieldId(field.id);
  };

  const handleTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    e.stopPropagation();

    if (isPreviewMode) return;

    if (selectedFieldId !== field.id) {
      setSelectedFieldId(field.id);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    if (touch) {
      dragStartOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
      setDraggingFieldId(field.id);
    }
  };

  // Handle Drag Move
  useEffect(() => {
    if (!draggingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const relativeX = e.clientX - rect.left - dragStartOffset.current.x;
      const relativeY = e.clientY - rect.top - dragStartOffset.current.y;

      let xPercent = (relativeX / rect.width) * 100;
      let yPercent = (relativeY / rect.height) * 100;

      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      setPlacedFields((prev) =>
        prev.map((f) =>
          f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f
        )
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const relativeX = touch.clientX - rect.left - dragStartOffset.current.x;
      const relativeY = touch.clientY - rect.top - dragStartOffset.current.y;

      let xPercent = (relativeX / rect.width) * 100;
      let yPercent = (relativeY / rect.height) * 100;

      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      setPlacedFields((prev) =>
        prev.map((f) =>
          f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f
        )
      );
    };

    const handleMouseUp = () => setDraggingFieldId(null);
    const handleTouchEnd = () => setDraggingFieldId(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingFieldId]);

  const handleResizeMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPreviewMode) return;

    setResizingFieldId(field.id);
    resizeStartWidth.current = field.width;
    resizeStartPointerX.current = e.clientX;
  };

  const handleResizeTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    e.stopPropagation();
    if (isPreviewMode) return;

    const touch = e.touches[0];
    if (touch) {
      setResizingFieldId(field.id);
      resizeStartWidth.current = field.width;
      resizeStartPointerX.current = touch.clientX;
    }
  };

  // Handle Resizing
  useEffect(() => {
    if (!resizingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const deltaX = e.clientX - resizeStartPointerX.current;
      const deltaXPercent = (deltaX / rect.width) * 100;

      let newWidth = resizeStartWidth.current + deltaXPercent;

      const activeField = placedFields.find((f) => f.id === resizingFieldId);
      const minWidthPercent = activeField ? (activeField.fontSize / 612) * 100 : 5;

      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));

      setPlacedFields((prev) =>
        prev.map((f) => (f.id === resizingFieldId ? { ...f, width: newWidth } : f))
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - resizeStartPointerX.current;
      const deltaXPercent = (deltaX / rect.width) * 100;

      let newWidth = resizeStartWidth.current + deltaXPercent;

      const activeField = placedFields.find((f) => f.id === resizingFieldId);
      const minWidthPercent = activeField ? (activeField.fontSize / 612) * 100 : 5;

      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));

      setPlacedFields((prev) =>
        prev.map((f) => (f.id === resizingFieldId ? { ...f, width: newWidth } : f))
      );
    };

    const handleMouseUp = () => setResizingFieldId(null);
    const handleTouchEnd = () => setResizingFieldId(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [resizingFieldId, placedFields]);

  // Update styling attributes for the currently selected placed field
  const updateSelectedField = (updates: Partial<PlacedField>) => {
    if (!selectedFieldId) return;
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
    );
  };

  // Perform Merge: Download Combined Multi-page PDF
  const handleDownloadCombinedPDF = async () => {
    if (!pdfBytes || csvRows.length === 0 || placedFields.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage('Generating unified PDF file…');
    setProcessingProgress({ current: 0, total: csvRows.length });

    try {
      const result = await generateCombinedPDF(
        pdfBytes,
        csvRows,
        placedFields as BaseField[],
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );

      const blob = new Blob([result.buffer as ArrayBuffer], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `merged_${pdfFile?.name.replace('.pdf', '') || 'output'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error rendering combined PDF. See developer console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform Merge: Download ZIP of individual PDFs
  const handleDownloadZIP = async () => {
    if (!pdfBytes || csvRows.length === 0 || placedFields.length === 0 || !filenameColumn)
      return;

    setIsProcessing(true);
    setProcessingMessage('Packing separate PDFs into ZIP Archive…');
    setProcessingProgress({ current: 0, total: csvRows.length });

    try {
      const zipBlob = await generateZIP(
        pdfBytes,
        csvRows,
        placedFields as BaseField[],
        filenameColumn,
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `merged_pdfs_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error creating ZIP bundle. See developer console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportDialogChange = (open: boolean) => {
    setExportDialogOpen(open);
    if (!open) {
      setProcessingProgress({ current: 0, total: 0 });
      setProcessingMessage('');
    }
  };

  const selectedField = placedFields.find((f) => f.id === selectedFieldId);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <NavBar
          isDarkMode={isDarkMode}
          onToggleDark={() => setIsDarkMode(!isDarkMode)}
          canExport={
            view === 'editor' &&
            !!pdfBytes &&
            csvRows.length > 0 &&
            placedFields.length > 0
          }
          onExportClick={() => setExportDialogOpen(true)}
          view={view}
          pdfFileName={pdfFile?.name}
          csvRowCount={csvRows.length}
          onBackToUpload={() => setView('upload')}
        />

        {view === 'upload' ? (
          <UploadScreen
            pdfFile={pdfFile}
            csvFileName={csvFileName}
            csvRows={csvRows}
            csvHeaders={csvHeaders}
            onPdfUpload={handlePdfUpload}
            onCsvUpload={handleCsvUpload}
            onContinue={() => setView('editor')}
          />
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <FieldsSidebar
              csvFileName={csvFileName}
              csvHeaders={csvHeaders}
              csvRows={csvRows}
              placedFields={placedFields}
              selectedFieldId={selectedFieldId}
              onAddField={addFieldToPage}
              onRemoveField={(id) => {
                setPlacedFields((prev) => prev.filter((f) => f.id !== id));
                if (selectedFieldId === id) setSelectedFieldId(null);
              }}
              onSelectField={setSelectedFieldId}
            />

            <EditorCanvas
              pdfBytes={pdfBytes}
              pdfDoc={pdfDoc}
              totalPages={totalPages}
              currentPage={currentPage}
              pdfDimensions={pdfDimensions}
              placedFields={placedFields}
              selectedFieldId={selectedFieldId}
              isPreviewMode={isPreviewMode}
              previewRowIndex={previewRowIndex}
              csvRows={csvRows}
              zoom={zoom}
              onPageChange={setCurrentPage}
              onZoomChange={setZoom}
              onTogglePreview={() => {
                setIsPreviewMode(!isPreviewMode);
                setSelectedFieldId(null);
              }}
              onPreviewRowChange={setPreviewRowIndex}
              onSelectField={setSelectedFieldId}
              onClearAllFields={() => {
                setPlacedFields([]);
                setSelectedFieldId(null);
              }}
              onFieldMouseDown={handleMouseDown}
              onFieldTouchStart={handleTouchStart}
              onResizeMouseDown={handleResizeMouseDown}
              onResizeTouchStart={handleResizeTouchStart}
              canvasRef={canvasRef}
              containerRef={containerRef}
            />

            <Inspector
              selectedField={selectedField}
              onUpdate={updateSelectedField}
              onDuplicate={handleDuplicateField}
              onDelete={(id) => {
                setPlacedFields((prev) => prev.filter((f) => f.id !== id));
                setSelectedFieldId(null);
              }}
            />
          </div>
        )}

        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={handleExportDialogChange}
          csvHeaders={csvHeaders}
          csvRows={csvRows}
          pdfFile={pdfFile}
          filenameColumn={filenameColumn}
          onFilenameColumnChange={setFilenameColumn}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
          processingMessage={processingMessage}
          onDownloadCombined={handleDownloadCombinedPDF}
          onDownloadZip={handleDownloadZIP}
        />
      </div>
    </TooltipProvider>
  );
}
