import { useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { TOOLS, SHAPE_TOOLS, CANVAS_WIDTH, CANVAS_HEIGHT, EMIT_THROTTLE } from '../constants'
import { drawStroke } from '../strokeRenderer'
import { optimizeStrokeForTransmit } from '@/utils/strokeOptimization'

/**
 * Hook to manage canvas drawing operations
 */
export function useCanvasDrawing({
  contextRef,
  canvasRef,
  tool,
  color,
  strokeWidth,
  fontSize,
  zoom,
  pan,
  socket,
  onStrokeAdd,
  imageCache
}) {
  // Drawing state refs
  const currentStroke = useRef(null)
  const startPoint = useRef(null)
  const lastDrawPoint = useRef(null)
  const shapePreviewSnapshot = useRef(null)
  const isDrawingRef = useRef(false)
  
  // Throttling refs
  const lastEmitTime = useRef(0)
  const lastSentPointIndex = useRef(0)
  const rafRef = useRef(null)
  const pendingPoint = useRef(null)

  /**
   * Get coordinates from mouse/touch event
   */
  const getCoordinates = useCallback((e, containerRect) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0
    
    const x = (clientX - containerRect.left - pan.x) / zoom
    const y = (clientY - containerRect.top - pan.y) / zoom
    return { x, y }
  }, [zoom, pan])

  /**
   * Check if coordinates are within canvas bounds
   */
  const isWithinCanvas = useCallback((x, y) => {
    return x >= 0 && x <= CANVAS_WIDTH && y >= 0 && y <= CANVAS_HEIGHT
  }, [])

  /**
   * Start a new stroke
   */
  const startStroke = useCallback((x, y) => {
    if (!isWithinCanvas(x, y)) return false
    
    isDrawingRef.current = true
    startPoint.current = { x, y }
    lastSentPointIndex.current = 0

    currentStroke.current = {
      id: uuidv4(),
      tool,
      color,
      strokeWidth,
      points: [{ x, y }],
      startPoint: { x, y }
    }

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const ctx = contextRef.current
      if (ctx) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    return true
  }, [tool, color, strokeWidth, isWithinCanvas])

  /**
   * Draw incrementally for pen/eraser
   */
  const drawIncremental = useCallback((x, y) => {
    if (!currentStroke.current) return
    
    const ctx = contextRef.current
    if (!ctx) return
    
    const prev = lastDrawPoint.current || currentStroke.current.startPoint
    
    // Draw single line segment - O(1) instead of O(n)
    ctx.beginPath()
    ctx.strokeStyle = tool === TOOLS.ERASER ? '#ffffff' : color
    ctx.lineWidth = strokeWidth
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    
    lastDrawPoint.current = { x, y }
    currentStroke.current.points.push({ x, y })

    // Emit to socket (throttled)
    const now = Date.now()
    if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
      socket.emit('draw:stroke', { 
        stroke: {
          id: currentStroke.current.id,
          tool: currentStroke.current.tool,
          color: currentStroke.current.color,
          strokeWidth: currentStroke.current.strokeWidth,
          startPoint: currentStroke.current.startPoint,
          points: currentStroke.current.points,
        },
        isPreview: true
      })
      lastSentPointIndex.current = currentStroke.current.points.length
      lastEmitTime.current = now
    }
  }, [tool, color, strokeWidth, socket])

  /**
   * Draw shape preview
   */
  const drawShapePreview = useCallback((x, y) => {
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) return
    if (!startPoint.current) return
    
    const ctx = contextRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    
    // Save snapshot on first preview
    if (!shapePreviewSnapshot.current) {
      shapePreviewSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } else {
      ctx.putImageData(shapePreviewSnapshot.current, 0, 0)
    }
    
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth

    const sx = startPoint.current.x
    const sy = startPoint.current.y

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

    // Emit preview to others (throttled)
    const now = Date.now()
    if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
      currentStroke.current.endPoint = { x, y }
      socket.emit('draw:stroke', { stroke: currentStroke.current, isPreview: true })
      lastEmitTime.current = now
    }
  }, [tool, color, strokeWidth, socket])

  /**
   * Continue drawing (handles both pen and shapes)
   */
  const continueStroke = useCallback((x, y) => {
    if (!isDrawingRef.current || !currentStroke.current) return
    
    pendingPoint.current = { x, y }

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      drawIncremental(x, y)
    } else {
      // For shapes, use RAF to batch updates
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          if (!pendingPoint.current || !isDrawingRef.current) return
          drawShapePreview(pendingPoint.current.x, pendingPoint.current.y)
        })
      }
    }
  }, [tool, drawIncremental, drawShapePreview])

  /**
   * End the current stroke
   */
  const endStroke = useCallback((finalPoint) => {
    if (!isDrawingRef.current) return null
    
    isDrawingRef.current = false

    if (currentStroke.current) {
      // Set endPoint for shapes
      if (SHAPE_TOOLS.includes(tool)) {
        const point = finalPoint || pendingPoint.current
        if (point) {
          currentStroke.current.endPoint = { x: point.x, y: point.y }
        }
      }

      // Notify parent
      if (onStrokeAdd) {
        onStrokeAdd(currentStroke.current)
      }

      // Emit final stroke to server
      if (socket) {
        const optimized = optimizeStrokeForTransmit(currentStroke.current, {
          simplifyEpsilon: 1.0,
          useDelta: true
        })
        socket.emit('draw:stroke', { stroke: optimized, isPreview: false })
        socket.emit('draw:complete', { strokeId: currentStroke.current.id })
      }
    }

    // Cleanup
    const finishedStroke = currentStroke.current
    currentStroke.current = null
    startPoint.current = null
    pendingPoint.current = null
    lastDrawPoint.current = null
    shapePreviewSnapshot.current = null
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    return finishedStroke
  }, [tool, socket, onStrokeAdd])

  /**
   * Cancel current stroke
   */
  const cancelStroke = useCallback(() => {
    isDrawingRef.current = false
    currentStroke.current = null
    startPoint.current = null
    pendingPoint.current = null
    lastDrawPoint.current = null
    shapePreviewSnapshot.current = null
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return {
    // State
    isDrawingRef,
    currentStroke,
    startPoint,
    shapePreviewSnapshot,
    
    // Methods
    getCoordinates,
    isWithinCanvas,
    startStroke,
    continueStroke,
    endStroke,
    cancelStroke,
    drawShapePreview
  }
}
