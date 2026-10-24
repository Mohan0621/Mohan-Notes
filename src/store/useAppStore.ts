import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { TemplateType, PaperColor } from '../utils/pageTemplates'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notebook {
  id: number
  name: string
  createdAt: string
  coverColor?: string
}

export interface Page {
  id: number
  notebookId: number
  order: number
  template: TemplateType
  paperColor?: PaperColor
  pdfPath: string | null
  pdfPageNumber: number | null
}

export type ToolType =
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'eraser'
  | 'shape'
  | 'lasso'
  | 'text'
  | 'laser'
  | 'image'
  | 'hand'

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'star'
export type PenType = 'fountain' | 'ball' | 'brush'
export type EraserType = 'precision' | 'standard' | 'stroke'
export type EraserSize = 'small' | 'medium' | 'large'

export type LassoMode = 'freehand' | 'rect'

export interface ToolSettings {
  color: string
  size: number
  opacity: number
  shapeType: ShapeType
  penType: PenType
  eraserType: EraserType
  eraserSize: EraserSize
  paperColor: PaperColor
  lassoMode: LassoMode
  quickColors: [string, string, string]
  activeColorIndex: number
  quickSizes: [number, number, number]
  activeSizeIndex: number
}

export interface StrokePoint {
  x: number
  y: number
  pressure: number
}

export interface DrawingObject {
  id: string
  type: 'freehand' | 'shape' | 'text' | 'image'
  tool: ToolType
  color: string
  size: number
  opacity: number
  points?: StrokePoint[]
  shapeType?: ShapeType
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  imageUrl?: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface OpenTab {
  notebookId: number
  selectedPageId: number | null
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  notebooks: Notebook[]
  openTabs: OpenTab[]
  activeTabIndex: number
  pagesByNotebook: Record<number, Page[]>
  objectsByPage: Record<number, DrawingObject[]>
  historyByPage: Record<number, DrawingObject[][]>
  historyIndexByPage: Record<number, number>
  activeTool: ToolType
  toolSettings: ToolSettings
  isEditingNotebookName: number | null
  showShortcutsPanel: boolean
  isLibraryView: boolean
  showThumbnailGrid: boolean
  showPagePanel: boolean
  zoomLevel: number
  bookmarkedPages: number[]
  searchQuery: string
  notebookCoverColors: Record<number, string>
  clipboard: DrawingObject[]

  togglePagePanel: () => void

  loadNotebooks: () => Promise<void>
  createNotebook: (name: string, coverColor?: string) => Promise<void>
  renameNotebook: (id: number, name: string) => Promise<void>
  deleteNotebook: (id: number) => Promise<void>
  openNotebookTab: (notebookId: number) => void
  closeTab: (index: number) => void
  setActiveTab: (index: number) => void

  loadPages: (notebookId: number) => Promise<void>
  createPage: (
    notebookId: number,
    template: TemplateType,
    pdfPath?: string,
    pdfPageNumber?: number,
    paperColor?: PaperColor
  ) => Promise<void>
  duplicatePage: (notebookId: number, pageId: number) => Promise<void>
  deletePage: (notebookId: number, pageId: number) => Promise<void>
  selectPage: (notebookId: number, pageId: number) => void
  nextPage: (notebookId: number) => void
  prevPage: (notebookId: number) => void
  reorderPages: (notebookId: number, pageIds: number[]) => Promise<void>
  clearPage: (pageId: number) => void
  toggleBookmark: (pageId: number) => void

  loadPageObjects: (pageId: number) => Promise<void>
  savePageObjects: (pageId: number) => Promise<void>
  addObject: (pageId: number, obj: DrawingObject) => void
  updateObject: (pageId: number, id: string, updates: Partial<DrawingObject>) => void
  removeObjects: (pageId: number, ids: string[]) => void
  setPageObjects: (pageId: number, objects: DrawingObject[]) => void

  pushHistory: (pageId: number) => void
  undo: (pageId: number) => void
  redo: (pageId: number) => void

  setActiveTool: (tool: ToolType) => void
  setToolSettings: (settings: Partial<ToolSettings>) => void
  setEraserSize: (size: EraserSize) => void
  setQuickColor: (index: number, color: string) => void
  selectQuickColorIndex: (index: number) => void
  setQuickSize: (index: number, size: number) => void
  selectQuickSizeIndex: (index: number) => void
  setEditingNotebookName: (id: number | null) => void
  setShowShortcutsPanel: (show: boolean) => void
  setLibraryView: (isLib: boolean) => void
  setShowThumbnailGrid: (show: boolean) => void
  setZoomLevel: (zoom: number) => void
  setSearchQuery: (query: string) => void
  setNotebookCoverColor: (notebookId: number, color: string) => void
  setClipboard: (objects: DrawingObject[]) => void
}

const DEFAULT_COVER_COLORS = [
  '#2563eb', // GoodNotes Classic Royal Blue
  '#0d9488', // Emerald Teal
  '#d97706', // Warm Amber
  '#e11d48', // Coral Crimson
  '#7c3aed', // Royal Violet
  '#475569', // Slate Gray
]

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    notebooks: [],
    openTabs: [],
    activeTabIndex: 0,
    pagesByNotebook: {},
    objectsByPage: {},
    historyByPage: {},
    historyIndexByPage: {},
    activeTool: 'pen',
    toolSettings: {
      color: '#000000',
      size: 3,
      opacity: 1,
      shapeType: 'rectangle',
      penType: 'fountain',
      eraserType: 'standard',
      eraserSize: 'medium',
      paperColor: 'white',
      lassoMode: 'freehand',
      quickColors: ['#000000', '#2563eb', '#dc2626'],
      activeColorIndex: 0,
      quickSizes: [2, 4, 8],
      activeSizeIndex: 0,
    },
    isEditingNotebookName: null,
    showShortcutsPanel: false,
    isLibraryView: false,
    showThumbnailGrid: false,
    showPagePanel: false,
    zoomLevel: 1,
    bookmarkedPages: [],
    searchQuery: '',
    notebookCoverColors: {},
    clipboard: [],

