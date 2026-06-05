import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
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

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs';

export default function App() {
  const [view, setView] = useState<'upload' | 'editor'>('upload');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const pdf = usePdf(view);
  const csv = useCsv();
  const fields = useFieldEditor(pdf.currentPage);
  const exportState = useExport(pdf.pdfBytes, pdf.pdfFile, csv.csvRows, fields.placedFields, csv.filenameColumn);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
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
          onToggleDark={() => setIsDarkMode(!isDarkMode)}
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
              onRemoveField={(id) => {
                fields.setPlacedFields((prev) => prev.filter((f) => f.id !== id));
                if (fields.selectedFieldId === id) fields.setSelectedFieldId(null);
              }}
              onSelectField={fields.setSelectedFieldId}
            />

            <EditorCanvas
              pdfBytes={pdf.pdfBytes}
              pdfDoc={pdf.pdfDoc}
              totalPages={pdf.totalPages}
              currentPage={pdf.currentPage}
              pdfDimensions={pdf.pdfDimensions}
              placedFields={fields.placedFields}
              selectedFieldId={fields.selectedFieldId}
              isPreviewMode={fields.isPreviewMode}
              previewRowIndex={fields.previewRowIndex}
              csvRows={csv.csvRows}
              zoom={pdf.zoom}
              onPageChange={pdf.setCurrentPage}
              onZoomChange={pdf.setZoom}
              onTogglePreview={() => {
                fields.setIsPreviewMode(!fields.isPreviewMode);
                fields.setSelectedFieldId(null);
              }}
              onPreviewRowChange={fields.setPreviewRowIndex}
              onSelectField={fields.setSelectedFieldId}
              onClearAllFields={() => {
                fields.setPlacedFields([]);
                fields.setSelectedFieldId(null);
              }}
              onFieldMouseDown={fields.handleMouseDown}
              onFieldTouchStart={fields.handleTouchStart}
              onResizeMouseDown={fields.handleResizeMouseDown}
              onResizeTouchStart={fields.handleResizeTouchStart}
              canvasRef={pdf.canvasRef}
              containerRef={fields.containerRef}
            />

            <Inspector
              selectedField={selectedField}
              onUpdate={fields.updateSelectedField}
              onDuplicate={fields.handleDuplicateField}
              onDelete={(id) => {
                fields.setPlacedFields((prev) => prev.filter((f) => f.id !== id));
                fields.setSelectedFieldId(null);
              }}
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
