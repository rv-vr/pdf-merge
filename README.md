# PDF Merge

A 100% client-side tool to bulk-merge CSV datasets into PDF templates. No server. No uploads. Everything runs in the browser.

---

## Features

### File Handling
- Upload any PDF as a template (certificates, invoices, forms, etc.)
- Upload a CSV file — columns become merge fields
- All processing is local; no data leaves your device

### Field Placement
- Insert CSV column fields onto the PDF canvas via sidebar buttons
- Click a field to select it
- Drag fields to reposition or use arrow keys for precise nudging
- Drag the right edge of a field to resize its width
- Delete selected fields with the Delete / Backspace key
- Multi-page PDF templates supported — fields are bound to their page

### Field Styling
- Per-field typography: font family (Helvetica, Times New Roman, Courier), size (pt), bold, italic, text color
- New fields auto-inherit the last used style

### Preview Mode
- Toggle preview to see real CSV values rendered on the template
- Fields are locked (non-draggable) in preview mode
- Row selector lets you step through every CSV record before exporting

### Batch Export
- Choose a CSV column to use as filenames
- Export as a single combined multi-page PDF (all records)
- Export as a ZIP archive of individually named PDFs

### PWA Support
- Installable as a Progressive Web App on desktop and mobile
- Works offline after first load

---

## Local Development

### Prerequisites

- Node.js ≥ 18

### Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build (TypeScript check + Vite bundle)
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint
```
