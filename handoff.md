# PDF Data Merger — Agent Handoff

## Project State

100% client-side React app (React 19, Vite 8, Tailwind v4, shadcn/ui radix-nova). No server. No uploads. Full editor with multi-select, bulk editing, layer order, field visibility, auto-fit width, marquee selection, undo/redo.

### Completed Features

| Feature                                         | Files                                    | Notes                                                                                     |
| ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Multi-select (`selectedFieldIds: string[]`)     | `useFieldEditor.ts`                      | Replaces single `selectedFieldId`. Derives legacy compat.                                 |
| Marquee drag-select on canvas                   | `EditorCanvas.tsx`                       | Click-drag on PDF container selects intersecting fields.                                  |
| Ctrl+click toggle selection                     | `useFieldEditor.ts`, `FieldsSidebar.tsx` | On canvas fields + sidebar field list.                                                    |
| Ctrl+A select all visible on page               | `useFieldEditor.ts` keydown handler      |                                                                                           |
| Bulk delete (Delete/Backspace)                  | `useFieldEditor.ts` keydown handler      | Deletes all selected fields.                                                              |
| Bulk arrow nudge                                | `useFieldEditor.ts` keydown handler      | Moves all selected by same delta.                                                         |
| Bold/Italic/Alignment for multi                 | `useFieldEditor.ts` keydown handler      | Applies to all selected.                                                                  |
| Layer order single (swap by 1)                  | `moveFieldForward/Backward`              | Context menu + Inspector single-field.                                                    |
| Layer order multi (consolidate + boundary swap) | `moveSelectedToFront/Back`               | Inspector multi-select buttons. Accepts optional `overrideIds`.                           |
| Keyboard `]/[` for layer order                  | `useFieldEditor.ts` keydown handler      | Single → `moveFieldForward/Backward`, Multi → `moveSelectedToFront/Back`.                 |
| Undo/redo snapshots                             | `snapshot()` via refs                    | Arrow nudges, style changes, layer reorder all snapshot.                                  |
| Auto-fit width                                  | `useFieldEditor.ts` `autoFitWidth`       | Scans all CSV rows for longest value, estimates pixel width.                              |
| Field visibility toggle                         | `FieldsSidebar.tsx`                      | Eye/EyeOff button per field sidebar. Filters from canvas render.                          |
| Copy/paste fields (Ctrl+C/V)                    | `useFieldEditor.ts`                      | Copies all selected fields. Pastes with offset. Uses `copiedFieldsRef` array.             |
| Field Inspector mixed state                     | `Inspector.tsx` `MultiInspector`         | Font shows "Mixed" when differs. Font size shows "--". Uncontrolled ToggleGroups.         |
| Marquee field height fix                        | `EditorCanvas.tsx`                       | Uses `fontSize × zoom × 1.5` for intersection, not broken percentage calc.                |
| Inspector architecture                          | `Inspector.tsx`                          | 3 separate branches: empty, `<MultiInspector>` component, single-field. Isolated refs.    |
| No right-click context menu                     | `EditorCanvas.tsx`                       | Removed entirely. All actions via Inspector or keyboard.                                  |
| `onClick` event bug fix                         | `Inspector.tsx`                          | `onClick={() => fn()}` not `onClick={fn}` — avoids React passing MouseEvent as first arg. |
| Right-click guard in mousedown                  | `useFieldEditor.ts` `handleMouseDown`    | `if (e.button !== 0) return;` prevents selection change on right-click.                   |
| PWA workbox size limit bump                     | `vite.config.ts`                         | `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024`                                          |

### Key Architecture Decisions

- **Selection**: `selectedFieldIds: string[]` state + `selectedFieldIdsRef` (ref mirror). Derived `selectedFieldId` for legacy compat (`selectedFieldIds.length === 1 ? selectedFieldIds[0] : null`).
- **Layer order**: `(overrideIds?: string[])` signature. No args → reads ref (Inspector). With args → uses provided IDs (context menu). Single field uses `moveFieldForward/Backward(id)` direct swap.
- **Snapshot pattern**: Read from ref (`placedFieldsRef.current`) inside `setUndoStack` callback. Avoids stale closure issues.
- **Undo/Redo**: Full state snapshots (array of `PlacedField[]`). Clears selection on undo.
- **Inspector**: 3-way conditional renders `Empty / <MultiInspector> / SingleField`. Each branch has own refs, effects, lifecycle.
- **Color picker**: `BulkColorPicker` sub-component with own `useRef`+`useEffect`+`useLayoutEffect`. Isolated from single-field picker.
- **Marquee**: `mousedown` on container div (not workspace div). Tracks via `marqueeStartRef`. On `mouseup` calculates intersection with all fields.

