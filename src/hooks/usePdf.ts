import { useReducer, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

type PdfState = {
  pdfFile: File | null;
  pdfBytes: ArrayBuffer | null;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  pdfDimensions: { width: number; height: number };
  zoom: number;
};

type PdfAction =
  | { type: 'pdf_loaded'; file: File; bytes: ArrayBuffer }
  | { type: 'doc_loaded'; doc: pdfjsLib.PDFDocumentProxy; totalPages: number }
  | { type: 'doc_reset' }
  | { type: 'page_changed'; page: number }
  | { type: 'dimensions_set'; dimensions: { width: number; height: number } }
  | { type: 'zoom_changed'; zoom: number };

const initialState: PdfState = {
  pdfFile: null,
  pdfBytes: null,
  pdfDoc: null,
  totalPages: 0,
  currentPage: 1,
  pdfDimensions: { width: 0, height: 0 },
  zoom: 1.0,
};

function pdfReducer(state: PdfState, action: PdfAction): PdfState {
  switch (action.type) {
    case 'pdf_loaded':
      return { ...state, pdfFile: action.file, pdfBytes: action.bytes, currentPage: 1 };
    case 'doc_loaded':
      return { ...state, pdfDoc: action.doc, totalPages: action.totalPages };
    case 'doc_reset':
      return { ...state, pdfDoc: null, totalPages: 0 };
    case 'page_changed':
      return { ...state, currentPage: action.page };
    case 'dimensions_set':
      return { ...state, pdfDimensions: action.dimensions };
    case 'zoom_changed':
      return { ...state, zoom: action.zoom };
    default:
      return state;
  }
}

export function usePdf(view: 'upload' | 'editor') {
  const [state, dispatch] = useReducer(pdfReducer, initialState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handlePdfUpload = (e: ChangeEvent<HTMLInputElement>, onLoaded?: () => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      dispatch({ type: 'pdf_loaded', file, bytes: buffer });
      onLoaded?.();
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    if (!state.pdfBytes) {
      dispatch({ type: 'doc_reset' });
      return;
    }
    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: state.pdfBytes!.slice(0) });
        const pdf = await loadingTask.promise;
        dispatch({ type: 'doc_loaded', doc: pdf, totalPages: pdf.numPages });
      } catch (err) {
        console.error('Error loading PDF document:', err);
      }
    };
    loadDoc();
  }, [state.pdfBytes]);

  useEffect(() => {
    if (!state.pdfDoc || view !== 'editor') return;
    let activeRenderTask: ReturnType<pdfjsLib.PDFPageProxy['render']> | null = null;
    const renderPage = async () => {
      try {
        const page = await state.pdfDoc!.getPage(state.currentPage);
        const viewport = page.getViewport({ scale: 1.5 * state.zoom });
        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            dispatch({ type: 'dimensions_set', dimensions: { width: viewport.width, height: viewport.height } });
            context.clearRect(0, 0, canvas.width, canvas.height);
            activeRenderTask = page.render({ canvasContext: context, viewport, canvas });
            await activeRenderTask.promise;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };
    renderPage();
    return () => { activeRenderTask?.cancel(); };
  }, [state.pdfDoc, state.currentPage, state.zoom, view]);

  return {
    ...state,
    canvasRef,
    handlePdfUpload,
    setCurrentPage: (page: number) => dispatch({ type: 'page_changed', page }),
    setZoom: (zoom: number) => dispatch({ type: 'zoom_changed', zoom }),
  };
}
