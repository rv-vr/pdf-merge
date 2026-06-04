import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import Papa from 'papaparse';
import { 
  generateCombinedPDF, 
  generateZIP 
} from '@/lib/pdfMerger';
import type { PlacedField } from '@/lib/pdfMerger';

// shadcn UI Components
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';

// Lucide Icons for premium visual cues
import { 
  FileUp, 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  Info, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  EyeOff,
  Move,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // File loading states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDimensions, setPdfDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
    width: 20
  });

  // Track property changes of the selected field
  useEffect(() => {
    if (!selectedFieldId) return;
    const selected = placedFields.find(f => f.id === selectedFieldId);
    if (selected) {
      setLastFieldProperties({
        font: selected.font,
        fontSize: selected.fontSize,
        color: selected.color,
        isBold: selected.isBold,
        isItalic: selected.isItalic,
        width: selected.width,
      });
    }
  }, [placedFields, selectedFieldId]);

  // Merge execution states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
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

      // Ignore nudges if user is focusing an input element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'SELECT' || 
         activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }

      const step = e.shiftKey ? 2.0 : 0.5; // Fine movement (0.5%) vs coarser (2.0%)

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlacedFields(prev =>
          prev.map(f => f.id === selectedFieldId ? { ...f, x: Math.max(0, f.x - step) } : f)
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlacedFields(prev =>
          prev.map(f => f.id === selectedFieldId ? { ...f, x: Math.min(100, f.x + step) } : f)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPlacedFields(prev =>
          prev.map(f => f.id === selectedFieldId ? { ...f, y: Math.max(0, f.y - step) } : f)
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPlacedFields(prev =>
          prev.map(f => f.id === selectedFieldId ? { ...f, y: Math.min(100, f.y + step) } : f)
        );
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setPlacedFields(prev => prev.filter(f => f.id !== selectedFieldId));
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

    let activeRenderTask: any = null;

    const renderPage = async () => {
      try {
        // Render target page
        const page = await pdfDoc.getPage(currentPage);
        
        // We render at 1.5x scale multiplied by zoom to keep visual quality high and crisp
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
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
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
      // Keep placed fields but reset page selection if pages don't exist
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
      }
    });
  };

  // Add CSV column header onto the template page
  const addFieldToPage = (header: string) => {
    const newField: PlacedField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: header,
      x: 40, // default top-left coordinates
      y: 45,
      page: currentPage,
      font: lastFieldProperties.font,
      fontSize: lastFieldProperties.fontSize,
      color: lastFieldProperties.color,
      isBold: lastFieldProperties.isBold,
      isItalic: lastFieldProperties.isItalic,
      width: lastFieldProperties.width
    };

    setPlacedFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Drag and Drop State Handlers
  const handleMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPreviewMode) return;

    if (selectedFieldId !== field.id) {
      setSelectedFieldId(field.id);
      return; // Select first, dragging requires subsequent click-drag
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

  // Handle Drag Move (Attached to document in effect when dragging)
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

      // Clamp between 0% and 100%
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));

      setPlacedFields(prev =>
        prev.map(f => f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f)
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

      setPlacedFields(prev =>
        prev.map(f => f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f)
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

      const activeField = placedFields.find(f => f.id === resizingFieldId);
      const minWidthPercent = activeField 
        ? (activeField.fontSize / 612) * 100 // US Letter width is 612pt
        : 5;

      // Clamp width between minimum font height representation and page boundary
      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));

      setPlacedFields(prev =>
        prev.map(f => f.id === resizingFieldId ? { ...f, width: newWidth } : f)
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

      const activeField = placedFields.find(f => f.id === resizingFieldId);
      const minWidthPercent = activeField 
        ? (activeField.fontSize / 612) * 100
        : 5;

      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));

      setPlacedFields(prev =>
        prev.map(f => f.id === resizingFieldId ? { ...f, width: newWidth } : f)
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
    setPlacedFields(prev =>
      prev.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f)
    );
  };

  // Perform Merge: Download Combined Multi-page PDF
  const handleDownloadCombinedPDF = async () => {
    if (!pdfBytes || csvRows.length === 0 || placedFields.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage('Generating unified PDF file...');
    setProcessingProgress({ current: 0, total: csvRows.length });

    try {
      const result = await generateCombinedPDF(
        pdfBytes,
        csvRows,
        placedFields,
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );

      // Trigger standard browser download
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
    if (!pdfBytes || csvRows.length === 0 || placedFields.length === 0 || !filenameColumn) return;

    setIsProcessing(true);
    setProcessingMessage('Packing separate PDFs into ZIP Archive...');
    setProcessingProgress({ current: 0, total: csvRows.length });

    try {
      const zipBlob = await generateZIP(
        pdfBytes,
        csvRows,
        placedFields,
        filenameColumn,
        (current, total) => {
          setProcessingProgress({ current, total });
        }
      );

      // Trigger standard browser download
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

  // Resolve the visual style of a placed field text bubble
  const getFieldStyle = (field: PlacedField) => {
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
      whiteSpace: 'nowrap',
      color: field.color,
      fontFamily: field.font === 'Helvetica' ? 'sans-serif' : field.font === 'Courier' ? 'monospace' : 'serif',
      fontSize: `${Math.max(8, field.fontSize * 0.9 * zoom)}px`, // scaled for CSS canvas size & zoom
      fontWeight: field.isBold ? 'bold' : 'normal',
      fontStyle: field.isItalic ? 'italic' : 'normal',
    };
  };

  const selectedField = placedFields.find(f => f.id === selectedFieldId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-md shadow-indigo-500/30">
            📄
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">PDF Data Merger</h1>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              100% Client-Side Templater • Secure Local Processing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfBytes && csvRows.length > 0 && placedFields.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-indigo-600 font-semibold hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">
                  <Download className="size-4" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Export Merged PDFs</DialogTitle>
                  <DialogDescription>
                    Configure output naming and download options
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-5 py-4 text-sm">
                  {/* Filename Column Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Filename Column (for ZIP download)
                    </label>
                    <Select
                      value={filenameColumn}
                      onValueChange={setFilenameColumn}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Select column for filename" />
                      </SelectTrigger>
                      <SelectContent>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* PDF generation feedback */}
                  {isProcessing && (
                    <div className="flex flex-col gap-2 rounded-lg border border-indigo-100 bg-indigo-50/30 p-3 text-indigo-900 dark:border-indigo-950/40 dark:bg-indigo-950/20 dark:text-indigo-300">
                      <span className="font-semibold">{processingMessage}</span>
                      <div className="h-1.5 w-full rounded-full bg-indigo-100 dark:bg-indigo-950">
                        <div 
                          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span>Row {processingProgress.current} of {processingProgress.total}</span>
                        <span>{Math.round((processingProgress.current / processingProgress.total) * 100)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Export Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="default"
                      onClick={handleDownloadCombinedPDF}
                      disabled={isProcessing}
                      className="w-full gap-2 bg-indigo-600 font-semibold hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <Download className="size-4" />
                      Download Combined PDF
                    </Button>

                    <Button 
                      variant="secondary"
                      onClick={handleDownloadZIP}
                      disabled={isProcessing || !filenameColumn}
                      className="w-full gap-2 border shadow-sm dark:border-slate-800"
                    >
                      <Download className="size-4" />
                      Download ZIP (Separate PDFs)
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* User Guide Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-lg">
                <Info />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How to Use PDF Data Merger</DialogTitle>
                <DialogDescription>
                  Follow these simple steps to bulk-generate customized documents:
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex gap-3">
                  <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0">1</Badge>
                  <p>Upload a <strong>PDF template</strong> (a certificate, invoice, or letter form).</p>
                </div>
                <div className="flex gap-3">
                  <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0">2</Badge>
                  <p>Upload a <strong>CSV file</strong> containing columns of values (e.g., Name, Date, ID).</p>
                </div>
                <div className="flex gap-3">
                  <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0">3</Badge>
                  <p><strong>Click or Drag</strong> fields from the sidebar onto the PDF page template.</p>
                </div>
                <div className="flex gap-3">
                  <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0">4</Badge>
                  <p>Select a field to customize its <strong>Font, Size, Color, and Weight</strong>.</p>
                </div>
                <div className="flex gap-3">
                  <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0">5</Badge>
                  <p>Toggle <strong>Preview Mode</strong> to review values, then export your documents!</p>
                </div>
                <Separator />
                <div className="rounded-lg bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300">
                  <strong>🔒 Absolute Privacy:</strong> PDF rendering, CSV parsing, and document assembly are done 100% in your browser. No files or values are sent to any server.
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="rounded-lg"
          >
            {isDarkMode ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex w-full flex-col gap-6 p-4 md:flex-row md:p-6 lg:h-[calc(100vh-80px)]">
        
        {/* Sidebar Controls Area */}
        <section className="flex w-full flex-col gap-6 md:w-80 md:shrink-0 lg:overflow-y-auto lg:pr-2">
          
          {/* File Upload card */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Select Sources</CardTitle>
              <CardDescription>Upload local files to merge</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              
              {/* PDF Uploader */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">PDF Template</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    id="pdf-upload"
                  />
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40">
                    <FileText className="text-indigo-500" />
                    <span className="truncate">
                      {pdfFile ? pdfFile.name : 'Upload template PDF'}
                    </span>
                    <FileUp className="ml-auto text-slate-400" />
                  </div>
                </div>
              </div>

              {/* CSV Uploader */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">CSV Data Source</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    id="csv-upload"
                  />
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40">
                    <FileText className="text-emerald-500" />
                    <span className="truncate">
                      {csvFileName ? csvFileName : 'Upload data CSV'}
                    </span>
                    <FileUp className="ml-auto text-slate-400" />
                  </div>
                </div>
              </div>



            </CardContent>
          </Card>

          {/* Placeholders Card */}
          {csvHeaders.length > 0 && (
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">2. Insert Fields</CardTitle>
                <CardDescription>Click a column header to place it</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {csvHeaders.map(header => (
                    <Button
                      key={header}
                      variant="secondary"
                      size="sm"
                      onClick={() => addFieldToPage(header)}
                      className="group gap-1.5 rounded-full border border-slate-100 bg-slate-50 text-xs hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-indigo-950/20"
                    >
                      <Plus className="opacity-60 transition-transform group-hover:rotate-90" />
                      {header}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Styling / Inspector Panel */}
          {selectedField && (
            <Card className="border-indigo-100 bg-indigo-50/20 shadow-sm dark:border-indigo-950/40 dark:bg-indigo-950/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-indigo-900 dark:text-indigo-200">
                    3. Text Styling
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPlacedFields(prev => prev.filter(f => f.id !== selectedFieldId));
                      setSelectedFieldId(null);
                    }}
                    className="size-8 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <CardDescription className="dark:text-slate-400">
                  Customizing field: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedField.fieldName}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 text-sm">
                
                {/* Font selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Font Family</label>
                  <Select
                    value={selectedField.font}
                    onValueChange={(val: 'Helvetica' | 'Times-Roman' | 'Courier') => updateSelectedField({ font: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Helvetica">Helvetica (Sans-Serif)</SelectItem>
                      <SelectItem value="Times-Roman">Times New Roman (Serif)</SelectItem>
                      <SelectItem value="Courier">Courier (Monospace)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Font Size Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Font Size (pt)</label>
                  <Input
                    type="number"
                    value={selectedField.fontSize}
                    min={1}
                    max={144}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        updateSelectedField({ fontSize: Math.max(1, Math.min(144, val)) });
                      }
                    }}
                    className="bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Formatting Buttons */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Style Options</label>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedField.isBold ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSelectedField({ isBold: !selectedField.isBold })}
                        className={`font-bold ${selectedField.isBold ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white dark:bg-slate-900'}`}
                      >
                        B
                      </Button>
                      <Button
                        variant={selectedField.isItalic ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateSelectedField({ isItalic: !selectedField.isItalic })}
                        className={`italic ${selectedField.isItalic ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white dark:bg-slate-900'}`}
                      >
                        I
                      </Button>
                    </div>
                  </div>

                  {/* Nudge helper explanation */}
                  <div className="ml-auto rounded-lg bg-slate-100 p-2 text-[10px] text-slate-500 dark:bg-slate-800/80">
                    💡 Use arrow keys on keyboard to nudge position.
                  </div>
                </div>

                {/* Colors presets */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Color Palette</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      '#000000', // Black
                      '#4f46e5', // Indigo
                      '#059669', // Emerald
                      '#dc2626', // Red
                      '#d97706', // Amber
                      '#ffffff', // White
                    ].map(preset => (
                      <button
                        key={preset}
                        onClick={() => updateSelectedField({ color: preset })}
                        className={`size-6 rounded-md border border-slate-300 shadow-sm transition-transform active:scale-95 dark:border-slate-700 ${
                          selectedField.color === preset ? 'scale-110 ring-2 ring-indigo-500' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset }}
                        title={preset}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={selectedField.color}
                    onChange={(e) => updateSelectedField({ color: e.target.value })}
                    placeholder="#hexcode"
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>

              </CardContent>
            </Card>
          )}



        </section>

        {/* Canvas Renderer / Main Area */}
        <section className="flex flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          
          {/* Canvas Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-2 py-0.5 font-mono text-xs dark:bg-slate-800/30">
                {pdfFile ? pdfFile.name : 'No Template Loaded'}
              </Badge>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="text-xs font-semibold">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
              {pdfBytes && (
                <div className="flex items-center gap-1.5 border-l pl-3 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                    disabled={zoom <= 0.5}
                    title="Zoom Out"
                  >
                    <ZoomOut />
                  </Button>
                  <span className="text-xs font-semibold w-12 text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setZoom(prev => Math.min(2.0, prev + 0.25))}
                    disabled={zoom >= 2.0}
                    title="Zoom In"
                  >
                    <ZoomIn />
                  </Button>
                </div>
              )}
              {pdfBytes && (
                <div className="flex items-center gap-1.5 border-l pl-3 dark:border-slate-800">
                  <Button
                    variant={isPreviewMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setIsPreviewMode(!isPreviewMode);
                      setSelectedFieldId(null); // Clear selection on preview to visual-lock
                    }}
                    className={isPreviewMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 px-3 rounded-lg font-semibold shadow-sm' : 'gap-1.5 h-8 px-3 rounded-lg font-semibold border dark:border-slate-800'}
                  >
                    {isPreviewMode ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    Preview Mode: {isPreviewMode ? 'ON' : 'OFF'}
                  </Button>
                </div>
              )}
              {pdfBytes && isPreviewMode && csvRows.length > 0 && (
                <div className="flex items-center gap-1.5 border-l pl-3 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setPreviewRowIndex(prev => Math.max(0, prev - 1))}
                    disabled={previewRowIndex === 0}
                    title="Previous CSV Row"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-semibold select-none w-24 text-center truncate">
                    Row {previewRowIndex + 1} / {csvRows.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setPreviewRowIndex(prev => Math.min(csvRows.length - 1, prev + 1))}
                    disabled={previewRowIndex === csvRows.length - 1}
                    title="Next CSV Row"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            {placedFields.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setPlacedFields([]);
                  setSelectedFieldId(null);
                }}
                className="gap-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 data-icon="inline-start" />
                Clear All Fields
              </Button>
            )}
          </div>

          {/* Canvas Workspace Area */}
          <div className="relative flex flex-1 items-start justify-center overflow-auto bg-slate-100 p-6 dark:bg-slate-950/50">
            
            {pdfBytes ? (
              <div 
                ref={containerRef}
                className="relative inline-block border border-slate-300 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 select-none"
                style={{ 
                  width: pdfDimensions.width ? `${pdfDimensions.width / 1.5}px` : 'auto' 
                }}
              >
                {/* Main Rendered Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className="block w-full h-auto"
                />

                {/* Drag Overlay Layer */}
                <div className="absolute inset-0 z-10 overflow-hidden cursor-crosshair">
                  {placedFields
                    .filter(field => field.page === currentPage)
                    .map(field => {
                      const isSelected = field.id === selectedFieldId;
                      // Display header tag name or actual CSV preview value
                      const displayVal = isPreviewMode && csvRows[previewRowIndex]
                        ? (csvRows[previewRowIndex][field.fieldName] || '')
                        : `{{${field.fieldName}}}`;

                      return (
                        <div
                          key={field.id}
                          style={getFieldStyle(field)}
                          onMouseDown={(e) => handleMouseDown(e, field)}
                          onTouchStart={(e) => handleTouchStart(e, field)}
                          className={`absolute z-20 flex rounded border bg-white/15 shadow-md active:cursor-grabbing dark:bg-slate-900/15 transition-all select-none ${
                            isSelected 
                              ? 'border-indigo-600 ring-2 ring-indigo-500/30' 
                              : 'border-slate-200 hover:border-indigo-400 hover:shadow-lg dark:border-slate-700'
                          } ${isPreviewMode ? 'pointer-events-none cursor-default' : 'cursor-grab'}`}
                        >
                          {!isPreviewMode && (
                            <Move className="opacity-40 shrink-0" style={{ width: '0.9em', height: '0.9em' }} />
                          )}
                          <span className="whitespace-nowrap leading-none select-none select-none-all truncate flex-1">
                            {displayVal || <span className="text-slate-400 italic text-xs">empty</span>}
                          </span>
                          
                          {/* Resize Grip */}
                          {isSelected && !isPreviewMode && (
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, field)}
                              onTouchStart={(e) => handleResizeTouchStart(e, field)}
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-indigo-500/20 active:bg-indigo-500/40 rounded-r border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-center text-[7px] text-slate-400 font-bold select-none"
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
              /* Upload Empty State */
              <div className="flex h-full w-full max-w-lg flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-800">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-3xl text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                  📄
                </div>
                <h3 className="mb-1 text-base font-bold">No PDF Template Loaded</h3>
                <p className="mb-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Upload your PDF document template and a CSV dataset to get started.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button 
                    variant="outline"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                    className="gap-2 border-slate-200 dark:border-slate-800"
                  >
                    <FileUp data-icon="inline-start" />
                    Upload PDF Template
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Canvas Workspace Footer Info */}
          {pdfBytes && (
            <div className="flex justify-between border-t pt-3 text-[10px] text-slate-400 dark:border-slate-800">
              <div>
                PDF dimensions: {Math.round(pdfDimensions.width / 1.5)} x {Math.round(pdfDimensions.height / 1.5)} CSS pixels
              </div>
              <div>
                Placed fields on current page: {placedFields.filter(f => f.page === currentPage).length}
              </div>
            </div>
          )}

        </section>

      </main>
    </div>
  );
}