### Remaining Phase 3 Features (Not Implemented)

---

## Phase 3 — Remaining Features

### 3.1 — Field Locking ✅

**Concept**: Add `locked: boolean` to `PlacedField`. Locked fields can't be dragged, resized, or deleted. Visual padlock indicator on field overlay and sidebar.

**Type change** (`src/lib/pdfMerger.ts`):

```ts
export interface PlacedField {
  // ... existing fields
  locked?: boolean
}
```

**DEFAULT_FIELD_PROPS** (`src/hooks/useFieldEditor.ts`): Add `locked: false`.

**Rendering** (`EditorCanvas.tsx`):

- Lock icon overlay on locked fields (bottom-left corner, small padlock)
- `cursor-not-allowed` instead of `cursor-grab` when locked
- `pointer-events-none` on resize grip when locked

**Drag/resize guards** (`useFieldEditor.ts`):

- `handleMouseDown`: `if (field.locked) return;`
- `handleTouchStart`: `if (field.locked) return;`
- `handleResizeMouseDown`: `if (field.locked) return;`
- `handleResizeTouchStart`: `if (field.locked) return;`

**Delete guard** (`useFieldEditor.ts`):

- `removeField` / keydown Delete: `if (f.locked) return;` in filter
- `clearAllFields`: skip locked fields

**Sidebar** (`FieldsSidebar.tsx`):

- Lock icon per field item (between visibility toggle and delete)
- Click to toggle lock

**Keyboard shortcut**: None needed, lock is toggled via sidebar or Inspector.

**Bulk operations**: Lock applies per-field. When bulk editing, lock toggle affects all selected non-locked fields.

**Undo**: Lock changes NOT covered by `snapshot()` currently (visibility, lock are immediate). Consider wrapping lock toggle in `snapshot()`.

**Export**: Locked fields export normally (lock is editor-only).

**Files to modify**: `pdfMerger.ts` (type), `useFieldEditor.ts` (handlers, toggle function), `EditorCanvas.tsx` (render), `FieldsSidebar.tsx` (toggle button), `Inspector.tsx` (maybe), `App.tsx` (wire).

---

### 3.2 — Preview Keyboard Navigation ✅

**Concept**: Keyboard shortcuts to cycle through CSV preview rows without touching the mouse.

**Keybindings** (`src/hooks/useFieldEditor.ts` keydown handler):

- `Ctrl+Up` / `Ctrl+Down`: Cycle preview rows (only in preview mode)
- `Ctrl+Shift+Up`: Jump to first row
- `Ctrl+Shift+Down`: Jump to last row
- `Ctrl+Number` (1-9): Jump to first, second... ninth row (proportional or absolute)

**Implementation**:

```ts
// In keydown handler, when isPreviewMode is true:
if (ctrl && isPreviewMode) {
  if (e.key === "ArrowDown") {
    e.preventDefault()
    setPreviewRowIndex((prev) => Math.min(csvRows.length - 1, prev + 1))
    return
  }
  if (e.key === "ArrowUp") {
    e.preventDefault()
    setPreviewRowIndex((prev) => Math.max(0, prev - 1))
    return
  }
}
```

**Dependency injection**: `isPreviewMode` and `setPreviewRowIndex` already in the hook. Need `csvRows.length` for bounds. Currently `csvRows` is not in the hook — need to either pass it, or just use stored ref.

**Approach**: Store `csvRows` ref in useFieldEditor:

```ts
const csvRowsRef = useRef<Record<string, string>[]>([])
useEffect(() => {
  csvRowsRef.current = csvRows
}, [csvRows])
```

Pass `csvRows` from App.tsx: add param to `useFieldEditor(currentPage, csvRows)` or set via a setter.

Simpler: pass `totalRows` number instead of full data.

**NavBar updates**: Add preview keyboard shortcuts to the keyboard shortcuts dialog.

**Files to modify**: `useFieldEditor.ts` (keydown handler), `App.tsx` (pass csvRowsLength), `NavBar.tsx` (shortcuts dialog).

---

### 3.3 — Sidebar Drag-to-Canvas ✅

**Concept**: Drag a CSV column from the sidebar directly onto the PDF canvas to create a field at the drop position.

**Drag source** (`FieldsSidebar.tsx`):

- Use HTML5 Drag & Drop API (`draggable`, `onDragStart`)
- Store the column name in `dataTransfer`
- Show drag ghost/image

**Drop target** (`EditorCanvas.tsx` container):

- `onDragOver`: `e.preventDefault()` to allow drop
- `onDrop`: Read column name from `dataTransfer`, calculate drop position as percentage of container dimensions
- Call `addFieldToPage(header)` then immediately update the field's x/y to the drop position

