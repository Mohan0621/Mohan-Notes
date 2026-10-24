import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Stage, Layer, Circle, Shape, Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import {
  useAppStore,
  type Page,
  type DrawingObject,
  type StrokePoint,
  type ToolType,
  type PenType,
  type ToolSettings,
} from '../store/useAppStore'
import { renderTemplate, getPageDimensions, type TemplateType, type PaperColor } from '../utils/pageTemplates'
import { loadPdfPage } from '../utils/pdfLoader'
import { uuidv4 } from '../utils/uuid'
import {
  strokeIntersectsCircle,
  eraseStrokePoints,
  boxIntersectsCircle,
  detectGeometricShape,
} from '../utils/geometry'
import {
  cloneObject,
  getObjectBounds,
  objectHitsPolygon,
  objectHitsRect,
  shapeFromDrag,
  translateObject,
  unionBounds,
} from '../utils/pageObjects'
import { GeometricShape } from './GeometricShape'
import { getPolishedStrokeOutline, drawSmoothOutline } from '../utils/strokeRenderer'
import './CanvasView.css'

interface CanvasViewProps {
  notebookId: number
}

// ─── Single Page Card Component ───────────────────────────────────────────────

interface SinglePageCardProps {
  page: Page
  pageIndex: number
  totalPages: number
  notebookId: number
  isSelected: boolean
  zoomLevel: number
  containerWidth: number
  containerHeight: number
  activeTool: ToolType
  toolSettings: ToolSettings
  laserPoints: { x: number; y: number; time: number }[]
  setLaserPoints: React.Dispatch<React.SetStateAction<{ x: number; y: number; time: number }[]>>
  onAddPageBelow: (order: number, template: TemplateType, paperColor: PaperColor) => void
  onDuplicatePage: (pageId: number) => void
  onDeletePage: (pageId: number) => void
}

