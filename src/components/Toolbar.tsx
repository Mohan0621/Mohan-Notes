import { useState, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'
import {
  useAppStore,
  type ShapeType,
  type PenType,
  type EraserType,
  type EraserSize,
  type LassoMode,
} from '../store/useAppStore'
import type { TemplateType, PaperColor } from '../utils/pageTemplates'
import './Toolbar.css'

const LASSO_OPTIONS: { id: LassoMode; label: string; desc: string }[] = [
  {
    id: 'freehand',
    label: '➰ Freestyle Loop',
    desc: 'Draw a freehand circle or loop to wrap, cut, copy, or move drawings',
  },
  {
    id: 'rect',
    label: '▭ Rectangle Box',
    desc: 'Drag a rectangular box to select objects',
  },
]

const PRESET_PALETTES = [
  '#000000', '#2563eb', '#dc2626', '#16a34a',
  '#ca8a04', '#9333ea', '#db2777', '#475569',
  '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6',
]

const PEN_OPTIONS: { id: PenType; label: string; desc: string }[] = [
  { id: 'fountain', label: 'Fountain Pen', desc: 'Pressure-sensitive with variable tapered line' },
  { id: 'ball',     label: 'Ball Pen',     desc: 'Smooth, consistent stroke width' },
  { id: 'brush',    label: 'Brush Pen',    desc: 'High sensitivity artistic expressive brush' },
]

const ERASER_OPTIONS: { id: EraserType; label: string; desc: string }[] = [
  { id: 'standard',  label: 'Standard Eraser',  desc: 'Erases strokes within radius' },
  { id: 'precision', label: 'Precision Eraser', desc: 'Fine-tipped micro eraser' },
  { id: 'stroke',    label: 'Stroke Eraser',    desc: 'Erases the entire stroke on touch' },
]

const ERASER_SIZES: { id: EraserSize; label: string; px: number }[] = [
  { id: 'small',  label: 'Small',  px: 14 },
  { id: 'medium', label: 'Medium', px: 28 },
  { id: 'large',  label: 'Large',  px: 52 },
]

const SHAPES: { id: ShapeType; label: string; icon: string }[] = [
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'circle',    label: 'Circle',    icon: '○' },
  { id: 'triangle',  label: 'Triangle',  icon: '△' },
  { id: 'line',      label: 'Line',      icon: '—' },
  { id: 'arrow',     label: 'Arrow',     icon: '➔' },
  { id: 'star',      label: 'Star',      icon: '★' },
]

const TEMPLATES: { id: TemplateType; label: string; icon: string }[] = [
  { id: 'lined',      label: 'Lined / Ruled',       icon: '📝' },
  { id: 'grid',       label: 'Graph / Grid',        icon: '▦' },
  { id: 'dot',        label: 'Dot Matrix',          icon: '⁖' },
  { id: 'cornell',    label: 'Cornell Notes',       icon: '📋' },
  { id: 'whiteboard', label: 'Big White Chart',     icon: '📊' },
  { id: 'blackboard', label: 'Big Black Chart',     icon: '🖤' },
  { id: 'checklist',  label: 'To-Do List',          icon: '☑' },
  { id: 'planner',    label: 'Weekly Planner',      icon: '📅' },
  { id: 'blank',      label: 'Blank Page',          icon: '📄' },
]

