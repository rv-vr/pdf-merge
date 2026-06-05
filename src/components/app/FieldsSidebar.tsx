import { useState } from 'react';
import { FileSpreadsheet, Search, Tag, Plus, GripVertical, X, Info, Hash, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PlacedField } from '@/types';
import { cn } from '@/lib/utils';

function getColumnIcon(header: string) {
  const lower = header.toLowerCase();
  if (lower.includes('date') || lower.includes('id') || lower.includes('num') || lower.includes('grade') || lower.includes('hours')) {
    return <Hash className="size-3.5 shrink-0" />;
  }
  return <Type className="size-3.5 shrink-0" />;
}

interface FieldsSidebarProps {
  csvFileName: string;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  placedFields: PlacedField[];
  selectedFieldId: string | null;
  onAddField: (header: string) => void;
  onRemoveField: (id: string) => void;
  onSelectField: (id: string | null) => void;
}

export function FieldsSidebar({
  csvFileName,
  csvHeaders,
  csvRows,
  placedFields,
  selectedFieldId,
  onAddField,
  onRemoveField,
  onSelectField,
}: FieldsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = csvHeaders.filter((h) =>
    h.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countOf = (col: string) => placedFields.filter((f) => f.fieldName === col).length;

  return (
      <div className="flex min-h-0 w-67 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        {/* Dataset summary */}
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{csvFileName || 'No CSV loaded'}</p>
              <p className="text-[11px] text-muted-foreground">
                {csvHeaders.length} columns · {csvRows.length} rows
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">CSV</Badge>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search columns…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1 overflow-hidden w-full">
          <div className="px-3 py-3">
            {/* Insert Fields section */}
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Insert Fields
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                    <Info className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-45 text-xs">
                  Click a column to place it on the PDF canvas
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Column cards */}
            <div className="flex flex-col gap-1">
              {filtered.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">No matching columns.</p>
              ) : (
                filtered.map((header) => {
                  const count = countOf(header);
                  const sample = csvRows[0]?.[header] ?? '';
                  return (
                    <button
                      key={header}
                      type="button"
                      onClick={() => onAddField(header)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-accent"
                    >
                      <span className="text-muted-foreground">{getColumnIcon(header)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium leading-tight">{header}</span>
                        <span className="block truncate font-mono text-[10px] text-muted-foreground">
                          {sample}
                        </span>
                      </span>
                      {count > 0 && (
                        <Badge variant="secondary" className="shrink-0 px-1.5 text-[10px]">
                          {count}
                        </Badge>
                      )}
                      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Placed fields section */}
            {placedFields.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Placed on Template ({placedFields.length})
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {placedFields.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelectField(f.id)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
                        f.id === selectedFieldId && 'bg-accent'
                      )}
                    >
                      <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" />
                      <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {f.fieldName}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {f.fontSize}pt
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveField(f.id);
                        }}
                        title="Remove field"
                      >
                        <X className="size-3" />
                      </Button>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
  );
}
