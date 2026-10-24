import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useAppStore, type ShapeType } from '../store/useAppStore'
import './FloatingToolDock.css'

const SHAPES: { id: ShapeType; label: string; icon: string }[] = [
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'circle',    label: 'Circle',    icon: '○' },
  { id: 'triangle',  label: 'Triangle',  icon: '△' },
  { id: 'line',      label: 'Line',      icon: '—' },
  { id: 'arrow',     label: 'Arrow',     icon: '➔' },
  { id: 'star',      label: 'Star',      icon: '★' },
]

export default function FloatingToolDock() {
  const {
    activeTool,
    setActiveTool,
    toolSettings,
    setToolSettings,
    selectQuickColorIndex,
    setQuickColor,
    selectQuickSizeIndex,
    undo,
    redo,
    openTabs,
    activeTabIndex,
    historyIndexByPage,
    historyByPage,
  } = useAppStore()

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShapePicker, setShowShapePicker] = useState(false)

  const activeTab = openTabs[activeTabIndex]
  const pageId = activeTab?.selectedPageId

  const canUndo = pageId ? (historyIndexByPage[pageId] ?? 0) > 0 : false
  const canRedo =
    pageId
      ? (historyIndexByPage[pageId] ?? 0) < ((historyByPage[pageId] ?? []).length - 1)
      : false

  return (
    <div className="gn-floating-dock-container">
      {/* ─── Top Pill: Undo & Redo ──────────────────────────────────── */}
      <div className="gn-floating-pill gn-undo-redo-pill">
        <button
          className="gn-dock-icon-btn"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={() => pageId && undo(pageId)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>

        <button
          className="gn-dock-icon-btn"
          title="Redo (Ctrl+Y)"
          disabled={!canRedo}
          onClick={() => pageId && redo(pageId)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </div>

      {/* ─── Main Vertical Floating Dock ───────────────────────────── */}
      <div className="gn-floating-pill gn-tools-vertical-dock">
        {/* Pen Tool with Teal Badge */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
          title="Fountain / Ball Pen (P)"
          onClick={() => setActiveTool('pen')}
        >
          <div className="gn-dock-pen-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
        </button>

        {/* Pencil Tool */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
          title="Pencil (L)"
          onClick={() => setActiveTool('pencil')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="2" x2="22" y2="6" />
            <path d="M7.5 20.5L19 9l-4-4L3.5 16.5 2 22z" />
          </svg>
        </button>

        {/* Highlighter */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          title="Highlighter (H)"
          onClick={() => setActiveTool('highlighter')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l-6 6v3h3l6-6" />
            <path d="M22 7l-3-3a2.828 2.828 0 0 0-4 0L7 12l7 7 8-8a2.828 2.828 0 0 0 0-4z" />
          </svg>
        </button>

        {/* Point Eraser */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          title="Eraser (E) — Point-by-point eraser"
          onClick={() => setActiveTool('eraser')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M14.5 2.5L21.5 9.5L16.5 14.5L9.5 7.5L14.5 2.5Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9.5 7.5L16.5 14.5L11 20L4 20L2.5 18.5L2.5 14.5L9.5 7.5Z" fill="#f8fafc" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {/* ─── Cutter / Lasso Wrapping Tool (User Requested) ─────────── */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'lasso' ? 'active' : ''}`}
          title="Lasso / Cutter (L) — Wrap strokes & shapes to copy, move, duplicate, or recolor"
          onClick={() => {
            setActiveTool('lasso')
            setShowShapePicker(false)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 22a5 5 0 0 1-2-4c0-3.87 3.13-7 7-7h2" />
            <path d="M12 4C7.58 4 4 7.58 4 12c0 1.5.42 2.9 1.15 4.1" />
            <path d="M18.5 7.5a4.5 4.5 0 0 1 0 9" />
            <circle cx="12" cy="4" r="1" />
          </svg>
        </button>

        {/* ─── Shapes Tool with Shape Picker Popover ─────────────────── */}
        <div className="gn-dock-menu-anchor">
          <button
            className={`gn-dock-tool-btn ${activeTool === 'shape' ? 'active' : ''}`}
            title={`Shapes (S) — Currently: ${toolSettings.shapeType}. Click to change shape.`}
            onClick={() => {
              if (activeTool !== 'shape') {
                setActiveTool('shape')
                setShowShapePicker(true)
              } else {
                setShowShapePicker(!showShapePicker)
              }
            }}
          >
            {toolSettings.shapeType === 'circle' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
              </svg>
            ) : toolSettings.shapeType === 'triangle' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 3 22 21 2 21" />
              </svg>
            ) : toolSettings.shapeType === 'line' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            ) : toolSettings.shapeType === 'arrow' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            ) : toolSettings.shapeType === 'star' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            )}
            <span className="gn-dock-sub-dot" />
          </button>

          {showShapePicker && (
            <div className="gn-dock-shape-popover">
              <div className="gn-dock-popover-title">Choose Shape</div>
              <div className="gn-dock-shapes-grid">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    className={`gn-dock-shape-opt ${toolSettings.shapeType === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setToolSettings({ shapeType: s.id })
                      setActiveTool('shape')
                      setShowShapePicker(false)
                    }}
                    title={s.label}
                  >
                    <span className="gn-dock-shape-glyph">{s.icon}</span>
                    <span className="gn-dock-shape-text">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hand Tool */}
        <button
          className={`gn-dock-tool-btn ${activeTool === 'hand' ? 'active' : ''}`}
          title="Hand / Pan Tool (H / Space) — Drag to scroll pages"
          onClick={() => {
            setActiveTool('hand')
            setShowShapePicker(false)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83L7 15" />
          </svg>
        </button>

        <div className="gn-dock-sep" />

        {/* ─── Thickness Preset Bars (Matches screenshot) ───────────── */}
        <div className="gn-dock-thickness-list">
          {toolSettings.quickSizes.map((sz, idx) => (
            <button
              key={idx}
              className={`gn-dock-thickness-btn ${toolSettings.activeSizeIndex === idx ? 'active' : ''}`}
              title={`Thickness preset: ${sz}px`}
              onClick={() => selectQuickSizeIndex(idx)}
            >
              <div
                className="gn-dock-thickness-bar"
                style={{
                  height: Math.max(Math.min(sz * 0.9, 10), 2),
                }}
              />
            </button>
          ))}
        </div>

        <div className="gn-dock-sep" />

        {/* ─── Color Dots (Cyan, Blue, White, Wheel) ───────────────── */}
        <div className="gn-dock-colors-list">
          {toolSettings.quickColors.map((col, idx) => (
            <button
              key={idx}
              className={`gn-dock-color-btn ${toolSettings.activeColorIndex === idx ? 'active' : ''}`}
              style={{ backgroundColor: col }}
              title={`Color: ${col}`}
              onClick={() => selectQuickColorIndex(idx)}
            />
          ))}

          {/* Color Wheel + Button */}
          <div className="gn-color-wheel-wrapper">
            <button
              className="gn-dock-wheel-btn"
              title="Custom Color Wheel"
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>

            {showColorPicker && (
              <div className="gn-dock-color-popover">
                <HexColorPicker
                  color={toolSettings.color}
                  onChange={(c) => {
                    setQuickColor(toolSettings.activeColorIndex, c)
                  }}
                />
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={() => setShowColorPicker(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
