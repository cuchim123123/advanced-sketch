import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { optimizeStrokeForTransmit } from '../utils/strokeOptimization'
import {
  TOOLS,
  COLORS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  EMIT_THROTTLE,
  TOOL_ICONS
} from './canvas/constants'
import {
  drawStroke,
  getStrokeBounds,
  drawSelectionHighlight
} from './canvas/strokeRenderer'
import {
  findStrokeAtPoint as findStrokeUtil,
  getTransformHandleAtPoint as getTransformHandleUtil
} from './canvas/utils/hitDetection'
import { generateCursor } from './canvas/utils/cursor'
import {
  getCanvasCoordinates,
  canvasToScreenCoordinates,
  isWithinCanvas as isWithinCanvasUtil
} from './canvas/utils/coordinates'
import { useCanvasExport } from '../hooks/useCanvasExport'
import { useCanvasState } from './canvas/hooks/useCanvasState'
import { useCanvasZoom } from './canvas/hooks/useCanvasZoom'
import { useCanvasKeyboard } from './canvas/hooks/useCanvasKeyboard'
import CanvasToolbar from './canvas/components/CanvasToolbar'
import CursorOverlay from './canvas/components/CursorOverlay'
import KeyboardShortcutsModal from './canvas/components/KeyboardShortcutsModal'

