import { useState, useCallback, useRef, useEffect } from 'react'
import { TOOLS, HANDLE_SIZE } from '../constants'
import { getCoordinates } from '../utils/coordinates'
import { getTransformHandleAtPoint, findStrokeAtPoint } from '../utils/hitDetection'
import { getCursorStyle, getHandleCursor } from '../utils/cursor'

/**
 * Main hook to orchestrate all mouse/touch events for canvas
 */
export function useCanvasEventHandlers({
  canvasRef, containerRef, contextRef, strokesRef, containerRectCache, imageCache,
  scale, offset, currentTool, currentColor, strokeWidth, eraserWidth,
  selectedStroke, setSelectedStroke,
  isDrawing, setIsDrawing,
  socket, roomId,
  redrawWithStrokes,
  onStartDrawing, onDraw, onStopDrawing,
  onTransformMove, onDragMove, clearTransformPending, getPendingStroke,
  onTextStart, cancelTextInput,
  onImageUpload
}) {
  const [transformMode, setTransformMode] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [cursorStyle, setCursorStyle] = useState('crosshair')
  
  const transformStart = useRef(null)
  const originalStrokeRef = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return // Left click only
    
    const { x, y } = getCoordinates(e, containerRectCache, scale, offset)
    
    // Check for transform handle if selecting
    if (currentTool === TOOLS.SELECT && selectedStroke) {
      const handle = getTransformHandleAtPoint(x, y, selectedStroke, contextRef.current, imageCache.current, scale)
      if (handle) {
        setTransformMode(handle)
        const bounds = getStrokeBounds(selectedStroke, contextRef.current, imageCache.current)
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        transformStart.current = {
          x, y, bounds,
          startAngle: Math.atan2(y - centerY, x - centerX),
          originalStroke: { ...selectedStroke }
        }
        originalStrokeRef.current = { ...selectedStroke }
        return
      }
    }
    
    // Check for stroke selection/drag
    if (currentTool === TOOLS.SELECT) {
      const clickedStroke = findStrokeAtPoint(x, y, strokesRef.current, contextRef.current, imageCache.current)
      if (clickedStroke) {
        if (selectedStroke?.id === clickedStroke.id) {
          // Start dragging
          setIsDragging(true)
          originalStrokeRef.current = { ...clickedStroke }
          dragOffset.current = {
            x: x - clickedStroke.startPoint.x,
            y: y - clickedStroke.startPoint.y
          }
        } else {
          setSelectedStroke(clickedStroke)
        }
        return
      } else {
        setSelectedStroke(null)
      }
    }
    
    // Text tool
    if (currentTool === TOOLS.TEXT) {
      onTextStart?.(x, y)
      return
    }
    
    // Image tool
    if (currentTool === TOOLS.IMAGE) {
      onImageUpload?.(x, y)
      return
    }
    
    // Start drawing
    if (currentTool !== TOOLS.SELECT) {
      setIsDrawing(true)
      onStartDrawing?.(x, y)
    }
  }, [currentTool, selectedStroke, scale, offset, onStartDrawing, onTextStart, onImageUpload])

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    const { x, y } = getCoordinates(e, containerRectCache, scale, offset)
    
    // Transform mode
    if (transformMode && selectedStroke) {
      onTransformMove?.(x, y)
      return
    }
    
    // Dragging mode
    if (isDragging && selectedStroke) {
      onDragMove?.(x, y)
      return
    }
    
    // Drawing mode
    if (isDrawing) {
      onDraw?.(x, y)
      return
    }
    
    // Update cursor
    updateCursor(x, y)
  }, [transformMode, isDragging, isDrawing, selectedStroke, scale, offset, onTransformMove, onDragMove, onDraw])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    // Finish transform
    if (transformMode && selectedStroke) {
      const pendingStroke = getPendingStroke?.()
      if (pendingStroke && socket && roomId) {
        socket.emit('draw:update', { stroke: pendingStroke, isPreview: false })
        // Update local strokes
        strokesRef.current = strokesRef.current.map(s => 
          s.id === pendingStroke.id ? pendingStroke : s
        )
        setSelectedStroke(pendingStroke)
      }
      setTransformMode(null)
      transformStart.current = null
      clearTransformPending?.()
      return
    }
    
    // Finish drag
    if (isDragging && selectedStroke) {
      const pendingStroke = getPendingStroke?.()
      if (pendingStroke && socket && roomId) {
        socket.emit('draw:update', { stroke: pendingStroke, isPreview: false })
        strokesRef.current = strokesRef.current.map(s => 
          s.id === pendingStroke.id ? pendingStroke : s
        )
        setSelectedStroke(pendingStroke)
      }
      setIsDragging(false)
      originalStrokeRef.current = null
      clearTransformPending?.()
      return
    }
    
    // Finish drawing
    if (isDrawing) {
      setIsDrawing(false)
      onStopDrawing?.()
    }
  }, [transformMode, isDragging, isDrawing, selectedStroke, socket, roomId, onStopDrawing, getPendingStroke, clearTransformPending])

  // Update cursor based on position
  const updateCursor = useCallback((x, y) => {
    if (currentTool === TOOLS.SELECT && selectedStroke) {
      const handle = getTransformHandleAtPoint(x, y, selectedStroke, contextRef.current, imageCache.current, scale)
      if (handle) {
        setCursorStyle(getHandleCursor(handle))
        return
      }
      
      const hitStroke = findStrokeAtPoint(x, y, strokesRef.current, contextRef.current, imageCache.current)
      if (hitStroke) {
        setCursorStyle('move')
        return
      }
    }
    
    setCursorStyle(getCursorStyle(currentTool, eraserWidth, scale))
  }, [currentTool, selectedStroke, eraserWidth, scale])

  // Mouse leave - finish any operation
  const handleMouseLeave = useCallback(() => {
    if (isDrawing || transformMode || isDragging) {
      handleMouseUp()
    }
  }, [isDrawing, transformMode, isDragging, handleMouseUp])

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = { 
      clientX: touch.clientX, 
      clientY: touch.clientY, 
      button: 0,
      preventDefault: () => {}
    }
    handleMouseDown(mouseEvent)
  }, [handleMouseDown])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const mouseEvent = { 
      clientX: touch.clientX, 
      clientY: touch.clientY 
    }
    handleMouseMove(mouseEvent)
  }, [handleMouseMove])

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault()
    handleMouseUp()
  }, [handleMouseUp])

  // Return refs for transform handler
  return {
    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // State
    transformMode,
    isDragging,
    cursorStyle,
    // Refs for transform handler
    transformStart,
    originalStrokeRef,
    dragOffset
  }
}