**Position calculation**:

```ts
const rect = containerRef.current.getBoundingClientRect()
const xPercent = ((e.clientX - rect.left) / rect.width) * 100
const yPercent = ((e.clientY - rect.top) / rect.height) * 100
```

**Field creation**: Modify `addFieldToPage` to accept optional `{ x, y }` overrides, or create field then immediately set position.

**Approach 1**: Add optional `pos` param to `addFieldToPage`:

```ts
const addFieldToPage = (header: string, pos?: { x: number; y: number }) => {
  // ... existing code
  x: pos?.x ?? 40,
  y: pos?.y ?? 45,
  // ...
};
```

**Approach 2**: After `addFieldToPage` returns (field created at default position), immediately update its position. But this requires knowing the new field's ID.

**Sidebar changes**:

- Add `draggable` to column items
- `onDragStart`: `e.dataTransfer.setData('text/plain', header)`
- Visual: change cursor to `grab`/`grabbing`

**Edge cases**:

- Drag to area outside container → no drop (handled by onDragOver)
- Multiple identical columns → each instance drop creates another field
- Drop on preview mode → ignore

**Files to modify**: `FieldsSidebar.tsx` (drag source), `EditorCanvas.tsx` (drop target), `useFieldEditor.ts` (optional pos param), `App.tsx` (wire onDrop handler), `CanvasToolbar.tsx` (maybe drag state indicator).

---

### 3.4 — Page Thumbnail Strip ❌ (Removed — no use case)

**Component location**: New component or inline in `EditorCanvas.tsx`, rendered between `CanvasToolbar` and the workspace div.

**Data needed**:

- Total pages (`totalPages`)
- Current page (`currentPage`)
- Pages with fields (derive from `placedFields.map(f => f.page)`)

**Rendering**:

- Horizontally scrollable strip
- Each thumbnail: small numbered box (use `pdfjs` to render actual thumbnail, or just numbered box)
- Active page: highlighted border
- Pages with fields: dot indicator or badge
- Click to navigate → `onPageChange(page)`

**Simple version** (no actual PDF thumbnails to avoid pdfjs render cost):

```tsx
<div className="flex gap-1 overflow-auto px-3 py-2 bg-card border-b border-border">
  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
    const hasFields = placedFields.some((f) => f.page === page)
    return (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded text-xs font-medium transition-colors",
          page === currentPage
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        )}
      >
        {page}
        {hasFields && (
          <div className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
        )}
      </button>
    )
  })}
</div>
```

**Position**: Between `CanvasToolbar` and the workspace `div`. In `EditorCanvas.tsx`:

```tsx
<CanvasToolbar ... />
<PageThumbnails totalPages={totalPages} currentPage={currentPage} placedFields={placedFields} onPageChange={onPageChange} />
<div className="flex flex-1 items-start justify-center overflow-auto ...">
```

**Responsive**: Hide on narrow widths or collapse into a dropdown.

**Integration with multi-select**: Switching pages clears selection (already handled by `handleWorkspaceMouseDown`/`onSelectField(null)`). No change needed.

**Files to modify**: `EditorCanvas.tsx` (render strip), `App.tsx` (pass needed props), new component `PageThumbnails.tsx` (optional extraction).

---

## General Improvements & Bug Fixes

### G.1 — Bundle Size

Current bundle ~2.1 MB (JS). Consider:

- **Dynamic import for pdfjs** (pdfjs is ~1.5MB). Currently loaded eagerly via `react-pdf`. Can lazy-load the PDF view components.
- **Dynamic import for pdf-lib** (pdf-lib is ~500KB). Only needed during export.
- **Code splitting**: Split by route (upload screen vs editor vs export dialog).

Vite config supports dynamic imports natively. Use `React.lazy()` for heavy components:

```tsx
const ExportDialog = React.lazy(() => import("@/components/app/ExportDialog"))
const EditorCanvas = React.lazy(() => import("@/components/app/EditorCanvas"))
```

### G.2 — Testing

No test suite exists. Consider:

- **Unit tests**: `useFieldEditor` hook logic (layer order, multi-select, undo/redo)
- **Component tests**: Inspector (empty/single/multi states), FieldsSidebar (column list, drag)
- **E2E**: Playwright for critical flows: upload → place fields → style → preview → export

Test framework suggestion: Vitest (matches Vite config). Component testing: `@testing-library/react`.

### G.3 — Accessibility

- Color picker hex input: no `change` event on keyboard entry (only `onBlur`). Add `onKeyDown` for Enter.
- Field elements have `role="button"` but no keyboard activation handler. Add `onKeyDown` for Enter/Space to select/activate.
- Sidebar column list uses `<button>` elements inside `<button>` (nested buttons in grip + select + remove). Fix: use `<div>` with `role="button"` or restructure.
- ToggleGroup items missing `aria-pressed` (should be handled by radix, verify).