function SinglePageCard({
  page,
  pageIndex,
  totalPages,
  notebookId,
  isSelected,
  zoomLevel,
  containerWidth,
  containerHeight,
  activeTool,
  toolSettings,
  laserPoints,
  setLaserPoints,
  onAddPageBelow,
  onDuplicatePage,
  onDeletePage,
}: SinglePageCardProps) {
  const {
    objectsByPage,
    addObject,
    updateObject,
    setPageObjects,
    savePageObjects,
    loadPageObjects,
    pushHistory,
    selectPage,
    removeObjects,
    clipboard,
    setClipboard,
  } = useAppStore()

  const pageId = page.id
  const objects = useMemo(() => objectsByPage[pageId] ?? [], [objectsByPage, pageId])

  const [isDrawing, setIsDrawing] = useState(false)
  const [isStylusErasing, setIsStylusErasing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<StrokePoint[]>([])
  const [currentObjId, setCurrentObjId] = useState<string | null>(null)
  const [pdfImage, setPdfImage] = useState<HTMLImageElement | null>(null)
  const [lassoPoints, setLassoPoints] = useState<number[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editingTextVal, setEditingTextVal] = useState('')
  const [editingTextPos, setEditingTextPos] = useState<{ x: number; y: number } | null>(null)
  const [selectionOffset, setSelectionOffset] = useState({ x: 0, y: 0 })
  const [isMovingSelection, setIsMovingSelection] = useState(false)
  const moveStartRef = useRef<{ x: number; y: number } | null>(null)
  const isMovingSelectionRef = useRef(false)
  const selectionOffsetRef = useRef({ x: 0, y: 0 })
  const lassoPointsRef = useRef<number[]>([])
  const shiftKeyRef = useRef(false)

  const stageRef = useRef<Konva.Stage>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDrawingRef = useRef(false)
  const isStylusErasingRef = useRef(false)
  const currentPointsRef = useRef<StrokePoint[]>([])
  const activePointerIdRef = useRef<number | null>(null)
  const hoverCountRef = useRef(0)
  const lastPressureRef = useRef(0.5)
  const rafIdRef = useRef<number | null>(null)

  // Dimensions based on template (Standard Portrait vs Big Widescreen Chart)
  const { width: CANVAS_W, height: CANVAS_H } = useMemo(
    () => getPageDimensions(page.template),
    [page.template]
  )

  // Compute scale based on viewport
  const baseScale = useMemo(() => {
    if (containerWidth <= 0 || containerHeight <= 0) return 0.85
    const availW = Math.max(containerWidth - 160, 360)
    const availH = Math.max(containerHeight - 120, 500)
    return Math.min(availW / CANVAS_W, availH / CANVAS_H, 1.0)
  }, [containerWidth, containerHeight, CANVAS_W, CANVAS_H])

  const totalScale = baseScale * zoomLevel
  const stageWidth = CANVAS_W * totalScale
  const stageHeight = CANVAS_H * totalScale

  // Eraser radius
  const eraserRadius = useMemo(() => {
    switch (toolSettings.eraserSize) {
      case 'small':
        return 12
      case 'large':
        return 44
      case 'medium':
      default:
        return 24
    }
  }, [toolSettings.eraserSize])

  // Load objects on mount if not yet loaded in memory
  useEffect(() => {
    if (objectsByPage[pageId] === undefined) {
      loadPageObjects(pageId)
    }
  }, [pageId, loadPageObjects, objectsByPage])

  // Load PDF
  useEffect(() => {
    if (page.pdfPath) {
      loadPdfPage(page.pdfPath, page.pdfPageNumber ?? 1).then(setPdfImage)
    } else {
      setPdfImage(null)
    }
  }, [page.pdfPath, page.pdfPageNumber])

  // Draw template onto background canvas
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const tmpl = renderTemplate(
      (page.template as TemplateType) ?? 'lined',
      CANVAS_W,
      CANVAS_H,
      (page.paperColor as PaperColor) ?? (page.template === 'blackboard' ? 'black' : 'white')
    )
    ctx.drawImage(tmpl, 0, 0)
    if (pdfImage) {
      ctx.drawImage(pdfImage, 0, 0, CANVAS_W, CANVAS_H)
    }
  }, [page.template, page.paperColor, pdfImage, CANVAS_W, CANVAS_H])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePageObjects(pageId), 500)
  }, [pageId, savePageObjects])

  const selectionBounds = useMemo(() => {
    const selected = objects.filter((o) => selectedIds.includes(o.id))
    const bounds = unionBounds(selected.map(getObjectBounds))
    if (!bounds) return null
    return {
      ...bounds,
      x: bounds.x + selectionOffset.x,
      y: bounds.y + selectionOffset.y,
    }
  }, [objects, selectedIds, selectionOffset])

  const displayObjects = useMemo(() => {
    if (!selectionOffset.x && !selectionOffset.y) return objects
    return objects.map((o) =>
      selectedIds.includes(o.id) ? translateObject(o, selectionOffset.x, selectionOffset.y) : o
    )
  }, [objects, selectedIds, selectionOffset])

  const pointInSelection = (x: number, y: number) => {
    if (!selectionBounds) return false
    return (
      x >= selectionBounds.x - 8 &&
      y >= selectionBounds.y - 8 &&
      x <= selectionBounds.x + selectionBounds.width + 8 &&
      y <= selectionBounds.y + selectionBounds.height + 8
    )
  }

  const commitSelectionMove = useCallback(() => {
    if (!isMovingSelectionRef.current && !isMovingSelection) return
    const dx = selectionOffsetRef.current.x || selectionOffset.x
    const dy = selectionOffsetRef.current.y || selectionOffset.y
    isMovingSelectionRef.current = false
    setIsMovingSelection(false)
    moveStartRef.current = null
    selectionOffsetRef.current = { x: 0, y: 0 }
    setSelectionOffset({ x: 0, y: 0 })
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    const next = objects.map((o) => (selectedIds.includes(o.id) ? translateObject(o, dx, dy) : o))
    setPageObjects(pageId, next)
    pushHistory(pageId)
    scheduleSave()
  }, [isMovingSelection, selectionOffset, objects, selectedIds, pageId, setPageObjects, pushHistory, scheduleSave])

  const commitLassoSelection = useCallback(() => {
    let poly = lassoPointsRef.current
    if (poly.length < 6 && lassoPoints.length >= 6) {
      poly = lassoPoints
    }
    let hit: DrawingObject[] = []
    if (toolSettings.lassoMode === 'rect' && currentPointsRef.current.length >= 2) {
      const [s, e] = currentPointsRef.current
      const x = Math.min(s.x, e.x)
      const y = Math.min(s.y, e.y)
      const w = Math.abs(e.x - s.x)
      const h = Math.abs(e.y - s.y)
      if (w >= 4 || h >= 4) {
        hit = objects.filter((o) => objectHitsRect(o, x, y, w, h))
      }
    } else if (poly.length >= 4) {
      hit = objects.filter((o) => objectHitsPolygon(o, poly))
    }
    setSelectedIds(hit.map((o) => o.id))
    lassoPointsRef.current = []
    setLassoPoints([])
  }, [lassoPoints, objects, toolSettings.lassoMode])

  const recolorSelection = useCallback(
    (color: string) => {
      if (!selectedIds.length) return
      const next = objects.map((o) =>
        selectedIds.includes(o.id) ? { ...o, color } : o
      )
      setPageObjects(pageId, next)
      pushHistory(pageId)
      scheduleSave()
    },
    [selectedIds, objects, pageId, setPageObjects, pushHistory, scheduleSave]
  )

  const copySelection = useCallback(() => {
    const selected = objects.filter((o) => selectedIds.includes(o.id))
    if (!selected.length) return
    setClipboard(selected)
  }, [objects, selectedIds, setClipboard])

  const cutSelection = useCallback(() => {
    const selected = objects.filter((o) => selectedIds.includes(o.id))
    if (!selected.length) return
    setClipboard(selected)
    removeObjects(pageId, selectedIds)
    setSelectedIds([])
    scheduleSave()
  }, [objects, selectedIds, setClipboard, removeObjects, pageId, scheduleSave])

  const duplicateSelection = useCallback(() => {
    const selected = objects.filter((o) => selectedIds.includes(o.id))
    if (!selected.length) return
    const clones = selected.map((o) => cloneObject(o, 24, 24))
    setPageObjects(pageId, [...objects, ...clones])
    pushHistory(pageId)
    setSelectedIds(clones.map((c) => c.id))
    scheduleSave()
  }, [objects, selectedIds, pageId, setPageObjects, pushHistory, scheduleSave])

  const pasteClipboard = useCallback(() => {
    if (!clipboard.length) return
    const clones = clipboard.map((o) => cloneObject(o, 28, 28))
    setPageObjects(pageId, [...objects, ...clones])
    pushHistory(pageId)
    setSelectedIds(clones.map((c) => c.id))
    setClipboard(clones)
    scheduleSave()
  }, [clipboard, objects, pageId, setPageObjects, pushHistory, setClipboard, scheduleSave])

  const deleteSelection = useCallback(() => {
    if (!selectedIds.length) return
    removeObjects(pageId, selectedIds)
    setSelectedIds([])
    scheduleSave()
  }, [selectedIds, removeObjects, pageId, scheduleSave])

  const getCanvasPos = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current
      if (!stage) return { x: 0, y: 0 }
      const containerRect = stage.container().getBoundingClientRect()
      return {
        x: (clientX - containerRect.left) / totalScale,
        y: (clientY - containerRect.top) / totalScale,
      }
    },
    [totalScale]
  )

  const getPressure = useCallback((pe: PointerEvent) => {
    if (pe.pointerType === 'mouse') {
      return 0.75
    }
    if (typeof pe.pressure === 'number' && pe.pressure > 0) {
      const clamped = Math.max(pe.pressure, 0.25)
      lastPressureRef.current = clamped
      return clamped
    }
    if (isDrawingRef.current && lastPressureRef.current > 0) {
      return Math.max(lastPressureRef.current, 0.25)
    }
    return 0.5
  }, [])

  // ─── Point-by-Point Eraser Execution ─────────────────────────────────────────

  const executeEraser = useCallback(
    (x: number, y: number) => {
      const radius = eraserRadius
      const isStrokeMode = toolSettings.eraserType === 'stroke'

      let hasChanged = false
      const nextObjects: DrawingObject[] = []

      for (const obj of objects) {
        if (obj.type === 'freehand' && obj.points) {
          const sw =
            obj.tool === 'highlighter'
              ? obj.size * 3.5
              : obj.tool === 'pencil'
              ? obj.size * 0.8
              : obj.size

          if (strokeIntersectsCircle(obj.points, sw, x, y, radius)) {
            hasChanged = true
            if (isStrokeMode) {
              continue
            } else {
              const subSegments = eraseStrokePoints(obj.points, sw, x, y, radius)
              for (const seg of subSegments) {
                if (seg.length > 0) {
                  nextObjects.push({
                    ...obj,
                    id: uuidv4(),
                    points: seg,
                  })
                }
              }
              continue
            }
          }
        } else if (obj.type === 'shape') {
          if (boxIntersectsCircle(obj.x ?? 0, obj.y ?? 0, obj.width ?? 40, obj.height ?? 40, x, y, radius)) {
            hasChanged = true
            continue
          }
        } else if (obj.type === 'text' || obj.type === 'image') {
          if (boxIntersectsCircle(obj.x ?? 0, obj.y ?? 0, obj.width ?? 60, obj.height ?? 30, x, y, radius)) {
            hasChanged = true
            continue
          }
        }
        nextObjects.push(obj)
      }

      if (hasChanged) {
        setPageObjects(pageId, nextObjects)
        pushHistory(pageId)
        scheduleSave()
      }
    },
    [eraserRadius, toolSettings.eraserType, objects, pageId, setPageObjects, pushHistory, scheduleSave]
  )

  // ─── Finish Drawing Stroke ───────────────────────────────────────────────────

  const finishDrawing = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    activePointerIdRef.current = null
    hoverCountRef.current = 0

    if (isStylusErasingRef.current) {
      isStylusErasingRef.current = false
      setIsStylusErasing(false)
      scheduleSave()
      return
    }

    if (isMovingSelectionRef.current || isMovingSelection) {
      commitSelectionMove()
      return
    }

    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    setIsDrawing(false)

    const points = currentPointsRef.current
    if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
      if (points.length >= 1) {
        addObject(pageId, {
          id: currentObjId ?? uuidv4(),
          type: 'freehand',
          tool: activeTool,
          color: toolSettings.color,
          size: toolSettings.size,
          opacity: activeTool === 'highlighter' ? 0.38 : activeTool === 'pencil' ? 0.6 : 1,
          points: [...points],
        })
        scheduleSave()
      }
    } else if (activeTool === 'shape' && points.length >= 2) {
      const [s, e2] = points
      const recognized = points.length >= 8 ? detectGeometricShape(points) : null
      const isLine = toolSettings.shapeType === 'line' || toolSettings.shapeType === 'arrow'
      const geom = shapeFromDrag(s, e2, shiftKeyRef.current)
      const longEnough = isLine
        ? Math.hypot(geom.x2 - geom.x1, geom.y2 - geom.y1) >= 6
        : geom.width >= 6 || geom.height >= 6
      if (longEnough || recognized) {
        const shapeTypeToUse = recognized?.shapeType ?? toolSettings.shapeType
        addObject(pageId, {
          id: currentObjId ?? uuidv4(),
          type: 'shape',
          tool: 'shape',
          color: toolSettings.color,
          size: Math.max(toolSettings.size, 2),
          opacity: 1,
          shapeType: shapeTypeToUse,
          x: recognized?.x ?? geom.x,
          y: recognized?.y ?? geom.y,
          width: Math.max(recognized?.width ?? geom.width, isLine ? 1 : 8),
          height: Math.max(recognized?.height ?? geom.height, isLine ? 1 : 8),
          x1: recognized?.x1 ?? geom.x1,
          y1: recognized?.y1 ?? geom.y1,
          x2: recognized?.x2 ?? geom.x2,
          y2: recognized?.y2 ?? geom.y2,
        })
        scheduleSave()
      }
    } else if (activeTool === 'lasso') {
      commitLassoSelection()
    }

    currentPointsRef.current = []
    setCurrentPoints([])
    setCurrentObjId(null)
  }, [
    activeTool,
    currentObjId,
    pageId,
    toolSettings.color,
    toolSettings.size,
    toolSettings.shapeType,
    addObject,
    scheduleSave,
    commitLassoSelection,
    isMovingSelection,
    commitSelectionMove,
  ])

  // ─── Native & Global Pointer Move Handler ──────────────────────────────────
  const handleMovePoint = useCallback(
    (pe: PointerEvent) => {
      if (activeTool === 'hand') return
      try {
        pe.preventDefault()
      } catch {
        /* ignore */
      }

      const { x, y } = getCanvasPos(pe.clientX, pe.clientY)
      setCursorPos({ x, y })
      shiftKeyRef.current = pe.shiftKey

      if ((isMovingSelectionRef.current || isMovingSelection) && moveStartRef.current) {
        const nextOffset = {
          x: x - moveStartRef.current.x,
          y: y - moveStartRef.current.y,
        }
        selectionOffsetRef.current = nextOffset
        setSelectionOffset(nextOffset)
        return
      }

      // Stylus barrel button erase
      if (
        isStylusErasingRef.current ||
        pe.buttons === 32 ||
        (pe.pointerType === 'pen' && (pe.buttons === 2 || pe.button === 2))
      ) {
        executeEraser(x, y)
        return
      }

      if (!isDrawingRef.current) return

      // NOTE: We deliberately do NOT abort on pe.buttons === 0 here!
      // In Windows & Chromium, tablet styluses (Huion, Wacom, XP-Pen) often send
      // buttons: 0 or brief pressure drops mid-stroke.
      // Strokes are terminated ONLY on pointerup / pointercancel.

      const coalesced: PointerEvent[] =
        typeof pe.getCoalescedEvents === 'function' && pe.getCoalescedEvents().length > 0
          ? pe.getCoalescedEvents()
          : [pe]

      if (activeTool === 'eraser') {
        for (const ev of coalesced) {
          const pt = getCanvasPos(ev.clientX, ev.clientY)
          executeEraser(pt.x, pt.y)
        }
      } else if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
        const newPts: StrokePoint[] = []
        let lastPt = currentPointsRef.current[currentPointsRef.current.length - 1]
        for (const ev of coalesced) {
          const pt = getCanvasPos(ev.clientX, ev.clientY)
          const press = getPressure(ev)
          if (lastPt && Math.hypot(lastPt.x - pt.x, lastPt.y - pt.y) < 0.2) {
            continue
          }
          const pointObj = { x: pt.x, y: pt.y, pressure: press }
          newPts.push(pointObj)
          lastPt = pointObj
        }
        if (newPts.length > 0) {
          currentPointsRef.current.push(...newPts)
          // Batch React re-renders via requestAnimationFrame to avoid freezing the event loop
          if (!rafIdRef.current) {
            rafIdRef.current = requestAnimationFrame(() => {
              rafIdRef.current = null
              setCurrentPoints([...currentPointsRef.current])
            })
          }
        }
      } else if (activeTool === 'shape' && currentPointsRef.current.length > 0) {
        currentPointsRef.current.push({ x, y, pressure: 1 })
        setCurrentPoints([...currentPointsRef.current])
      } else if (activeTool === 'lasso') {
        if (toolSettings.lassoMode === 'rect' && currentPointsRef.current.length > 0) {
          const pts = currentPointsRef.current
          const updated = pts.length === 1 ? [...pts, { x, y, pressure: 1 }] : [pts[0], { x, y, pressure: 1 }]
          currentPointsRef.current = updated
          setCurrentPoints(updated)
        } else {
          const pts = lassoPointsRef.current
          if (pts.length >= 2) {
            const lastX = pts[pts.length - 2]
            const lastY = pts[pts.length - 1]
            if (Math.hypot(x - lastX, y - lastY) < 2) return
          }
          pts.push(x, y)
          setLassoPoints([...pts])
        }
      } else if (activeTool === 'laser') {
        setLaserPoints((pts) => [...pts, { x, y, time: Date.now() }])
      }
    },
    [
      activeTool,
      getCanvasPos,
      isMovingSelection,
      executeEraser,
      toolSettings.lassoMode,
      getPressure,
      setLaserPoints,
    ]
  )

  // Window-level pointer tracking ensuring 100% of movements and releases are captured
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current && !isStylusErasingRef.current && !isMovingSelectionRef.current) return
      handleMovePoint(e)
    }
    const handleGlobalPointerUp = () => {
      if (isDrawingRef.current || isStylusErasingRef.current) {
        finishDrawing()
      }
    }
    const handleGlobalPointerCancel = () => {
      // Discard 1-point micro-cancels from Windows Ink gesture recognition
      if (isDrawingRef.current && currentPointsRef.current.length <= 1) {
        currentPointsRef.current = []
        setCurrentPoints([])
        isDrawingRef.current = false
        setIsDrawing(false)
        setCurrentObjId(null)
        return
      }
      if (isDrawingRef.current || isStylusErasingRef.current) {
        finishDrawing()
      }
    }
    const handleBlur = () => {
      if (isDrawingRef.current || isStylusErasingRef.current) {
        finishDrawing()
      }
    }

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: false })
    window.addEventListener('pointerup', handleGlobalPointerUp)
    window.addEventListener('pointercancel', handleGlobalPointerCancel)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
      window.removeEventListener('pointercancel', handleGlobalPointerCancel)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleMovePoint, finishDrawing])

  // Keyboard shortcuts for selected lasso objects (Copy, Cut, Paste, Delete, Esc)
  useEffect(() => {
    if (!isSelected || !selectedIds.length) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault()
          copySelection()
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault()
          cutSelection()
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault()
          pasteClipboard()
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelection()
      } else if (e.key === 'Escape') {
        setSelectedIds([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, selectedIds, copySelection, cutSelection, pasteClipboard, deleteSelection])

  // ─── Pointer Down ─────────────────────────────────────────────────────────────

  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    if (activeTool === 'hand') return
    const pe = e.evt as PointerEvent

    // Allow primary click for mouse, secondary for eraser, and ALL pen / touch events
    if (
      pe.pointerType === 'mouse' &&
      pe.button !== 0 &&
      pe.buttons !== 1 &&
      pe.button !== 2 &&
      pe.buttons !== 2
    ) {
      return
    }

    try {
      pe.preventDefault()
    } catch {
      /* ignore */
    }

    if (!isSelected) {
      selectPage(notebookId, pageId)
    }
    activePointerIdRef.current = pe.pointerId
    shiftKeyRef.current = pe.shiftKey

    const { x, y } = getCanvasPos(pe.clientX, pe.clientY)
    const pressure = getPressure(pe)
    setCursorPos({ x, y })
    hoverCountRef.current = 0

    if (selectedIds.length && pointInSelection(x, y) && (activeTool === 'lasso' || activeTool === 'shape')) {
      isMovingSelectionRef.current = true
      setIsMovingSelection(true)
      moveStartRef.current = { x: x - selectionOffset.x, y: y - selectionOffset.y }
      return
    }

    if (selectedIds.length && !pointInSelection(x, y) && activeTool === 'lasso') {
      setSelectedIds([])
    }

    // Stylus barrel button erase (button 2 or buttons 2 or 32)
    if (
      pe.buttons === 32 ||
      pe.button === 2 ||
      (pe.pointerType === 'pen' && (pe.buttons === 2 || pe.buttons === 32))
    ) {
      isStylusErasingRef.current = true
      setIsStylusErasing(true)
      executeEraser(x, y)
      return
    }

    if (activeTool === 'eraser') {
      isDrawingRef.current = true
      setIsDrawing(true)
      executeEraser(x, y)
    } else if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
      const id = uuidv4()
      isDrawingRef.current = true
      setIsDrawing(true)
      setCurrentObjId(id)
      const initialPts = [{ x, y, pressure }]
      currentPointsRef.current = initialPts
      setCurrentPoints(initialPts)
    } else if (activeTool === 'shape') {
      const id = uuidv4()
      isDrawingRef.current = true
      setIsDrawing(true)
      setCurrentObjId(id)
      const initialPts = [{ x, y, pressure: 1 }]
      currentPointsRef.current = initialPts
      setCurrentPoints(initialPts)
    } else if (activeTool === 'lasso') {
      isDrawingRef.current = true
      setIsDrawing(true)
      setSelectedIds([])
      setSelectionOffset({ x: 0, y: 0 })
      selectionOffsetRef.current = { x: 0, y: 0 }
      if (toolSettings.lassoMode === 'rect') {
        const initialPts = [{ x, y, pressure: 1 }]
        currentPointsRef.current = initialPts
        setCurrentPoints(initialPts)
        lassoPointsRef.current = []
        setLassoPoints([])
      } else {
        lassoPointsRef.current = [x, y]
        setLassoPoints([x, y])
      }
    } else if (activeTool === 'laser') {
      isDrawingRef.current = true
      setIsDrawing(true)
      setLaserPoints((pts) => [...pts, { x, y, time: Date.now() }])
    } else if (activeTool === 'text') {
      const newId = uuidv4()
      const obj: DrawingObject = {
        id: newId,
        type: 'text',
        tool: 'text',
        color: toolSettings.color,
        size: toolSettings.size,
        opacity: 1,
        x,
        y,
        text: 'Type here...',
        fontSize: 18,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }
      addObject(pageId, obj)
      scheduleSave()
      setEditingTextId(newId)
      setEditingTextVal('Type here...')
      setEditingTextPos({ x, y })
    }
  }

  // ─── Pointer Move ─────────────────────────────────────────────────────────────

  const onPointerMove = (e: KonvaEventObject<PointerEvent>) => {
    handleMovePoint(e.evt as PointerEvent)
  }

  // ─── Stroke Shape Renderer ───────────────────────────────────────────────────

  const renderStrokeShape = (
    id: string,
    points: StrokePoint[],
    tool: ToolType,
    penType: PenType,
    baseSize: number,
    color: string,
    opacity: number,
    isSelectedStroke: boolean,
    isComplete = true
  ) => {
    return (
      <Shape
        key={id}
        sceneFunc={(context) => {
          if (!points || points.length === 0) return
          const ctx = context._context as CanvasRenderingContext2D

          ctx.save()

          if (tool === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply'
            ctx.globalAlpha = opacity
            ctx.strokeStyle = color
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.lineWidth = baseSize * 4
            ctx.beginPath()
            ctx.moveTo(points[0].x, points[0].y)
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y)
            }
            ctx.stroke()
          } else {
            ctx.globalAlpha = opacity
            ctx.fillStyle = color
            ctx.strokeStyle = color

            // Single dot
            if (points.length === 1) {
              const p = points[0]
              const dotR = Math.max((baseSize * (0.6 + 0.8 * (p.pressure ?? 0.5))) / 2, 1.8)
              ctx.beginPath()
              ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2)
              ctx.fill()
              ctx.restore()
              return
            }

            const outline = getPolishedStrokeOutline(points, tool, penType, baseSize, isComplete)
            drawSmoothOutline(ctx, outline)

            if (isSelectedStroke) {
              ctx.lineWidth = 1.5
              ctx.strokeStyle = '#2563eb'
              ctx.setLineDash([4, 4])
              ctx.stroke()
            }
          }

          ctx.restore()
        }}
        listening={false}
      />
    )
  }

  // ─── Render Canvas Objects ───────────────────────────────────────────────────

  const renderObj = (obj: DrawingObject) => {
    const sel = selectedIds.includes(obj.id)

    if (obj.type === 'freehand' && obj.points && obj.points.length >= 1) {
      return renderStrokeShape(
        obj.id,
        obj.points,
        obj.tool,
        toolSettings.penType,
        obj.size,
        obj.color,
        obj.opacity,
        sel,
        true
      )
    }

    if (obj.type === 'shape' || obj.type === 'text' || obj.type === 'image') {
      return <GeometricShape key={obj.id} obj={obj} selected={sel} />
    }

    return null
  }

  // ─── Live Preview Stroke ─────────────────────────────────────────────────────

  const renderPreview = () => {
    if (!isDrawing || currentPoints.length < 1) return null

    if (activeTool === 'pen' || activeTool === 'pencil' || activeTool === 'highlighter') {
      return renderStrokeShape(
        'preview-stroke',
        currentPoints,
        activeTool,
        toolSettings.penType,
        toolSettings.size,
        toolSettings.color,
        activeTool === 'highlighter' ? 0.38 : activeTool === 'pencil' ? 0.6 : 1,
        false,
        false
      )
    }

    if (activeTool === 'shape' && currentPoints.length >= 2) {
      const geom = shapeFromDrag(currentPoints[0], currentPoints[currentPoints.length - 1], shiftKeyRef.current)
      const previewObj: DrawingObject = {
        id: 'preview-shape',
        type: 'shape',
        tool: 'shape',
        color: toolSettings.color,
        size: Math.max(toolSettings.size, 2),
        opacity: 1,
        shapeType: toolSettings.shapeType,
        ...geom,
      }
      return <GeometricShape key="preview-shape" obj={previewObj} />
    }

    if (activeTool === 'lasso' && toolSettings.lassoMode === 'rect' && currentPoints.length >= 2) {
      const geom = shapeFromDrag(currentPoints[0], currentPoints[1], false)
      return (
        <Rect
          x={geom.x}
          y={geom.y}
          width={geom.width}
          height={geom.height}
          stroke="#2563eb"
          strokeWidth={1.5}
          dash={[6, 4]}
          fill="rgba(37, 99, 235, 0.08)"
          listening={false}
        />
      )
    }
    return null
  }

  const isDarkPaper = page.paperColor === 'black' || page.paperColor === 'dark' || page.template === 'blackboard'
  const templateLabel =
    page.template === 'whiteboard'
      ? '📊 Big White Chart'
      : page.template === 'blackboard'
      ? '🖤 Big Black Chart'
      : page.template.charAt(0).toUpperCase() + page.template.slice(1)

  return (
    <div className="gn-page-wrapper" id={`page-node-${pageId}`}>
      {/* Page Header Bar */}
      <div className={`gn-page-header-pill ${isSelected ? 'is-active' : ''}`} style={{ width: stageWidth, maxWidth: 'none' }}>
        <div className="gn-page-header-left">
          <span className="gn-page-badge">PAGE {pageIndex + 1} OF {totalPages}</span>
          <span>{templateLabel}</span>
        </div>
        <div className="gn-page-header-right">
          <button
            className="gn-page-action-btn"
            title="Add next page below"
            onClick={() => onAddPageBelow(page.order, 'lined', 'white')}
          >
            <span>+ Add Below</span>
          </button>
          <button
            className="gn-page-action-btn"
            title="Duplicate this page"
            onClick={() => onDuplicatePage(pageId)}
          >
            <span>⎘ Duplicate</span>
          </button>
          {totalPages > 1 && (
            <button
              className="gn-page-action-btn delete-btn"
              title="Delete this page"
              onClick={() => {
                if (confirm(`Delete Page ${pageIndex + 1}?`)) {
                  onDeletePage(pageId)
                }
              }}
            >
              <span>🗑 Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Page Canvas Card */}
      <div
        className={`gn-canvas-card ${isDarkPaper ? 'theme-dark' : 'theme-light'}`}
        style={{
          width: stageWidth,
          height: stageHeight,
        }}
      >
        <canvas
          ref={bgCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="gn-bg-canvas"
          style={{
            width: stageWidth,
            height: stageHeight,
          }}
        />

        <Stage
          ref={stageRef}
          width={stageWidth}
          height={stageHeight}
          scaleX={totalScale}
          scaleY={totalScale}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: activeTool === 'hand' ? 'grab' : activeTool === 'eraser' ? 'crosshair' : 'crosshair',
            touchAction: 'none',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={() => setCursorPos(null)}
        >
          <Layer>
            {displayObjects.map(renderObj)}
            {renderPreview()}

            {/* Lasso polygon */}
            {lassoPoints.length >= 4 && (
              <Shape
                sceneFunc={(context, shape) => {
                  context.beginPath()
                  context.moveTo(lassoPoints[0], lassoPoints[1])
                  for (let i = 2; i < lassoPoints.length; i += 2) {
                    context.lineTo(lassoPoints[i], lassoPoints[i + 1])
                  }
                  context.closePath()
                  context.fillStrokeShape(shape)
                }}
                stroke="#2563eb"
                strokeWidth={1.5}
                dash={[6, 4]}
                fill="rgba(37, 99, 235, 0.08)"
                listening={false}
              />
            )}

            {/* Laser pointer trail */}
            {laserPoints.map((pt, i) => {
              const age = Date.now() - pt.time
              const alpha = Math.max(0, 1 - age / 800)
              return (
                <Circle
                  key={i}
                  x={pt.x}
                  y={pt.y}
                  radius={7 * alpha}
                  fill={`rgba(239, 68, 68, ${alpha})`}
                  shadowColor="#ef4444"
                  shadowBlur={12}
                  shadowOpacity={alpha}
                  listening={false}
                />
              )
            })}

            {/* Eraser contact indicator circle */}
            {(activeTool === 'eraser' || isStylusErasing) && cursorPos && (
              <Circle
                x={cursorPos.x}
                y={cursorPos.y}
                radius={eraserRadius}
                stroke="#ef4444"
                strokeWidth={1.5}
                dash={[4, 3]}
                fill="rgba(239, 68, 68, 0.12)"
                listening={false}
              />
            )}
          </Layer>
        </Stage>

        {selectionBounds && selectedIds.length > 0 && (
          <>
            <div
              className="gn-object-menu"
              style={{
                left: Math.max(0, selectionBounds.x * totalScale),
                top: Math.max(0, selectionBounds.y * totalScale - 46),
              }}
              onPointerDown={(ev) => ev.stopPropagation()}
            >
              <button type="button" onClick={cutSelection} title="Cut (Ctrl+X)">✂ Cut</button>
              <button type="button" onClick={copySelection} title="Copy (Ctrl+C)">📋 Copy</button>
              <button type="button" onClick={duplicateSelection} title="Duplicate">⎘ Duplicate</button>
              <button type="button" onClick={pasteClipboard} title="Paste (Ctrl+V)" disabled={!clipboard.length}>📋 Paste</button>
              <div className="gn-menu-colors">
                {['#000000', '#2563eb', '#dc2626', '#16a34a', '#9333ea'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    className="gn-menu-color-dot"
                    style={{ backgroundColor: col }}
                    title={`Recolor selection to ${col}`}
                    onClick={() => recolorSelection(col)}
                  />
                ))}
              </div>
              <button type="button" className="danger" onClick={deleteSelection} title="Delete (Del)">🗑 Delete</button>
            </div>
            <div
              className="gn-selection-wrapper"
              style={{
                left: selectionBounds.x * totalScale,
                top: selectionBounds.y * totalScale,
                width: Math.max(selectionBounds.width * totalScale, 16),
                height: Math.max(selectionBounds.height * totalScale, 16),
              }}
              onPointerDown={(ev) => {
                if (ev.button !== 0) return
                ev.stopPropagation()
                try {
                  ev.currentTarget.setPointerCapture(ev.pointerId)
                } catch {
                  /* ignore pointer capture failure */
                }
                const { x, y } = getCanvasPos(ev.clientX, ev.clientY)
                isMovingSelectionRef.current = true
                setIsMovingSelection(true)
                moveStartRef.current = { x: x - selectionOffset.x, y: y - selectionOffset.y }
              }}
              onPointerMove={(ev) => {
                if (!isMovingSelectionRef.current || !moveStartRef.current) return
                const { x, y } = getCanvasPos(ev.clientX, ev.clientY)
                const nextOffset = {
                  x: x - moveStartRef.current.x,
                  y: y - moveStartRef.current.y,
                }
                selectionOffsetRef.current = nextOffset
                setSelectionOffset(nextOffset)
              }}
              onPointerUp={() => commitSelectionMove()}
              onPointerCancel={() => commitSelectionMove()}
            >
              <span className="gn-handle nw" />
              <span className="gn-handle ne" />
              <span className="gn-handle sw" />
              <span className="gn-handle se" />
            </div>
          </>
        )}

        {/* In-place text editor */}
        {editingTextId && editingTextPos && (
          <div
            className="gn-inline-text-editor"
            style={{
              left: editingTextPos.x * totalScale,
              top: editingTextPos.y * totalScale,
            }}
          >
            <input
              autoFocus
              className="gn-inline-text-input"
              value={editingTextVal}
              onChange={(e) => setEditingTextVal(e.target.value)}
              onBlur={() => {
                if (editingTextId) {
                  updateObject(pageId, editingTextId, { text: editingTextVal })
                  scheduleSave()
                }
                setEditingTextId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (editingTextId) {
                    updateObject(pageId, editingTextId, { text: editingTextVal })
                    scheduleSave()
                  }
                  setEditingTextId(null)
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Continuous Canvas View Component ─────────────────────────────────────

export default function CanvasView({ notebookId }: CanvasViewProps) {
  const {
    pagesByNotebook,
    openTabs,
    activeTabIndex,
    activeTool,
    toolSettings,
    zoomLevel,
    createPage,
    duplicatePage,
    deletePage,
    selectPage,
  } = useAppStore()

  const activeTab = openTabs[activeTabIndex]
  const selectedPageId = activeTab?.selectedPageId
  const pages = useMemo(() => pagesByNotebook[notebookId] ?? [], [pagesByNotebook, notebookId])

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [laserPoints, setLaserPoints] = useState<{ x: number; y: number; time: number }[]>([])

  // Hand tool / Pan state
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)

  const isHandMode = activeTool === 'hand' || isSpacePressed

  // Responsive container observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
    }
    updateSize()
    const obs = new ResizeObserver(updateSize)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Fade laser pointer trail
  useEffect(() => {
    if (laserPoints.length === 0) return
    const interval = setInterval(() => {
      const now = Date.now()
      setLaserPoints((pts) => pts.filter((p) => now - p.time < 800))
    }, 40)
    return () => clearInterval(interval)
  }, [laserPoints.length])

  // Spacebar Hand Tool shortcut toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        setIsSpacePressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Smooth scroll to selected page when selected externally
  useEffect(() => {
    if (selectedPageId) {
      const el = document.getElementById(`page-node-${selectedPageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [selectedPageId])

  // Track active page on scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container || pages.length <= 1) return

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect()
      const centerY = containerRect.top + containerRect.height / 2

      let closestPageId = pages[0]?.id
      let minDistance = Infinity

      for (const p of pages) {
        const el = document.getElementById(`page-node-${p.id}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          const pageCenterY = rect.top + rect.height / 2
          const dist = Math.abs(pageCenterY - centerY)
          if (dist < minDistance) {
            minDistance = dist
            closestPageId = p.id
          }
        }
      }

      if (closestPageId && closestPageId !== selectedPageId) {
        selectPage(notebookId, closestPageId)
      }
    }

    let timeout: ReturnType<typeof setTimeout> | null = null
    const debouncedScroll = () => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(handleScroll, 120)
    }

    container.addEventListener('scroll', debouncedScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', debouncedScroll)
      if (timeout) clearTimeout(timeout)
    }
  }, [pages, notebookId, selectedPageId, selectPage])

  // Hand Tool drag panning on container
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHandMode) return
    const container = containerRef.current
    if (!container) return
    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isHandMode || !isPanning || !panStartRef.current) return
    const container = containerRef.current
    if (!container) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    container.scrollLeft = panStartRef.current.scrollLeft - dx
    container.scrollTop = panStartRef.current.scrollTop - dy
  }

  const handleContainerPointerUp = () => {
    setIsPanning(false)
    panStartRef.current = null
  }

  const handleAddPage = (template: TemplateType, paperColor: PaperColor = 'white') => {
    createPage(notebookId, template, undefined, undefined, paperColor)
  }

  return (
    <div
      ref={containerRef}
      className={`gn-canvas-container ${isHandMode ? 'hand-tool' : ''} ${isPanning ? 'is-panning' : ''}`}
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerLeave={handleContainerPointerUp}
    >
      {pages.length > 0 ? (
        <div className="gn-multi-page-column">
          {pages.map((p, idx) => (
            <SinglePageCard
              key={p.id}
              page={p}
              pageIndex={idx}
              totalPages={pages.length}
              notebookId={notebookId}
              isSelected={p.id === selectedPageId}
              zoomLevel={zoomLevel}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              activeTool={activeTool}
              toolSettings={toolSettings}
              laserPoints={laserPoints}
              setLaserPoints={setLaserPoints}
              onAddPageBelow={(_order, tmpl, pc) => handleAddPage(tmpl, pc)}
              onDuplicatePage={(pid) => duplicatePage(notebookId, pid)}
              onDeletePage={(pid) => deletePage(notebookId, pid)}
            />
          ))}

          {/* Bottom Add Next Page Card */}
          <div className="gn-add-page-bottom-card">
            <div className="gn-add-page-bottom-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Next Page to Notebook</span>
            </div>

            <div className="gn-quick-templates-grid">
              <button
                className="gn-quick-template-chip"
                onClick={() => handleAddPage('lined', 'white')}
              >
                <span>📝 Lined Sheet</span>
              </button>
              <button
                className="gn-quick-template-chip"
                onClick={() => handleAddPage('blank', 'white')}
              >
                <span>📄 Blank Page</span>
              </button>
              <button
                className="gn-quick-template-chip"
                onClick={() => handleAddPage('grid', 'white')}
              >
                <span>▦ Grid Paper</span>
              </button>
              <button
                className="gn-quick-template-chip"
                onClick={() => handleAddPage('cornell', 'white')}
              >
                <span>📋 Cornell Notes</span>
              </button>
              <button
                className="gn-quick-template-chip"
                onClick={() => handleAddPage('whiteboard', 'white')}
              >
                <span>📊 Big White Chart</span>
              </button>
              <button
                className="gn-quick-template-chip chip-blackboard"
                onClick={() => handleAddPage('blackboard', 'black')}
              >
                <span>🖤 Big Black Chart</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace-no-page">
          <div className="workspace-no-page-inner">
            <span className="workspace-no-page-icon">📄</span>
            <h3>Notebook is Empty</h3>
            <p>Click below to choose your first sheet or presentation chart:</p>
            <div className="gn-quick-templates-grid" style={{ marginTop: '16px' }}>
              <button className="gn-quick-template-chip" onClick={() => handleAddPage('lined', 'white')}>
                <span>📝 Lined Sheet</span>
              </button>
              <button className="gn-quick-template-chip" onClick={() => handleAddPage('whiteboard', 'white')}>
                <span>📊 Big White Chart</span>
              </button>
              <button className="gn-quick-template-chip chip-blackboard" onClick={() => handleAddPage('blackboard', 'black')}>
                <span>🖤 Big Black Chart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
