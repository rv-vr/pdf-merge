# AGENTS.md — PDF Data Merger

Start each session by loading the `/caveman` skill. Use `/react-doctor` after feature work.

## Commands

| Command           | Action                                                |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Vite dev server                                       |
| `npm run build`   | `tsc -b && vite build` — typecheck + production build |
| `npm run lint`    | ESLint                                                |
| `npm run preview` | Vite preview (built output)                           |
| `npm run doctor`  | react-doctor diagnostics                              |

**`npm run build` does both typecheck and production build.** TypeScript 6.0 with strict mode (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`). Ensure new code satisfies all before shipping.

## Architecture

Single-page React app with two views: `'upload'` | `'editor'`. State lives in App.tsx, distributed to 4 hooks:

```
App.tsx
├── usePdf()       → pdf state, page nav, zoom
├── useCsv()       → CSV parse, rows, column headers
├── useFieldEditor() → fields, selection, drag, layer, undo/redo
└── useExport()    → export progress, PDF/ZIP generation
```

Components live in `src/components/app/`: `EditorCanvas`, `Inspector`, `FieldsSidebar`, `CanvasToolbar`, `NavBar`, `UploadScreen`, `ExportDialog`. UI primitives in `src/components/ui/`.

## Critical: Coordinate System

- Positions stored as **percentages** (0–100) of canvas, **not pixels**
- Canvas: top-left origin (CSS) → PDF: bottom-left origin (pdf-lib)
- `translateCoordinates()` in `src/lib/pdfMerger.ts` handles the flip
- Y baseline offset: **`fontSize * 0.95`** (source truth — CLAUDE.md says 0.85, ignore that)
- **Any change to field positioning must preserve this contract**

## Field Model (`PlacedField`)

```ts
id, fieldName, x, y, page (1-indexed), font, fontSize, color, isBold, isItalic,
width (percent), align?, visible?
```

## Selection & Layer

- `selectedFieldIds: string[]` (multi-select). Derived `selectedFieldId` for legacy compat
- Layer order functions accept optional `overrideIds` param — no args reads ref, with args uses provided IDs
- Undo/redo uses full state snapshots of `PlacedField[]`. Snapshot reads ref to avoid stale closures

## Inspector

3-way render: empty → `<MultiInspector>` → single-field. Each branch has own refs/effects. Color picker uses uncontrolled `defaultValue` (not controlled) to avoid React overriding.

## Vue

- **No test suite exists** — all changes must be manually verified
- `handoff.md` contains detailed Phase 3 implementation specs (field locking, preview keyboard nav, sidebar drag-to-canvas, page thumbnail strip)
- `context-menu.tsx` is stale/unused — can be removed
- Touch support required: maintain `touchstart/touchmove/touchend` alongside mouse handlers
- No server-side code. No API calls. PWA with unpkg CDN for pdfjs worker
- Tailwind v4 (CSS-based config, `@theme inline`). shadcn/ui `radix-nova` style
- Vite 8 + Rolldown. `@/` → `src/` path alias
- `GITHUB_ACTIONS` env changes `base` path (used in PWA manifest)
