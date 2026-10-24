import { describe, it, expect } from 'vitest'
import { uuidv4 } from './uuid'
import {
  distToSegment,
  strokeIntersectsCircle,
  boxIntersectsCircle,
  eraseStrokePoints,
  detectGeometricShape,
} from './geometry'
import { objectHitsPolygon } from './pageObjects'
import type { DrawingObject } from '../store/useAppStore'

describe('uuid', () => {
  it('generates a valid uuid format', () => {
    const id = uuidv4()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique ids', () => {
    const id1 = uuidv4()
    const id2 = uuidv4()
    expect(id1).not.toBe(id2)
  })
})

describe('geometry & eraser hit testing', () => {
  it('calculates point to segment distance correctly', () => {
    // Segment from (0, 0) to (10, 0)
    // Point at (5, 5) -> distance should be 5
    const d = distToSegment(5, 5, 0, 0, 10, 0)
    expect(d).toBeCloseTo(5)

    // Point at (15, 0) -> distance to endpoint (10,0) is 5
    const d2 = distToSegment(15, 0, 0, 0, 10, 0)
    expect(d2).toBeCloseTo(5)
  })

  it('detects stroke intersection between points', () => {
    // Stroke with points at (0, 0) and (100, 0)
    const points = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 100, y: 0, pressure: 0.5 },
    ]
    // Eraser at midpoint (50, 5) with radius 10
    const hits = strokeIntersectsCircle(points, 2, 50, 5, 10)
    expect(hits).toBe(true)

    // Eraser far away at (50, 50) with radius 10
    const misses = strokeIntersectsCircle(points, 2, 50, 50, 10)
    expect(misses).toBe(false)
  })

  it('detects box intersection', () => {
    const hits = boxIntersectsCircle(10, 10, 50, 50, 12, 12, 5)
    expect(hits).toBe(true)

    const misses = boxIntersectsCircle(10, 10, 50, 50, 100, 100, 5)
    expect(misses).toBe(false)
  })

  it('splits stroke points around the eraser circle', () => {
    // 5 points at x = 0, 10, 20, 30, 40
    const points = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 0, pressure: 0.5 },
      { x: 20, y: 0, pressure: 0.5 },
      { x: 30, y: 0, pressure: 0.5 },
      { x: 40, y: 0, pressure: 0.5 },
    ]
    // Erase point at (20, 0) with radius 5
    const segments = eraseStrokePoints(points, 2, 20, 0, 5)
    // Should be split into 2 segments: [0, 10] and [30, 40]
    expect(segments.length).toBe(2)
    expect(segments[0].length).toBe(2)
    expect(segments[1].length).toBe(2)
  })
})

describe('detectGeometricShape (Goodnotes Shape Recognition)', () => {
  it('detects a clean straight line', () => {
    // 8 points forming a nearly straight horizontal line with slight jitter
    const points = [
      { x: 10, y: 10, pressure: 0.5 },
      { x: 30, y: 10.5, pressure: 0.5 },
      { x: 50, y: 9.8, pressure: 0.5 },
      { x: 70, y: 10.2, pressure: 0.5 },
      { x: 90, y: 10, pressure: 0.5 },
      { x: 110, y: 10.3, pressure: 0.5 },
      { x: 130, y: 10, pressure: 0.5 },
    ]
    const detected = detectGeometricShape(points)
    expect(detected).not.toBeNull()
    expect(detected?.shapeType).toBe('line')
    expect(detected?.x1).toBe(10)
    expect(detected?.x2).toBe(130)
  })

  it('detects a closed circle/oval loop', () => {
    // 16 points around a circle of radius 40 centered at (100, 100)
    const points: { x: number; y: number; pressure: number }[] = []
    for (let i = 0; i <= 16; i++) {
      const angle = (i / 16) * Math.PI * 2
      points.push({
        x: 100 + Math.cos(angle) * 40,
        y: 100 + Math.sin(angle) * 40,
        pressure: 0.5,
      })
    }
    const detected = detectGeometricShape(points)
    expect(detected).not.toBeNull()
    expect(detected?.shapeType).toBe('circle')
    expect(detected?.width).toBeCloseTo(80, 0)
    expect(detected?.height).toBeCloseTo(80, 0)
  })
})

describe('lasso wrapping and polygon hit testing', () => {
  it('detects objects wrapped by freehand lasso polygon', () => {
    // Lasso polygon wrapping box around (50, 50) to (150, 150)
    const lassoPoly = [40, 40, 160, 40, 160, 160, 40, 160]

    // Object 1: Freehand stroke inside the lasso
    const insideObj: DrawingObject = {
      id: 'o1',
      type: 'freehand',
      tool: 'pen',
      color: '#000000',
      size: 2,
      opacity: 1,
      points: [
        { x: 80, y: 80, pressure: 0.5 },
        { x: 90, y: 90, pressure: 0.5 },
      ],
    }
    expect(objectHitsPolygon(insideObj, lassoPoly)).toBe(true)

    // Object 2: Freehand stroke completely outside the lasso
    const outsideObj: DrawingObject = {
      id: 'o2',
      type: 'freehand',
      tool: 'pen',
      color: '#000000',
      size: 2,
      opacity: 1,
      points: [
        { x: 250, y: 250, pressure: 0.5 },
        { x: 270, y: 270, pressure: 0.5 },
      ],
    }
    expect(objectHitsPolygon(outsideObj, lassoPoly)).toBe(false)
  })
})

