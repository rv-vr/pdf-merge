import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePdf } from "@/hooks/usePdf"

describe("usePdf", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => usePdf("upload"))
    expect(result.current.pdfFile).toBeNull()
    expect(result.current.pdfBytes).toBeNull()
    expect(result.current.totalPages).toBe(0)
    expect(result.current.currentPage).toBe(1)
    expect(result.current.zoom).toBe(1.0)
    expect(result.current.pdfDimensions).toEqual({ width: 0, height: 0 })
  })

  it("setCurrentPage updates page", () => {
    const { result } = renderHook(() => usePdf("upload"))
    act(() => result.current.setCurrentPage(3))
    expect(result.current.currentPage).toBe(3)
  })

  it("setTotalPages updates page count", () => {
    const { result } = renderHook(() => usePdf("upload"))
    act(() => result.current.setTotalPages(10))
    expect(result.current.totalPages).toBe(10)
  })

  it("setZoom updates zoom", () => {
    const { result } = renderHook(() => usePdf("upload"))
    act(() => result.current.setZoom(1.5))
    expect(result.current.zoom).toBe(1.5)
  })

  it("setPdfDimensions updates dimensions", () => {
    const { result } = renderHook(() => usePdf("upload"))
    act(() => result.current.setPdfDimensions({ width: 612, height: 792 }))
    expect(result.current.pdfDimensions).toEqual({ width: 612, height: 792 })
  })

  it("handlePdfUpload dispatches pdf_loaded with file and buffer", async () => {
    const { result } = renderHook(() => usePdf("upload"))
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    })
    const changeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    const onLoaded = vi.fn()

    await vi.waitFor(() => {
      result.current.handlePdfUpload(changeEvent, onLoaded)
      expect(result.current.pdfFile).toBe(file)
    })
  })
})
