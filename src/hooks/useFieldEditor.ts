import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { PlacedField } from '@/types';

type FieldProps = {
  font: 'Helvetica' | 'Times-Roman' | 'Courier';
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  width: number;
  align: 'left' | 'center' | 'right';
};

const DEFAULT_FIELD_PROPS: FieldProps = {
  font: 'Helvetica',
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
  const [lastFieldProperties, setLastFieldProperties] = useState<FieldProps>(DEFAULT_FIELD_PROPS);

  // Undo / Redo stacks (max 50 entries each)
  const [undoStack, setUndoStack] = useState<PlacedField[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedField[][]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeStartWidth = useRef<number>(0);
  const resizeStartPointerX = useRef<number>(0);

  // placedFields ref for use inside event handlers without stale closure
  const placedFieldsRef = useRef(placedFields);
  useEffect(() => { placedFieldsRef.current = placedFields; }, [placedFields]);

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
    if (!selectedFieldId) return;
    const selected = placedFields.find((f) => f.id === selectedFieldId);
    if (selected) {
      setLastFieldProperties({
        font: selected.font,
        fontSize: selected.fontSize,
        color: selected.color,
        isBold: selected.isBold,
        isItalic: selected.isItalic,
        width: selected.width,
        align: selected.align ?? 'left',
      });
    }
  }, [placedFields, selectedFieldId]);

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

      if (!selectedFieldId || isInputFocused) return;

      // Bold / Italic shortcuts
      if (ctrl && e.key === 'b') {
        e.preventDefault();
        snapshot();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, isBold: !f.isBold } : f))
        );
        return;
      }
      if (ctrl && e.key === 'i') {
        e.preventDefault();
        snapshot();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, isItalic: !f.isItalic } : f))
        );
        return;
      }

      // Arrow-key nudge
      const step = e.shiftKey ? 2.0 : 0.5;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, x: Math.max(0, f.x - step) } : f))
        );
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, x: Math.min(100, f.x + step) } : f))
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, y: Math.max(0, f.y - step) } : f))
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPlacedFields((prev) =>
          prev.map((f) => (f.id === selectedFieldId ? { ...f, y: Math.min(100, f.y + step) } : f))
        );
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        snapshot();
        setPlacedFields((prev) => prev.filter((f) => f.id !== selectedFieldId));
        setSelectedFieldId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, snapshot, undo, redo]);

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
    const newField: PlacedField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: header,
      x: 40,
      y: 45,
      page: currentPage,
      ...lastFieldProperties,
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

  const updateSelectedField = (updates: Partial<PlacedField>) => {
    if (!selectedFieldId) return;
    snapshot();
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, ...updates } : f))
    );
  };

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
    removeField,
    clearAllFields,
    undo,
    redo,
    handleMouseDown,
    handleTouchStart,
    handleResizeMouseDown,
    handleResizeTouchStart,
    resetFields,
  };
}
