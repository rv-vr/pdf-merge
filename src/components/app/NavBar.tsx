import { FileText, Download, Info, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface NavBarProps {
  isDarkMode: boolean;
  onToggleDark: () => void;
  canExport: boolean;
  onExportClick: () => void;
  view: 'upload' | 'editor';
  pdfFileName?: string;
  csvRowCount?: number;
  onBackToUpload?: () => void;
}

export function NavBar({
  isDarkMode,
  onToggleDark,
  canExport,
  onExportClick,
  view,
  pdfFileName,
  csvRowCount,
  onBackToUpload,
}: NavBarProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
      {/* Left: Logo + file info */}
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight tracking-tight">PDF Data Merger</span>
        </div>

        {view === 'editor' && pdfFileName && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToUpload}
              className="gap-1.5 text-xs"
            >
              ← Files
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="max-w-45 truncate font-medium">{pdfFileName}</span>
              {csvRowCount !== undefined && (
                <Badge variant="secondary" className="text-[10px]">
                  {csvRowCount} records
                </Badge>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInfoOpen(true)}
          className="size-8 rounded-lg"
          title="How to use"
        >
          <Info className="size-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDark}
          className="size-8 rounded-lg"
          title="Toggle theme"
        >
          {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <Separator orientation="vertical" className="h-5" />
        <Button onClick={onExportClick} size="sm" className="gap-1.5" disabled={!canExport}>
          <Download className="size-3.5" />
          Export
        </Button>
      </div>

      {/* Info / How-to Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How to Use PDF Data Merger</DialogTitle>
            <DialogDescription>
              Follow these steps to bulk-generate customized documents:
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4 text-sm leading-relaxed text-muted-foreground">
            <div className="flex gap-3">
              <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                1
              </Badge>
              <p>
                Upload a <strong className="text-foreground">PDF template</strong> (a certificate,
                invoice, or letter form).
              </p>
            </div>
            <div className="flex gap-3">
              <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                2
              </Badge>
              <p>
                Upload a <strong className="text-foreground">CSV file</strong> containing columns of
                values (e.g., Name, Date, ID).
              </p>
            </div>
            <div className="flex gap-3">
              <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                3
              </Badge>
              <p>
                <strong className="text-foreground">Click</strong> fields from the sidebar onto the
                PDF page template.
              </p>
            </div>
            <div className="flex gap-3">
              <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                4
              </Badge>
              <p>
                Select a field to customize its{' '}
                <strong className="text-foreground">Font, Size, Color, and Weight</strong>.
              </p>
            </div>
            <div className="flex gap-3">
              <Badge className="size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs">
                5
              </Badge>
              <p>
                Toggle <strong className="text-foreground">Preview Mode</strong> to review values,
                then export your documents!
              </p>
            </div>
            <Separator />
            <div className="rounded-lg bg-muted p-3 text-xs">
              <strong>🔒 Absolute Privacy:</strong> PDF rendering, CSV parsing, and document
              assembly are done 100% in your browser. No files or values are sent to any server.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
