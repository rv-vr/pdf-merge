import React, { useState, useEffect } from 'react';
import { pdfjs } from 'react-pdf';
import { NavBar } from '@/components/app/NavBar';
import { UploadScreen } from '@/components/app/UploadScreen';
import { FieldsSidebar } from '@/components/app/FieldsSidebar';
import { EditorCanvas } from '@/components/app/EditorCanvas';
import { Inspector } from '@/components/app/Inspector';
import { ExportDialog } from '@/components/app/ExportDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePdf } from '@/hooks/usePdf';
import { useCsv } from '@/hooks/useCsv';
import { useFieldEditor } from '@/hooks/useFieldEditor';
import { useExport } from '@/hooks/useExport';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const THEME_STORAGE_KEY = 'pdf-merger-theme';

export default function App() {
  const [view, setView] = useState<'upload' | 'editor'>('upload');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  const pdf = usePdf(view);
  const csv = useCsv();
  const fields = useFieldEditor(pdf.currentPage);
  const exportState = useExport(pdf.pdfBytes, pdf.pdfFile, csv.csvRows, fields.placedFields, csv.filenameColumn);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    pdf.handlePdfUpload(e, fields.resetFields);
  };

  const selectedField = fields.placedFields.find((f) => f.id === fields.selectedFieldId);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <NavBar
          isDarkMode={isDarkMode}
          onToggleDark={() => setIsDarkMode((current) => !current)}
          canExport={
            view === 'editor' &&
            !!pdf.pdfBytes &&
            csv.csvRows.length > 0 &&
            fields.placedFields.length > 0
          }
          onExportClick={exportState.openExportDialog}
          view={view}
          pdfFileName={pdf.pdfFile?.name}
          csvRowCount={csv.csvRows.length}
          onBackToUpload={() => setView('upload')}
        />

        {view === 'upload' ? (
          <UploadScreen
            pdfFile={pdf.pdfFile}
            csvFileName={csv.csvFileName}
            csvRows={csv.csvRows}
            csvHeaders={csv.csvHeaders}
            onPdfUpload={handlePdfUpload}
            onCsvUpload={csv.handleCsvUpload}
            onContinue={() => setView('editor')}
          />
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <FieldsSidebar
              csvFileName={csv.csvFileName}
              csvHeaders={csv.csvHeaders}
              csvRows={csv.csvRows}
              placedFields={fields.placedFields}
              selectedFieldId={fields.selectedFieldId}
              onAddField={fields.addFieldToPage}
              onRemoveField={fields.removeField}
              onSelectField={fields.setSelectedFieldId}
              onReorderFields={fields.reorderFields}
            />

            <EditorCanvas
              pdfBytes={pdf.pdfBytes}
              totalPages={pdf.totalPages}
              currentPage={pdf.currentPage}
              pdfDimensions={pdf.pdfDimensions}
              placedFields={fields.placedFields}
              selectedFieldId={fields.selectedFieldId}
              isPreviewMode={fields.isPreviewMode}
              previewRowIndex={fields.previewRowIndex}
              csvRows={csv.csvRows}
              zoom={pdf.zoom}
              canUndo={fields.canUndo}
              canRedo={fields.canRedo}
              onPageChange={pdf.setCurrentPage}
              onZoomChange={pdf.setZoom}
              onTogglePreview={() => {
                fields.setIsPreviewMode(!fields.isPreviewMode);
                fields.setSelectedFieldId(null);
              }}
              onPreviewRowChange={fields.setPreviewRowIndex}
              onSelectField={fields.setSelectedFieldId}
              onClearAllFields={fields.clearAllFields}
              onUndo={fields.undo}
              onRedo={fields.redo}
              onFieldMouseDown={fields.handleMouseDown}
              onFieldTouchStart={fields.handleTouchStart}
              onResizeMouseDown={fields.handleResizeMouseDown}
              onResizeTouchStart={fields.handleResizeTouchStart}
              containerRef={fields.containerRef}
              onLoadSuccess={pdf.setTotalPages}
              onPageRenderSuccess={(width, height) => pdf.setPdfDimensions({ width, height })}
            />

            <Inspector
              selectedField={selectedField}
              onUpdate={fields.updateSelectedField}
              onCommit={fields.commitSelectedField}
              onUpdateCommit={fields.updateAndCommitField}
              onDuplicate={fields.handleDuplicateField}
              onDelete={fields.removeField}
              onMoveToFront={fields.moveFieldToFront}
              onMoveToBack={fields.moveFieldToBack}
            />
          </div>
        )}

        <ExportDialog
          open={exportState.exportDialogOpen}
          onOpenChange={exportState.handleExportDialogChange}
          csvHeaders={csv.csvHeaders}
          csvRows={csv.csvRows}
          pdfFile={pdf.pdfFile}
          filenameColumn={csv.filenameColumn}
          onFilenameColumnChange={csv.setFilenameColumn}
          isProcessing={exportState.isProcessing}
          processingProgress={exportState.processingProgress}
          processingMessage={exportState.processingMessage}
          onDownloadCombined={exportState.handleDownloadCombinedPDF}
          onDownloadZip={exportState.handleDownloadZIP}
        />
      </div>
    </TooltipProvider>
  );
}
