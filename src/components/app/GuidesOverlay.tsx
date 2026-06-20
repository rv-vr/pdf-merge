import { useRef, useCallback, useState, useEffect } from "react"
import type { Guide } from "@/lib/editorTypes"

interface GuidesOverlayProps {
  guides: Guide[]
  currentPage: number
  isPreviewMode: boolean
  onRemoveGuide: (id: string) => void
  onUpdateGuidePosition: (id: string, position: number) => void
  ghostPosition?: number | null
  ghostOrientation?: "horizontal" | "vertical"
  versionKey?: number
  zoom: number
}

function getCanvasRect(): DOMRect | null {
  return (
    document
      .querySelector("[data-canvas-container]")
      ?.getBoundingClientRect() ?? null
  )
}

function toVp(px: number, isVert: boolean, zoom: number): number {
  const r = getCanvasRect()
  if (!r) return 0
  return isVert ? r.left + px * zoom : r.top + px * zoom
}

export function GuidesOverlay({
  guides,
  currentPage,
  isPreviewMode,
  onRemoveGuide,
  onUpdateGuidePosition,
  ghostPosition,
  ghostOrientation,
  versionKey,
  zoom,
}: GuidesOverlayProps) {
  const dragRef = useRef<{
    id: string
    orientation: "horizontal" | "vertical"
  } | null>(null)
  const [, forceUpdate] = useState(0)
  const [wsBounds, setWsBounds] = useState(() => {
    const ws = document.querySelector("[data-workspace]")
    if (!ws) return { top: 0, height: 0, left: 0, width: 0 }
    const r = ws.getBoundingClientRect()
    return { top: r.top, height: r.height, left: r.left, width: r.width }
  })

  const refreshWsBounds = useCallback(() => {
    const ws = document.querySelector("[data-workspace]")
    if (!ws) return
    const r = ws.getBoundingClientRect()
    setWsBounds({ top: r.top, height: r.height, left: r.left, width: r.width })
    forceUpdate((n) => n + 1)
  }, [])

  useEffect(() => {
    const ws = document.querySelector("[data-workspace]")
    if (!ws) return
    let ticking = false
    const handler = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          refreshWsBounds()
          ticking = false
        })
      }
    }
    ws.addEventListener("scroll", handler, { passive: true })
    const onResize = () => refreshWsBounds()
    window.addEventListener("resize", onResize)
    return () => {
      ws.removeEventListener("scroll", handler)
      window.removeEventListener("resize", onResize)
    }
  }, [refreshWsBounds])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshWsBounds()
  }, [versionKey, refreshWsBounds])

  const pageGuides = guides.filter((g) => g.page === currentPage)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, guide: Guide) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = { id: guide.id, orientation: guide.orientation }

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const r = getCanvasRect()
        if (!r) return
        const px =
          dragRef.current.orientation === "vertical"
            ? (ev.clientX - r.left) / zoom
            : (ev.clientY - r.top) / zoom
        onUpdateGuidePosition(dragRef.current.id, Math.round(px))
      }

      const handleMouseUp = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const { id } = dragRef.current
        dragRef.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        const rulers = document.querySelectorAll("[data-ruler]")
        for (const el of rulers) {
          const r = el.getBoundingClientRect()
          if (
            ev.clientX >= r.left &&
            ev.clientX <= r.right &&
            ev.clientY >= r.top &&
            ev.clientY <= r.bottom
          ) {
            onRemoveGuide(id)
            break
          }
        }
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUpdateGuidePosition, onRemoveGuide]
  )

  const handleDoubleClick = useCallback(
    (id: string) => {
      onRemoveGuide(id)
    },
    [onRemoveGuide]
  )

  if (isPreviewMode) return null
  if (pageGuides.length === 0 && (ghostPosition == null || ghostPosition < 0))
    return null

  return (
    <div
      className="fixed z-40 pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        clipPath:
          wsBounds.height > 0
            ? `inset(${wsBounds.top}px ${window.innerWidth - wsBounds.left - wsBounds.width}px 0 ${wsBounds.left}px)`
            : "inset(0)",
      }}
    >
      {pageGuides.map((guide) => {
        const isVert = guide.orientation === "vertical"
        const vp = toVp(guide.position, isVert, zoom)
        return (
          <div
            key={guide.id}
            className="pointer-events-auto cursor-grab active:cursor-grabbing"
            style={{
              position: "absolute",
              [isVert ? "left" : "top"]: vp,
              [isVert ? "top" : "left"]: 0,
              [isVert ? "width" : "height"]: 1,
              [isVert ? "bottom" : "right"]: 0,
            }}
            onMouseDown={(e) => handleMouseDown(e, guide)}
            onDoubleClick={() => handleDoubleClick(guide.id)}
          >
            <div
              className={`absolute ${isVert ? "inset-y-0 -translate-x-1/2 w-4 cursor-col-resize" : "inset-x-0 -translate-y-1/2 h-4 cursor-row-resize"}`}
            />
            <div
              className={`${isVert ? "h-full w-px" : "w-full h-px"} bg-blue-500/60`}
            />
          </div>
        )
      })}
      {ghostPosition != null && ghostPosition >= 0 && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            [ghostOrientation === "vertical" ? "left" : "top"]: toVp(
              ghostPosition,
              ghostOrientation === "vertical",
              zoom
            ),
            [ghostOrientation === "vertical" ? "top" : "left"]: 0,
            [ghostOrientation === "vertical" ? "width" : "height"]: 1,
            [ghostOrientation === "vertical" ? "bottom" : "right"]: 0,
          }}
        >
          <div
            className={`${ghostOrientation === "vertical" ? "h-full w-px" : "w-full h-px"} bg-blue-500/80`}
          />
        </div>
      )}
    </div>
  )
}
