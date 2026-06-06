import { FileText, Download, Info, Sun, Moon, Keyboard } from 'lucide-react';
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

const SHORTCUT_GROUPS = [
  {
    label: 'History',
    shortcuts: [
      { keySets: [['Ctrl', 'Z']], description: 'Undo' },
      { keySets: [['Ctrl', 'Y'], ['Ctrl', 'Shift', 'Z']], description: 'Redo' },
    ],
  },
  {
    label: 'Typography',
    shortcuts: [
      { keySets: [['Ctrl', 'B']], description: 'Toggle bold' },
      { keySets: [['Ctrl', 'I']], description: 'Toggle italic' },
      { keySets: [['Ctrl', 'Shift', 'L']], description: 'Align left' },
      { keySets: [['Ctrl', 'Shift', 'E']], description: 'Align center' },
      { keySets: [['Ctrl', 'Shift', 'R']], description: 'Align right' },
    ],
  },
  {
    label: 'Field position',
    shortcuts: [
      { keySets: [['↑ ↓ ← →'], ['Shift', '↑ ↓ ← →']], description: 'Nudge field' },
    ],
  },
  {
    label: 'Layer order',
    shortcuts: [
      { keySets: [[']']], description: 'Move forward one layer' },
      { keySets: [['[']], description: 'Move backward one layer' },
      { keySets: [['Ctrl', ']']], description: 'Bring to front' },
      { keySets: [['Ctrl', '[']], description: 'Send to back' },
    ],
  },
  {
    label: 'Field management',
    shortcuts: [
      { keySets: [['Delete'], ['Backspace']], description: 'Delete selected field' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
            <Separator orientation="vertical"  />
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
          onClick={() => setShortcutsOpen(true)}
          className="size-8 rounded-lg"
          title="Keyboard shortcuts"
        >
          <Keyboard className="size-4" />
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

        {view === 'editor' && (
          <>
            <Separator orientation="vertical"  />
            <Button onClick={onExportClick} size="sm" className="gap-1.5" disabled={!canExport}>
              <Download className="size-3.5" />
              Export
            </Button>
          </>
        )}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Shortcuts work when a field is selected and no text input is focused.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground">{s.description}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {s.keySets.flatMap((keySet, j) => [
                          ...(j > 0 ? [<span key={`sep-${j}`} className="px-0.5 text-[10px] text-muted-foreground">/</span>] : []),
                          ...keySet.map((k) => <Kbd key={`${j}-${k}`}>{k}</Kbd>),
                        ])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