export default function Canvas({ 
  socket, 
  roomCode, 
  strokes = [],  // Renamed from initialStrokes - parent manages this
  previewStrokes = {}, // Shape previews from other users
  onStrokeAdd,   // Callback when user draws a stroke
  onStrokeUpdate, // Callback when user moves a stroke
  onClear,       // Callback for clear confirmation
  cursors = {},
  showCursorNames = true,
  disabled = false  // Disable drawing when room is loading
}) {
  // Use canvas state hook
  const {
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    fontSize, setFontSize,
    isDrawing, setIsDrawing,
    isDrawingRef,
    selectedStroke, setSelectedStroke,
    isDragging, setIsDragging,
    dragOffset,
    transformMode, setTransformMode,
    transformStart,
    originalStrokeRef,
    textInput, setTextInput,
    showShortcuts, setShowShortcuts
  } = useCanvasState()

  // Canvas refs
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const contextRef = useRef(null)
  const strokesRef = useRef(strokes)
  const currentStroke = useRef(null)
  const startPoint = useRef(null)
  
  // Text input ref
  const textInputRef = useRef(null)
  
  // Image upload ref
  const imageInputRef = useRef(null)
  const pendingImagePosition = useRef(null)
  const imageCache = useRef(new Map())
  
  // Cache container rect
  const containerRectCache = useRef(null)
  
  // Refs for hook dependencies
  const toolRef = useRef(tool)
  const disabledRef = useRef(disabled)
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { disabledRef.current = disabled }, [disabled])
  
  // Use zoom/pan hook
  const {
    zoom, setZoom,
    pan, setPan,
    isPanning, setIsPanning,
    spacePressed, setSpacePressed,
    lastPanPoint,
    lastPinchDistance,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom: resetZoomFn,
    startPan,
    handlePanMove,
    shouldPan
  } = useCanvasZoom(containerRef, isDrawingRef, { toolRef, disabledRef })
  
  // Shape preview snapshot
  const shapePreviewSnapshot = useRef(null)
  
  // Generate dynamic cursor based on tool and stroke width
  const getCursor = useMemo(() => {
    return generateCursor(tool, strokeWidth, zoom)
  }, [tool, strokeWidth, zoom])
  
  // Clear selection when switching away from select tool
  useEffect(() => {
    if (tool !== TOOLS.SELECT) {
      setSelectedStroke(null)
      setIsDragging(false)
    }
  }, [tool])

  // Keep strokesRef in sync with strokes + preview strokes
  useEffect(() => {
    strokesRef.current = [...strokes, ...Object.values(previewStrokes)]
  }, [strokes, previewStrokes])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    
    const setupCanvas = () => {
      const w = container.offsetWidth
      const h = container.offsetHeight
      
      if (w === 0 || h === 0) return
      
      // Use fixed large canvas size for zoom (wide format)
      canvas.width = CANVAS_WIDTH * 2
      canvas.height = CANVAS_HEIGHT * 2
      canvas.style.width = `${CANVAS_WIDTH}px`
      canvas.style.height = `${CANVAS_HEIGHT}px`

      const context = canvas.getContext('2d')
      context.scale(2, 2)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      contextRef.current = context

      // Use ref to get current strokes (not stale closure)
      redrawWithStrokes(strokesRef.current)
      
      // Center canvas in viewport on initial load
      const centerX = (w - CANVAS_WIDTH) / 2
      const centerY = (h - CANVAS_HEIGHT) / 2
      setPan({ x: centerX, y: centerY })
    }
    
    setupCanvas()
    
    // Initialize cached rect
    containerRectCache.current = container.getBoundingClientRect()
    
    // Update rect on scroll (can change position)
    const handleScroll = () => {
      containerRectCache.current = container.getBoundingClientRect()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Use ResizeObserver for container size changes (sidebar toggle, etc.)
    const resizeObserver = new ResizeObserver(() => {
      // Update cached rect when container resizes
      containerRectCache.current = container.getBoundingClientRect()
    })
    
    resizeObserver.observe(container)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Helper to redraw with specific strokes array (used by resize handler)
  const redrawWithStrokes = (strokesArray) => {
    const context = contextRef.current
    if (!context) return

    const canvas = canvasRef.current
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    strokesArray.forEach(stroke => {
      if (stroke && stroke.tool) {
        drawStroke(stroke, context, imageCache.current)
      }
    })
  }

  // Redraw when strokes or preview strokes change
  // NOTE: Always full redraw for correctness. Optimization can come later with layered canvas.
  useEffect(() => {
    const ctx = contextRef.current
    if (!ctx) return

    // Skip redraw if we're actively transforming/dragging - handleMouseMove handles that
    if (transformMode || isDragging) return

    // Combine final strokes + preview strokes
    const allStrokes = [...strokes, ...Object.values(previewStrokes)]
    redrawWithStrokes(allStrokes)
    
    // Invalidate shape preview snapshot so next draw uses fresh state
    shapePreviewSnapshot.current = null
    
    // Draw selection highlight if there's a selected stroke
    if (selectedStroke && tool === TOOLS.SELECT) {
      const currentStrokeData = strokes.find(s => s.id === selectedStroke.id)
      if (currentStrokeData) {
        drawSelectionHighlight(currentStrokeData, ctx, imageCache.current)
      }
    }
  }, [strokes, previewStrokes, selectedStroke, tool, transformMode, isDragging])

  // Wrapper functions for utils (pass refs and cache)
  const getTransformHandleAtPoint = (x, y, stroke) => {
    return getTransformHandleUtil(x, y, stroke, contextRef.current, imageCache.current)
  }

  const getCoordinates = (e) => {
    const rect = containerRectCache.current || containerRef.current?.getBoundingClientRect()
    return getCanvasCoordinates(e, rect, zoom, pan)
  }
  
  const isWithinCanvas = (x, y) => isWithinCanvasUtil(x, y)
  
  const canvasToScreen = (x, y) => canvasToScreenCoordinates(x, y, zoom, pan)

  // Hit detection wrapper
  const findStrokeAtPoint = (x, y) => {
    return findStrokeUtil(strokes, x, y, contextRef.current, imageCache.current)
  }

  const startDrawing = (e) => {
    // Don't allow drawing when disabled
    if (disabled) return

    // Handle select tool - find and select stroke at point
    if (tool === TOOLS.SELECT) {
      const { x, y } = getCoordinates(e)
      
      // First check if clicking on a transform handle of selected stroke
      if (selectedStroke) {
        const handleType = getTransformHandleAtPoint(x, y, selectedStroke)
        if (handleType) {
          setTransformMode(handleType)
          const bounds = getStrokeBounds(selectedStroke, contextRef.current, imageCache.current)
          const centerX = bounds.x + bounds.width / 2
          const centerY = bounds.y + bounds.height / 2
          // Store original stroke for preview
          originalStrokeRef.current = JSON.parse(JSON.stringify(selectedStroke))
          transformStart.current = {
            x, y,
            bounds: { ...bounds },
            originalStroke: originalStrokeRef.current,
            rotation: selectedStroke.rotation || 0,
            // Store initial angle for rotation calculation
            startAngle: Math.atan2(y - centerY, x - centerX)
          }
          return
        }
      }
      
      // Otherwise, try to select a stroke
      const hitStroke = findStrokeAtPoint(x, y)
      
      if (hitStroke) {
        setSelectedStroke(hitStroke)
        setIsDragging(true)
        // Store offset from click point to startPoint (not bounds)
        dragOffset.current = {
          x: x - hitStroke.startPoint.x,
          y: y - hitStroke.startPoint.y
        }
        // Store original stroke for drag preview
        originalStrokeRef.current = JSON.parse(JSON.stringify(hitStroke))
      } else {
        setSelectedStroke(null)
      }
      return
    }

    // Handle text tool - show input instead of drawing
    if (tool === TOOLS.TEXT) {
      const { x, y } = getCoordinates(e)
      // Only allow text placement within canvas
      if (!isWithinCanvas(x, y)) return
      // Get click position relative to container for input placement
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      const screenX = clientX - rect.left
      const screenY = clientY - rect.top
      setTextInput({ show: true, x, y, screenX, screenY, value: '' })
      return
    }

    // Handle image tool - open file picker
    if (tool === TOOLS.IMAGE) {
      const { x, y } = getCoordinates(e)
      // Only allow image placement within canvas
      if (!isWithinCanvas(x, y)) return
      pendingImagePosition.current = { x, y }
      imageInputRef.current?.click()
      return
    }

    const { x, y } = getCoordinates(e)
    
    // Don't start drawing outside canvas bounds
    if (!isWithinCanvas(x, y)) return
    
    setIsDrawing(true)
    isDrawingRef.current = true
    startPoint.current = { x, y }

    currentStroke.current = {
      id: uuidv4(),
      tool,
      color,
      strokeWidth,
      points: [{ x, y }],
      startPoint: { x, y }
    }
    lastSentPointIndex.current = 0 // Reset for new stroke

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      // Just set style, actual drawing happens in draw()
      const ctx = contextRef.current
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }

  // Use RAF for smoother drawing
  const rafRef = useRef(null)
  const pendingPoint = useRef(null)
  const lastEmitTime = useRef(0)
  const lastSentPointIndex = useRef(0) // Track which points already sent
  const EMIT_THROTTLE = 50 // Emit every 50ms max
  
  // Last point for incremental drawing
  const lastDrawPoint = useRef(null)
  const draw = (e) => {
    if (!isDrawingRef.current) return
    if (!currentStroke.current) return

    const { x, y } = getCoordinates(e)
    pendingPoint.current = { x, y }

    // For pen/eraser, draw ONLY the new segment (not entire path!)
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const ctx = contextRef.current
      const prev = lastDrawPoint.current || currentStroke.current.startPoint
      
      // Draw single line segment - O(1) instead of O(n)!
      ctx.beginPath()
      ctx.strokeStyle = tool === TOOLS.ERASER ? '#ffffff' : color
      ctx.lineWidth = strokeWidth
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      
      lastDrawPoint.current = { x, y }
      currentStroke.current.points.push({ x, y })

      // Throttle socket emit - send NEW points since last emit
      const now = Date.now()
      if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
        // Send only points that haven't been sent yet
        const newPoints = currentStroke.current.points.slice(lastSentPointIndex.current)
        if (newPoints.length > 0) {
          socket.emit('draw:stroke', { 
            stroke: {
              id: currentStroke.current.id,
              tool: currentStroke.current.tool,
              color: currentStroke.current.color,
              strokeWidth: currentStroke.current.strokeWidth,
              startPoint: currentStroke.current.startPoint,
              points: currentStroke.current.points, // Send FULL points for other users to render
            },
            isPreview: true // Mark as preview so other clients render incrementally
          })
          lastSentPointIndex.current = currentStroke.current.points.length
        }
        lastEmitTime.current = now
      }
    } else {
      // For shapes, use RAF to batch updates
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          if (!pendingPoint.current || !isDrawingRef.current || !currentStroke.current) return
          
          const point = pendingPoint.current
          drawShapePreview(point)
          
          // Emit shape preview to other users (throttled)
          const now = Date.now()
          if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
            currentStroke.current.endPoint = { x: point.x, y: point.y }
            socket.emit('draw:stroke', { stroke: currentStroke.current, isPreview: true })
            lastEmitTime.current = now
          }
        })
      }
    }
  }
  
  // Extracted shape preview - simple redraw approach for correctness
  const drawShapePreview = (point) => {
    const { x, y } = point
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) return
    if (!startPoint.current) return
    
    const ctx = contextRef.current
    const canvas = canvasRef.current
    
    // On first preview of this shape, save snapshot
    if (!shapePreviewSnapshot.current) {
      shapePreviewSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } else {
      // Restore from snapshot
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
      const width = x - sx
      const height = y - sy
      ctx.strokeRect(sx, sy, width, height)
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

  const stopDrawing = (e) => {
    if (!isDrawing && !isDrawingRef.current) return
    setIsDrawing(false)
    isDrawingRef.current = false

    if (currentStroke.current) {
      if ([TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.ARROW, TOOLS.DIAMOND].includes(tool)) {
        // Use pendingPoint if available (from last RAF), otherwise get from event
        // This ensures endPoint matches the preview position
        const point = pendingPoint.current || getCoordinates(e)
        currentStroke.current.endPoint = { x: point.x, y: point.y }
      }

      // Notify parent to add stroke (parent manages state)
      if (onStrokeAdd) {
        onStrokeAdd(currentStroke.current)
      }

      // Emit final stroke to server (optimized)
      if (socket) {
        const optimized = optimizeStrokeForTransmit(currentStroke.current, {
          simplifyEpsilon: 1.0, // Less aggressive for final stroke
          useDelta: true
        })
        socket.emit('draw:stroke', { stroke: optimized, isPreview: false })
        socket.emit('draw:complete', { strokeId: currentStroke.current.id })
      }
    }

    currentStroke.current = null
    startPoint.current = null
    pendingPoint.current = null // Clear pending point
    pendingDrawEvent.current = null // Clear pending draw event
    lastDrawPoint.current = null // Reset for next stroke
    shapePreviewSnapshot.current = null // Reset shape preview snapshot
    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (drawRafId.current) {
      cancelAnimationFrame(drawRafId.current)
      drawRafId.current = null
    }
  }

  const handleClear = () => {
    if (onClear) {
      onClear() // Let parent handle confirmation
    } else if (socket) {
      socket.emit('draw:clear')
    }
  }

  const handleUndo = () => {
    if (socket) {
      socket.emit('draw:undo')
    }
  }

  const handleRedo = () => {
    if (socket) {
      socket.emit('draw:redo')
    }
  }

  // Export format state
  const [showExportMenu, setShowExportMenu] = useState(false)
  
  // Use export hook
  const { handleExport: exportCanvas } = useCanvasExport(canvasRef, strokes, imageCache.current)
  
  // Wrapper to also close menu
  const handleExport = (format = 'png') => {
    exportCanvas(format)
    setShowExportMenu(false)
  }
  
  // Use keyboard shortcuts hook
  useCanvasKeyboard({
    tool,
    setTool,
    setSpacePressed,
    setIsPanning,
    setSelectedStroke,
    setShowShortcuts,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onExport: handleExport,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: handleResetZoom,
    disabled
  })

  // Handle mouse leaving canvas
  const handleMouseLeave = () => {
    if (isDrawing) {
      stopDrawing({ clientX: 0, clientY: 0 })
    }
    setIsPanning(false)
  }

  // Throttle refs for cursor
  const lastCursorEmit = useRef(0)
  // Throttle ref for transform/drag preview emit
  const lastTransformEmit = useRef(0)
  
  // RAF for transform/drag to prevent jitter
  const transformRafId = useRef(null)
  const pendingTransformStroke = useRef(null)
  
  // RAF-based draw scheduling - sync with browser paint cycle
  const drawRafId = useRef(null)
  const pendingDrawEvent = useRef(null)
  
  // Handle cursor move without drawing
  const handleMouseMove = (e) => {
    // FAST PATH: If drawing, schedule for next RAF (sync with display refresh)
    if (isDrawing) {
      // Store latest event (newer events override older ones)
      pendingDrawEvent.current = e
      
      // Only schedule ONE RAF per frame
      if (!drawRafId.current) {
        drawRafId.current = requestAnimationFrame(() => {
          drawRafId.current = null
          if (pendingDrawEvent.current && isDrawingRef.current) {
            draw(pendingDrawEvent.current)
            
            // Emit cursor position to others (throttled to ~30fps)
            const now = Date.now()
            if (socket && now - lastCursorEmit.current > 33) {
              const { x, y } = getCoordinates(pendingDrawEvent.current)
              socket.emit('cursor:move', { x, y, tool })
              lastCursorEmit.current = now
            }
          }
        })
      }
      return
    }
    
    // Handle panning (space+drag, middle mouse, or hand tool)
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x
      const dy = e.clientY - lastPanPoint.current.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      return
    }
    
    // Throttle cursor emit to 30fps (not every pixel!)
    const now = Date.now()
    if (socket && !isPanning && now - lastCursorEmit.current > 33) {
      const { x, y } = getCoordinates(e)
      socket.emit('cursor:move', { x, y, tool })
      lastCursorEmit.current = now
    }
    
    // Handle transform mode (resize/rotate)
    if (transformMode && selectedStroke && transformStart.current) {
      const { x, y } = getCoordinates(e)
      const { bounds, originalStroke } = transformStart.current
      let updatedStroke = { ...originalStroke } // Always base on original, not current selectedStroke
      
      if (transformMode === 'rotate') {
        // Calculate rotation angle from center using initial angle as reference
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        const currentAngle = Math.atan2(y - centerY, x - centerX)
        const deltaAngle = (currentAngle - transformStart.current.startAngle) * 180 / Math.PI
        // Normalize rotation to 0-360
        let newRotation = (originalStroke.rotation || 0) + deltaAngle
        while (newRotation < 0) newRotation += 360
        while (newRotation >= 360) newRotation -= 360
        updatedStroke.rotation = newRotation
      } else {
        // Handle resize
        const dx = x - transformStart.current.x
        const dy = y - transformStart.current.y
        
        let newX = bounds.x
        let newY = bounds.y
        let newWidth = bounds.width
        let newHeight = bounds.height
        
        // Calculate new dimensions based on handle
        if (transformMode.includes('w')) { // West (left)
          newX = bounds.x + dx
          newWidth = bounds.width - dx
        }
        if (transformMode.includes('e')) { // East (right)
          newWidth = bounds.width + dx
        }
        if (transformMode.includes('n')) { // North (top)
          newY = bounds.y + dy
          newHeight = bounds.height - dy
        }
        if (transformMode.includes('s')) { // South (bottom)
          newHeight = bounds.height + dy
        }
        
        // Ensure minimum size
        if (newWidth < 10) newWidth = 10
        if (newHeight < 10) newHeight = 10
        
        // Update stroke based on type
        if (updatedStroke.tool === TOOLS.IMAGE) {
          updatedStroke.startPoint = { x: newX, y: newY }
          updatedStroke.width = newWidth
          updatedStroke.height = newHeight
        } else if (updatedStroke.tool === TOOLS.TEXT) {
          // For text, scale fontSize proportionally and update position
          const scaleY = newHeight / bounds.height
          updatedStroke.fontSize = Math.max(8, Math.round((originalStroke.fontSize || 16) * scaleY))
          updatedStroke.startPoint = { x: newX, y: newY + newHeight }
        } else if (updatedStroke.startPoint && updatedStroke.endPoint) {
          // For shapes, update start and end points
          updatedStroke.startPoint = { x: newX, y: newY }
          updatedStroke.endPoint = { x: newX + newWidth, y: newY + newHeight }
        }
      }
      
      // Update ref immediately for mouseUp to use
      pendingTransformStroke.current = updatedStroke
      
      // Redraw immediately - no RAF needed, browser will batch
      const updatedStrokes = strokesRef.current.map(s => 
        s.id === originalStroke.id ? updatedStroke : s
      )
      redrawWithStrokes(updatedStrokes)
      drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
      
      // Emit preview to others (throttled to ~15fps for transform)
      const now = Date.now()
      if (socket && now - lastTransformEmit.current > 66) {
        socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
        lastTransformEmit.current = now
      }
      return
    }
    
    // Handle dragging selected element
    if (isDragging && selectedStroke && originalStrokeRef.current) {
      const { x, y } = getCoordinates(e)
      const originalStroke = originalStrokeRef.current
      
      // Calculate new startPoint position
      const newStartX = x - dragOffset.current.x
      const newStartY = y - dragOffset.current.y
      
      // Update stroke position - always base on original
      let updatedStroke = { ...originalStroke }
      
      if (originalStroke.startPoint && originalStroke.endPoint) {
        // For shapes with startPoint and endPoint, move both points
        const dx = newStartX - originalStroke.startPoint.x
        const dy = newStartY - originalStroke.startPoint.y
        updatedStroke.startPoint = { x: newStartX, y: newStartY }
        updatedStroke.endPoint = {
          x: originalStroke.endPoint.x + dx,
          y: originalStroke.endPoint.y + dy
        }
      } else {
        // For text, images, and other single-point strokes
        updatedStroke.startPoint = { x: newStartX, y: newStartY }
      }
      
      // Update ref immediately for mouseUp to use
      pendingTransformStroke.current = updatedStroke
      
      // Redraw immediately - no RAF needed
      const updatedStrokes = strokesRef.current.map(s => 
        s.id === originalStroke.id ? updatedStroke : s
      )
      redrawWithStrokes(updatedStrokes)
      drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
      
      // Emit preview to others (throttled to ~15fps)
      const now = Date.now()
      if (socket && now - lastTransformEmit.current > 66) {
        socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
        lastTransformEmit.current = now
      }
      return
    }
  }
  
  // Touch handlers for React (single touch drawing only)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      startDrawing(e)
    }
  }
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && !isPanning) {
      // Use same RAF pattern as mouse for consistency
      pendingDrawEvent.current = e
      if (!drawRafId.current) {
        drawRafId.current = requestAnimationFrame(() => {
          drawRafId.current = null
          if (pendingDrawEvent.current && isDrawingRef.current) {
            draw(pendingDrawEvent.current)
          }
        })
      }
    }
  }
  
  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      lastPinchDistance.current = null
      setIsPanning(false)
      stopDrawing(e)
    }
  }
  
  // Wrap reset zoom with proper canvas dimensions
  const handleResetZoom = () => {
    resetZoomFn(containerRef, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  // Text input handlers
  const handleTextSubmit = () => {
    if (!textInput.value.trim()) {
      setTextInput({ show: false, x: 0, y: 0, value: '' })
      return
    }

    const textStroke = {
      id: uuidv4(),
      tool: TOOLS.TEXT,
      color,
      fontSize,
      text: textInput.value,
      startPoint: { x: textInput.x, y: textInput.y }
    }

    // Add to local state
    if (onStrokeAdd) {
      onStrokeAdd(textStroke)
    }

    // Emit to server
    if (socket) {
      socket.emit('draw:stroke', { stroke: textStroke })
      socket.emit('draw:complete', { strokeId: textStroke.id })
    }

    setTextInput({ show: false, x: 0, y: 0, value: '' })
  }

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    } else if (e.key === 'Escape') {
      setTextInput({ show: false, x: 0, y: 0, value: '' })
    }
  }

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Limit file size (max 2MB for base64 efficiency)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('Image too large. Please select an image under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target.result
      const img = new Image()
      
      img.onload = () => {
        // Scale down if too large
        let width = img.width
        let height = img.height
        const maxDimension = 500
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        const position = pendingImagePosition.current || { x: 100, y: 100 }
        
        const imageStroke = {
          id: uuidv4(),
          tool: TOOLS.IMAGE,
          imageData,
          width,
          height,
          startPoint: position
        }

        // Add to local state
        if (onStrokeAdd) {
          onStrokeAdd(imageStroke)
        }

        // Emit to server
        if (socket) {
          socket.emit('draw:stroke', { stroke: imageStroke })
          socket.emit('draw:complete', { strokeId: imageStroke.id })
        }

        // Redraw to show image
        redrawWithStrokes([...strokesRef.current, imageStroke])
        
        pendingImagePosition.current = null
      }
      
      img.src = imageData
    }
    
    reader.readAsDataURL(file)
    
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Focus text input when shown
  useEffect(() => {
    if (textInput.show && textInputRef.current) {
      // Use setTimeout to ensure DOM is ready and prevent immediate blur
      const timer = setTimeout(() => {
        textInputRef.current?.focus()
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [textInput.show])

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Toolbar */}
      <CanvasToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        fontSize={fontSize}
        setFontSize={setFontSize}
        zoom={zoom}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={handleExport}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        setSelectedStroke={setSelectedStroke}
      />

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-slate-50 ${
          isPanning ? 'cursor-grabbing' : 
          (spacePressed || tool === TOOLS.HAND) ? 'cursor-grab' : ''
        }`}
        onMouseDown={(e) => {
          if (e.button === 1 || shouldPan()) {
            // Middle mouse button or space/hand tool for panning
            e.preventDefault()
            startPan(e)
          } else {
            startDrawing(e)
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={(e) => {
          // Cancel any pending transform RAF
          if (transformRafId.current) {
            cancelAnimationFrame(transformRafId.current)
            transformRafId.current = null
          }
          
          if (isPanning) {
            setIsPanning(false)
          } else if (transformMode && selectedStroke) {
            // Finish transform - use pendingTransformStroke (the actual transformed version)
            const finalStroke = pendingTransformStroke.current || selectedStroke
            setTransformMode(null)
            transformStart.current = null
            originalStrokeRef.current = null
            pendingTransformStroke.current = null
            
            // Update selectedStroke state with final position
            setSelectedStroke(finalStroke)
            
            // Update the stroke in parent state
            if (onStrokeUpdate) {
              onStrokeUpdate(finalStroke)
            }
            
            // Emit final update to server (without isPreview)
            if (socket) {
              socket.emit('draw:update', { stroke: finalStroke })
            }
          } else if (isDragging && selectedStroke) {
            // Finish dragging - use pendingTransformStroke (the actual dragged version)
            const finalStroke = pendingTransformStroke.current || selectedStroke
            setIsDragging(false)
            originalStrokeRef.current = null
            pendingTransformStroke.current = null
            
            // Update selectedStroke state with final position
            setSelectedStroke(finalStroke)
            
            // Update the stroke in parent state
            if (onStrokeUpdate) {
              onStrokeUpdate(finalStroke)
            }
            
            // Emit final update to server (without isPreview)
            if (socket) {
              socket.emit('draw:update', { stroke: finalStroke })
            }
          } else {
            stopDrawing(e)
          }
        }}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Checkerboard background to show canvas bounds */}
        <div 
          className={`absolute bg-white shadow-lg ${
            isPanning ? 'cursor-grabbing' : 
            (spacePressed || tool === TOOLS.HAND) ? 'cursor-grab' : ''
          }`}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              cursor: isPanning ? 'grabbing' :
                (tool === TOOLS.HAND || spacePressed) ? 'grab' :
                tool === TOOLS.SELECT ? (isDragging ? 'grabbing' : 'default') :
                (tool === TOOLS.PEN || tool === TOOLS.ERASER) ? getCursor : 'crosshair'
            }}
          />
        </div>

        {/* Other users' cursors */}
        <CursorOverlay
          cursors={cursors}
          canvasToScreen={canvasToScreen}
          showCursorNames={showCursorNames}
        />

        {/* Text Input Overlay */}
        {textInput.show && (
          <div
            className="absolute z-50"
            style={{
              left: textInput.screenX,
              top: textInput.screenY,
              transform: 'translate(-4px, -50%)'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={handleTextKeyDown}
              onBlur={(e) => {
                // Delay blur to allow click events to process first
                setTimeout(() => handleTextSubmit(), 100)
              }}
              placeholder="Type text..."
              className="px-2 py-1 border-2 border-sky-500 rounded outline-none min-w-[150px] bg-white shadow-lg"
              style={{ 
                fontSize: `${fontSize}px`,
                color: color
              }}
            />
          </div>
        )}

        {/* Hidden Image Input */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Hints */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-slate-300 pointer-events-none select-none shadow-lg">
          <div>Scroll to zoom • Space+drag to pan • Pinch on mobile</div>
          <div className="mt-1 text-slate-400">Press ? for keyboard shortcuts</div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </div>
    </div>
  )
}

export { TOOLS, COLORS }
