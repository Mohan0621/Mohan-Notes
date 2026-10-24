import getStroke from 'perfect-freehand'
import type { StrokePoint, ToolType, PenType } from '../store/useAppStore'

export interface RenderOptions {
  baseSize: number
  color: string
  opacity: number
  tool: ToolType
  penType?: PenType
  isComplete?: boolean
  isSelected?: boolean
}

/**
 * Computes a smooth, polished polygon outline for a hand-drawn stroke using
 * the industry-standard perfect-freehand algorithm (like GoodNotes & OpenBoard).
 */
export function getPolishedStrokeOutline(
  points: StrokePoint[],
  tool: ToolType,
  penType: PenType = 'fountain',
  baseSize: number,
  isComplete = true
): number[][] {
  if (!points || points.length === 0) return []

  // Map to format accepted by perfect-freehand [x, y, pressure]
  const inputPts = points.map((p) => [p.x, p.y, p.pressure ?? 0.5])

  // Tuning based on tool and pen type for OpenBoard / GoodNotes caliber feel
  let size = baseSize * 1.5
  let thinning = 0.35
  let smoothing = 0.65
  let streamline = 0.45
  let startTaper = Math.min(baseSize * 2.5, 14)
  let endTaper = Math.min(baseSize * 3.5, 20)

  if (tool === 'pencil') {
    size = baseSize * 1.2
    thinning = 0.25
    smoothing = 0.55
    streamline = 0.35
    startTaper = 4
    endTaper = 6
  } else if (tool === 'highlighter') {
    size = baseSize * 4
    thinning = 0
    smoothing = 0.7
    streamline = 0.5
    startTaper = 0
    endTaper = 0
  } else if (penType === 'ball') {
    size = baseSize * 1.3
    thinning = 0.15
    smoothing = 0.6
    streamline = 0.4
    startTaper = 3
    endTaper = 5
  } else if (penType === 'brush') {
    size = baseSize * 2.2
    thinning = 0.7
    smoothing = 0.7
    streamline = 0.55
    startTaper = Math.min(baseSize * 4, 22)
    endTaper = Math.min(baseSize * 5, 28)
  }

  return getStroke(inputPts, {
    size: Math.max(size, 2),
    thinning,
    smoothing,
    streamline,
    simulatePressure: false,
    last: isComplete,
    start: {
      taper: startTaper,
      cap: true,
    },
    end: {
      taper: endTaper,
      cap: true,
    },
  })
}

/**
 * Draws the smooth outline polygon onto an HTML5 2D Canvas context.
 */
export function drawSmoothOutline(
  ctx: CanvasRenderingContext2D,
  outline: number[][]
): void {
  if (!outline || outline.length < 3) return
  ctx.beginPath()
  ctx.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    const p0 = outline[i]
    const p1 = outline[(i + 1) % outline.length]
    ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
  }
  ctx.closePath()
  ctx.fill()
}