    togglePagePanel: () => set((s) => ({ showPagePanel: !s.showPagePanel })),

    // ── Notebooks ────────────────────────────────────────────────────────────

    loadNotebooks: async () => {
      const notebooks = await window.electronAPI.notebookList()
      set({ notebooks })
      if (notebooks.length > 0 && get().openTabs.length === 0) {
        get().openNotebookTab(notebooks[0].id)
      }
    },

    createNotebook: async (name, coverColor) => {
      const selectedColor = coverColor || DEFAULT_COVER_COLORS[Math.floor(Math.random() * DEFAULT_COVER_COLORS.length)]
      const notebook = await window.electronAPI.notebookCreate(name)
      set((s) => ({
        notebooks: [...s.notebooks, { ...notebook, coverColor: selectedColor }],
        notebookCoverColors: { ...s.notebookCoverColors, [notebook.id]: selectedColor },
      }))
      get().openNotebookTab(notebook.id)
    },

    renameNotebook: async (id, name) => {
      await window.electronAPI.notebookRename(id, name)
      set((s) => ({ notebooks: s.notebooks.map((n) => (n.id === id ? { ...n, name } : n)) }))
    },

    deleteNotebook: async (id) => {
      await window.electronAPI.notebookDelete(id)
      set((s) => {
        const tabs = s.openTabs.filter((t) => t.notebookId !== id)
        return {
          notebooks: s.notebooks.filter((n) => n.id !== id),
          openTabs: tabs,
          activeTabIndex: Math.max(0, Math.min(s.activeTabIndex, tabs.length - 1)),
        }
      })
    },

