# PDF Merger

A secure, 100% client-side tool to bulk-merge CSV datasets into PDF templates.

## How to Use

1. **Upload Files**:
   - Upload your template PDF (e.g., certificate, invoice, form).
   - Upload your CSV dataset containing the merge values.
2. **Place Fields**:
   - Click column name buttons in the **Insert Fields** sidebar to place placeholder tags on the PDF template.
   - Click a field in the preview window to select it. Drag or use arrow keys to position it. Drag the right edge to resize the field width.
3. **Style Fields**:
   - Customize font size (pt), family (Helvetica, Times New Roman, Courier), styling (Bold, Italic), and text color for the selected field.
   - Newly added fields will automatically copy the last used styling configurations.
4. **Preview Merge**:
   - Click **Preview Mode: OFF** on the canvas header to toggle previewing on.
   - In preview mode, all text fields are locked from editing/dragging.
   - Use the row selector next to the preview toggle to switch rows and review formatting with real CSV values.
5. **Batch Export**:
   - Click the **Export** button in the top navigation bar.
   - Select the CSV column to use for filenames.
   - Download a unified PDF containing all records or a ZIP file containing separate named PDFs.

## Local Development

### Prerequisites

- Node.js installed

### Commands

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Run local development server**:
   ```bash
   npm run dev
   ```
3. **Build production bundle**:
   ```bash
   npm run build
   ```
