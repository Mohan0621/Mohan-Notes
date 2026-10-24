import type { DrawingObject } from '../store/useAppStore'
import { pointInPolygon, strokeIntersectsPolygon } from './geometry'
import { uuidv4 } from './uuid'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function getObjectBounds(obj: DrawingObject): Bounds {
  if (obj.type === 'freehand' && obj.points && obj.points.length) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    const pad = Math.max((obj.size ?? 2) / 2, 1)
    for (const p of obj.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(maxX - minX + pad * 2, 2),
      height: Math.max(maxY - minY + pad * 2, 2),
    }
  }

  if (obj.shapeType === 'line' || obj.shapeType === 'arrow') {
    const x1 = obj.x1 ?? obj.x ?? 0
    const y1 = obj.y1 ?? obj.y ?? 0
    const x2 = obj.x2 ?? (obj.x ?? 0) + (obj.width ?? 0)
    const y2 = obj.y2 ?? (obj.y ?? 0) + (obj.height ?? 0)
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.max(Math.abs(x2 - x1), 2),
      height: Math.max(Math.abs(y2 - y1), 2),
    }
  }

  return {
    x: obj.x ?? 0,
    y: obj.y ?? 0,
    width: Math.max(obj.width ?? 40, 2),
    height: Math.max(obj.height ?? 40, 2),
  }
}

export function unionBounds(list: Bounds[]): Bounds | null {
  if (!list.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of list) {
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function rectToPolygon(x: number, y: number, w: number, h: number): number[] {
  return [x, y, x + w, y, x + w, y + h, x, y + h]
}

export function polygonBounds(poly: number[]): Bounds | null {
  if (poly.length < 4) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < poly.length; i += 2) {
    minX = Math.min(minX, poly[i])
    minY = Math.min(minY, poly[i + 1])
  }
  for (let i = 0; i < poly.length; i += 2) {
    maxX = Math.max(maxX, poly[i])
    maxY = Math.max(maxY, poly[i + 1])
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function objectHitsPolygon(obj: DrawingObject, poly: number[]): boolean {
  if (poly.length < 6) {
    const b = polygonBounds(poly)
    if (!b || (b.width < 4 && b.height < 4)) return false
    return objectHitsRect(obj, b.x, b.y, b.width, b.height)
  }

  // 1. Freehand stroke: point inside polygon OR stroke crosses polygon boundary
  if (obj.type === 'freehand' && obj.points && obj.points.length > 0) {
    if (obj.points.some((p) => pointInPolygon(p.x, p.y, poly))) return true
    if (strokeIntersectsPolygon(obj.points, poly)) return true
    return false
  }

  // 2. Line or Arrow: check endpoints or line crossing polygon
  if (obj.shapeType === 'line' || obj.shapeType === 'arrow') {
    const x1 = obj.x1 ?? obj.x ?? 0
    const y1 = obj.y1 ?? obj.y ?? 0
    const x2 = obj.x2 ?? (obj.x ?? 0) + (obj.width ?? 0)
    const y2 = obj.y2 ?? (obj.y ?? 0) + (obj.height ?? 0)
    if (pointInPolygon(x1, y1, poly) || pointInPolygon(x2, y2, poly)) return true
    const lineStroke = [{ x: x1, y: y1 }, { x: x2, y: y2 }]
    if (strokeIntersectsPolygon(lineStroke, poly)) return true
    return false
  }

  // 3. Shapes, text, images: check corners and center
  const b = getObjectBounds(obj)
  const samples: [number, number][] = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height],
    [b.x + b.width / 2, b.y + b.height / 2],
  ]
  if (samples.some(([x, y]) => pointInPolygon(x, y, poly))) return true

  // Check if any polygon vertex is inside this object's bounds
  for (let i = 0; i < poly.length - 1; i += 2) {
    const px = poly[i]
    const py = poly[i + 1]
    if (px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height) {
      return true
    }
  }

  return false
}

export function objectHitsRect(obj: DrawingObject, rx: number, ry: number, rw: number, rh: number): boolean {
  const b = getObjectBounds(obj)
  return !(b.x + b.width < rx || rx + rw < b.x || b.y + b.height < ry || ry + rh < b.y)
}

export function translateObject(obj: DrawingObject, dx: number, dy: number): DrawingObject {
  return {
    ...obj,
    x: obj.x != null ? obj.x + dx : obj.x,
    y: obj.y != null ? obj.y + dy : obj.y,
    x1: obj.x1 != null ? obj.x1 + dx : obj.x1,
    y1: obj.y1 != null ? obj.y1 + dy : obj.y1,
    x2: obj.x2 != null ? obj.x2 + dx : obj.x2,
    y2: obj.y2 != null ? obj.y2 + dy : obj.y2,
    points: obj.points?.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
  }
}

export function cloneObject(obj: DrawingObject, dx = 28, dy = 28): DrawingObject {
  return { ...translateObject(obj, dx, dy), id: uuidv4() }
}

export function trianglePoints(x: number, y: number, w: number, h: number): number[] {
  return [x + w / 2, y, x + w, y + h, x, y + h]
}

export function starPoints(cx: number, cy: number, outerR: number, innerR: number, spikes = 5): number[] {
  const pts: number[] = []
  const step = Math.PI / spikes
  let rot = -Math.PI / 2
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r)
    rot += step
  }
  return pts
}

export function shapeFromDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  constrainSquare: boolean
) {
  let x2 = end.x
  let y2 = end.y
  if (constrainSquare) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const side = Math.max(Math.abs(dx), Math.abs(dy))
    x2 = start.x + Math.sign(dx || 1) * side
    y2 = start.y + Math.sign(dy || 1) * side
  }
  return {
    x: Math.min(start.x, x2),
    y: Math.min(start.y, y2),
    width: Math.abs(x2 - start.x),
    height: Math.abs(y2 - start.y),
    x1: start.x,
    y1: start.y,
    x2,
    y2,
  }
}
