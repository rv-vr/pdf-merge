import React, { useState } from 'react';
import { FileText, FileUp, RotateCcw, Check, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    <Card
      className={cn(
        'relative cursor-pointer transition-colors',
        hover && 'border-primary/50 bg-accent/30',
        file && 'border-border'
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
        className="absolute inset-0 cursor-pointer opacity-0"
        style={{ zIndex: -1 }}
      />
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        {file ? (
          <>
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-xl',
                isPdf ? 'bg-red-50 text-red-500 dark:bg-red-950/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30'
              )}
            >
              <FileText className="size-6" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="max-w-[200px] truncate text-sm font-semibold">{file.name}</span>
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Check className="size-2.5" />
                  Ready
                </Badge>
              </div>
              {!isPdf && csvRowCount !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
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
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Replace
            </Button>
          </>
        ) : (
          <>
            <div
              className={cn(
                'flex size-12 items-center justify-center rounded-xl bg-muted',
                isPdf ? 'text-muted-foreground' : 'text-muted-foreground'
              )}
            >
              <FileText className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isPdf ? 'Template PDF' : 'CSV Dataset'}
              </p>
              <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-muted-foreground">
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
              className="gap-1.5"
            >
              <FileUp className="size-3.5" />
              Choose {isPdf ? '.pdf' : '.csv'} file
            </Button>
            <p className="text-xs text-muted-foreground">or drop it here</p>
          </>
        )}
      </CardContent>
    </Card>
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

  // Create a mock File-like for CSV display (we only have metadata)
  const csvFile = csvRows.length > 0 ? ({ name: _csvFileName || 'data.csv' } as File) : null;

  const statusText = ready
    ? 'Both files ready'
    : pdfFile || csvRows.length > 0
    ? '1 of 2 uploaded'
    : 'Upload both files to continue';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-auto bg-muted/30 p-8">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Bulk-merge your dataset into a PDF
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Upload a template and a CSV, place fields where the data should go, then export
            hundreds of personalized PDFs at once.
          </p>
        </div>

        {/* Dropzones */}
        <Card className="w-full">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dropzone
                kind="pdf"
                file={pdfFile}
                onUpload={onPdfUpload}
                inputId="pdf-upload"
              />
              <Dropzone
                kind="csv"
                file={csvFile}
                csvRowCount={csvRows.length}
                csvColCount={csvHeaders.length}
                onUpload={onCsvUpload}
                inputId="csv-upload"
              />
            </div>

            <Separator className="my-5" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{statusText}</span>
              <Button
                disabled={!ready}
                onClick={onContinue}
                size="lg"
                className="gap-2"
              >
                Open editor
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Load sample shortcut */}
        <button
          onClick={() => {
            // Trigger a synthetic upload to show users what to do
            document.getElementById('pdf-upload')?.click();
          }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Sparkles className="size-3" />
          Upload a PDF template to get started
        </button>
      </div>
    </div>
  );
}
