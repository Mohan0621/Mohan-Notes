import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import Toolbar from './Toolbar'
import { useAppStore } from '../store/useAppStore'

describe('Toolbar component', () => {
  it('renders without throwing when no active tab', () => {
    useAppStore.setState({ openTabs: [], isLibraryView: false })
    expect(() => renderToString(<Toolbar />)).not.toThrow()
  })

  it('renders without throwing when active notebook tab is open', () => {
    useAppStore.setState({
      openTabs: [{ notebookId: 1, selectedPageId: 101 }],
      activeTabIndex: 0,
      isLibraryView: false,
      notebooks: [{ id: 1, name: 'Quick Notes', createdAt: '2026-10-24' }],
      pagesByNotebook: {
        1: [{ id: 101, notebookId: 1, order: 0, template: 'lined', pdfPath: null, pdfPageNumber: null }],
      },
    })
    expect(() => renderToString(<Toolbar />)).not.toThrow()
  })
})
