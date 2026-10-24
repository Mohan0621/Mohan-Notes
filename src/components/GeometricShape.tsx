import { Rect, Ellipse, Line, Arrow, Text as KonvaText, Image as KonvaImage } from 'react-konva'
import { useEffect, useState } from 'react'
import type { DrawingObject } from '../store/useAppStore'
import { starPoints, trianglePoints } from '../utils/pageObjects'

interface GeometricShapeProps {
  obj: DrawingObject
  selected?: boolean
}

export function GeometricShape({ obj, selected }: GeometricShapeProps) {
  const sw = Math.max(obj.size ?? 2, 1.5)
  const stroke = obj.color || '#111827'
  const highlight = selected ? { shadowColor: '#2563eb', shadowBlur: 8, shadowOpacity: 0.45 } : {}

  if (obj.type === 'text') {
    return (
      <KonvaText
        x={obj.x ?? 0}
        y={obj.y ?? 0}
        text={obj.text || ''}
        fontSize={obj.fontSize ?? 18}
        fontFamily={obj.fontFamily ?? 'Inter, sans-serif'}
        fill={stroke}
        width={obj.width ?? 280}
        listening={false}
        {...highlight}
      />
    )
  }

  if (obj.type === 'image') {
    return <CanvasImage obj={obj} selected={!!selected} />
  }

  if (obj.type !== 'shape') return null

  const x = obj.x ?? 0
  const y = obj.y ?? 0
  const w = Math.max(obj.width ?? 0, 1)
  const h = Math.max(obj.height ?? 0, 1)
  const x1 = obj.x1 ?? x
  const y1 = obj.y1 ?? y
  const x2 = obj.x2 ?? x + w
  const y2 = obj.y2 ?? y + h
  const kind = obj.shapeType ?? 'rectangle'

  if (kind === 'line') {
    return (
      <Line
        points={[x1, y1, x2, y2]}
        stroke={stroke}
        strokeWidth={sw}
        lineCap="round"
        listening={false}
        {...highlight}
      />
    )
  }

  if (kind === 'arrow') {
    return (
      <Arrow
        points={[x1, y1, x2, y2]}
        stroke={stroke}
        fill={stroke}
        strokeWidth={sw}
        pointerLength={Math.max(12, sw * 3)}
        pointerWidth={Math.max(10, sw * 2.4)}
        listening={false}
        {...highlight}
      />
    )
  }

  if (kind === 'circle') {
    return (
      <Ellipse
        x={x + w / 2}
        y={y + h / 2}
        radiusX={Math.max(w / 2, 1)}
        radiusY={Math.max(h / 2, 1)}
        stroke={stroke}
        strokeWidth={sw}
        fill="rgba(255,255,255,0)"
        listening={false}
        {...highlight}
      />
    )
  }

  if (kind === 'triangle') {
    return (
      <Line
        points={trianglePoints(x, y, w, h)}
        closed
        stroke={stroke}
        strokeWidth={sw}
        fill="rgba(255,255,255,0)"
        lineJoin="round"
        listening={false}
        {...highlight}
      />
    )
  }

  if (kind === 'star') {
    const cx = x + w / 2
    const cy = y + h / 2
    const outer = Math.min(w, h) / 2
    return (
      <Line
        points={starPoints(cx, cy, outer, outer * 0.42)}
        closed
        stroke={stroke}
        strokeWidth={sw}
        fill="rgba(255,255,255,0)"
        lineJoin="round"
        listening={false}
        {...highlight}
      />
    )
  }

  return (
    <Rect
      x={x}
      y={y}
      width={w}
      height={h}
      stroke={stroke}
      strokeWidth={sw}
      cornerRadius={6}
      fill="rgba(255,255,255,0)"
      listening={false}
      {...highlight}
    />
  )
}

function CanvasImage({ obj, selected }: { obj: DrawingObject; selected: boolean }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!obj.imageUrl) return
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = obj.imageUrl
  }, [obj.imageUrl])

  if (!image) return null

  return (
    <KonvaImage
      image={image}
      x={obj.x ?? 0}
      y={obj.y ?? 0}
      width={obj.width ?? 200}
      height={obj.height ?? 150}
      listening={false}
      shadowColor={selected ? '#2563eb' : undefined}
      shadowBlur={selected ? 8 : 0}
    />
  )
}

