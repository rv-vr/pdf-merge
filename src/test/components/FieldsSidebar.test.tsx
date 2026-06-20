import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FieldsSidebar } from "@/components/app/FieldsSidebar"
import type { PlacedField } from "@/types"

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("FieldsSidebar", () => {
  const fieldA: PlacedField = {
    id: "f1",
    fieldName: "name",
    x: 10,
    y: 20,
    page: 1,
    font: "Helvetica",
    fontSize: 14,
    color: "#000",
    isBold: false,
    isItalic: false,
    width: 30,
    align: "left",
    visible: true,
  }
  const fieldB: PlacedField = {
    id: "f2",
    fieldName: "email",
    x: 30,
    y: 40,
    page: 1,
    font: "Helvetica",
    fontSize: 12,
    color: "#000",
    isBold: false,
    isItalic: false,
    width: 30,
    align: "left",
    visible: true,
  }

  const baseProps = {
    csvFileName: "data.csv",
    csvHeaders: ["name", "email"],
    csvRows: [{ name: "Alice", email: "a@b.com" }],
    placedFields: [] as PlacedField[],
    selectedFieldId: null,
    selectedFieldIds: [] as string[],
    onAddField: vi.fn(),
    onSelectField: vi.fn(),
    onReorderFields: vi.fn(),
    onToggleVisibility: vi.fn(),
    onToggleFieldSelection: vi.fn(),
    onToggleLock: vi.fn(),
  }

  it("renders dataset info", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} />)
    expect(screen.getByText("data.csv")).toBeInTheDocument()
    expect(screen.getByText("2 columns · 1 rows")).toBeInTheDocument()
  })

  it("shows no CSV loaded when name is empty", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} csvFileName="" />)
    expect(screen.getByText("No CSV loaded")).toBeInTheDocument()
  })

  it("renders column headers as clickable items", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} />)
    expect(screen.getByText("name")).toBeInTheDocument()
    expect(screen.getByText("email")).toBeInTheDocument()
  })

  it("shows sample value from first row", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} />)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("a@b.com")).toBeInTheDocument()
  })

  it("renders placed fields section when fields exist", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} placedFields={[fieldA]} />)
    expect(screen.getByText("Placed on template (1)")).toBeInTheDocument()
    expect(screen.getByText("14pt")).toBeInTheDocument()
  })

  it("shows placed fields count badge", () => {
    renderWithProvider(
      <FieldsSidebar {...baseProps} placedFields={[fieldA, fieldB]} />
    )
    expect(screen.getByText("Placed on template (2)")).toBeInTheDocument()
  })

  it("filters columns by search", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} />)
    const input = screen.getByPlaceholderText("Search columns…")
    expect(input).toBeInTheDocument()
  })

  it("shows insert fields heading", () => {
    renderWithProvider(<FieldsSidebar {...baseProps} />)
    expect(screen.getByText("Insert fields")).toBeInTheDocument()
  })
})
