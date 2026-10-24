import { useState, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import './Sidebar.css'

export default function Sidebar() {
  const {
    notebooks,
    createNotebook,
    renameNotebook,
    deleteNotebook,
    openNotebookTab,
    openTabs,
    activeTabIndex,
    isEditingNotebookName,
    setEditingNotebookName,
    setShowShortcutsPanel,
    showShortcutsPanel,
    setLibraryView,
    isLibraryView,
  } = useAppStore()

  const [newName, setNewName] = useState('')
  const [editValue, setEditValue] = useState('')
  const [showNew, setShowNew] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)

  const activeNotebookId = isLibraryView ? null : openTabs[activeTabIndex]?.notebookId

  const handleCreate = async () => {
    await createNotebook(newName.trim() || 'Untitled Notebook')
    setNewName('')
    setShowNew(false)
  }

  const handleStartRename = (id: number, name: string) => {
    setEditValue(name)
    setEditingNotebookName(id)
    setTimeout(() => editRef.current?.focus(), 0)
  }

  const handleRename = async (id: number) => {
    if (editValue.trim()) await renameNotebook(id, editValue.trim())
    setEditingNotebookName(null)
  }

  return (
    <aside className="sidebar">
      {/* Brand & Library Link */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-left" onClick={() => setLibraryView(true)}>
          <div className="sidebar-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <span className="sidebar-brand-name">GoodNotes</span>
        </div>

        <button
          className="sidebar-add-btn"
          title="Create New Notebook"
          onClick={() => setShowNew(true)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Library View Shortcut Button */}
      <div className="sidebar-nav-quick">
        <button
          className={`sidebar-quick-item ${isLibraryView ? 'active' : ''}`}
          onClick={() => setLibraryView(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>All Documents</span>
        </button>
      </div>

      <div className="sidebar-section-header">
        <span className="sidebar-title">Notebooks</span>
        <span className="sidebar-count">{notebooks.length}</span>
      </div>

      {showNew && (
        <div className="sidebar-new-notebook">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Notebook name..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setShowNew(false)
            }}
          />
          <div className="sidebar-new-actions">
            <button onClick={handleCreate} className="btn-primary">
              Create
            </button>
            <button onClick={() => setShowNew(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {notebooks.length === 0 && (
          <p className="sidebar-empty">
            No notebooks yet.
            <br />
            Click + to create one.
          </p>
        )}
        {notebooks.map((nb) => {
          const coverColor = nb.coverColor || '#2563eb'
          const isActive = !isLibraryView && nb.id === activeNotebookId

          return (
            <div
              key={nb.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => openNotebookTab(nb.id)}
            >
              {isEditingNotebookName === nb.id ? (
                <input
                  ref={editRef}
                  className="sidebar-rename-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(nb.id)
                    if (e.key === 'Escape') setEditingNotebookName(null)
                  }}
                  onBlur={() => handleRename(nb.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span
                    className="sidebar-nb-swatch"
                    style={{ backgroundColor: coverColor }}
                  />
                  <span className="sidebar-item-name" title={nb.name}>
                    {nb.name}
                  </span>
                  <div className="sidebar-item-actions">
                    <button
                      className="sidebar-mini-btn"
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(nb.id, nb.name)
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="sidebar-mini-btn danger"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete notebook "${nb.name}" and all its pages?`)) {
                          deleteNotebook(nb.id)
                        }
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-footer-btn ${showShortcutsPanel ? 'active' : ''}`}
          title="Keyboard shortcuts"
          onClick={() => setShowShortcutsPanel(!showShortcutsPanel)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M10 12h.001M14 12h.001M18 12h.001M8 16h8" />
          </svg>
          <span>Shortcuts</span>
        </button>
      </div>
    </aside>
  )
}
