import { TOOLS } from '../constants'

/**
 * Generate dynamic cursor SVG based on tool and stroke width
 * @param {string} tool - Current tool
 * @param {number} strokeWidth - Current stroke width
 * @param {number} zoom - Current zoom level
 * @returns {string} CSS cursor value
 */
export function generateCursor(tool, strokeWidth, zoom) {
  const size = Math.max(strokeWidth * zoom, 4) // Minimum 4px for visibility
  const cursorSize = Math.min(Math.max(size + 8, 16), 64) // Canvas cursor size between 16-64px
  const center = cursorSize / 2
  const radius = Math.max(size / 2, 2)
  
  if (tool === TOOLS.SELECT) {
    return 'default'
  } else if (tool === TOOLS.ERASER) {
    // Eraser: circle matching stroke width
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><circle cx="${center}" cy="${center}" r="${radius}" fill="rgba(255,255,255,0.5)" stroke="%23333" stroke-width="1.5"/><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="white" stroke-width="3"/><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="%23333" stroke-width="1.5"/></svg>`
    return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}') ${center} ${center}, auto`
  } else if (tool === TOOLS.PEN) {
    // Pen: crosshair with dot matching stroke width
    const dotRadius = Math.max(radius, 1.5)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><line x1="${center}" y1="2" x2="${center}" y2="${cursorSize-2}" stroke="white" stroke-width="3"/><line x1="2" y1="${center}" x2="${cursorSize-2}" y2="${center}" stroke="white" stroke-width="3"/><line x1="${center}" y1="2" x2="${center}" y2="${cursorSize-2}" stroke="%23333" stroke-width="1.5"/><line x1="2" y1="${center}" x2="${cursorSize-2}" y2="${center}" stroke="%23333" stroke-width="1.5"/><circle cx="${center}" cy="${center}" r="${dotRadius}" fill="%23333" stroke="white" stroke-width="1"/></svg>`
    return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}') ${center} ${center}, crosshair`
  }
  return 'crosshair'
}

/**
 * Get cursor style for canvas based on current state
 * @param {Object} params - Parameters
 * @returns {string} CSS cursor value
 */
export function getCanvasCursor({
  tool,
  strokeWidth,
  zoom,
  isPanning,
  spacePressed,
  isDragging
}) {
  if (isPanning) return 'grabbing'
  if (tool === TOOLS.HAND || spacePressed) return 'grab'
  if (tool === TOOLS.SELECT) return isDragging ? 'grabbing' : 'default'
  if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
    return generateCursor(tool, strokeWidth, zoom)
  }
  return 'crosshair'
}
