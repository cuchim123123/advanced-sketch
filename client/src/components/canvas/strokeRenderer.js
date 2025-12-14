import { TOOLS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'

/**
 * Draw a single stroke on the canvas context
 */
export function drawStroke(stroke, ctx, imageCache) {
  if (!stroke || !stroke.tool) return
  
  // Guard: shapes require startPoint and endPoint
  const shapeTools = [TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.ARROW, TOOLS.DIAMOND]
  if (shapeTools.includes(stroke.tool)) {
    if (!stroke.startPoint?.x || !stroke.endPoint?.x) {
      console.warn('[drawStroke] Invalid shape stroke, missing points:', stroke.id, stroke.tool)
      return
    }
  }
  
  // Guard: pen/eraser require points array
  if ((stroke.tool === TOOLS.PEN || stroke.tool === TOOLS.ERASER) && (!stroke.points || stroke.points.length === 0)) {
    return
  }

  ctx.save()

  // Apply rotation for all strokes that have rotation and startPoint
  if (stroke.rotation && stroke.startPoint) {
    console.log('[drawStroke] Applying rotation:', stroke.id, stroke.rotation)
    const bounds = getStrokeBounds(stroke, ctx, imageCache)
    if (bounds) {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      ctx.translate(centerX, centerY)
      ctx.rotate(stroke.rotation * Math.PI / 180)
      ctx.translate(-centerX, -centerY)
    }
  }

  ctx.beginPath()
  ctx.strokeStyle = stroke.tool === TOOLS.ERASER ? '#ffffff' : (stroke.color || '#000000')
  ctx.lineWidth = stroke.strokeWidth || 3

  if (stroke.tool === TOOLS.LINE) {
    ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y)
    ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y)
  } else if (stroke.tool === TOOLS.RECTANGLE) {
    const width = stroke.endPoint.x - stroke.startPoint.x
    const height = stroke.endPoint.y - stroke.startPoint.y
    const maxSize = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 2
    const clampedWidth = Math.max(-maxSize, Math.min(maxSize, width))
    const clampedHeight = Math.max(-maxSize, Math.min(maxSize, height))
    ctx.strokeRect(stroke.startPoint.x, stroke.startPoint.y, clampedWidth, clampedHeight)
    ctx.restore()
    return
  } else if (stroke.tool === TOOLS.CIRCLE) {
    const radius = Math.sqrt(
      Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
      Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
    )
    const maxRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT)
    const clampedRadius = Math.min(maxRadius, Math.max(0, radius))
    if (clampedRadius > 0) {
      ctx.arc(stroke.startPoint.x, stroke.startPoint.y, clampedRadius, 0, 2 * Math.PI)
    }
  } else if (stroke.tool === TOOLS.TRIANGLE) {
    const sx = stroke.startPoint.x
    const sy = stroke.startPoint.y
    const ex = stroke.endPoint.x
    const ey = stroke.endPoint.y
    // Triangle: startPoint is TOP vertex (FIXED), expands down and symmetrically
    const halfWidth = Math.abs(ex - sx)
    ctx.moveTo(sx, sy)                    // Top (FIXED)
    ctx.lineTo(sx + halfWidth, ey)        // Bottom right
    ctx.lineTo(sx - halfWidth, ey)        // Bottom left
    ctx.closePath()
  } else if (stroke.tool === TOOLS.ARROW) {
    const sx = stroke.startPoint.x
    const sy = stroke.startPoint.y
    const ex = stroke.endPoint.x
    const ey = stroke.endPoint.y
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    const angle = Math.atan2(ey - sy, ex - sx)
    const headLen = 15
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6))
  } else if (stroke.tool === TOOLS.DIAMOND) {
    const sx = stroke.startPoint.x
    const sy = stroke.startPoint.y
    const ex = stroke.endPoint.x
    const ey = stroke.endPoint.y
    // Diamond: startPoint is TOP vertex (FIXED), expands down and symmetrically
    const halfWidth = Math.abs(ex - sx)
    const height = Math.abs(ey - sy)
    ctx.moveTo(sx, sy)                         // Top (FIXED)
    ctx.lineTo(sx + halfWidth, sy + height/2)  // Right
    ctx.lineTo(sx, ey)                         // Bottom
    ctx.lineTo(sx - halfWidth, sy + height/2)  // Left
    ctx.closePath()
  } else if (stroke.tool === TOOLS.TEXT) {
    ctx.font = `${stroke.fontSize || 16}px Arial, sans-serif`
    ctx.fillStyle = stroke.color || '#000000'
    ctx.fillText(stroke.text || '', stroke.startPoint.x, stroke.startPoint.y)
    ctx.restore()
    return
  } else if (stroke.tool === TOOLS.IMAGE && stroke.imageData) {
    const cachedImg = imageCache?.get(stroke.id)

    if (cachedImg && cachedImg.complete) {
      ctx.drawImage(
        cachedImg,
        stroke.startPoint.x,
        stroke.startPoint.y,
        stroke.width || cachedImg.width,
        stroke.height || cachedImg.height
      )
      ctx.restore()
      return
    } else if (imageCache) {
      // Image not cached yet - load it but DON'T draw immediately
      // This prevents layer order issues (image drawing over other strokes)
      // The image will be drawn on next redraw after it's cached
      if (!imageCache.has(stroke.id)) {
        const img = new Image()
        img.onload = () => {
          imageCache.set(stroke.id, img)
          // Dispatch custom event to trigger canvas redraw
          window.dispatchEvent(new CustomEvent('canvas:imageLoaded', { detail: { strokeId: stroke.id } }))
        }
        img.onerror = () => {
          console.warn('Failed to load image:', stroke.id)
        }
        // Mark as loading to prevent multiple load attempts
        imageCache.set(stroke.id, img) // img.complete will be false until loaded
        img.src = stroke.imageData
      }
      // Don't draw anything - wait for image to load and trigger redraw
    }
    ctx.restore()
    return
  } else {
    // Pen or eraser - draw path
    if (stroke.points && stroke.points.length > 0) {
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.forEach(point => {
        ctx.lineTo(point.x, point.y)
      })
    }
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * Get bounding box of a stroke
 */
export function getStrokeBounds(stroke, ctx, imageCache) {
  if (!stroke) return null

  if (stroke.tool === TOOLS.TEXT && stroke.startPoint) {
    if (ctx) ctx.font = `${stroke.fontSize || 16}px Arial, sans-serif`
    const textWidth = ctx ? ctx.measureText(stroke.text || '').width : 100
    const textHeight = stroke.fontSize || 16
    return {
      x: stroke.startPoint.x,
      y: stroke.startPoint.y - textHeight,
      width: textWidth,
      height: textHeight
    }
  } else if (stroke.tool === TOOLS.IMAGE && stroke.startPoint) {
    const cachedImg = imageCache?.get(stroke.id)
    const width = stroke.width || cachedImg?.width || 100
    const height = stroke.height || cachedImg?.height || 100
    return {
      x: stroke.startPoint.x,
      y: stroke.startPoint.y,
      width: width,
      height: height
    }
  } else if (stroke.startPoint && stroke.endPoint) {
    const minX = Math.min(stroke.startPoint.x, stroke.endPoint.x)
    const minY = Math.min(stroke.startPoint.y, stroke.endPoint.y)
    const maxX = Math.max(stroke.startPoint.x, stroke.endPoint.x)
    const maxY = Math.max(stroke.startPoint.y, stroke.endPoint.y)
    return {
      x: minX,
      y: minY,
      width: maxX - minX || 1,
      height: maxY - minY || 1
    }
  }
  return null
}

/**
 * Draw selection highlight with resize handles
 */
export function drawSelectionHighlight(stroke, ctx, imageCache) {
  if (!stroke || !ctx) return

  const bounds = getStrokeBounds(stroke, ctx, imageCache)
  if (!bounds) return

  const padding = 4
  const handleSize = 8
  const rotation = stroke.rotation || 0

  ctx.save()

  if (rotation !== 0) {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation * Math.PI / 180)
    ctx.translate(-centerX, -centerY)
  }

  // Selection border
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.strokeRect(
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2
  )
  ctx.setLineDash([])

  // Resize handles (corners)
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 2

  const handles = [
    { x: bounds.x - padding - handleSize / 2, y: bounds.y - padding - handleSize / 2 },
    { x: bounds.x + bounds.width + padding - handleSize / 2, y: bounds.y - padding - handleSize / 2 },
    { x: bounds.x - padding - handleSize / 2, y: bounds.y + bounds.height + padding - handleSize / 2 },
    { x: bounds.x + bounds.width + padding - handleSize / 2, y: bounds.y + bounds.height + padding - handleSize / 2 }
  ]

  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)
  })

  // Rotation handle
  const rotateHandleY = bounds.y - padding - 25
  const rotateHandleX = bounds.x + bounds.width / 2

  ctx.beginPath()
  ctx.moveTo(rotateHandleX, bounds.y - padding)
  ctx.lineTo(rotateHandleX, rotateHandleY + 8)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(rotateHandleX, rotateHandleY, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = '#0ea5e9'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(rotateHandleX, rotateHandleY, 4, -Math.PI * 0.7, Math.PI * 0.3)
  ctx.stroke()

  ctx.restore()
}

