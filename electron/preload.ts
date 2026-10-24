import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  notebookCreate: (name: string) => ipcRenderer.invoke('notebook:create', name),
  notebookList: () => ipcRenderer.invoke('notebook:list'),
  notebookRename: (id: number, name: string) => ipcRenderer.invoke('notebook:rename', id, name),
  notebookDelete: (id: number) => ipcRenderer.invoke('notebook:delete', id),

  pageCreate: (notebookId: number, template: string, pdfPath?: string, pdfPageNumber?: number) =>
    ipcRenderer.invoke('page:create', notebookId, template, pdfPath, pdfPageNumber),
  pageList: (notebookId: number) => ipcRenderer.invoke('page:list', notebookId),
  pageDelete: (id: number) => ipcRenderer.invoke('page:delete', id),
  pageReorder: (notebookId: number, pageIds: number[]) => ipcRenderer.invoke('page:reorder', notebookId, pageIds),

  strokesSave: (pageId: number, strokes: string) => ipcRenderer.invoke('strokes:save', pageId, strokes),
  strokesLoad: (pageId: number) => ipcRenderer.invoke('strokes:load', pageId),

  pdfImport: () => ipcRenderer.invoke('pdf:import'),
  pageExport: (pageId: number, dataUrl: string) => ipcRenderer.invoke('page:export', pageId, dataUrl),
  getVersion: () => ipcRenderer.invoke('app:version'),
})
