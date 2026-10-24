import { useAppStore } from '../store/useAppStore'
import './TabBar.css'

export default function TabBar() {
  const {
    openTabs,
    activeTabIndex,
    notebooks,
    closeTab,
    setActiveTab,
    setLibraryView,
  } = useAppStore()

  if (openTabs.length === 0) {
    return (
      <div className="tab-bar">
        <div className="tab-bar-empty" onClick={() => setLibraryView(true)}>
          <span>+ Open a notebook from Documents</span>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-bar">
      <div className="tab-list">
        {openTabs.map((tab, index) => {
          const notebook = notebooks.find((n) => n.id === tab.notebookId)
          const coverColor = notebook?.coverColor || '#2563eb'
          const isActive = index === activeTabIndex

          return (
            <div
              key={tab.notebookId}
              className={`tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              <span
                className="tab-color-dot"
                style={{ backgroundColor: coverColor }}
              />
              <span className="tab-name">{notebook?.name ?? 'Untitled Notebook'}</span>
              <button
                className="tab-close"
                title="Close tab"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(index)
                }}
              >
                &times;
              </button>
            </div>
          )
        })}
      </div>

      <button
        className="tab-add-btn"
        title="Browse Documents Library"
        onClick={() => setLibraryView(true)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