    openNotebookTab: (notebookId) => {
      const { openTabs } = get()
      const existing = openTabs.findIndex((t) => t.notebookId === notebookId)
      if (existing >= 0) {
        set({ activeTabIndex: existing, isLibraryView: false })
        return
      }
      set((s) => ({
        openTabs: [...s.openTabs, { notebookId, selectedPageId: null }],
        activeTabIndex: s.openTabs.length,
        isLibraryView: false,
      }))
      get().loadPages(notebookId)
    },

    closeTab: (index) => {
      set((s) => {
        const tabs = s.openTabs.filter((_, i) => i !== index)
        const nextIndex = Math.min(s.activeTabIndex, Math.max(0, tabs.length - 1))
        return {
          openTabs: tabs,
          activeTabIndex: nextIndex,
          isLibraryView: tabs.length === 0 ? true : s.isLibraryView,
        }
      })
    },

    setActiveTab: (index) => set({ activeTabIndex: index, isLibraryView: false }),

    // ── Pages ────────────────────────────────────────────────────────────────

    loadPages: async (notebookId) => {
      const pages = await window.electronAPI.pageList(notebookId)
      set((s) => ({ pagesByNotebook: { ...s.pagesByNotebook, [notebookId]: pages as Page[] } }))
      // Auto-select first page if none selected
      const tab = get().openTabs.find((t) => t.notebookId === notebookId)
      if (tab && !tab.selectedPageId && pages.length > 0) {
        get().selectPage(notebookId, pages[0].id)
      }
    },

    createPage: async (notebookId, template, pdfPath, pdfPageNumber, paperColor = 'white') => {
      const page = await window.electronAPI.pageCreate(notebookId, template, pdfPath, pdfPageNumber)
      const pageWithPaper = { ...(page as Page), paperColor }
      set((s) => ({
        pagesByNotebook: {
          ...s.pagesByNotebook,
          [notebookId]: [...(s.pagesByNotebook[notebookId] ?? []), pageWithPaper],
        },
        openTabs: s.openTabs.map((t) =>
          t.notebookId === notebookId ? { ...t, selectedPageId: page.id } : t
        ),
      }))
    },

    duplicatePage: async (notebookId, pageId) => {
      const pages = get().pagesByNotebook[notebookId] ?? []
      const srcPage = pages.find((p) => p.id === pageId)
      if (!srcPage) return
      const newPage = await window.electronAPI.pageCreate(
        notebookId,
        srcPage.template,
        srcPage.pdfPath ?? undefined,
        srcPage.pdfPageNumber ?? undefined
      )
      // Copy strokes
      const existingStrokes = get().objectsByPage[pageId] ?? []
      if (existingStrokes.length > 0) {
        const duplicatedStrokes = existingStrokes.map((o) => ({
          ...o,
          id: `${o.id}-copy-${Date.now()}`,
        }))
        set((s) => ({
          objectsByPage: { ...s.objectsByPage, [newPage.id]: duplicatedStrokes },
        }))
        await window.electronAPI.strokesSave(newPage.id, JSON.stringify(duplicatedStrokes))
      }
      await get().loadPages(notebookId)
      get().selectPage(notebookId, newPage.id)
    },

    deletePage: async (notebookId, pageId) => {
      await window.electronAPI.pageDelete(pageId)
      set((s) => {
        const pages = (s.pagesByNotebook[notebookId] ?? []).filter((p) => p.id !== pageId)
        return {
          pagesByNotebook: { ...s.pagesByNotebook, [notebookId]: pages },
          openTabs: s.openTabs.map((t) => {
            if (t.notebookId !== notebookId) return t
            return { ...t, selectedPageId: t.selectedPageId === pageId ? pages[0]?.id ?? null : t.selectedPageId }
          }),
        }
      })
    },

    selectPage: (notebookId, pageId) => {
      const activeTab = get().openTabs.find((t) => t.notebookId === notebookId)
      if (activeTab?.selectedPageId === pageId) {
        return
      }
      set((s) => ({
        openTabs: s.openTabs.map((t) => (t.notebookId === notebookId ? { ...t, selectedPageId: pageId } : t)),
        showThumbnailGrid: false,
      }))
      if (get().objectsByPage[pageId] === undefined) {
        get().loadPageObjects(pageId)
      }
    },

