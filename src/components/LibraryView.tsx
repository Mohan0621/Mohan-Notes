import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { TemplateType, PaperColor } from '../utils/pageTemplates'
import './LibraryView.css'

const COVER_COLORS = [
  { name: 'Royal Blue',  color: '#2563eb', gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' },
  { name: 'Emerald Teal', color: '#0d9488', gradient: 'linear-gradient(135deg, #0f766e, #14b8a6)' },
  { name: 'Coral Pink',  color: '#e11d48', gradient: 'linear-gradient(135deg, #be123c, #fb7185)' },
  { name: 'Warm Amber',  color: '#d97706', gradient: 'linear-gradient(135deg, #b45309, #f59e0b)' },
  { name: 'Violet Star', color: '#7c3aed', gradient: 'linear-gradient(135deg, #6d28d9, #a855f7)' },
  { name: 'Leather Noir',color: '#334155', gradient: 'linear-gradient(135deg, #1e293b, #475569)' },
]

const TEMPLATE_PRESETS: { id: TemplateType; label: string; desc: string }[] = [
  { id: 'lined',     label: 'Lined / Ruled',  desc: 'Classic ruled paper with red margin' },
  { id: 'cornell',   label: 'Cornell Notes',  desc: 'Study system with cue and summary zones' },
  { id: 'dot',       label: 'Dot Grid',       desc: 'Clean bullet journal dot matrix' },
  { id: 'grid',      label: 'Graph / Grid',   desc: 'Precision math and science grid' },
  { id: 'checklist', label: 'To-Do List',     desc: 'Organized daily task checklist' },
  { id: 'planner',   label: 'Weekly Planner', desc: 'Week view scheduling blocks' },
  { id: 'blank',     label: 'Blank Page',     desc: 'Plain unlined artist sketchbook' },
]

export default function LibraryView() {
  const {
    notebooks,
    createNotebook,
    deleteNotebook,
    renameNotebook,
    openNotebookTab,
    searchQuery,
    setSearchQuery,
    pagesByNotebook,
  } = useAppStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [selectedColor, setSelectedColor] = useState(COVER_COLORS[0].color)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lined')
  const [selectedPaperColor, setSelectedPaperColor] = useState<PaperColor>('white')
  const [filterStarred, setFilterStarred] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredNotebooks = notebooks.filter((n) => {
    const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleCreate = async () => {
    const title = newTitle.trim() || 'Untitled Notebook'
    await createNotebook(title, selectedColor)
    // Create initial page with selected template & paper color
    const latestNotebooks = useAppStore.getState().notebooks
    const created = latestNotebooks[latestNotebooks.length - 1]
    if (created) {
      await useAppStore.getState().createPage(created.id, selectedTemplate, undefined, undefined, selectedPaperColor)
      openNotebookTab(created.id)
    }
    setShowNewModal(false)
    setNewTitle('')
  }

  const handleStartRename = (id: number, name: string) => {
    setEditingId(id)
    setEditTitle(name)
  }

  const handleRenameSubmit = async (id: number) => {
    if (editTitle.trim()) {
      await renameNotebook(id, editTitle.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="gn-library-view">
      {/* ─── Top Library Header ────────────────────────────────────── */}
      <div className="gn-lib-header">
        <div className="gn-lib-title-area">
          <div className="gn-lib-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h1 className="gn-lib-heading">Documents</h1>
            <p className="gn-lib-sub">GoodNotes Library &bull; {notebooks.length} Notebook{notebooks.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="gn-lib-actions">
          {/* Search box */}
          <div className="gn-lib-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search notebooks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="gn-lib-clear-search" onClick={() => setSearchQuery('')}>
                &times;
              </button>
            )}
          </div>

          {/* New Notebook button */}
          <button className="gn-lib-new-btn" onClick={() => setShowNewModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Notebook</span>
          </button>
        </div>
      </div>

      {/* ─── Library Filter Bar ────────────────────────────────────── */}
      <div className="gn-lib-filter-bar">
        <div className="gn-filter-tabs">
          <button
            className={`gn-filter-tab ${!filterStarred ? 'active' : ''}`}
            onClick={() => setFilterStarred(false)}
          >
            All Notebooks
          </button>
          <button
            className={`gn-filter-tab ${filterStarred ? 'active' : ''}`}
            onClick={() => setFilterStarred(true)}
          >
            Favorites
          </button>
        </div>
      </div>

      {/* ─── Notebooks Grid ────────────────────────────────────────── */}
      <div className="gn-lib-content">
        {filteredNotebooks.length === 0 ? (
          <div className="gn-lib-empty">
            <div className="gn-lib-empty-icon">📓</div>
            <h3>No notebooks found</h3>
            <p>Create a new notebook with custom covers and templates to get started.</p>
            <button className="gn-lib-new-btn" onClick={() => setShowNewModal(true)}>
              + Create First Notebook
            </button>
          </div>
        ) : (
          <div className="gn-notebook-grid">
            {filteredNotebooks.map((nb) => {
              const coverColor = nb.coverColor || '#2563eb'
              const pageCount = (pagesByNotebook[nb.id] ?? []).length
              const isRenaming = editingId === nb.id

              return (
                <div key={nb.id} className="gn-notebook-card" onClick={() => openNotebookTab(nb.id)}>
                  {/* Notebook Realistic Book Cover */}
                  <div
                    className="gn-book-cover"
                    style={{
                      backgroundColor: coverColor,
                    }}
                  >
                    <div className="gn-book-spine" />
                    <div className="gn-book-band" />
                    <div className="gn-book-emboss">
                      <div className="gn-book-label">
                        <span className="gn-book-label-title">{nb.name}</span>
                        <span className="gn-book-label-meta">GOODNOTES</span>
                      </div>
                    </div>
                  </div>

                  {/* Notebook Card Footer */}
                  <div className="gn-card-info">
                    {isRenaming ? (
                      <input
                        autoFocus
                        className="gn-card-rename-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => handleRenameSubmit(nb.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(nb.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <div className="gn-card-name-row">
                        <span className="gn-card-name" title={nb.name}>
                          {nb.name}
                        </span>
                        <div className="gn-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="gn-card-action-btn"
                            title="Rename"
                            onClick={() => handleStartRename(nb.id, nb.name)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="gn-card-action-btn danger"
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete notebook "${nb.name}" and all its pages?`)) {
                                deleteNotebook(nb.id)
                              }
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="gn-card-meta">
                      {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── New Notebook Modal ─────────────────────────────────────── */}
      {showNewModal && (
        <div className="gn-modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="gn-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gn-modal-header">
              <h2>Create New Notebook</h2>
              <button className="gn-modal-close" onClick={() => setShowNewModal(false)}>
                &times;
              </button>
            </div>

            <div className="gn-modal-body">
              {/* Notebook Name */}
              <div className="gn-form-group">
                <label>Notebook Title</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g., Biology Notes, Project Plan..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                  }}
                />
              </div>

              {/* Cover Color Selection */}
              <div className="gn-form-group">
                <label>Cover Style</label>
                <div className="gn-cover-colors-grid">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.color}
                      className={`gn-cover-color-btn ${selectedColor === c.color ? 'active' : ''}`}
                      style={{ background: c.gradient }}
                      title={c.name}
                      onClick={() => setSelectedColor(c.color)}
                    >
                      {selectedColor === c.color && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Color */}
              <div className="gn-form-group">
                <label>Paper Tone</label>
                <div className="gn-paper-color-options">
                  {(['white', 'cream', 'dark'] as PaperColor[]).map((pc) => (
                    <button
                      key={pc}
                      className={`gn-paper-tone-btn ${selectedPaperColor === pc ? 'active' : ''}`}
                      onClick={() => setSelectedPaperColor(pc)}
                    >
                      <span className={`gn-tone-dot tone-${pc}`} />
                      {pc.charAt(0).toUpperCase() + pc.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Template Selection */}
              <div className="gn-form-group">
                <label>Initial Paper Template</label>
                <div className="gn-template-picker-grid">
                  {TEMPLATE_PRESETS.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      className={`gn-template-choice-btn ${selectedTemplate === tmpl.id ? 'active' : ''}`}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                    >
                      <div className="gn-template-choice-title">{tmpl.label}</div>
                      <div className="gn-template-choice-desc">{tmpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="gn-modal-footer">
              <button className="gn-modal-btn ghost" onClick={() => setShowNewModal(false)}>
                Cancel
              </button>
              <button className="gn-modal-btn primary" onClick={handleCreate}>
                Create Notebook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
