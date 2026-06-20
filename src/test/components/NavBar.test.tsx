import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { NavBar } from "@/components/app/NavBar"

describe("NavBar", () => {
  const baseProps = {
    isDarkMode: false,
    onToggleDark: () => {},
    canExport: false,
    onExportClick: () => {},
    view: "upload" as const,
  }

  it("renders logo text", () => {
    render(<NavBar {...baseProps} />)
    expect(screen.getByText("PDF Merge")).toBeInTheDocument()
  })

  it("shows export button in editor view when canExport is true", () => {
    render(<NavBar {...baseProps} view="editor" canExport={true} />)
    expect(screen.getByText("Export")).toBeInTheDocument()
  })

  it("disables export button when canExport is false", () => {
    render(<NavBar {...baseProps} view="editor" canExport={false} />)
    expect(screen.getByText("Export")).toBeDisabled()
  })

  it("shows file name in editor view", () => {
    render(<NavBar {...baseProps} view="editor" pdfFileName="test.pdf" />)
    expect(screen.getByText("test.pdf")).toBeInTheDocument()
  })

  it("shows record count badge", () => {
    render(
      <NavBar
        {...baseProps}
        view="editor"
        pdfFileName="doc.pdf"
        csvRowCount={42}
      />
    )
    expect(screen.getByText("42 records")).toBeInTheDocument()
  })

  it("shows sun icon in dark mode", () => {
    render(<NavBar {...baseProps} isDarkMode={true} />)
    const sunIcon = document.querySelector(".lucide-sun")
    expect(sunIcon).toBeTruthy()
  })

  it("shows moon icon in light mode", () => {
    render(<NavBar {...baseProps} isDarkMode={false} />)
    const moonIcon = document.querySelector(".lucide-moon")
    expect(moonIcon).toBeTruthy()
  })

  it("shows back button in editor view", () => {
    render(<NavBar {...baseProps} view="editor" pdfFileName="doc.pdf" />)
    expect(screen.getByText("← Files")).toBeInTheDocument()
  })
})
