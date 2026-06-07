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
import fontkit from '@pdf-lib/fontkit';

export interface PlacedField {
  id: string;
  fieldName: string;
  x: number; // percentage from left of canvas (0 - 100)
  y: number; // percentage from top of canvas (0 - 100)
  page: number; // page number (1-indexed)
  font: 'Arimo' | 'Tinos' | 'Carlito' | 'EB Garamond' | 'Inter' | 'Lora' | 'Open Sans';
  fontSize: number;
  color: string; // hex color (e.g. #000000)
  isBold: boolean;
  isItalic: boolean;
  width: number; // width as percentage of page width (0 - 100)
  align?: 'left' | 'center' | 'right';
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
  // The baseline of the text inside the box starts at roughly 95% of font size below the top of the box.
  const y = pdfHeight - (yPercent / 100) * pdfHeight - fontSize * 0.95;
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
const GOOGLE_FONTS_URLS: Record<string, { regular: string; bold: string; italic: string; boldItalic: string }> = {
  'Arimo': {
    regular: 'https://fonts.gstatic.com/s/arimo/v28/P5sMzZBg7FTnOfDY8cM42A.ttf',
    bold: 'https://fonts.gstatic.com/s/arimo/v28/P5sMzZBg7FTnOfDY6MM42N0.ttf',
    italic: 'https://fonts.gstatic.com/s/arimo/v28/P5sZzZBg7FTnOfDY_c4R2NDy.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/arimo/v28/P5seZZBg7FTnOfDY_c4h1NEXzME.ttf'
  },
  'Tinos': {
    regular: 'https://fonts.gstatic.com/s/tinos/v21/Hhy9U5Q4V4w2oW2bCGQ.ttf',
    bold: 'https://fonts.gstatic.com/s/tinos/v21/Hhy6U5Q4V4w2oW2bIG8-Bg.ttf',
    italic: 'https://fonts.gstatic.com/s/tinos/v21/Hhy7U5Q4V4w2oW2bCGQPMA.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/tinos/v21/Hhy5U5Q4V4w2oW2bCGQPHG8-Bs0.ttf'
  },
  'Carlito': {
    regular: 'https://fonts.gstatic.com/s/carlito/v21/a80PENJa3kPK_Fw5G2E.ttf',
    bold: 'https://fonts.gstatic.com/s/carlito/v21/a80AENJa3kPK_Fw5O4szc1c.ttf',
    italic: 'https://fonts.gstatic.com/s/carlito/v21/a80OENJa3kPK_Fw5G2EqeA.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/carlito/v21/a809ENJa3kPK_Fw5G2EqlFszc1c.ttf'
  },
  'EB Garamond': {
    regular: 'https://fonts.gstatic.com/s/ebgaramond/v26/DK1tFFrssaR547Ei8y6u0A8u.ttf',
    bold: 'https://fonts.gstatic.com/s/ebgaramond/v26/DK1wFFrssaR547Ei8y6u0C8q-pQ.ttf',
    italic: 'https://fonts.gstatic.com/s/ebgaramond/v26/DK1rFFrssaR547Ei8y6u0A8u-Lcy.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/ebgaramond/v26/DK1yFFrssaR547Ei8y6u0C8q-pQy3w.ttf'
  },
  'Lora': {
    regular: 'https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOuMw_LIftL.ttf',
    bold: 'https://fonts.gstatic.com/s/lora/v32/0QI8MX1D_JOuMw_Dmt73aA.ttf',
    italic: 'https://fonts.gstatic.com/s/lora/v32/0QI7MX1D_JOuMw_LMvN1cYg.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/lora/v32/0QI9MX1D_JOuMw_LMvNVKZqWbg.ttf'
  },
  'Inter': {
    regular: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrj72A.ttf',
    bold: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrj72A.ttf',
    italic: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTc2dthjZ-Ck-8.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/inter/v20/UcCM3FwrK3iLTcvneQg7Ca725JhhKnNqk4j1ebLhAm8SrXTcPtxhjZ-Ck-8.ttf'
  },
  'Open Sans': {
    regular: 'https://fonts.gstatic.com/s/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4nY1U2xQ.ttf',
    bold: 'https://fonts.gstatic.com/s/opensans/v44/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1y4nY1U2xQ.ttf',
    italic: 'https://fonts.gstatic.com/s/opensans/v44/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWZ0Pw86hd0Rk8ZkaVcUx6EQ.ttf',
    boldItalic: 'https://fonts.gstatic.com/s/opensans/v44/memQYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWq8tWZ0Pw86hd0RkyFjaVcUx6EQ.ttf'
  }
};

const fontBytesCache = new Map<string, ArrayBuffer>();

async function getEmbeddedFont(
  pdfDoc: PDFDocument,
  fontType: string,
  isBold: boolean,
  isItalic: boolean
) {
  if (fontType === 'Helvetica' || fontType === 'Times-Roman' || fontType === 'Courier') {
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
      if (isBold && isItalic) standardName = StandardFonts.CourierBoldOblique;
      else if (isBold) standardName = StandardFonts.CourierBold;
      else if (isItalic) standardName = StandardFonts.CourierOblique;
      else standardName = StandardFonts.Courier;
    }

    return await pdfDoc.embedFont(standardName);
  }

  const fontUrls = GOOGLE_FONTS_URLS[fontType];
  if (!fontUrls) {
    return await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  let url = fontUrls.regular;
  if (isBold && isItalic) url = fontUrls.boldItalic;
  else if (isBold) url = fontUrls.bold;
  else if (isItalic) url = fontUrls.italic;

  const cacheKey = `${fontType}|${isBold}|${isItalic}`;
  let bytes = fontBytesCache.get(cacheKey);
  if (!bytes) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch font from ${url}`);
    }
    bytes = await response.arrayBuffer();
    fontBytesCache.set(cacheKey, bytes);
  }

  pdfDoc.registerFontkit(fontkit);
  return await pdfDoc.embedFont(bytes);
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
        fontType,
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
    let { x, y } = translateCoordinates(field.x, field.y, pdfWidth, pdfHeight, field.fontSize);

    // Apply text alignment within the field box
    const fieldWidthPts = (field.width / 100) * pdfWidth;
    const align = field.align ?? 'left';
    if (align !== 'left') {
      const textWidth = font.widthOfTextAtSize(textValue, field.fontSize);
      if (align === 'center') x += (fieldWidthPts - textWidth) / 2;
      else if (align === 'right') x += fieldWidthPts - textWidth;
    }

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
