import { useReducer } from "react"
import type { ChangeEvent } from "react"

type PdfState = {
  pdfFile: File | null
  pdfBytes: ArrayBuffer | null
  totalPages: number
  currentPage: number
  pdfDimensions: { width: number; height: number }
  zoom: number
}

type PdfAction =
  | { type: "pdf_loaded"; file: File; bytes: ArrayBuffer }
  | { type: "total_pages_set"; totalPages: number }
  | { type: "page_changed"; page: number }
  | { type: "dimensions_set"; dimensions: { width: number; height: number } }
  | { type: "zoom_changed"; zoom: number }
  | { type: "doc_reset" }

const initialState: PdfState = {
  pdfFile: null,
  pdfBytes: null,
  totalPages: 0,
  currentPage: 1,
  pdfDimensions: { width: 0, height: 0 },
  zoom: 1.0,
}

function pdfReducer(state: PdfState, action: PdfAction): PdfState {
  switch (action.type) {
    case "pdf_loaded":
      return {
        ...state,
        pdfFile: action.file,
        pdfBytes: action.bytes,
        currentPage: 1,
      }
    case "total_pages_set":
      return { ...state, totalPages: action.totalPages }
    case "page_changed":
      return { ...state, currentPage: action.page }
    case "dimensions_set":
      return { ...state, pdfDimensions: action.dimensions }
    case "zoom_changed":
      return { ...state, zoom: action.zoom }
    case "doc_reset":
      return {
        ...state,
        pdfFile: null,
        pdfBytes: null,
        totalPages: 0,
        currentPage: 1,
      }
    default:
      return state
  }
}

export function usePdf(_view: "upload" | "editor") {
  void _view
  const [state, dispatch] = useReducer(pdfReducer, initialState)

  const handlePdfUpload = (
    e: ChangeEvent<HTMLInputElement>,
    onLoaded?: () => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer
      dispatch({ type: "pdf_loaded", file, bytes: buffer })
      onLoaded?.()
    }
    reader.readAsArrayBuffer(file)
  }

  return {
    ...state,
    handlePdfUpload,
    setCurrentPage: (page: number) => dispatch({ type: "page_changed", page }),
    setTotalPages: (total: number) =>
      dispatch({ type: "total_pages_set", totalPages: total }),
    setPdfDimensions: (dimensions: { width: number; height: number }) =>
      dispatch({ type: "dimensions_set", dimensions }),
    setZoom: (zoom: number) => dispatch({ type: "zoom_changed", zoom }),
  }
}
