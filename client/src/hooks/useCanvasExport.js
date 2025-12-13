import { useCallback } from 'react'
import { TOOLS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../components/canvas/constants'
import { getStrokeBounds } from '../components/canvas/strokeRenderer'

/**
 * Hook for handling canvas export (PNG, SVG, PDF)
 */
export function useCanvasExport(canvasRef, strokes, imageCache) {
  
  const handleExport = useCallback((format = 'png') => {
    const canvas = canvasRef.current
    if (!canvas) return

    const filename = `sketch-${new Date().toISOString().slice(0, 10)}`

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else if (format === 'svg') {
      exportAsSVG(filename, strokes, imageCache)
    } else if (format === 'pdf') {
      exportAsPDF(filename, canvas)
    }
  }, [canvasRef, strokes, imageCache])

  return { handleExport }
}

/**
 * Export strokes as SVG
 */
function exportAsSVG(filename, strokes, imageCache) {
  const svgNS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNS, 'svg')
  svg.setAttribute('width', CANVAS_WIDTH)
  svg.setAttribute('height', CANVAS_HEIGHT)
  svg.setAttribute('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`)
  svg.setAttribute('xmlns', svgNS)

  // White background
  const bg = document.createElementNS(svgNS, 'rect')
  bg.setAttribute('width', '100%')
  bg.setAttribute('height', '100%')
  bg.setAttribute('fill', 'white')
  svg.appendChild(bg)

  // Draw all strokes
  strokes.forEach(stroke => {
    if (!stroke) return

    const rotation = stroke.rotation || 0
    let group = null

    if (rotation !== 0) {
      group = document.createElementNS(svgNS, 'g')
      const bounds = getStrokeBounds(stroke, null, imageCache)
      if (bounds) {
        const cx = bounds.x + bounds.width / 2
        const cy = bounds.y + bounds.height / 2
        group.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`)
      }
    }

    let element = null

    if (stroke.tool === TOOLS.LINE && stroke.startPoint && stroke.endPoint) {
      element = document.createElementNS(svgNS, 'line')
      element.setAttribute('x1', stroke.startPoint.x)
      element.setAttribute('y1', stroke.startPoint.y)
      element.setAttribute('x2', stroke.endPoint.x)
      element.setAttribute('y2', stroke.endPoint.y)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('stroke-linecap', 'round')
    } else if (stroke.tool === TOOLS.RECTANGLE && stroke.startPoint && stroke.endPoint) {
      element = document.createElementNS(svgNS, 'rect')
      const x = Math.min(stroke.startPoint.x, stroke.endPoint.x)
      const y = Math.min(stroke.startPoint.y, stroke.endPoint.y)
      const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x)
      const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y)
      element.setAttribute('x', x)
      element.setAttribute('y', y)
      element.setAttribute('width', w)
      element.setAttribute('height', h)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('fill', 'none')
    } else if (stroke.tool === TOOLS.CIRCLE && stroke.startPoint && stroke.endPoint) {
      element = document.createElementNS(svgNS, 'circle')
      const radius = Math.sqrt(
        Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
        Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
      )
      element.setAttribute('cx', stroke.startPoint.x)
      element.setAttribute('cy', stroke.startPoint.y)
      element.setAttribute('r', radius)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('fill', 'none')
    } else if (stroke.tool === TOOLS.TRIANGLE && stroke.startPoint && stroke.endPoint) {
      element = document.createElementNS(svgNS, 'polygon')
      const sx = stroke.startPoint.x
      const sy = stroke.startPoint.y
      const ex = stroke.endPoint.x
      const ey = stroke.endPoint.y
      const points = `${(sx + ex) / 2},${sy} ${ex},${ey} ${sx},${ey}`
      element.setAttribute('points', points)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('fill', 'none')
    } else if (stroke.tool === TOOLS.DIAMOND && stroke.startPoint && stroke.endPoint) {
      element = document.createElementNS(svgNS, 'polygon')
      const sx = stroke.startPoint.x
      const sy = stroke.startPoint.y
      const ex = stroke.endPoint.x
      const ey = stroke.endPoint.y
      const cx = (sx + ex) / 2
      const cy = (sy + ey) / 2
      const points = `${cx},${sy} ${ex},${cy} ${cx},${ey} ${sx},${cy}`
      element.setAttribute('points', points)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('fill', 'none')
    } else if (stroke.tool === TOOLS.ARROW && stroke.startPoint && stroke.endPoint) {
      const g = document.createElementNS(svgNS, 'g')
      const line = document.createElementNS(svgNS, 'line')
      line.setAttribute('x1', stroke.startPoint.x)
      line.setAttribute('y1', stroke.startPoint.y)
      line.setAttribute('x2', stroke.endPoint.x)
      line.setAttribute('y2', stroke.endPoint.y)
      line.setAttribute('stroke', stroke.color || '#000')
      line.setAttribute('stroke-width', stroke.strokeWidth || 3)
      g.appendChild(line)

      const angle = Math.atan2(
        stroke.endPoint.y - stroke.startPoint.y,
        stroke.endPoint.x - stroke.startPoint.x
      )
      const headLen = 15
      const arrowhead = document.createElementNS(svgNS, 'polyline')
      const ax1 = stroke.endPoint.x - headLen * Math.cos(angle - Math.PI / 6)
      const ay1 = stroke.endPoint.y - headLen * Math.sin(angle - Math.PI / 6)
      const ax2 = stroke.endPoint.x - headLen * Math.cos(angle + Math.PI / 6)
      const ay2 = stroke.endPoint.y - headLen * Math.sin(angle + Math.PI / 6)
      arrowhead.setAttribute('points', `${ax1},${ay1} ${stroke.endPoint.x},${stroke.endPoint.y} ${ax2},${ay2}`)
      arrowhead.setAttribute('stroke', stroke.color || '#000')
      arrowhead.setAttribute('stroke-width', stroke.strokeWidth || 3)
      arrowhead.setAttribute('fill', 'none')
      g.appendChild(arrowhead)
      element = g
    } else if (stroke.tool === TOOLS.TEXT && stroke.startPoint) {
      element = document.createElementNS(svgNS, 'text')
      element.setAttribute('x', stroke.startPoint.x)
      element.setAttribute('y', stroke.startPoint.y)
      element.setAttribute('font-family', 'Arial, sans-serif')
      element.setAttribute('font-size', stroke.fontSize || 16)
      element.setAttribute('fill', stroke.color || '#000')
      element.textContent = stroke.text || ''
    } else if (stroke.tool === TOOLS.PEN && stroke.points?.length > 0) {
      element = document.createElementNS(svgNS, 'polyline')
      const points = stroke.points.map(p => `${p.x},${p.y}`).join(' ')
      element.setAttribute('points', points)
      element.setAttribute('stroke', stroke.color || '#000')
      element.setAttribute('stroke-width', stroke.strokeWidth || 3)
      element.setAttribute('stroke-linecap', 'round')
      element.setAttribute('stroke-linejoin', 'round')
      element.setAttribute('fill', 'none')
    } else if (stroke.tool === TOOLS.IMAGE && stroke.imageData) {
      element = document.createElementNS(svgNS, 'image')
      element.setAttribute('x', stroke.startPoint.x)
      element.setAttribute('y', stroke.startPoint.y)
      element.setAttribute('width', stroke.width || 100)
      element.setAttribute('height', stroke.height || 100)
      element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', stroke.imageData)
    }

    if (element) {
      if (group) {
        group.appendChild(element)
        svg.appendChild(group)
      } else {
        svg.appendChild(element)
      }
    }
  })

  // Download SVG
  const svgData = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${filename}.svg`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export canvas as PDF
 */
async function exportAsPDF(filename, canvas) {
  if (!canvas) return

  try {
    const { jsPDF } = await import('jspdf')
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: CANVAS_WIDTH > CANVAS_HEIGHT ? 'landscape' : 'portrait',
      unit: 'px',
      format: [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2]
    })

    pdf.addImage(imgData, 'PNG', 0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('PDF export failed:', error)
    alert('PDF export requires jspdf library. Falling back to PNG export.')
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
}