/**
 * Redraw all strokes on canvas
 */
export function redrawCanvas(ctx, canvas, strokes, imageCache) {
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  strokes.forEach(stroke => {
    if (stroke && stroke.tool) {
      drawStroke(stroke, ctx, imageCache)
    }
  })
}

/**
 * Draw shape preview while drawing
 */
export function drawShapePreview(ctx, canvas, tool, startPoint, endPoint, color, strokeWidth, snapshot) {
  if (!ctx || !startPoint) return

  // Restore snapshot first
  if (snapshot) {
    ctx.putImageData(snapshot, 0, 0)
  }

  const { x, y } = endPoint
  const sx = startPoint.x
  const sy = startPoint.y

  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth

  if (tool === TOOLS.LINE) {
    ctx.moveTo(sx, sy)
    ctx.lineTo(x, y)
    ctx.stroke()
  } else if (tool === TOOLS.RECTANGLE) {
    ctx.strokeRect(sx, sy, x - sx, y - sy)
  } else if (tool === TOOLS.CIRCLE) {
    const radius = Math.hypot(x - sx, y - sy)
    if (radius > 0) {
      ctx.arc(sx, sy, radius, 0, 2 * Math.PI)
      ctx.stroke()
    }
  } else if (tool === TOOLS.TRIANGLE) {
    ctx.moveTo((sx + x) / 2, sy)
    ctx.lineTo(x, y)
    ctx.lineTo(sx, y)
    ctx.closePath()
    ctx.stroke()
  } else if (tool === TOOLS.ARROW) {
    ctx.moveTo(sx, sy)
    ctx.lineTo(x, y)
    ctx.stroke()
    const angle = Math.atan2(y - sy, x - sx)
    const headLen = 15
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  } else if (tool === TOOLS.DIAMOND) {
    const cx = (sx + x) / 2
    const cy = (sy + y) / 2
    ctx.moveTo(cx, sy)
    ctx.lineTo(x, cy)
    ctx.lineTo(cx, y)
    ctx.lineTo(sx, cy)
    ctx.closePath()
    ctx.stroke()
  }
}
