import { useEffect, useCallback } from 'react'
import { useAppStore } from './store/useAppStore'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import WorkspaceArea from './components/WorkspaceArea'
import ShortcutsPanel from './components/ShortcutsPanel'
import './App.css'

export default function App() {
  const {
    loadNotebooks,
    undo,
    redo,
    openTabs,
    activeTabIndex,
    showShortcutsPanel,
    setShowShortcutsPanel,
    setActiveTool,
  } = useAppStore()

  useEffect(() => {
    loadNotebooks()
  }, [loadNotebooks])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or editable field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const tab = openTabs[activeTabIndex]
      const pageId = tab?.selectedPageId

      // Undo / Redo
      if (pageId) {
        if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          e.preventDefault()
          undo(pageId)
          return
        }
        if ((e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z')) || (e.ctrlKey && (e.key === 'y' || e.key === 'Y'))) {
          e.preventDefault()
          redo(pageId)
          return
        }
      }

      // Tool shortcut keys
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'p':
            setActiveTool('pen')
            break
          case 'h':
            setActiveTool('highlighter')
            break
          case 'e':
            setActiveTool('eraser')
            break
          case 's':
            setActiveTool('shape')
            break
          case 't':
            setActiveTool('text')
            break
          case 'escape':
            setShowShortcutsPanel(false)
            break
        }
      }
    },
    [openTabs, activeTabIndex, undo, redo, setActiveTool, setShowShortcutsPanel]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <TabBar />
        <Toolbar />
        <WorkspaceArea />
      </div>
      {showShortcutsPanel && <ShortcutsPanel />}
    </div>
  )
}