// Helper to get stroke bounds
function getStrokeBounds(stroke, ctx, imageCache) {
  if (stroke.tool === TOOLS.IMAGE) {
    return {
      x: stroke.startPoint.x,
      y: stroke.startPoint.y,
      width: stroke.width || 100,
      height: stroke.height || 100
    }
  }
  
  if (stroke.tool === TOOLS.TEXT) {
    ctx.font = `${stroke.fontStyle || 'normal'} ${stroke.fontSize || 16}px ${stroke.fontFamily || 'Arial'}`
    const metrics = ctx.measureText(stroke.text || '')
    return {
      x: stroke.startPoint.x,
      y: stroke.startPoint.y - (stroke.fontSize || 16),
      width: metrics.width || 100,
      height: stroke.fontSize || 16
    }
  }
  
  if (stroke.startPoint && stroke.endPoint) {
    const x = Math.min(stroke.startPoint.x, stroke.endPoint.x)
    const y = Math.min(stroke.startPoint.y, stroke.endPoint.y)
    return {
      x,
      y,
      width: Math.abs(stroke.endPoint.x - stroke.startPoint.x),
      height: Math.abs(stroke.endPoint.y - stroke.startPoint.y)
    }
  }
  
  return { x: 0, y: 0, width: 100, height: 100 }
}
