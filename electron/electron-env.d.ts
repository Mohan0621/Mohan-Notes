/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface Window {
  electronAPI: {
    // Notebooks
    notebookCreate: (name: string) => Promise<{ id: number; name: string; createdAt: string }>
    notebookList: () => Promise<Array<{ id: number; name: string; createdAt: string }>>
    notebookRename: (id: number, name: string) => Promise<void>
    notebookDelete: (id: number) => Promise<void>
    // Pages
    pageCreate: (notebookId: number, template: string, pdfPath?: string, pdfPageNumber?: number) => Promise<{ id: number; notebookId: number; order: number; template: string; pdfPath: string | null; pdfPageNumber: number | null }>
    pageList: (notebookId: number) => Promise<Array<{ id: number; notebookId: number; order: number; template: string; pdfPath: string | null; pdfPageNumber: number | null }>>
    pageDelete: (id: number) => Promise<void>
    pageReorder: (notebookId: number, pageIds: number[]) => Promise<void>
    // Strokes
    strokesSave: (pageId: number, strokes: string) => Promise<void>
    strokesLoad: (pageId: number) => Promise<string>
    // PDF
    pdfImport: () => Promise<{ path: string; pageCount: number } | null>
    // Export
    pageExport: (pageId: number, dataUrl: string) => Promise<string | null>
    // App
    getVersion: () => Promise<string>
  }
}
