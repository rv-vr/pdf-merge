import { 
  PDFDocument, 
  rgb, 
  StandardFonts, 
  pushGraphicsState, 
  popGraphicsState, 
  moveTo, 
  lineTo, 
  closePath, 
  clip, 
  endPath 
} from 'pdf-lib';
import JSZip from 'jszip';

export interface PlacedField {
  id: string;
  fieldName: string;
  x: number; // percentage from left of canvas (0 - 100)
  y: number; // percentage from top of canvas (0 - 100)
  page: number; // page number (1-indexed)
  font: 'Helvetica' | 'Times-Roman' | 'Courier';
  fontSize: number;
  color: string; // hex color (e.g. #000000)
  isBold: boolean;
  isItalic: boolean;
  width: number; // width as percentage of page width (0 - 100)
}



/**
 * Translates page percentage coordinates from the screen canvas (top-left origin)
 * into PDF points (bottom-left origin).
 */
function translateCoordinates(
  xPercent: number,
  yPercent: number,
  pdfWidth: number,
  pdfHeight: number,
  fontSize: number
): { x: number; y: number } {
  // Convert percentage directly to pdf points (top-left x)
  const x = (xPercent / 100) * pdfWidth;
  // Canvas y starts at 0 at the top, PDF y starts at 0 at the bottom.
  // The baseline of the text inside the box starts at roughly 85% of font size below the top of the box.
  const y = pdfHeight - (yPercent / 100) * pdfHeight - fontSize * 0.85;
  return { x, y };
}

/**
 * Helper to parse a hex color string (e.g. "#aa3bff") to rgb values (0.0 - 1.0)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 0 : g,
    b: isNaN(b) ? 0 : b,
  };
}

/**
 * Helper to resolve the correct font style based on parameters
 */
async function getEmbeddedFont(
  pdfDoc: PDFDocument,
  fontType: 'Helvetica' | 'Times-Roman' | 'Courier',
  isBold: boolean,
  isItalic: boolean
) {
  let standardName: StandardFonts;

  if (fontType === 'Helvetica') {
    if (isBold && isItalic) standardName = StandardFonts.HelveticaBoldOblique;
    else if (isBold) standardName = StandardFonts.HelveticaBold;
    else if (isItalic) standardName = StandardFonts.HelveticaOblique;
    else standardName = StandardFonts.Helvetica;
  } else if (fontType === 'Times-Roman') {
    if (isBold && isItalic) standardName = StandardFonts.TimesRomanBoldItalic;
    else if (isBold) standardName = StandardFonts.TimesRomanBold;
    else if (isItalic) standardName = StandardFonts.TimesRomanItalic;
    else standardName = StandardFonts.TimesRoman;
  } else {
    // Courier
    if (isBold && isItalic) standardName = StandardFonts.CourierBoldOblique;
    else if (isBold) standardName = StandardFonts.CourierBold;
    else if (isItalic) standardName = StandardFonts.CourierOblique;
    else standardName = StandardFonts.Courier;
  }

  return await pdfDoc.embedFont(standardName);
}

/**
 * Generates a single merged PDF with values replaced for a specific CSV row.
 */
async function generateSingleMergedPDF(
  templateBytes: ArrayBuffer,
  row: Record<string, string>,
  fields: PlacedField[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes.slice(0));
  const pages = pdfDoc.getPages();

  // Pre-load all unique font combinations in parallel — avoids await inside the field loop
  const uniqueFontKeys = [...new Set(fields.map((f) => `${f.font}|${f.isBold}|${f.isItalic}`))];
  const fontEntries = await Promise.all(
    uniqueFontKeys.map(async (key) => {
      const [fontType, isBoldStr, isItalicStr] = key.split('|');
      const font = await getEmbeddedFont(
        pdfDoc,
        fontType as 'Helvetica' | 'Times-Roman' | 'Courier',
        isBoldStr === 'true',
        isItalicStr === 'true'
      );
      return [key, font] as const;
    })
  );
  const fontCache = new Map(fontEntries);

  for (const field of fields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Resolve the value from the CSV row, fallback to field placeholder name
    const textValue = row[field.fieldName] !== undefined ? row[field.fieldName] : `{{${field.fieldName}}}`;

    const font = fontCache.get(`${field.font}|${field.isBold}|${field.isItalic}`)!;
    
    // Translate coordinate (canvas top-left percentage -> PDF bottom-left points)
    const { x, y } = translateCoordinates(field.x, field.y, pdfWidth, pdfHeight, field.fontSize);

    const { r, g, b } = hexToRgb(field.color);

    // Bounding box for clipping path
    const clipX = x;
    const clipWidth = (field.width / 100) * pdfWidth;
    const clipHeight = field.fontSize * 1.2;
    // Bounding box Y-bottom (PDF origin is bottom-left)
    const clipY = pdfHeight - (field.y / 100) * pdfHeight - clipHeight;

    // Apply clipping path to restrict text rendering inside the box
    page.pushOperators(
      pushGraphicsState(),
      moveTo(clipX, clipY),
      lineTo(clipX, clipY + clipHeight),
      lineTo(clipX + clipWidth, clipY + clipHeight),
      lineTo(clipX + clipWidth, clipY),
      closePath(),
      clip(),
      endPath()
    );

    // Draw the text
    page.drawText(textValue, {
      x,
      y,
      size: field.fontSize,
      font,
      color: rgb(r, g, b),
    });

    // Restore graphics state to disable clipping for next page operations
    page.pushOperators(popGraphicsState());
  }

  return await pdfDoc.save();
}

/**
 * Combines all CSV rows into a single PDF document.
 * Each CSV row generates a copy of all the template pages filled with its data.
 */
export async function generateCombinedPDF(
  templateBytes: ArrayBuffer,
  rows: Record<string, string>[],
  fields: PlacedField[],
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const finalDoc = await PDFDocument.create();
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    
    // Create a temporary single PDF for this row
    const singlePdfBytes = await generateSingleMergedPDF(templateBytes, row, fields);
    const tempDoc = await PDFDocument.load(singlePdfBytes);
    
    // Copy all pages from the temp document to the final document
    const pageIndices = Array.from({ length: tempDoc.getPageCount() }, (_, index) => index);
    const copiedPages = await finalDoc.copyPages(tempDoc, pageIndices);
    
    copiedPages.forEach((page) => {
      finalDoc.addPage(page);
    });

    if (onProgress) {
      onProgress(i + 1, total);
    }
    
    // Yield execution slightly for UI responsiveness in large jobs
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return await finalDoc.save();
}

/**
 * Generates separate PDF files for each CSV row and packs them into a ZIP file.
 */
export async function generateZIP(
  templateBytes: ArrayBuffer,
  rows: Record<string, string>[],
  fields: PlacedField[],
  filenameColumn: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    
    // Generate PDF for this row
    const pdfBytes = await generateSingleMergedPDF(templateBytes, row, fields);
    
    // Determine file name
    const rawName = row[filenameColumn] ? row[filenameColumn].trim() : `row-${i + 1}`;
    // Sanitize filename to avoid path traversal / invalid characters
    const sanitizedName = rawName.replace(/[/\\?%*:|"<>. ]/g, '_');
    const filename = `${sanitizedName || `row_${i + 1}`}.pdf`;

    zip.file(filename, pdfBytes);

    if (onProgress) {
      onProgress(i + 1, total);
    }

    // Yield execution for UI responsiveness
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