export default function Toolbar() {
  const {
    activeTool,
    toolSettings,
    setActiveTool,
    setToolSettings,
    setEraserSize,
    selectQuickColorIndex,
    setQuickColor,
    selectQuickSizeIndex,
    setQuickSize,
    openTabs,
    activeTabIndex,
    notebooks,
    renameNotebook,
    createPage,
    clearPage,
    toggleBookmark,
    bookmarkedPages,
    setShowThumbnailGrid,
    showThumbnailGrid,
    setLibraryView,
    isLibraryView,
    zoomLevel,
    setZoomLevel,
    undo,
    redo,
    historyIndexByPage,
    historyByPage,
    pagesByNotebook,
    nextPage,
    prevPage,
    showPagePanel,
    togglePagePanel,
  } = useAppStore()

  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [selectedPaperColor, setSelectedPaperColor] = useState<PaperColor>('white')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTab = openTabs[activeTabIndex]
  const currentNotebook = notebooks.find((n) => n.id === activeTab?.notebookId)
  const pageId = activeTab?.selectedPageId

  if (isLibraryView || !activeTab) {
    return null
  }

  const notebookPages = currentNotebook ? pagesByNotebook[currentNotebook.id] ?? [] : []
  const currentPageIdx = pageId ? notebookPages.findIndex((p) => p.id === pageId) : -1
  const totalPages = notebookPages.length

  const isBookmarked = pageId && Array.isArray(bookmarkedPages) ? bookmarkedPages.includes(pageId) : false
  const canUndo = pageId ? (historyIndexByPage?.[pageId] ?? 0) > 0 : false
  const canRedo = pageId ? (historyIndexByPage?.[pageId] ?? 0) < ((historyByPage?.[pageId] ?? []).length - 1) : false

  const quickColors = toolSettings?.quickColors || ['#000000', '#2563eb', '#dc2626']
  const quickSizes = toolSettings?.quickSizes || [2, 4, 8]

  const handleExport = async () => {
    if (!pageId) return
    const stage = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement
    if (!stage) return
    const dataUrl = stage.toDataURL('image/png')
    await window.electronAPI.pageExport(pageId, dataUrl)
  }

  const handleTitleSubmit = async () => {
    if (currentNotebook && titleValue.trim()) {
      await renameNotebook(currentNotebook.id, titleValue.trim())
    }
    setIsEditingTitle(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pageId) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      if (!dataUrl) return
      useAppStore.getState().addObject(pageId, {
        id: `img-${Date.now()}`,
        type: 'image',
        tool: 'image',
        color: '#000000',
        size: 1,
        opacity: 1,
        imageUrl: dataUrl,
        x: 150,
        y: 150,
        width: 300,
        height: 220,
      })
      useAppStore.getState().savePageObjects(pageId)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <header className="gn-toolbar">
      {/* ─── Left Section: Documents, Title, & Page Stepper ─────────── */}
      <div className="gn-toolbar-left">
        <button
          className="gn-tool-btn gn-back-btn"
          title="Back to Documents Library"
          onClick={() => setLibraryView(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="gn-back-label">Documents</span>
        </button>

        <button
          className={`gn-tool-btn ${showPagePanel ? 'active' : ''}`}
          title="Toggle Page Sidebar"
          onClick={togglePagePanel}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>

        <div className="gn-divider" />

        {/* Notebook Title Pill */}
        <div className="gn-title-pill">
          {isEditingTitle ? (
            <input
              autoFocus
              className="gn-title-input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit()
                if (e.key === 'Escape') setIsEditingTitle(false)
              }}
            />
          ) : (
            <div
              className="gn-title-text-wrap"
              onClick={() => {
                setTitleValue(currentNotebook?.name ?? 'Untitled Notebook')
                setIsEditingTitle(true)
              }}
              title="Click to rename notebook"
            >
              <span className="gn-title-text">{currentNotebook?.name ?? 'Untitled Notebook'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          )}
        </div>

        {/* Page Stepper (‹ Page 1 of 5 ›) */}
        {currentNotebook && totalPages > 0 && (
          <div className="gn-page-stepper">
            <button
              className="gn-page-step-btn"
              title="Previous Page"
              disabled={currentPageIdx <= 0}
              onClick={() => prevPage(currentNotebook.id)}
            >
              ‹
            </button>
            <span className="gn-page-step-text">
              {currentPageIdx >= 0 ? currentPageIdx + 1 : 1} / {totalPages}
            </span>
            <button
              className="gn-page-step-btn"
              title="Next Page"
              disabled={currentPageIdx >= totalPages - 1}
              onClick={() => nextPage(currentNotebook.id)}
            >
              ›
            </button>
          </div>
        )}

        {/* Bookmark star */}
        {pageId && (
          <button
            className={`gn-tool-btn gn-star-btn ${isBookmarked ? 'bookmarked' : ''}`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark this page'}
            onClick={() => toggleBookmark(pageId)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? '#f59e0b' : 'none'} stroke={isBookmarked ? '#f59e0b' : 'currentColor'} strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}
      </div>

      {/* ─── Center Section: Signature GoodNotes Tool Island ─────────── */}
      <div className="gn-tool-island">
        {/* Pen tool with sub-menu */}
        <div className="gn-menu-anchor">
          <button
            className={`gn-island-btn ${activeTool === 'pen' || activeTool === 'pencil' ? 'active' : ''}`}
            title="Pen Tool (P) — Click again for Pen types (Fountain, Ball, Brush)"
            onClick={() => {
              if (activeTool !== 'pen' && activeTool !== 'pencil') {
                setActiveTool('pen')
              } else {
                setActiveMenu(activeMenu === 'pen' ? null : 'pen')
              }
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            <span className="gn-tool-sub-indicator" />
          </button>

          {activeMenu === 'pen' && (
            <div className="gn-popover gn-pen-popover">
              <div className="gn-popover-title">Pen Style</div>
              <div className="gn-pen-options">
                {PEN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`gn-pen-opt-btn ${toolSettings.penType === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setToolSettings({ penType: opt.id })
                      setActiveTool('pen')
                      setActiveMenu(null)
                    }}
                  >
                    <div className="gn-pen-opt-title">{opt.label}</div>
                    <div className="gn-pen-opt-desc">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Prominent GoodNotes Eraser Tool with Sub-Menu ───────────── */}
        <div className="gn-menu-anchor">
          <button
            className={`gn-island-btn gn-eraser-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
            title="Eraser (E) — Click again for Size, Modes, & Clear Page"
            onClick={() => {
              if (activeTool !== 'eraser') {
                setActiveTool('eraser')
              } else {
                setActiveMenu(activeMenu === 'eraser' ? null : 'eraser')
              }
            }}
          >
            {/* Iconic GoodNotes Pink & White Rubber Eraser */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M14.5 2.5L21.5 9.5L16.5 14.5L9.5 7.5L14.5 2.5Z" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9.5 7.5L16.5 14.5L11 20L4 20L2.5 18.5L2.5 14.5L9.5 7.5Z" fill={activeTool === 'eraser' ? '#ffffff' : '#f8fafc'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="gn-tool-sub-indicator" />
          </button>

          {activeMenu === 'eraser' && (
            <div className="gn-popover gn-eraser-popover">
              <div className="gn-popover-title">Eraser Size</div>
              <div className="gn-eraser-size-row">
                {ERASER_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    className={`gn-eraser-size-btn ${toolSettings.eraserSize === sz.id ? 'active' : ''}`}
                    onClick={() => setEraserSize(sz.id)}
                  >
                    <span
                      className="gn-eraser-size-dot"
                      style={{
                        width: Math.min(sz.px * 0.45, 20),
                        height: Math.min(sz.px * 0.45, 20),
                      }}
                    />
                    <span>{sz.label}</span>
                  </button>
                ))}
              </div>

              <div className="gn-popover-sep" />

              <div className="gn-popover-title">Eraser Mode</div>
              <div className="gn-pen-options">
                {ERASER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`gn-pen-opt-btn ${toolSettings.eraserType === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setToolSettings({ eraserType: opt.id })
                      setActiveMenu(null)
                    }}
                  >
                    <div className="gn-pen-opt-title">{opt.label}</div>
                    <div className="gn-pen-opt-desc">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div className="gn-popover-sep" />

              <button
                className="gn-clear-page-btn"
                onClick={() => {
                  if (pageId && confirm('Clear all drawings and annotations on this page?')) {
                    clearPage(pageId)
                    setActiveMenu(null)
                  }
                }}
              >
                Clear Entire Page
              </button>
            </div>
          )}
        </div>

        {/* Highlighter tool */}
        <button
          className={`gn-island-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          title="Highlighter (H) — Semi-transparent glow"
          onClick={() => {
            setActiveTool('highlighter')
            setActiveMenu(null)
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l-6 6v3h3l6-6" />
            <path d="M22 7l-3-3a2.828 2.828 0 0 0-4 0L7 12l7 7 8-8a2.828 2.828 0 0 0 0-4z" />
          </svg>
        </button>

        {/* Shapes tool with sub-menu */}
        <div className="gn-menu-anchor">
          <button
            className={`gn-island-btn ${activeTool === 'shape' ? 'active' : ''}`}
            title="Shapes Tool (S) — Rectangle, Circle, Arrow, Triangle, Star"
            onClick={() => {
              if (activeTool !== 'shape') {
                setActiveTool('shape')
              } else {
                setActiveMenu(activeMenu === 'shape' ? null : 'shape')
              }
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
            <span className="gn-tool-sub-indicator" />
          </button>

          {activeMenu === 'shape' && (
            <div className="gn-popover gn-shapes-popover">
              <div className="gn-popover-title">Geometric Shapes</div>
              <div className="gn-shapes-grid">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    className={`gn-shape-grid-btn ${toolSettings.shapeType === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setToolSettings({ shapeType: s.id })
                      setActiveMenu(null)
                    }}
                  >
                    <span className="gn-shape-icon">{s.icon}</span>
                    <span className="gn-shape-name">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lasso selection */}
        <div className="gn-menu-anchor">
          <button
            className={`gn-island-btn ${activeTool === 'lasso' ? 'active' : ''}`}
            title={`Lasso Tool (L) — ${toolSettings.lassoMode === 'freehand' ? 'Freestyle Loop (circle/wrap to cut & move)' : 'Rectangle Selection'}`}
            onClick={() => {
              if (activeTool !== 'lasso') {
                setActiveTool('lasso')
              } else {
                setActiveMenu(activeMenu === 'lasso' ? null : 'lasso')
              }
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 22a5 5 0 0 1-2-4c0-3.87 3.13-7 7-7h2" />
              <path d="M12 4C7.58 4 4 7.58 4 12c0 1.5.42 2.9 1.15 4.1" />
              <path d="M18.5 7.5a4.5 4.5 0 0 1 0 9" />
              <circle cx="12" cy="4" r="1" />
            </svg>
            <span className="gn-tool-sub-indicator" />
          </button>

          {activeMenu === 'lasso' && (
            <div className="gn-popover gn-lasso-popover" style={{ minWidth: 250 }}>
              <div className="gn-popover-title">Lasso Selection Mode</div>
              <div className="gn-pen-options">
                {LASSO_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`gn-pen-opt-btn ${toolSettings.lassoMode === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setToolSettings({ lassoMode: opt.id })
                      setActiveMenu(null)
                    }}
                  >
                    <div className="gn-pen-opt-title">{opt.label}</div>
                    <div className="gn-pen-opt-desc">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Image / Sticker insert */}
        <button
          className={`gn-island-btn ${activeTool === 'image' ? 'active' : ''}`}
          title="Insert Image or Sticker onto Page"
          onClick={() => {
            fileInputRef.current?.click()
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />

        {/* Text tool */}
        <button
          className={`gn-island-btn ${activeTool === 'text' ? 'active' : ''}`}
          title="Text Box Tool (T) — Type anywhere"
          onClick={() => {
            setActiveTool('text')
            setActiveMenu(null)
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>

        {/* Laser pointer tool */}
        <button
          className={`gn-island-btn ${activeTool === 'laser' ? 'active' : ''}`}
          title="Laser Pointer — Presentation pointer with trailing fade"
          onClick={() => {
            setActiveTool('laser')
            setActiveMenu(null)
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        {/* Hand / Pan Tool */}
        <button
          className={`gn-island-btn ${activeTool === 'hand' ? 'active' : ''}`}
          title="Hand / Pan Tool (H / Space) — Drag to scroll and pan pages"
          onClick={() => {
            setActiveTool('hand')
            setActiveMenu(null)
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.83L7 15" />
          </svg>
        </button>

        <div className="gn-island-sep" />

        {/* ─── GoodNotes Signature 3 Color Slots ──────────────────────── */}
        <div className="gn-color-slots">
          {quickColors.map((col, idx) => (
            <div key={idx} className="gn-menu-anchor">
              <button
                className={`gn-color-slot ${toolSettings.activeColorIndex === idx ? 'active' : ''}`}
                style={{ backgroundColor: col }}
                title={`Color slot ${idx + 1}: ${col} (Click to select, click again to change)`}
                onClick={() => {
                  if (toolSettings.activeColorIndex === idx) {
                    setActiveMenu(activeMenu === `color-${idx}` ? null : `color-${idx}`)
                  } else {
                    selectQuickColorIndex(idx)
                  }
                }}
              />
              {activeMenu === `color-${idx}` && (
                <div className="gn-popover gn-color-popover">
                  <div className="gn-popover-title">Slot {idx + 1} Color</div>
                  <div className="gn-palette-grid">
                    {PRESET_PALETTES.map((preset) => (
                      <button
                        key={preset}
                        className={`gn-preset-swatch ${quickColors[idx] === preset ? 'active' : ''}`}
                        style={{ backgroundColor: preset }}
                        onClick={() => {
                          setQuickColor(idx, preset)
                          setActiveMenu(null)
                        }}
                      />
                    ))}
                  </div>
                  <div className="gn-popover-sep" />
                  <HexColorPicker
                    color={quickColors[idx]}
                    onChange={(c) => setQuickColor(idx, c)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="gn-island-sep" />

        {/* ─── GoodNotes Signature 3 Thickness Slots ─────────────────── */}
        <div className="gn-size-slots">
          {quickSizes.map((sz, idx) => (
            <div key={idx} className="gn-menu-anchor">
              <button
                className={`gn-size-slot ${toolSettings.activeSizeIndex === idx ? 'active' : ''}`}
                title={`Thickness slot ${idx + 1}: ${sz}px (Click to select, click again to adjust)`}
                onClick={() => {
                  if (toolSettings.activeSizeIndex === idx) {
                    setActiveMenu(activeMenu === `size-${idx}` ? null : `size-${idx}`)
                  } else {
                    selectQuickSizeIndex(idx)
                  }
                }}
              >
                <div
                  className="gn-size-dot"
                  style={{
                    width: Math.min(Math.max(sz * 1.5, 3), 18),
                    height: Math.min(Math.max(sz * 1.5, 3), 18),
                  }}
                />
              </button>
              {activeMenu === `size-${idx}` && (
                <div className="gn-popover gn-size-popover">
                  <div className="gn-popover-title">Slot {idx + 1} Thickness: {sz}px</div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    step="0.5"
                    value={sz}
                    onChange={(e) => setQuickSize(idx, parseFloat(e.target.value))}
                    className="gn-slider"
                  />
                  <div className="gn-size-preview-row">
                    <div
                      className="gn-size-preview-dot"
                      style={{
                        width: sz * 1.8,
                        height: sz * 1.8,
                        backgroundColor: toolSettings.color,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Section: Document Actions & Page Tools ────────────── */}
      <div className="gn-toolbar-right">
        {/* Undo / Redo */}
        <div className="gn-action-group">
          <button
            className="gn-tool-btn"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => pageId && undo(pageId)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          <button
            className="gn-tool-btn"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={() => pageId && redo(pageId)}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
        </div>

        <div className="gn-divider" />

        {/* Thumbnail Grid View Toggle */}
        <button
          className={`gn-tool-btn ${showThumbnailGrid ? 'active' : ''}`}
          title="Page Thumbnails Grid View"
          onClick={() => setShowThumbnailGrid(!showThumbnailGrid)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>

        {/* Add Page Menu Popover */}
        <div className="gn-menu-anchor">
          <button
            className="gn-tool-btn gn-add-page-btn"
            title="Add Page to Notebook"
            onClick={() => setActiveMenu(activeMenu === 'add-page' ? null : 'add-page')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {activeMenu === 'add-page' && activeTab && (
            <div className="gn-popover gn-add-page-popover">
              <div className="gn-popover-title">Add Page</div>

              {/* Paper color selector */}
              <div className="gn-paper-color-row">
                <span className="gn-sub-label">Paper Color:</span>
                <div className="gn-paper-color-buttons">
                  {(['white', 'cream', 'dark', 'black'] as PaperColor[]).map((pc) => (
                    <button
                      key={pc}
                      className={`gn-paper-color-btn ${selectedPaperColor === pc ? 'active' : ''}`}
                      onClick={() => setSelectedPaperColor(pc)}
                    >
                      <span className={`gn-paper-color-sample sample-${pc}`} />
                      {pc.charAt(0).toUpperCase() + pc.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gn-popover-sep" />

              <div className="gn-template-grid">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    className="gn-template-opt-btn"
                    onClick={() => {
                      const paperCol = tmpl.id === 'blackboard' ? 'black' : tmpl.id === 'whiteboard' ? 'white' : selectedPaperColor
                      createPage(activeTab.notebookId, tmpl.id, undefined, undefined, paperCol)
                      setActiveMenu(null)
                    }}
                  >
                    <span className="gn-template-icon">{tmpl.icon}</span>
                    <span className="gn-template-label">{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="gn-zoom-control">
          <button
            className="gn-zoom-btn"
            title="Zoom out"
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
          >
            -
          </button>
          <span className="gn-zoom-text">{Math.round(zoomLevel * 100)}%</span>
          <button
            className="gn-zoom-btn"
            title="Zoom in"
            onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.1))}
          >
            +
          </button>
        </div>

        {/* Export page as PNG / PDF */}
        <button
          className="gn-export-btn"
          title="Export current page as high-res PNG image"
          onClick={handleExport}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export</span>
        </button>
      </div>
    </header>
  )
}
