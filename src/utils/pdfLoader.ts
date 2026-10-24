import * as pdfjsLib from 'pdfjs-dist'

// Point pdfjs worker to the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString()

const pdfCache = new Map<string, pdfjsLib.PDFDocumentProxy>()

export async function loadPdfDocument(filePath: string): Promise<pdfjsLib.PDFDocumentProxy> {
  if (pdfCache.has(filePath)) return pdfCache.get(filePath)!
  const url = `file:///${filePath.replace(/\\/g, '/')}`
  const doc = await pdfjsLib.getDocument({ url, verbosity: 0 }).promise
  pdfCache.set(filePath, doc)
  return doc
}

export async function loadPdfPage(filePath: string, pageNumber: number): Promise<HTMLImageElement | null> {
  try {
    const doc = await loadPdfDocument(filePath)
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = canvas.toDataURL()
    })
  } catch (err) {
    console.error('PDF load error:', err)
    return null
  }
}

export async function getPdfPageCount(filePath: string): Promise<number> {
  try { return (await loadPdfDocument(filePath)).numPages } catch { return 0 }
}
