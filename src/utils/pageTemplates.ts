export type TemplateType =
  | 'blank'
  | 'lined'
  | 'grid'
  | 'dot'
  | 'cornell'
  | 'checklist'
  | 'planner'
  | 'whiteboard'
  | 'blackboard'

export type PaperColor = 'white' | 'cream' | 'dark' | 'black'

export function getPageDimensions(template?: string): { width: number; height: number } {
  if (template === 'whiteboard' || template === 'blackboard') {
    return { width: 1440, height: 960 }
  }
  return { width: 960, height: 1356 }
}

export function renderTemplate(
  template: TemplateType,
  width: number,
  height: number,
  paperColor: PaperColor = 'white'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Base paper colors
  let bg = '#ffffff'
  let lineCol = '#d1dbf0'
  let marginCol = '#f87171'
  let textCol = '#64748b'

  if (template === 'blackboard' || paperColor === 'black') {
    bg = '#14171d'
    lineCol = '#252a36'
    marginCol = '#38bdf8'
    textCol = '#94a3b8'
  } else if (template === 'whiteboard') {
    bg = '#ffffff'
    lineCol = '#f1f5f9'
    marginCol = '#2563eb'
    textCol = '#64748b'
  } else if (paperColor === 'cream') {
    bg = '#FAF6EC'
    lineCol = '#e2d8c3'
    marginCol = '#ea7a7a'
    textCol = '#78716c'
  } else if (paperColor === 'dark') {
    bg = '#181a20'
    lineCol = '#2d3342'
    marginCol = '#475569'
    textCol = '#94a3b8'
  }

  // Draw background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  if (template === 'lined') {
    const lineSpacing = 36
    const marginLeft = 68

    // Left margin line
    ctx.strokeStyle = marginCol
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(marginLeft, 0)
    ctx.lineTo(marginLeft, height)
    ctx.stroke()

    // Horizontal ruled lines
    ctx.strokeStyle = lineCol
    ctx.lineWidth = 1
    for (let y = lineSpacing * 2; y < height - 20; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  } else if (template === 'grid') {
    ctx.strokeStyle = lineCol
    ctx.lineWidth = 0.6
    const g = 24
    for (let x = 0; x <= width; x += g) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += g) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  } else if (template === 'dot') {
    ctx.fillStyle = lineCol
    const spacing = 28
    const r = 1.2
    for (let x = spacing; x < width - spacing / 2; x += spacing) {
      for (let y = spacing; y < height - spacing / 2; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (template === 'cornell') {
    // Cornell Notes Template
    const headerHeight = 90
    const summaryHeight = 160
    const cueWidth = 240
    const lineSpacing = 32

    // Header separator
    ctx.strokeStyle = marginCol
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, headerHeight)
    ctx.lineTo(width, headerHeight)
    ctx.stroke()

    // Cue column separator
    ctx.beginPath()
    ctx.moveTo(cueWidth, headerHeight)
    ctx.lineTo(cueWidth, height - summaryHeight)
    ctx.stroke()

    // Summary separator
    ctx.beginPath()
    ctx.moveTo(0, height - summaryHeight)
    ctx.lineTo(width, height - summaryHeight)
    ctx.stroke()

    // Notes area lines
    ctx.strokeStyle = lineCol
    ctx.lineWidth = 0.8
    for (let y = headerHeight + lineSpacing; y < height - summaryHeight; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(cueWidth, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Summary lines
    for (let y = height - summaryHeight + lineSpacing; y < height; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Text labels
    ctx.fillStyle = textCol
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('TOPIC / TITLE:', 28, 45)
    ctx.fillText('DATE:', width - 180, 45)
    ctx.fillText('CUE / RECALL COLUMN', 24, headerHeight + 28)
    ctx.fillText('SUMMARY', 24, height - summaryHeight + 24)
  } else if (template === 'checklist') {
    const startY = 80
    const rowH = 44
    const leftMargin = 50

    ctx.fillStyle = textCol
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('TO-DO CHECKLIST', leftMargin, 48)

    ctx.strokeStyle = lineCol
    ctx.lineWidth = 1

    for (let y = startY; y < height - 40; y += rowH) {
      // Checkbox circle
      ctx.beginPath()
      ctx.arc(leftMargin + 10, y + 10, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Horizontal writing line
      ctx.beginPath()
      ctx.moveTo(leftMargin + 32, y + 16)
      ctx.lineTo(width - leftMargin, y + 16)
      ctx.stroke()
    }
  } else if (template === 'planner') {
    const colW = (width - 60) / 3
    const rowH = (height - 120) / 2
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Weekend']

    ctx.fillStyle = textCol
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('WEEKLY PLANNER', 30, 48)

    ctx.strokeStyle = lineCol
    ctx.lineWidth = 1

    days.forEach((day, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = 30 + col * colW
      const y = 80 + row * rowH
      const w = colW - 14
      const h = rowH - 16

      // Box
      ctx.strokeRect(x, y, w, h)

      // Header background
      ctx.fillStyle = paperColor === 'dark' ? '#252a35' : '#f1f5f9'
      ctx.fillRect(x, y, w, 28)

      // Day label
      ctx.fillStyle = textCol
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.fillText(day.toUpperCase(), x + 10, y + 19)

      // Inner lines
      ctx.strokeStyle = lineCol
      for (let ly = y + 54; ly < y + h - 10; ly += 26) {
        ctx.beginPath()
        ctx.moveTo(x + 10, ly)
        ctx.lineTo(x + w - 10, ly)
        ctx.stroke()
      }
    })
  } else if (template === 'whiteboard') {
    // Big Whiteboard Presentation Chart
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 0.8
    const g = 36
    for (let x = 0; x <= width; x += g) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += g) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Header badge
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(24, 20, 240, 28)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    ctx.strokeRect(24, 20, 240, 28)
    ctx.fillStyle = '#475569'
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('📊 WHITEBOARD CHART', 36, 39)
  } else if (template === 'blackboard') {
    // Big Blackboard Presentation Chart
    ctx.strokeStyle = '#252a36'
    ctx.lineWidth = 0.8
    const g = 36
    for (let x = 0; x <= width; x += g) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += g) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Header badge
    ctx.fillStyle = '#1e222b'
    ctx.fillRect(24, 20, 240, 28)
    ctx.strokeStyle = '#333b4d'
    ctx.lineWidth = 1
    ctx.strokeRect(24, 20, 240, 28)
    ctx.fillStyle = '#94a3b8'
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('🖤 BLACKBOARD CHART', 36, 39)
  }

  return canvas
}
