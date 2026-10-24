import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

const require = createRequire(import.meta.url)

export interface Notebook {
  id: number
  name: string
  createdAt: string
}

export interface Page {
  id: number
  notebookId: number
  order: number
  template: string
  pdfPath: string | null
  pdfPageNumber: number | null
}

let _db: import('better-sqlite3').Database | null = null

export function getDb(): import('better-sqlite3').Database {
  if (_db) return _db

  // Load the native better-sqlite3 binary rebuilt for Electron
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Database = require('better-sqlite3') as any
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'goodnotes.db')

  fs.mkdirSync(userDataPath, { recursive: true })

  _db = new Database(dbPath) as import('better-sqlite3').Database
  _db.pragma('journal_mode = WAL')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('foreign_keys = ON')

  _db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notebookId INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      "order" INTEGER NOT NULL DEFAULT 0,
      template TEXT NOT NULL DEFAULT 'blank',
      pdfPath TEXT,
      pdfPageNumber INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS strokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pageId INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      data TEXT NOT NULL DEFAULT '[]',
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(pageId)
    );

    CREATE INDEX IF NOT EXISTS idx_pages_notebook ON pages(notebookId, "order");
    CREATE INDEX IF NOT EXISTS idx_strokes_page ON strokes(pageId);
  `)

  return _db
}

// ─── Notebooks ────────────────────────────────────────────────────────────────

export function dbNotebookCreate(name: string): Notebook {
  const db = getDb()
  // Use run() + lastInsertRowid instead of RETURNING (safer across SQLite versions)
  const result = db.prepare('INSERT INTO notebooks (name) VALUES (?)').run(name)
  const id = Number(result.lastInsertRowid)
  return db.prepare('SELECT id, name, createdAt FROM notebooks WHERE id = ?').get(id) as Notebook
}

export function dbNotebookList(): Notebook[] {
  return getDb().prepare('SELECT id, name, createdAt FROM notebooks ORDER BY id ASC').all() as Notebook[]
}

export function dbNotebookRename(id: number, name: string): void {
  getDb().prepare('UPDATE notebooks SET name = ? WHERE id = ?').run(name, id)
}

export function dbNotebookDelete(id: number): void {
  getDb().prepare('DELETE FROM notebooks WHERE id = ?').run(id)
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export function dbPageCreate(
  notebookId: number,
  template: string,
  pdfPath?: string,
  pdfPageNumber?: number
): Page {
  const db = getDb()
  const row = db
    .prepare('SELECT COALESCE(MAX("order"), -1) as maxOrder FROM pages WHERE notebookId = ?')
    .get(notebookId) as { maxOrder: number }
  const nextOrder = row.maxOrder + 1

  const result = db
    .prepare(
      'INSERT INTO pages (notebookId, "order", template, pdfPath, pdfPageNumber) VALUES (?, ?, ?, ?, ?)'
    )
    .run(notebookId, nextOrder, template, pdfPath ?? null, pdfPageNumber ?? null)

  const id = Number(result.lastInsertRowid)
  return db
    .prepare('SELECT id, notebookId, "order", template, pdfPath, pdfPageNumber FROM pages WHERE id = ?')
    .get(id) as Page
}

export function dbPageList(notebookId: number): Page[] {
  return getDb()
    .prepare(
      'SELECT id, notebookId, "order", template, pdfPath, pdfPageNumber FROM pages WHERE notebookId = ? ORDER BY "order" ASC'
    )
    .all(notebookId) as Page[]
}

export function dbPageDelete(id: number): void {
  getDb().prepare('DELETE FROM pages WHERE id = ?').run(id)
}

export function dbPageReorder(notebookId: number, pageIds: number[]): void {
  const db = getDb()
  const update = db.prepare('UPDATE pages SET "order" = ? WHERE id = ? AND notebookId = ?')
  const tx = db.transaction(() => {
    pageIds.forEach((id, i) => update.run(i, id, notebookId))
  })
  tx()
}

// ─── Strokes ──────────────────────────────────────────────────────────────────

export function dbStrokesSave(pageId: number, data: string): void {
  getDb()
    .prepare(
      `INSERT INTO strokes (pageId, data, updatedAt) VALUES (?, ?, datetime('now'))
       ON CONFLICT(pageId) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`
    )
    .run(pageId, data)
}

export function dbStrokesLoad(pageId: number): string {
  const row = getDb()
    .prepare('SELECT data FROM strokes WHERE pageId = ?')
    .get(pageId) as { data: string } | undefined
  return row?.data ?? '[]'
}
