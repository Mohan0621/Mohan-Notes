import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { TemplateType } from '../utils/pageTemplates'
import './PagePanel.css'

interface Props {
  notebookId: number
}

const TEMPLATE_BUTTONS: { id: TemplateType; label: string }[] = [
  { id: 'lined',      label: '+ Lined' },
  { id: 'grid',       label: '+ Grid' },
  { id: 'whiteboard', label: '+ White Chart' },
  { id: 'blackboard', label: '+ Black Chart' },
  { id: 'cornell',    label: '+ Cornell' },
  { id: 'dot',        label: '+ Dot' },
  { id: 'checklist',  label: '+ To-Do' },
  { id: 'blank',      label: '+ Blank' },
]

export default function PagePanel({ notebookId }: Props) {
  const {
    pagesByNotebook,
    loadPages,
    createPage,
    deletePage,
    duplicatePage,
    selectPage,
    openTabs,
    activeTabIndex,
    bookmarkedPages,
    toggleBookmark,
  } = useAppStore()

  const pages = pagesByNotebook[notebookId] ?? []
  const selectedPageId = openTabs[activeTabIndex]?.selectedPageId

  useEffect(() => {
    loadPages(notebookId)
  }, [notebookId, loadPages])

  const handleImportPdf = async () => {
    const result = await window.electronAPI.pdfImport()
    if (!result) return
    await createPage(notebookId, 'blank', result.path, 1)
  }

  return (
    <aside className="gn-page-panel">
      {/* Header */}
      <div className="gn-page-panel-header">
        <span className="gn-page-panel-title">Pages</span>
        <span className="gn-page-panel-count">{pages.length}</span>
      </div>

      {/* Pages List */}
      <div className="gn-page-panel-list">
        {pages.map((p, idx) => {
          const isSelected = p.id === selectedPageId
          const isBookmarked = bookmarkedPages.includes(p.id)

          return (
            <div
              key={p.id}
              className={`gn-page-strip-item ${isSelected ? 'active' : ''}`}
              onClick={() => selectPage(notebookId, p.id)}
            >
              <div className="gn-strip-num-col">
                <span className="gn-strip-num">{idx + 1}</span>
                <button
                  className={`gn-strip-star ${isBookmarked ? 'starred' : ''}`}
                  title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleBookmark(p.id)
                  }}
                >
                  ★
                </button>
              </div>

              {/* Miniature Page Card */}
              <div className={`gn-strip-thumb paper-template-${p.template} paper-tone-${p.paperColor ?? 'white'}`}>
                {p.pdfPath && <span className="gn-strip-pdf-badge">PDF</span>}
              </div>

              {/* Hover actions */}
              <div className="gn-strip-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="gn-strip-act-btn"
                  title="Duplicate Page"
                  onClick={() => duplicatePage(notebookId, p.id)}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  className="gn-strip-act-btn danger"
                  title="Delete Page"
                  onClick={() => {
                    if (pages.length <= 1) {
                      alert('A notebook must have at least one page.')
                      return
                    }
                    if (confirm(`Delete Page ${idx + 1}?`)) {
                      deletePage(notebookId, p.id)
                    }
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Add Buttons */}
      <div className="gn-page-panel-footer">
        <div className="gn-page-add-grid">
          {TEMPLATE_BUTTONS.map((t) => (
            <button
              key={t.id}
              className="gn-page-add-btn"
              onClick={() => createPage(notebookId, t.id)}
            >
              {t.label}
            </button>
          ))}
          <button className="gn-page-add-btn pdf-btn" onClick={handleImportPdf}>
            📄 Import PDF
          </button>
        </div>
      </div>
    </aside>
  )
}
