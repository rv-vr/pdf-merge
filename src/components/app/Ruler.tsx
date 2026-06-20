import { useMemo, useRef, useCallback } from "react"

interface RulerProps {
  orientation: "horizontal" | "vertical"
  containerWidth: number
  containerHeight: number
  zoom: number
  onGuideCreate?: (
    orientation: "horizontal" | "vertical",
    position: number
  ) => void
  onGuidePreview?: (position: number | null) => void
}

function computeTickInterval(zoom: number): number {
  if (zoom >= 1.5) return 2
  if (zoom >= 0.75) return 5
  return 10
}

export function Ruler({
  orientation,
  containerWidth,
  containerHeight,
  zoom,
  onGuideCreate,
  onGuidePreview,
}: RulerProps) {
  const SIZE = 18

  const isHorizontal = orientation === "horizontal"
  const length = isHorizontal ? containerWidth : containerHeight
  const tickInterval = computeTickInterval(zoom)

  const draggingRef = useRef(false)

  const ticks = useMemo(() => {
    const result: { pos: number; label: string; isMajor: boolean }[] = []
    for (let i = 0; i <= 100; i += tickInterval) {
      const px = (i / 100) * length
      result.push({
        pos: px,
        label: String(i),
        isMajor: i % (tickInterval * 2) === 0 || i === 0 || i === 100,
      })
    }
    return result
  }, [length, tickInterval])

  const getPctFromEvent = useCallback(
    (ev: MouseEvent): { pct: number; onCanvas: boolean } | null => {
      const container = document.querySelector(
        "[data-canvas-container]"
      ) as HTMLElement | null
      if (!container) return null
      const rect = container.getBoundingClientRect()
      const pct = isHorizontal
        ? ((ev.clientY - rect.top) / rect.height) * 100
        : ((ev.clientX - rect.left) / rect.width) * 100
      return { pct: Math.round(pct), onCanvas: pct >= 0 && pct <= 100 }
    },
    [isHorizontal]
  )

  const handleMouseDown = useCallback(
    (_e: React.MouseEvent) => {
      void _e
      if (!onGuideCreate) return
      draggingRef.current = true

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return
        const res = getPctFromEvent(ev)
        if (res) onGuidePreview?.(res.pct)
      }

      const handleMouseUp = (ev: MouseEvent) => {
        draggingRef.current = false
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        const res = getPctFromEvent(ev)
        onGuidePreview?.(null)
        if (res && res.onCanvas) onGuideCreate(orientation, res.pct)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [onGuideCreate, onGuidePreview, orientation, getPctFromEvent]
  )

  const rulerStyle: React.CSSProperties = isHorizontal
    ? { width: containerWidth, height: SIZE }
    : { width: SIZE, height: containerHeight }

  return (
    <div
      data-ruler
      className="relative shrink-0 overflow-hidden bg-card select-none text-muted-foreground"
      style={rulerStyle}
      onMouseDown={handleMouseDown}
    >
      <svg
        width={isHorizontal ? containerWidth : SIZE}
        height={isHorizontal ? SIZE : containerHeight}
        className="block"
      >
        {ticks.map((tick) => (
          <g key={tick.pos}>
            {isHorizontal ? (
              <>
                <line
                  x1={tick.pos}
                  y1={0}
                  x2={tick.pos}
                  y2={tick.isMajor ? SIZE - 2 : SIZE - 8}
                  stroke="currentColor"
                  strokeWidth={0.5}
                />
                {tick.isMajor && (
                  <text
                    x={tick.pos + 2}
                    y={SIZE - 4}
                    fill="currentColor"
                    fontSize={8}
                    fontFamily="monospace"
                  >
                    {tick.label}
                  </text>
                )}
              </>
            ) : (
              <>
                <line
                  x1={0}
                  y1={tick.pos}
                  x2={tick.isMajor ? SIZE - 2 : SIZE - 8}
                  y2={tick.pos}
                  stroke="currentColor"
                  strokeWidth={0.5}
                />
                {tick.isMajor && (
                  <text
                    x={SIZE - 4}
                    y={tick.pos - 2}
                    fill="currentColor"
                    fontSize={8}
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {tick.label}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