    nextPage: (notebookId) => {
      const pages = get().pagesByNotebook[notebookId] ?? []
      if (pages.length <= 1) return
      const tab = get().openTabs.find((t) => t.notebookId === notebookId)
      const currentIdx = pages.findIndex((p) => p.id === tab?.selectedPageId)
      if (currentIdx >= 0 && currentIdx < pages.length - 1) {
        get().selectPage(notebookId, pages[currentIdx + 1].id)
      }
    },

    prevPage: (notebookId) => {
      const pages = get().pagesByNotebook[notebookId] ?? []
      if (pages.length <= 1) return
      const tab = get().openTabs.find((t) => t.notebookId === notebookId)
      const currentIdx = pages.findIndex((p) => p.id === tab?.selectedPageId)
      if (currentIdx > 0) {
        get().selectPage(notebookId, pages[currentIdx - 1].id)
      }
    },

    reorderPages: async (notebookId, pageIds) => {
      await window.electronAPI.pageReorder(notebookId, pageIds)
      await get().loadPages(notebookId)
    },

    clearPage: (pageId) => {
      set((s) => ({
        objectsByPage: { ...s.objectsByPage, [pageId]: [] },
      }))
      get().pushHistory(pageId)
      get().savePageObjects(pageId)
    },

    toggleBookmark: (pageId) => {
      set((s) => {
        const isBm = s.bookmarkedPages.includes(pageId)
        return {
          bookmarkedPages: isBm ? s.bookmarkedPages.filter((id) => id !== pageId) : [...s.bookmarkedPages, pageId],
        }
      })
    },

    // ── Drawing objects ──────────────────────────────────────────────────────

    loadPageObjects: async (pageId) => {
      const data = await window.electronAPI.strokesLoad(pageId)
      try {
        const objects = JSON.parse(data) as DrawingObject[]
        set((s) => {
          const inMemory = s.objectsByPage[pageId]
          // If memory already has objects and loaded from disk has fewer or 0, keep in-memory!
          if (inMemory && inMemory.length >= objects.length) {
            return s
          }
          return {
            objectsByPage: { ...s.objectsByPage, [pageId]: objects },
            historyByPage: { ...s.historyByPage, [pageId]: [objects] },
            historyIndexByPage: { ...s.historyIndexByPage, [pageId]: 0 },
          }
        })
      } catch {
        set((s) => ({ objectsByPage: { ...s.objectsByPage, [pageId]: s.objectsByPage[pageId] ?? [] } }))
      }
    },

    savePageObjects: async (pageId) => {
      const objects = get().objectsByPage[pageId] ?? []
      await window.electronAPI.strokesSave(pageId, JSON.stringify(objects))
    },

    addObject: (pageId, obj) => {
      set((s) => ({ objectsByPage: { ...s.objectsByPage, [pageId]: [...(s.objectsByPage[pageId] ?? []), obj] } }))
      get().pushHistory(pageId)
      get().savePageObjects(pageId)
    },

    updateObject: (pageId, id, updates) => {
      set((s) => ({
        objectsByPage: {
          ...s.objectsByPage,
          [pageId]: (s.objectsByPage[pageId] ?? []).map((o) => (o.id === id ? { ...o, ...updates } : o)),
        },
      }))
      get().savePageObjects(pageId)
    },

    removeObjects: (pageId, ids) => {
      set((s) => ({
        objectsByPage: {
          ...s.objectsByPage,
          [pageId]: (s.objectsByPage[pageId] ?? []).filter((o) => !ids.includes(o.id)),
        },
      }))
      get().pushHistory(pageId)
      get().savePageObjects(pageId)
    },

    setPageObjects: (pageId, objects) => {
      set((s) => ({ objectsByPage: { ...s.objectsByPage, [pageId]: objects } }))
      get().savePageObjects(pageId)
    },

