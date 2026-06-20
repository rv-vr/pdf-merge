import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useFieldEditor } from "@/hooks/useFieldEditor"

describe("useFieldEditor", () => {
  const currentPage = 1

  it("returns initial state", () => {
    const { result } = renderHook(() => useFieldEditor(currentPage))
    expect(result.current.placedFields).toEqual([])
    expect(result.current.selectedFieldIds).toEqual([])
    expect(result.current.selectedFieldId).toBeNull()
    expect(result.current.isPreviewMode).toBe(false)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  describe("addFieldToPage", () => {
    it("adds a field with default props", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("email"))
      expect(result.current.placedFields).toHaveLength(1)
      const field = result.current.placedFields[0]
      expect(field.fieldName).toBe("email")
      expect(field.x).toBe(40)
      expect(field.y).toBe(45)
      expect(field.page).toBe(currentPage)
      expect(field.font).toBe("Helvetica")
      expect(field.fontSize).toBe(14)
      expect(field.color).toBe("#000000")
      expect(field.width).toBe(20)
      expect(field.visible).toBe(true)
      expect(result.current.selectedFieldId).toBe(field.id)
    })

    it("adds a field at specified position", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("email", { x: 50, y: 60 }))
      expect(result.current.placedFields[0].x).toBe(50)
      expect(result.current.placedFields[0].y).toBe(60)
    })

    it("inherits props from previously selected field", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("first"))
      const first = result.current.placedFields[0]
      // Modify the first field's props
      act(() =>
        result.current.updateAndCommitField({
          font: "Courier",
          fontSize: 20,
          color: "#ff0000",
          width: 50,
        })
      )
      // Deselect then reselect
      act(() => result.current.setSelectedFieldId(first.id))
      act(() => result.current.addFieldToPage("second"))
      const second = result.current.placedFields[1]
      expect(second.font).toBe("Courier")
      expect(second.fontSize).toBe(20)
      expect(second.color).toBe("#ff0000")
      expect(second.width).toBe(50)
    })
  })

  describe("removeField", () => {
    it("removes a field by id", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const id = result.current.placedFields[0].id
      act(() => result.current.removeField(id))
      expect(result.current.placedFields).toEqual([])
    })

    it("does not remove locked fields", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const id = result.current.placedFields[0].id
      act(() => result.current.toggleFieldLock(id))
      act(() => result.current.removeField(id))
      expect(result.current.placedFields).toHaveLength(1)
    })
  })

  describe("clearAllFields", () => {
    it("removes all fields", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      act(() => result.current.clearAllFields())
      expect(result.current.placedFields).toEqual([])
    })

    it("keeps unlocked fields and removes locked on clear all", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const firstId = result.current.placedFields[0].id
      const secondId = result.current.placedFields[1].id
      act(() => result.current.toggleFieldLock(firstId))
      act(() => result.current.clearAllFields())
      // locked field gets removed, unlocked persists
      expect(result.current.placedFields).toHaveLength(1)
      expect(result.current.placedFields[0].id).toBe(secondId)
    })
  })

  describe("undo / redo", () => {
    it("undo restores previous state", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      expect(result.current.placedFields).toHaveLength(1)
      act(() => result.current.undo())
      expect(result.current.placedFields).toEqual([])
      expect(result.current.canRedo).toBe(true)
    })

    it("redo restores undone state", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      act(() => result.current.undo())
      act(() => result.current.redo())
      expect(result.current.placedFields).toHaveLength(1)
    })

    it("undo clears selection", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      expect(result.current.selectedFieldIds).not.toEqual([])
      act(() => result.current.undo())
      expect(result.current.selectedFieldIds).toEqual([])
    })

    it("multiple undos stop at empty stack", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.undo())
      act(() => result.current.undo())
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe("layer ordering", () => {
    it("moveFieldForward swaps with next field", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const [first, second] = result.current.placedFields
      act(() => result.current.moveFieldForward(first.id))
      expect(result.current.placedFields[0].id).toBe(second.id)
      expect(result.current.placedFields[1].id).toBe(first.id)
    })

    it("moveFieldForward on last field does nothing", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const fields = result.current.placedFields
      const last = fields[fields.length - 1]
      act(() => result.current.moveFieldForward(last.id))
      expect(result.current.placedFields[fields.length - 1].id).toBe(last.id)
    })

    it("moveFieldBackward swaps with previous field", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const [first, second] = result.current.placedFields
      act(() => result.current.moveFieldBackward(second.id))
      expect(result.current.placedFields[0].id).toBe(second.id)
      expect(result.current.placedFields[1].id).toBe(first.id)
    })

    it("moveFieldBackward on first field does nothing", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const first = result.current.placedFields[0]
      act(() => result.current.moveFieldBackward(first.id))
      expect(result.current.placedFields[0].id).toBe(first.id)
    })

    it("moveSelectedToFront moves selected to top of layer order", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      act(() => result.current.addFieldToPage("c"))
      const fields123 = result.current.placedFields
      const fa = fields123[0]
      const fc = fields123[2]
      act(() => result.current.setSelectedFieldIds([fa.id, fc.id]))
      act(() => result.current.moveSelectedToFront())
      const order = result.current.placedFields.map((f) => f.id)
      expect(order[order.length - 1]).toBe(fc.id)
      expect(order[order.length - 2]).toBe(fa.id)
    })

    it("moveSelectedToBack moves selected to bottom of layer order", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      act(() => result.current.addFieldToPage("c"))
      const fieldsA = result.current.placedFields
      const fb2 = fieldsA[1]
      const fc2 = fieldsA[2]
      act(() => result.current.setSelectedFieldIds([fb2.id, fc2.id]))
      act(() => result.current.moveSelectedToBack())
      const order = result.current.placedFields.map((f) => f.id)
      expect(order[0]).toBe(fb2.id)
      expect(order[1]).toBe(fc2.id)
    })
  })

  describe("toggleFieldLock", () => {
    it("toggles lock state", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const id = result.current.placedFields[0].id
      expect(result.current.placedFields[0].locked).toBe(false)
      act(() => result.current.toggleFieldLock(id))
      expect(result.current.placedFields[0].locked).toBe(true)
      act(() => result.current.toggleFieldLock(id))
      expect(result.current.placedFields[0].locked).toBe(false)
    })
  })

  describe("toggleFieldVisibility", () => {
    it("toggles visibility", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const id = result.current.placedFields[0].id
      expect(result.current.placedFields[0].visible).toBe(true)
      act(() => result.current.toggleFieldVisibility(id))
      expect(result.current.placedFields[0].visible).toBe(false)
    })
  })

  describe("copyStyle / pasteStyle", () => {
    it("copies and pastes style onto another field", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const [a, b] = result.current.placedFields
      // Select 'a' and modify its style
      act(() => result.current.setSelectedFieldId(a.id))
      act(() =>
        result.current.updateAndCommitField({
          font: "Courier",
          fontSize: 24,
          color: "#ff0000",
          isBold: true,
          align: "center",
        })
      )
      // Copy style from 'a', then select 'b' and paste
      act(() => result.current.setSelectedFieldId(b.id))
      // Re-select 'a' to copy
      act(() => result.current.setSelectedFieldId(a.id))
      act(() => result.current.copyStyle())
      // Select 'b' and paste
      act(() => result.current.setSelectedFieldId(b.id))
      act(() => result.current.pasteStyle())
      const pasted = result.current.placedFields.find((f) => f.id === b.id)!
      expect(pasted.font).toBe("Courier")
      expect(pasted.fontSize).toBe(24)
      expect(pasted.color).toBe("#ff0000")
      expect(pasted.isBold).toBe(true)
      expect(pasted.align).toBe("center")
    })
  })

  describe("autoFitWidth", () => {
    it("calculates width based on longest CSV value", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const csvRows = [
        { name: "Alice" },
        { name: "Christopher" },
        { name: "Bob" },
      ]
      act(() => result.current.autoFitWidth(csvRows))
      // Christopher is longest → estWidthPercent = chr.length * fontSize * 0.6 / 612 * 100
      const estPct = Math.min(95, ((11 * 14 * 0.6) / 612) * 100)
      const expected = Math.max(5, Math.round(estPct * 10) / 10)
      expect(result.current.placedFields[0].width).toBe(expected)
    })
  })

  describe("setSelectedFieldIds", () => {
    it("selects multiple fields", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      const ids = result.current.placedFields.map((f) => f.id)
      act(() => result.current.setSelectedFieldIds(ids))
      expect(result.current.selectedFieldIds).toEqual(ids)
      expect(result.current.selectedFieldId).toBeNull() // because more than 1 selected
    })
  })

  describe("handleDuplicateField", () => {
    it("duplicates field with offset", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      const original = result.current.placedFields[0]
      act(() => result.current.handleDuplicateField(original))
      expect(result.current.placedFields).toHaveLength(2)
      const dup = result.current.placedFields[1]
      expect(dup.fieldName).toBe(original.fieldName)
      expect(dup.x).toBe(original.x + 2)
      expect(dup.y).toBe(original.y + 2)
      expect(dup.id).not.toBe(original.id)
    })
  })

  describe("reorderFields", () => {
    it("reverses display order to match draw order", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("a"))
      act(() => result.current.addFieldToPage("b"))
      act(() => result.current.addFieldToPage("c"))
      const ids = result.current.placedFields.map((f) => f.id)
      // Display order: c (top), b, a (bottom)
      const displayOrder = [ids[2], ids[1], ids[0]]
      act(() => result.current.reorderFields(displayOrder))
      const finalOrder = result.current.placedFields.map((f) => f.id)
      // stored order should be reversed: a, b, c
      expect(finalOrder).toEqual([ids[0], ids[1], ids[2]])
    })
  })

  describe("updateSelectedField", () => {
    it("updates field without snapshot", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      act(() => result.current.updateSelectedField({ fontSize: 30 }))
      expect(result.current.placedFields[0].fontSize).toBe(30)
    })
  })

  describe("updateAndCommitField", () => {
    it("updates field with snapshot", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      act(() => result.current.updateAndCommitField({ fontSize: 30 }))
      expect(result.current.placedFields[0].fontSize).toBe(30)
      // snapshot was taken, undo should revert
      act(() => result.current.undo())
      expect(result.current.placedFields[0].fontSize).toBe(14)
    })
  })

  describe("guides", () => {
    it("adds a guide", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addGuide("vertical", 50))
      expect(result.current.guides).toHaveLength(1)
      expect(result.current.guides[0].orientation).toBe("vertical")
      expect(result.current.guides[0].position).toBe(50)
    })

    it("removes a guide", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addGuide("horizontal", 30))
      const id = result.current.guides[0].id
      act(() => result.current.removeGuide(id))
      expect(result.current.guides).toEqual([])
    })

    it("updates guide position", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addGuide("vertical", 50))
      const id = result.current.guides[0].id
      act(() => result.current.updateGuidePosition(id, 75))
      expect(result.current.guides[0].position).toBe(75)
    })
  })

  describe("toggles", () => {
    it("snapToGuides defaults to true", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      expect(result.current.snapToGuides).toBe(true)
    })

    it("showRulers defaults to true", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      expect(result.current.showRulers).toBe(true)
    })

    it("setSnapToGuides toggles", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.setSnapToGuides(false))
      expect(result.current.snapToGuides).toBe(false)
    })

    it("setShowRulers toggles", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.setShowRulers(false))
      expect(result.current.showRulers).toBe(false)
    })
  })

  describe("setIsPreviewMode", () => {
    it("toggles preview mode", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      expect(result.current.isPreviewMode).toBe(false)
      act(() => result.current.setIsPreviewMode(true))
      expect(result.current.isPreviewMode).toBe(true)
    })
  })

  describe("resetFields", () => {
    it("resets all state", () => {
      const { result } = renderHook(() => useFieldEditor(currentPage))
      act(() => result.current.addFieldToPage("name"))
      act(() => result.current.undo())
      act(() => result.current.redo())
      act(() => result.current.resetFields())
      expect(result.current.placedFields).toEqual([])
      expect(result.current.selectedFieldIds).toEqual([])
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
    })
  })
})
