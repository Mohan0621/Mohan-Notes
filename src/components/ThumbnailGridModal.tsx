import { useAppStore } from '../store/useAppStore'
import './ThumbnailGridModal.css'

interface Props {
  notebookId: number
}

export default function ThumbnailGridModal({ notebookId }: Props) {
  const {
    pagesByNotebook,
    openTabs,
    activeTabIndex,
    selectPage,
    duplicatePage,
    deletePage,
    createPage,
    setShowThumbnailGrid,
    bookmarkedPages,
    toggleBookmark,
    notebooks,
  } = useAppStore()

  const pages = pagesByNotebook[notebookId] ?? []
  const currentTab = openTabs[activeTabIndex]
  const selectedPageId = currentTab?.selectedPageId
  const currentNotebook = notebooks.find((n) => n.id === notebookId)

  return (
    <div className="gn-thumb-overlay" onClick={() => setShowThumbnailGrid(false)}>
      <div className="gn-thumb-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="gn-thumb-header">
          <div className="gn-thumb-header-left">
            <h3>{currentNotebook?.name ?? 'Notebook'} &bull; Pages</h3>
            <span className="gn-thumb-count">{pages.length} Pages</span>
          </div>

          <div className="gn-thumb-header-actions">
            <button
              className="gn-thumb-add-btn"
              onClick={() => createPage(notebookId, 'lined')}
            >
              + Add Page
            </button>
            <button
              className="gn-thumb-close-btn"
              onClick={() => setShowThumbnailGrid(false)}
            >
              Done
            </button>
          </div>
        </div>

        {/* Thumbnails Grid */}
        <div className="gn-thumb-grid">
          {pages.map((p, idx) => {
            const isSelected = p.id === selectedPageId
            const isBookmarked = bookmarkedPages.includes(p.id)

            return (
              <div
                key={p.id}
                className={`gn-thumb-card ${isSelected ? 'active' : ''}`}
                onClick={() => selectPage(notebookId, p.id)}
              >
                {/* Thumbnail Sheet */}
                <div className={`gn-thumb-paper paper-template-${p.template} paper-tone-${p.paperColor ?? 'white'}`}>
                  {p.pdfPath && <span className="gn-thumb-pdf-tag">PDF</span>}
                  <button
                    className={`gn-thumb-star ${isBookmarked ? 'starred' : ''}`}
                    title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleBookmark(p.id)
                    }}
                  >
                    ★
                  </button>
                </div>

                {/* Footer details */}
                <div className="gn-thumb-info">
                  <span className="gn-thumb-num">{idx + 1}</span>
                  <div className="gn-thumb-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="gn-thumb-act-btn"
                      title="Duplicate Page"
                      onClick={() => duplicatePage(notebookId, p.id)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    <button
                      className="gn-thumb-act-btn danger"
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Quick Add Card */}
          <div
            className="gn-thumb-add-card"
            onClick={() => createPage(notebookId, 'lined')}
          >
            <div className="gn-thumb-add-inner">
              <span className="gn-thumb-add-icon">+</span>
              <span className="gn-thumb-add-text">Add Page</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
