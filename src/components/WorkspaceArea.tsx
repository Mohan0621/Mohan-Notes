import { useAppStore } from '../store/useAppStore'
import PagePanel from './PagePanel'
import CanvasView from './CanvasView'
import LibraryView from './LibraryView'
import ThumbnailGridModal from './ThumbnailGridModal'
import FloatingToolDock from './FloatingToolDock'
import './WorkspaceArea.css'

export default function WorkspaceArea() {
  const { openTabs, activeTabIndex, isLibraryView, showThumbnailGrid, showPagePanel } = useAppStore()
  const activeTab = openTabs[activeTabIndex]

  if (isLibraryView || !activeTab) {
    return <LibraryView />
  }

  return (
    <main className="workspace">
      {showPagePanel && <PagePanel notebookId={activeTab.notebookId} />}
      <div className="workspace-main">
        {activeTab.notebookId ? (
          <>
            <CanvasView notebookId={activeTab.notebookId} />
            <FloatingToolDock />
          </>
        ) : (
          <div className="workspace-no-page">
            <div className="workspace-no-page-inner">
              <span className="workspace-no-page-icon">📄</span>
              <h3>No Notebook Selected</h3>
              <p>Open a notebook from your library to start writing.</p>
            </div>
          </div>
        )}
      </div>

      {showThumbnailGrid && <ThumbnailGridModal notebookId={activeTab.notebookId} />}
    </main>
  )
}
