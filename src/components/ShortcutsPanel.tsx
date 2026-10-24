import { useAppStore } from '../store/useAppStore'
import './ShortcutsPanel.css'

const SHORTCUT_GROUPS = [
  {
    category: 'Drawing & Inking Tools',
    items: [
      { key: 'P', action: 'Pen / Inking Tool' },
      { key: 'L', action: 'Pencil / Shading' },
      { key: 'H', action: 'Highlighter Tool' },
      { key: 'E', action: 'Eraser (Standard / Precision / Stroke)' },
      { key: 'S', action: 'Shapes Tool (Rect, Circle, Triangle, Arrow, Star)' },
      { key: 'Lasso', action: 'Lasso Tool for Freehand Selection' },
      { key: 'T', action: 'Text Box Tool (Click to write)' },
    ],
  },
  {
    category: 'Navigation & Editing',
    items: [
      { key: 'Ctrl + Z', action: 'Undo last stroke / action' },
      { key: 'Ctrl + Y / Ctrl+Shift+Z', action: 'Redo previously undone stroke' },
      { key: 'Double-Click Text', action: 'Inline edit text contents' },
      { key: 'Stylus Pressure', action: 'Dynamic line width for Huion/Wacom pens' },
      { key: 'Click Color Slot', action: 'Swap / customize quick color presets' },
      { key: 'Click Size Slot', action: 'Swap / adjust thickness presets' },
    ],
  },
]

export default function ShortcutsPanel() {
  const { setShowShortcutsPanel } = useAppStore()

  return (
    <div className="shortcuts-overlay" onClick={() => setShowShortcutsPanel(false)}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="shortcuts-header-title">
            <span className="shortcuts-badge">⌨️</span>
            <h3>GoodNotes Shortcuts & Gestures</h3>
          </div>
          <button className="icon-btn" onClick={() => setShowShortcutsPanel(false)}>
            ✕
          </button>
        </div>

        <div className="shortcuts-content">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="shortcut-section">
              <h4 className="shortcut-category-title">{group.category}</h4>
              <div className="shortcuts-list">
                {group.items.map((s) => (
                  <div key={s.key} className="shortcut-row">
                    <kbd className="kbd">{s.key}</kbd>
                    <span className="shortcut-action">{s.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