### G.4 — Stale File Removal

- `context-menu.tsx` component can be removed (no longer used anywhere).
- `onDuplicateField`/`onDeleteField`/`onCopyStyle`/`onPasteStyle`/`onMoveSelectedToFront`/`onMoveSelectedToBack` props were removed from `EditorCanvas.tsx`. Verify none remain in `App.tsx`.

### G.5 — Known Quirks

- `React.ComponentProps<typeof ...>` in shadcn components includes `onClick` which conflicts with radix's `onSelect`. Context menu was removed so this is no longer an issue.
- `useLayoutEffect` for color sync (`colorInputRef.current.value = ...`) runs synchronously. If input is controlled (`value={...}`), React overrides it after layout effect. The color input uses `defaultValue` (uncontrolled) to avoid this. Multi-select uses `<BulkColorPicker>` with its own ref.
- Color event listener effect dep `selectedField?.id` changes on field switch, causing re-attach. Correct behavior.
- `snapshot()` inside `setPlacedFields` callback creates two state updates. React 19 batches these in event handlers. Outside event handlers (e.g., in effects), wrap in `React.startTransition` or use `unstable_batchedUpdates`.

---

## File Index

| File                                   | Purpose                                       | Key Exports                                                                    |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/pdfMerger.ts`                 | PDF generation, PlacedField type              | `PlacedField`, `generateCombinedPDF`, `generateZIP`, `generateSingleMergedPDF` |
| `src/hooks/useFieldEditor.ts`          | All field state, selection, drag, layer order | `useFieldEditor`                                                               |
| `src/hooks/usePdf.ts`                  | PDF loading, page nav, zoom                   | `usePdf`                                                                       |
| `src/hooks/useCsv.ts`                  | CSV parsing                                   | `useCsv`                                                                       |
| `src/hooks/useExport.ts`               | Export dialog state, PDF generation           | `useExport`                                                                    |
| `src/components/app/EditorCanvas.tsx`  | PDF canvas, field overlays, marquee, drag     | `EditorCanvas`                                                                 |
| `src/components/app/Inspector.tsx`     | Field inspector, multi-select controls        | `Inspector`, `MultiInspector`, `BulkColorPicker`                               |
| `src/components/app/FieldsSidebar.tsx` | CSV columns, placed field list, drag reorder  | `FieldsSidebar`                                                                |
| `src/components/app/CanvasToolbar.tsx` | Preview mode, zoom, undo/redo, page nav       | `CanvasToolbar`                                                                |
| `src/components/app/NavBar.tsx`        | Top bar, keyboard shortcuts dialog            | `NavBar`                                                                       |
| `src/components/app/UploadScreen.tsx`  | Drag-and-drop file upload                     | `UploadScreen`                                                                 |
| `src/components/app/ExportDialog.tsx`  | Export format selection, progress             | `ExportDialog`                                                                 |
| `src/App.tsx`                          | Root component, state wiring                  | `App`                                                                          |
| `vite.config.ts`                       | Build config, PWA, workbox                    |                                                                                |

### Data Flow

```
App.tsx
├── usePdf() → pdf state, handlers
├── useCsv() → csv state, handlers
├── useFieldEditor() → fields state, selection, drag, layer
├── useExport() → export state, progress
│
├── NavBar (pdf info, csv count, dark mode, export button, keyboard dialog)
├── UploadScreen (pdf + csv dropzones, continue button)
├── EditorCanvas
│   ├── CanvasToolbar (preview, zoom, undo/redo, page nav)
│   ├── Page thumbnails (not implemented)
│   ├── PDF canvas (react-pdf)
│   └── Field overlays (drag, resize, multi-select styling)
├── FieldsSidebar
│   ├── Dataset summary
│   ├── Column search + insert
│   └── Placed fields list (reorder, visibility, selection highlight)
└── Inspector
    ├── Empty state
    ├── MultiInspector (bulk typography, color, fit width, layer order)
    └── Single field (font, size, bold/italic, align, color, position, layer, duplicate/delete)
```

---

## Implementation Order (Recommended)

1. **Sidebar drag-to-canvas** (3.3) — most user-facing value, moderate effort
2. **Preview keyboard nav** (3.2) — small effort, high UX impact
3. **Page thumbnail strip** (3.4) — medium effort, good for multi-page workflows
4. **Field locking** (3.1) — moderate effort, pairs well with multi-select
5. **Bundle optimization** (G.1) — when bundle size becomes a deploy issue
6. **Accessibility** (G.3) — ongoing, fix as encountered