    // ── History ──────────────────────────────────────────────────────────────

    pushHistory: (pageId) => {
      const { objectsByPage, historyByPage, historyIndexByPage } = get()
      const objects = [...(objectsByPage[pageId] ?? [])]
      const history = historyByPage[pageId] ?? []
      const idx = historyIndexByPage[pageId] ?? 0
      const newHistory = [...history.slice(0, idx + 1), objects].slice(-50)
      set((s) => ({
        historyByPage: { ...s.historyByPage, [pageId]: newHistory },
        historyIndexByPage: { ...s.historyIndexByPage, [pageId]: newHistory.length - 1 },
      }))
    },

    undo: (pageId) => {
      const { historyByPage, historyIndexByPage } = get()
      const idx = historyIndexByPage[pageId] ?? 0
      if (idx <= 0) return
      const newIdx = idx - 1
      const objects = [...(historyByPage[pageId]?.[newIdx] ?? [])]
      set((s) => ({
        historyIndexByPage: { ...s.historyIndexByPage, [pageId]: newIdx },
        objectsByPage: { ...s.objectsByPage, [pageId]: objects },
      }))
      get().savePageObjects(pageId)
    },

    redo: (pageId) => {
      const { historyByPage, historyIndexByPage } = get()
      const history = historyByPage[pageId] ?? []
      const idx = historyIndexByPage[pageId] ?? 0
      if (idx >= history.length - 1) return
      const newIdx = idx + 1
      const objects = [...(history[newIdx] ?? [])]
      set((s) => ({
        historyIndexByPage: { ...s.historyIndexByPage, [pageId]: newIdx },
        objectsByPage: { ...s.objectsByPage, [pageId]: objects },
      }))
      get().savePageObjects(pageId)
    },

    // ── Tools & UI ───────────────────────────────────────────────────────────

    setActiveTool: (tool) => set({ activeTool: tool }),
    setToolSettings: (settings) => set((s) => ({ toolSettings: { ...s.toolSettings, ...settings } })),
    setEraserSize: (size) => set((s) => ({ toolSettings: { ...s.toolSettings, eraserSize: size } })),

    setQuickColor: (index, color) => {
      set((s) => {
        const qc = [...s.toolSettings.quickColors] as [string, string, string]
        qc[index] = color
        return {
          toolSettings: {
            ...s.toolSettings,
            quickColors: qc,
            color,
            activeColorIndex: index,
          },
        }
      })
    },

    selectQuickColorIndex: (index) => {
      set((s) => ({
        toolSettings: {
          ...s.toolSettings,
          activeColorIndex: index,
          color: s.toolSettings.quickColors[index],
        },
      }))
    },

    setQuickSize: (index, size) => {
      set((s) => {
        const qs = [...s.toolSettings.quickSizes] as [number, number, number]
        qs[index] = size
        return {
          toolSettings: {
            ...s.toolSettings,
            quickSizes: qs,
            size,
            activeSizeIndex: index,
          },
        }
      })
    },

    selectQuickSizeIndex: (index) => {
      set((s) => ({
        toolSettings: {
          ...s.toolSettings,
          activeSizeIndex: index,
          size: s.toolSettings.quickSizes[index],
        },
      }))
    },

    setEditingNotebookName: (id) => set({ isEditingNotebookName: id }),
    setShowShortcutsPanel: (show) => set({ showShortcutsPanel: show }),
    setLibraryView: (isLib) => set({ isLibraryView: isLib }),
    setShowThumbnailGrid: (show) => set({ showThumbnailGrid: show }),
    setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setNotebookCoverColor: (notebookId, color) =>
      set((s) => ({
        notebookCoverColors: { ...s.notebookCoverColors, [notebookId]: color },
        notebooks: s.notebooks.map((n) => (n.id === notebookId ? { ...n, coverColor: color } : n)),
      })),
    setClipboard: (objects) => set({ clipboard: objects.map((o) => ({ ...o })) }),
  }))
)
