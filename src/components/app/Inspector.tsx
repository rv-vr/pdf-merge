import {
  Tag,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { PlacedField } from '@/types';
import { cn } from '@/lib/utils';

const COLOR_SWATCHES = [
  '#000000',
  '#ffffff',
  '#1a1a2e',
  '#52525b',
  '#4f46e5',
  '#059669',
  '#dc2626',
  '#d97706',
];

interface InspectorProps {
  selectedField: PlacedField | undefined;
  onUpdate: (updates: Partial<PlacedField>) => void;
  onDuplicate: (field: PlacedField) => void;
  onDelete: (id: string) => void;
}

export function Inspector({ selectedField, onUpdate, onDuplicate, onDelete }: InspectorProps) {
  return (
    <div className="flex h-full w-75 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
        <Tag className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Field Inspector</span>
      </div>

      {/* Empty state */}
      {!selectedField ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Tag className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">No field selected</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Click a field on the template to edit its font, color, and position — or add one from
              the sidebar.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {/* Field header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Tag className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">
                {selectedField.fieldName}
              </p>
              <code className="font-mono text-[10px] text-muted-foreground">
                {`{{${selectedField.fieldName}}}`}
              </code>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicate(selectedField)}
              title="Duplicate field"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(selectedField.id)}
              title="Delete field"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          {/* Typography group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Typography
            </p>

            {/* Font family */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Font family</Label>
              <Select
                value={selectedField.font}
                onValueChange={(val: 'Helvetica' | 'Times-Roman' | 'Courier') =>
                  onUpdate({ font: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Helvetica">Helvetica (Sans-serif)</SelectItem>
                  <SelectItem value="Times-Roman">Times New Roman (Serif)</SelectItem>
                  <SelectItem value="Courier">Courier (Monospace)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font size */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Font size</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={144}
                  step={1}
                  value={[selectedField.fontSize]}
                  onValueChange={([val]) => onUpdate({ fontSize: val })}
                  className="flex-1"
                />
                <div className="relative w-16 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={144}
                    value={selectedField.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) onUpdate({ fontSize: Math.max(1, Math.min(144, val)) });
                    }}
                    className="w-full pr-6 text-center text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    pt
                  </span>
                </div>
              </div>
            </div>

            {/* Style + alignment */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Style &amp; alignment</Label>
              <div className="flex items-center justify-between">
                {/* Bold / Italic */}
                <ToggleGroup
                  type="multiple"
                  spacing={0}
                  value={[
                    ...(selectedField.isBold ? ['bold'] : []),
                    ...(selectedField.isItalic ? ['italic'] : []),
                  ]}
                  onValueChange={(values) =>
                    onUpdate({
                      isBold: values.includes('bold'),
                      isItalic: values.includes('italic'),
                    })
                  }
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="bold" className="w-9 font-bold">
                    B
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" className="w-9 italic">
                    I
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Alignment */}
                <ToggleGroup
                  type="single"
                  spacing={0}
                  value={selectedField.align ?? 'left'}
                  onValueChange={(val) => {
                    if (val) onUpdate({ align: val as 'left' | 'center' | 'right' });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="left" className="w-9">
                    <AlignLeft className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="center" className="w-9">
                    <AlignCenter className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="right" className="w-9">
                    <AlignRight className="size-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Color group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Color
            </p>

            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onUpdate({ color })}
                  aria-label={color}
                  title={color}
                  style={{ backgroundColor: color }}
                  className={cn(
                    'size-7 rounded border border-border shadow-sm transition-transform hover:scale-105 active:scale-95',
                    color.toLowerCase() === '#ffffff' && 'border-border',
                    selectedField.color.toLowerCase() === color.toLowerCase() &&
                      'scale-110 ring-2 ring-ring ring-offset-2'
                  )}
                />
              ))}
            </div>

            {/* Hex + color picker */}
            <div className="flex items-center gap-2">
              <label
                className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border"
                style={{ backgroundColor: selectedField.color }}
                title="Pick custom color"
                aria-label="Pick custom color"
              >
                <input
                  type="color"
                  value={selectedField.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="absolute -inset-1 cursor-pointer opacity-0"
                />
              </label>
              <div className="flex flex-1 items-center rounded-md border border-input px-2.5 h-9">
                <span className="font-mono text-sm text-muted-foreground">#</span>
                <input
                  type="text"
                  value={selectedField.color.replace('#', '').toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    onUpdate({ color: '#' + v });
                  }}
                  aria-label="Hex color value"
                  className="flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:text-muted-foreground"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Position & size group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Position &amp; size
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Math.round(selectedField.x * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdate({ x: Math.max(0, Math.min(100, val)) });
                  }}
                  className="h-8 text-center text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Math.round(selectedField.y * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdate({ y: Math.max(0, Math.min(100, val)) });
                  }}
                  className="h-8 text-center text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">W</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={Math.round(selectedField.width * 10) / 10}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onUpdate({ width: Math.max(1, Math.min(100, val)) });
                  }}
                  className="h-8 text-center text-xs"
                />
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3 shrink-0" />
              Use arrow keys to nudge. Hold Shift for larger steps.
            </p>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
