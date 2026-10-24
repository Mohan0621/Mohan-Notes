import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import {
  dbNotebookCreate, dbNotebookList, dbNotebookRename, dbNotebookDelete,
  dbPageCreate, dbPageList, dbPageDelete, dbPageReorder,
  dbStrokesSave, dbStrokesLoad,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Mohan Notes',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Remove menu bar in all modes
  win.setMenu(null)

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // DevTools can be opened manually with Ctrl+Shift+I
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ─── Safe IPC wrapper — logs errors to main process console ──────────────────

function handle<T>(channel: string, fn: (...args: unknown[]) => T) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await Promise.resolve(fn(...args))
    } catch (err) {
      console.error(`[IPC ERROR] ${channel}:`, err)
      throw err
    }
  })
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

handle('notebook:create', (name) => dbNotebookCreate(name as string))
handle('notebook:list',   ()     => dbNotebookList())
handle('notebook:rename', (id, name) => dbNotebookRename(id as number, name as string))
handle('notebook:delete', (id)   => dbNotebookDelete(id as number))

handle('page:create', (notebookId, template, pdfPath, pdfPageNumber) =>
  dbPageCreate(notebookId as number, template as string, pdfPath as string | undefined, pdfPageNumber as number | undefined))
handle('page:list',   (notebookId) => dbPageList(notebookId as number))
handle('page:delete', (id)         => dbPageDelete(id as number))
handle('page:reorder', (notebookId, pageIds) =>
  dbPageReorder(notebookId as number, pageIds as number[]))

handle('strokes:save', (pageId, data) => dbStrokesSave(pageId as number, data as string))
handle('strokes:load', (pageId)       => dbStrokesLoad(pageId as number))

ipcMain.handle('pdf:import', async () => {
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    title: 'Import PDF',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return { path: result.filePaths[0], pageCount: -1 }
})

ipcMain.handle('page:export', async (_e, pageId: number, dataUrl: string) => {
  if (!win) return null
  const result = await dialog.showSaveDialog(win, {
    title: 'Export Page as PNG',
    defaultPath: `page-${pageId}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  })
  if (result.canceled || !result.filePath) return null
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
  fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'))
  return result.filePath
})

handle('app:version', () => app.getVersion())

// ─── Stylus & GPU Acceleration Flags ─────────────────────────────────────────
app.commandLine.appendSwitch('enable-pointer-events')
app.commandLine.appendSwitch('high-dpi-support', '1')
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.commandLine.appendSwitch('touch-events', 'enabled')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null }
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
app.whenReady().then(createWindow)
