// Browser fallback adapter for window.electronAPI when running in standard browser/dev preview
export function initBrowserStorageFallback() {
  if (typeof window === 'undefined' || window.electronAPI) return

  const STORAGE_KEY_NOTEBOOKS = 'goodnotes_notebooks'
  const STORAGE_KEY_PAGES = 'goodnotes_pages'
  const STORAGE_KEY_STROKES = 'goodnotes_strokes'

  const getStored = <T>(key: string, def: T): T => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : def
    } catch {
      return def
    }
  }

  const setStored = (key: string, val: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(val))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  // Seed default notebook if empty
  let notebooks = getStored<Array<{ id: number; name: string; createdAt: string; coverColor?: string }>>(
    STORAGE_KEY_NOTEBOOKS,
    []
  )
  let pages = getStored<Array<{ id: number; notebookId: number; order: number; template: string; pdfPath: string | null; pdfPageNumber: number | null }>>(
    STORAGE_KEY_PAGES,
    []
  )
  const strokesMap: Record<number, string> = getStored(STORAGE_KEY_STROKES, {})

  if (notebooks.length === 0) {
    const defaultNb = { id: 1, name: 'Quick Notes', createdAt: new Date().toISOString(), coverColor: '#2563eb' }
    const defaultPage = { id: 101, notebookId: 1, order: 0, template: 'lined', pdfPath: null, pdfPageNumber: null }
    notebooks = [defaultNb]
    pages = [defaultPage]
    setStored(STORAGE_KEY_NOTEBOOKS, notebooks)
    setStored(STORAGE_KEY_PAGES, pages)
  }

  window.electronAPI = {
    notebookCreate: async (name: string) => {
      const id = Date.now()
      const item = { id, name, createdAt: new Date().toISOString(), coverColor: '#2563eb' }
      notebooks.push(item)
      setStored(STORAGE_KEY_NOTEBOOKS, notebooks)
      // Create initial page
      const pageId = Date.now() + 1
      pages.push({ id: pageId, notebookId: id, order: 0, template: 'lined', pdfPath: null, pdfPageNumber: null })
      setStored(STORAGE_KEY_PAGES, pages)
      return item
    },
    notebookList: async () => {
      notebooks = getStored(STORAGE_KEY_NOTEBOOKS, notebooks)
      return [...notebooks]
    },
    notebookRename: async (id: number, name: string) => {
      notebooks = notebooks.map((n) => (n.id === id ? { ...n, name } : n))
      setStored(STORAGE_KEY_NOTEBOOKS, notebooks)
    },
    notebookDelete: async (id: number) => {
      notebooks = notebooks.filter((n) => n.id !== id)
      pages = pages.filter((p) => p.notebookId !== id)
      setStored(STORAGE_KEY_NOTEBOOKS, notebooks)
      setStored(STORAGE_KEY_PAGES, pages)
    },

    pageCreate: async (notebookId: number, template: string, pdfPath?: string, pdfPageNumber?: number) => {
      const id = Date.now()
      const nPages = pages.filter((p) => p.notebookId === notebookId)
      const page = {
        id,
        notebookId,
        order: nPages.length,
        template,
        pdfPath: pdfPath ?? null,
        pdfPageNumber: pdfPageNumber ?? null,
      }
      pages.push(page)
      setStored(STORAGE_KEY_PAGES, pages)
      return page
    },
    pageList: async (notebookId: number) => {
      pages = getStored(STORAGE_KEY_PAGES, pages)
      return pages.filter((p) => p.notebookId === notebookId).sort((a, b) => a.order - b.order)
    },
    pageDelete: async (id: number) => {
      pages = pages.filter((p) => p.id !== id)
      setStored(STORAGE_KEY_PAGES, pages)
    },
    pageReorder: async (notebookId: number, pageIds: number[]) => {
      pages = pages.map((p) => {
        if (p.notebookId !== notebookId) return p
        const idx = pageIds.indexOf(p.id)
        return idx >= 0 ? { ...p, order: idx } : p
      })
      setStored(STORAGE_KEY_PAGES, pages)
    },

    strokesSave: async (pageId: number, strokes: string) => {
      strokesMap[pageId] = strokes
      setStored(STORAGE_KEY_STROKES, strokesMap)
    },
    strokesLoad: async (pageId: number) => {
      const map = getStored<Record<number, string>>(STORAGE_KEY_STROKES, strokesMap)
      return map[pageId] ?? '[]'
    },

    pdfImport: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'application/pdf'
        input.onchange = (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) {
            const url = URL.createObjectURL(file)
            resolve({ path: url, pageCount: 1 })
          } else {
            resolve(null)
          }
        }
        input.click()
      })
    },
    pageExport: async (pageId: number, dataUrl: string) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `goodnotes-page-${pageId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return `goodnotes-page-${pageId}.png`
    },
    getVersion: async () => '6.4.2 (GoodNotes Web Edition)',
  }
}
