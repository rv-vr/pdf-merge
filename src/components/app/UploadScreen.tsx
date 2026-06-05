import React, { useState } from 'react';
import { FileText, FileUp, RotateCcw, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  kind: 'pdf' | 'csv';
  file: File | null;
  csvRowCount?: number;
  csvColCount?: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputId: string;
}

function Dropzone({ kind, file, csvRowCount, csvColCount, onUpload, inputId }: DropzoneProps) {
  const [hover, setHover] = useState(false);
  const isPdf = kind === 'pdf';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(true);
  };
  const handleDragLeave = () => setHover(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    const syntheticEvent = {
      target: { files: e.dataTransfer.files },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onUpload(syntheticEvent);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition-colors cursor-pointer',
        hover
          ? 'border-foreground/20 bg-accent/40'
          : file
          ? 'border-border bg-background'
          : 'border-dashed border-border bg-background hover:border-foreground/20 hover:bg-accent/20'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !file && document.getElementById(inputId)?.click()}
    >
      <input
        id={inputId}
        type="file"
        accept={isPdf ? '.pdf' : '.csv'}
        onChange={onUpload}
        aria-label={isPdf ? 'Upload PDF template' : 'Upload CSV dataset'}
        className="absolute inset-0 cursor-pointer opacity-0"
        style={{ zIndex: -1 }}
      />

      {file ? (
        <>
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              isPdf
                ? 'bg-red-50 text-red-500 dark:bg-red-950/30'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
            )}
          >
            <FileText className="size-5" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="max-w-48 truncate text-sm font-medium">{file.name}</span>
              <Badge variant="secondary" className="gap-1 px-1.5 text-[10px]">
                <Check className="size-2.5" />
                Ready
              </Badge>
            </div>
            {!isPdf && csvRowCount !== undefined && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {csvRowCount} rows · {csvColCount} columns
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(inputId)?.click();
            }}
            className="h-7 gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            Replace
          </Button>
        </>
      ) : (
        <>
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              isPdf
                ? 'bg-red-50/80 text-red-400 dark:bg-red-950/25 dark:text-red-500'
                : 'bg-emerald-50/80 text-emerald-500 dark:bg-emerald-950/25 dark:text-emerald-500'
            )}
          >
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{isPdf ? 'Template PDF' : 'CSV Dataset'}</p>
            <p className="mt-1 max-w-44 text-xs leading-relaxed text-muted-foreground">
              {isPdf
                ? 'Certificate, invoice, or form to merge data into'
                : 'The records — one row becomes one merged document'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(inputId)?.click();
            }}
            className="h-7 gap-1.5 text-xs"
          >
            <FileUp className="size-3.5" />
            Choose {isPdf ? '.pdf' : '.csv'}
          </Button>
        </>
      )}
    </div>
  );
}

interface UploadScreenProps {
  pdfFile: File | null;
  csvFileName: string;
  csvRows: Record<string, string>[];
  csvHeaders: string[];
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContinue: () => void;
}

export function UploadScreen({
  pdfFile,
  csvFileName: _csvFileName,
  csvRows,
  csvHeaders,
  onPdfUpload,
  onCsvUpload,
  onContinue,
}: UploadScreenProps) {
  const ready = !!pdfFile && csvRows.length > 0;

  const csvFile = csvRows.length > 0 ? ({ name: _csvFileName || 'data.csv' } as File) : null;

  const statusText = ready
    ? 'Both files ready'
    : pdfFile || csvRows.length > 0
    ? '1 of 2 uploaded'
    : 'Upload both files to continue';

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto bg-muted/20 p-8">
      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Bulk-merge your dataset into a PDF
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a template and a CSV, place fields, then export hundreds of personalized PDFs.
          </p>
        </div>

        {/* Dropzones */}
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Dropzone kind="pdf" file={pdfFile} onUpload={onPdfUpload} inputId="pdf-upload" />
          <Dropzone
            kind="csv"
            file={csvFile}
            csvRowCount={csvRows.length}
            csvColCount={csvHeaders.length}
            onUpload={onCsvUpload}
            inputId="csv-upload"
          />
        </div>

        {/* Footer */}
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted-foreground">{statusText}</span>
          <Button disabled={!ready} onClick={onContinue} size="sm" className="gap-1.5">
            Open editor
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
