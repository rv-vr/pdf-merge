import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PlacedField } from '@/types';

type FieldProps = {
  font: 'Arimo' | 'Tinos' | 'Carlito' | 'EB Garamond' | 'Inter' | 'Lora' | 'Open Sans';
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  width: number;
  align: 'left' | 'center' | 'right';
};

const DEFAULT_FIELD_PROPS: FieldProps = {
  font: 'Inter',
  fontSize: 14,
  color: '#000000',
  isBold: false,
  isItalic: false,
  width: 20,
  align: 'left',
};

export function useFieldEditor(currentPage: number) {
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);

  // Undo / Redo stacks (max 50 entries each)
  const [undoStack, setUndoStack] = useState<PlacedField[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedField[][]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartWidth = useRef<number>(0);
  const resizeStartPointerX = useRef<number>(0);

  // Ref mirrors — kept current so event handlers avoid stale closures.
  // Writing to refs inside effects is fine (no cascading setState).
  const placedFieldsRef = useRef(placedFields);
  const selectedFieldIdRef = useRef(selectedFieldId);
  // Tracks the last non-null selectedFieldId so new fields can inherit its properties.
  const lastSelectedFieldIdRef = useRef<string | null>(null);

  useEffect(() => { placedFieldsRef.current = placedFields; }, [placedFields]);
  useEffect(() => {
    selectedFieldIdRef.current = selectedFieldId;
    if (selectedFieldId !== null) lastSelectedFieldIdRef.current = selectedFieldId;
  }, [selectedFieldId]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const snapshot = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), [...placedFieldsRef.current]]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (!prev.length) return prev;
      const restored = prev[prev.length - 1];
      setRedoStack((r) => [...r, [...placedFieldsRef.current]]);
      setPlacedFields(restored);
      setSelectedFieldId(null);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const restored = prev[prev.length - 1];
      setUndoStack((u) => [...u, [...placedFieldsRef.current]]);
      setPlacedFields(restored);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA');

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo / Redo — global, no field selection required
      if (ctrl && !isInputFocused) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
          return;
        }
      }

      const id = selectedFieldIdRef.current;
      if (!id || isInputFocused) return;

      if (ctrl) {
        // Bold / Italic
        if (e.key === 'b') {
          e.preventDefault();
          snapshot();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, isBold: !f.isBold } : f))
          );
          return;
        }
        if (e.key === 'i') {
          e.preventDefault();
          snapshot();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, isItalic: !f.isItalic } : f))
          );
          return;
        }
        // Alignment (Google Docs shortcuts)
        if (e.shiftKey) {
          if (e.key === 'L') {
            e.preventDefault();
            snapshot();
            setPlacedFields((prev) =>
              prev.map((f) => (f.id === id ? { ...f, align: 'left' } : f))
            );
            return;
          }
          if (e.key === 'E') {
            e.preventDefault();
            snapshot();
            setPlacedFields((prev) =>
              prev.map((f) => (f.id === id ? { ...f, align: 'center' } : f))
            );
            return;
          }
          if (e.key === 'R') {
            e.preventDefault();
            snapshot();
            setPlacedFields((prev) =>
              prev.map((f) => (f.id === id ? { ...f, align: 'right' } : f))
            );
            return;
          }
        }
      }

      // Layer reorder — ] / [ step one, Ctrl+] / Ctrl+[ jump to front/back
      if (e.key === ']' || e.key === '[') {
        e.preventDefault();
        snapshot();
        if (ctrl) {
          setPlacedFields((prev) => {
            const field = prev.find((f) => f.id === id);
            if (!field) return prev;
            return e.key === ']'
              ? [...prev.filter((f) => f.id !== id), field]
              : [field, ...prev.filter((f) => f.id !== id)];
          });
        } else {
          setPlacedFields((prev) => {
            const idx = prev.findIndex((f) => f.id === id);
            if (idx < 0) return prev;
            const next = [...prev];
            if (e.key === ']') {
              if (idx === prev.length - 1) return prev;
              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            } else {
              if (idx === 0) return prev;
              [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
            }
            return next;
          });
        }
        return;
      }

      // Arrow-key nudge (no ctrl)
      if (!ctrl) {
        const step = e.shiftKey ? 2.0 : 0.5;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, x: Math.max(0, f.x - step) } : f))
          );
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, x: Math.min(100, f.x + step) } : f))
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, y: Math.max(0, f.y - step) } : f))
          );
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPlacedFields((prev) =>
            prev.map((f) => (f.id === id ? { ...f, y: Math.min(100, f.y + step) } : f))
          );
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          snapshot();
          setPlacedFields((prev) => prev.filter((f) => f.id !== id));
          setSelectedFieldId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapshot, undo, redo]);

  useEffect(() => {
    if (!draggingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let xPercent = ((e.clientX - rect.left - dragStartOffset.current.x) / rect.width) * 100;
      let yPercent = ((e.clientY - rect.top - dragStartOffset.current.y) / rect.height) * 100;
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));
      setPlacedFields((prev) =>
        prev.map((f) => (f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f))
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = container.getBoundingClientRect();
      let xPercent = ((touch.clientX - rect.left - dragStartOffset.current.x) / rect.width) * 100;
      let yPercent = ((touch.clientY - rect.top - dragStartOffset.current.y) / rect.height) * 100;
      xPercent = Math.max(0, Math.min(100, xPercent));
      yPercent = Math.max(0, Math.min(100, yPercent));
      setPlacedFields((prev) =>
        prev.map((f) => (f.id === draggingFieldId ? { ...f, x: xPercent, y: yPercent } : f))
      );
    };

    const handleMouseUp = () => setDraggingFieldId(null);
    const handleTouchEnd = () => setDraggingFieldId(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingFieldId]);

  useEffect(() => {
    if (!resizingFieldId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - resizeStartPointerX.current) / rect.width) * 100;
      let newWidth = resizeStartWidth.current + deltaXPercent;
      const activeField = placedFields.find((f) => f.id === resizingFieldId);
      const minWidthPercent = activeField ? (activeField.fontSize / 612) * 100 : 5;
      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));
      setPlacedFields((prev) =>
        prev.map((f) => (f.id === resizingFieldId ? { ...f, width: newWidth } : f))
      );
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = container.getBoundingClientRect();
      const deltaXPercent = ((touch.clientX - resizeStartPointerX.current) / rect.width) * 100;
      let newWidth = resizeStartWidth.current + deltaXPercent;
      const activeField = placedFields.find((f) => f.id === resizingFieldId);
      const minWidthPercent = activeField ? (activeField.fontSize / 612) * 100 : 5;
      newWidth = Math.max(minWidthPercent, Math.min(100 - (activeField?.x || 0), newWidth));
      setPlacedFields((prev) =>
        prev.map((f) => (f.id === resizingFieldId ? { ...f, width: newWidth } : f))
      );
    };

    const handleMouseUp = () => setResizingFieldId(null);
    const handleTouchEnd = () => setResizingFieldId(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [resizingFieldId, placedFields]);

  const addFieldToPage = (header: string) => {
    snapshot();
    // Look up properties from the currently selected field, or the last selected one, or fall back to defaults.
    const sourceField =
      placedFieldsRef.current.find((f) => f.id === selectedFieldIdRef.current) ??
      placedFieldsRef.current.find((f) => f.id === lastSelectedFieldIdRef.current);
    const props: FieldProps = sourceField
      ? {
          font: sourceField.font,
          fontSize: sourceField.fontSize,
          color: sourceField.color,
          isBold: sourceField.isBold,
          isItalic: sourceField.isItalic,
          width: sourceField.width,
          align: sourceField.align ?? 'left',
        }
      : DEFAULT_FIELD_PROPS;

    const newField: PlacedField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: header,
      x: 40,
      y: 45,
      page: currentPage,
      ...props,
    };
    setPlacedFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const handleDuplicateField = (field: PlacedField) => {
    snapshot();
    const newField: PlacedField = {
      ...field,
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(100, field.x + 2),
      y: Math.min(100, field.y + 2),
    };
    setPlacedFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  // Stable ref-based update — no snapshot. Safe to use in long-lived event listeners
  // (e.g. native color picker 'change') because it reads selectedFieldId from the ref,
  // not a stale closure.
  const updateSelectedField = useCallback((updates: Partial<PlacedField>) => {
    const id = selectedFieldIdRef.current;
    if (!id) return;
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  // Snapshot the current state (call at end of continuous interaction — onBlur, onValueCommit, color picker close).
  const commitSelectedField = useCallback(() => {
    snapshot();
  }, [snapshot]);

  // Snapshot + update in one step — for discrete one-shot changes (font family, bold, italic, alignment).
  const updateAndCommitField = useCallback((updates: Partial<PlacedField>) => {
    const id = selectedFieldIdRef.current;
    if (!id) return;
    snapshot();
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, [snapshot]);

  const removeField = (id: string) => {
    snapshot();
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const clearAllFields = () => {
    snapshot();
    setPlacedFields([]);
    setSelectedFieldId(null);
  };

  // Layer ordering — renders last = appears on top (both DOM and pdf-lib draw order)
  const moveFieldToFront = (id: string) => {
    snapshot();
    setPlacedFields((prev) => {
      const field = prev.find((f) => f.id === id);
      if (!field) return prev;
      return [...prev.filter((f) => f.id !== id), field];
    });
  };

  const moveFieldToBack = (id: string) => {
    snapshot();
    setPlacedFields((prev) => {
      const field = prev.find((f) => f.id === id);
      if (!field) return prev;
      return [field, ...prev.filter((f) => f.id !== id)];
    });
  };

  // displayOrderIds: topmost-first (index 0 = renders on top).
  // Reverses before storing so last in array = topmost (matches DOM/pdf-lib draw order).
  const reorderFields = useCallback((displayOrderIds: string[]) => {
    snapshot();
    setPlacedFields((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      return [...displayOrderIds].reverse().map((id) => map.get(id)).filter(Boolean) as PlacedField[];
    });
  }, [snapshot]);

  const handleMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPreviewMode) return;
    if (selectedFieldId !== field.id) {
      setSelectedFieldId(field.id);
      return;
    }
    snapshot();
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDraggingFieldId(field.id);
  };

  const handleTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    if (selectedFieldId !== field.id) {
      setSelectedFieldId(field.id);
      return;
    }
    snapshot();
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    if (touch) {
      dragStartOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      setDraggingFieldId(field.id);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPreviewMode) return;
    snapshot();
    setResizingFieldId(field.id);
    resizeStartWidth.current = field.width;
    resizeStartPointerX.current = e.clientX;
  };

  const handleResizeTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    const touch = e.touches[0];
    if (touch) {
      snapshot();
      setResizingFieldId(field.id);
      resizeStartWidth.current = field.width;
      resizeStartPointerX.current = touch.clientX;
    }
  };

  const resetFields = () => {
    setPlacedFields([]);
    setSelectedFieldId(null);
    setUndoStack([]);
    setRedoStack([]);
  };

  return {
    placedFields,
    selectedFieldId,
    isPreviewMode,
    previewRowIndex,
    containerRef,
    canUndo,
    canRedo,
    setPlacedFields,
    setSelectedFieldId,
    setIsPreviewMode,
    setPreviewRowIndex,
    addFieldToPage,
    handleDuplicateField,
    updateSelectedField,
    commitSelectedField,
    updateAndCommitField,
    removeField,
    clearAllFields,
    moveFieldToFront,
    moveFieldToBack,
    reorderFields,
    undo,
    redo,
    handleMouseDown,
    handleTouchStart,
    handleResizeMouseDown,
    handleResizeTouchStart,
    resetFields,
  };
}
