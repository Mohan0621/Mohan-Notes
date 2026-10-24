import type { StrokePoint } from '../store/useAppStore'

/**
 * Calculates the shortest distance from point P(px, py) to line segment A(x1, y1) - B(x2, y2).
 */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy

  if (l2 === 0) {
    return Math.hypot(px - x1, py - y1)
  }

  // Projection parameter clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  const projX = x1 + t * dx
  const projY = y1 + t * dy

  return Math.hypot(px - projX, py - projY)
}

/**
 * Checks if an eraser circle at (ex, ey) with radius `radius` intersects a stroke.
 * Checks all segments of the stroke with stroke width padding.
 */
export function strokeIntersectsCircle(
  points: StrokePoint[],
  strokeWidth: number,
  ex: number,
  ey: number,
  radius: number
): boolean {
  if (!points || points.length === 0) return false

  const totalRadius = radius + strokeWidth / 2

  if (points.length === 1) {
    return Math.hypot(points[0].x - ex, points[0].y - ey) <= totalRadius
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const d = distToSegment(ex, ey, p1.x, p1.y, p2.x, p2.y)
    if (d <= totalRadius) {
      return true
    }
  }

  return false
}

/**
 * Splits a stroke into remaining sub-stroke segments by removing points inside the eraser circle.
 * This provides precision / standard point-by-point erasing without deleting the entire stroke!
 */
export function eraseStrokePoints(
  points: StrokePoint[],
  strokeWidth: number,
  ex: number,
  ey: number,
  radius: number
): StrokePoint[][] {
  if (!points || points.length === 0) return []

  const totalRadius = radius + strokeWidth / 3
  const segments: StrokePoint[][] = []
  let currentSegment: StrokePoint[] = []

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    const d = Math.hypot(pt.x - ex, pt.y - ey)

    if (d > totalRadius) {
      currentSegment.push(pt)
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
        currentSegment = []
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

/**
 * Checks if a bounding box (x, y, w, h) intersects an eraser circle at (ex, ey) with radius `radius`.
 */
export function boxIntersectsCircle(
  x: number,
  y: number,
  w: number,
  h: number,
  ex: number,
  ey: number,
  radius: number
): boolean {
  const closestX = Math.max(x, Math.min(ex, x + w))
  const closestY = Math.max(y, Math.min(ey, y + h))
  return Math.hypot(ex - closestX, ey - closestY) <= radius
}

/**
 * Point-in-polygon ray casting algorithm for lasso selection.
 */
export function pointInPolygon(x: number, y: number, poly: number[]): boolean {
  if (poly.length < 6) return false
  const pts: [number, number][] = []
  for (let i = 0; i < poly.length - 1; i += 2) {
    pts.push([poly[i], poly[i + 1]])
  }
  let inside = false
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Checks if two 2D line segments (p1-p2 and p3-p4) intersect.
 */
export function lineSegmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax)
  }
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  )
}

/**
 * Checks if any segment of a stroke intersects the boundary of a polygon.
 */
export function strokeIntersectsPolygon(points: { x: number; y: number }[], poly: number[]): boolean {
  if (!points || points.length < 2 || poly.length < 6) return false
  const polyPoints: [number, number][] = []
  for (let i = 0; i < poly.length - 1; i += 2) {
    polyPoints.push([poly[i], poly[i + 1]])
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const n = polyPoints.length
    for (let j = 0; j < n; j++) {
      const q1 = polyPoints[j]
      const q2 = polyPoints[(j + 1) % n]
      if (lineSegmentsIntersect(p1.x, p1.y, p2.x, p2.y, q1[0], q1[1], q2[0], q2[1])) {
        return true
      }
    }
  }
  return false
}

export interface DetectedShape {
  shapeType: 'rectangle' | 'circle' | 'line' | 'triangle'
  x: number
  y: number
  width: number
  height: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

/**
 * Goodnotes Shape Recognition:
 * Detects whether a freehand stroke matches a clean geometric shape (Line, Circle, Rectangle, Triangle).
 */
export function detectGeometricShape(points: { x: number; y: number }[]): DetectedShape | null {
  if (!points || points.length < 6) return null

  // Calculate total path length
  let totalLen = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalLen += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
  }
  // Require minimum length so normal handwriting words/letters are never mistaken for geometric shapes
  if (totalLen < 30) return null

  const p0 = points[0]
  const pEnd = points[points.length - 1]
  const directDist = Math.hypot(pEnd.x - p0.x, pEnd.y - p0.y)

  // 1. Straight Line Detection
  // Deliberate straight line drawing requires length >= 30 and ratio >= 0.92
  if (directDist >= 30 && directDist / totalLen >= 0.92) {
    return {
      shapeType: 'line',
      x: Math.min(p0.x, pEnd.x),
      y: Math.min(p0.y, pEnd.y),
      width: Math.abs(pEnd.x - p0.x),
      height: Math.abs(pEnd.y - p0.y),
      x1: p0.x,
      y1: p0.y,
      x2: pEnd.x,
      y2: pEnd.y,
    }
  }

  // Calculate bounding box
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w < 35 || h < 35) return null

  // 2. Closed Loop Shapes (Circle, Rectangle, Triangle)
  const isClosed = directDist < 45 || directDist / totalLen < 0.28
  if (!isClosed) return null

  const cx = minX + w / 2
  const cy = minY + h / 2
  const rx = w / 2
  const ry = h / 2

  // 2a. Check Ellipse / Circle
  let circleErr = 0
  for (const pt of points) {
    const normDist = Math.hypot((pt.x - cx) / rx, (pt.y - cy) / ry)
    circleErr += Math.abs(normDist - 1)
  }
  const avgCircleErr = circleErr / points.length
  if (avgCircleErr < 0.22) {
    return {
      shapeType: 'circle',
      x: minX,
      y: minY,
      width: w,
      height: h,
    }
  }

  // 2b. Check Rectangle
  // Points of a rectangle cluster near the 4 outer bounding box edges
  let rectEdgeHits = 0
  const pad = Math.max(w, h) * 0.18
  for (const pt of points) {
    const nearLeft = Math.abs(pt.x - minX) < pad
    const nearRight = Math.abs(pt.x - maxX) < pad
    const nearTop = Math.abs(pt.y - minY) < pad
    const nearBottom = Math.abs(pt.y - maxY) < pad
    if (nearLeft || nearRight || nearTop || nearBottom) {
      rectEdgeHits++
    }
  }
  const rectRatio = rectEdgeHits / points.length
  if (rectRatio >= 0.78) {
    return {
      shapeType: 'rectangle',
      x: minX,
      y: minY,
      width: w,
      height: h,
    }
  }

  return null
}

