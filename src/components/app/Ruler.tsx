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

function computeTickInterval(nativeLen: number): number {
  const target = nativeLen / 25
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)))
  const norm = target / magnitude
  if (norm < 1.5) return Math.max(1, Math.round(1 * magnitude))
  if (norm < 3.5) return Math.max(1, Math.round(2 * magnitude))
  if (norm < 7.5) return Math.max(1, Math.round(5 * magnitude))
  return Math.max(1, Math.round(10 * magnitude))
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
  const nativeLen = isHorizontal
    ? containerWidth / zoom
    : containerHeight / zoom
  const tickInterval = computeTickInterval(nativeLen)

  const draggingRef = useRef(false)

  const ticks = useMemo(() => {
    const result: { pos: number; label: string; isMajor: boolean }[] = []
    for (let i = 0; i <= nativeLen; i += tickInterval) {
      result.push({
        pos: i * zoom,
        label: String(i),
        isMajor: i % (tickInterval * 2) === 0 || i === 0 || i === nativeLen,
      })
    }
    return result
  }, [tickInterval, zoom, isHorizontal, containerWidth, containerHeight])

  const getPctFromEvent = useCallback(
    (ev: MouseEvent): { pct: number; onCanvas: boolean } | null => {
      const container = document.querySelector(
        "[data-canvas-container]"
      ) as HTMLElement | null
      if (!container) return null
      const rect = container.getBoundingClientRect()
      const px = isHorizontal
        ? (ev.clientY - rect.top) / zoom
        : (ev.clientX - rect.left) / zoom
      return {
        pct: Math.round(px),
        onCanvas:
          px >= 0 &&
          px <= (isHorizontal ? containerHeight / zoom : containerWidth / zoom),
      }
    },
    [isHorizontal, zoom, containerWidth, containerHeight]
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
