import { useRef, useCallback } from 'react'
import { TOOLS } from '../constants'
import { getStrokeBounds, drawSelectionHighlight } from '../strokeRenderer'

/**
 * Hook to manage canvas transform operations (resize, rotate, drag)
 */
export function useCanvasTransform({
  contextRef,
  strokes,
  strokesRef,
  selectedStroke,
  setSelectedStroke,
  socket,
  onStrokeUpdate,
  imageCache,
  redrawWithStrokes
}) {
  // Transform state
  const transformStart = useRef(null)
  const originalStrokeRef = useRef(null)
  const pendingTransformStroke = useRef(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Throttling
  const lastTransformEmit = useRef(0)

  /**
   * Check if point is on a transform handle
   */
  const getTransformHandleAtPoint = useCallback((x, y, stroke) => {
    if (!stroke) return null
    
    const bounds = getStrokeBounds(stroke, contextRef.current, imageCache.current)
    if (!bounds) return null
    
    const padding = 4
    const handleSize = 12
    const rotation = stroke.rotation || 0
    
    // Transform point if rotation is applied
    let tx = x, ty = y
    if (rotation !== 0) {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      const rad = -rotation * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      tx = cos * (x - centerX) - sin * (y - centerY) + centerX
      ty = sin * (x - centerX) + cos * (y - centerY) + centerY
    }
    
    // Check rotation handle first
    const rotateHandleY = bounds.y - padding - 25
    const rotateHandleX = bounds.x + bounds.width / 2
    if (Math.hypot(tx - rotateHandleX, ty - rotateHandleY) <= 12) {
      return 'rotate'
    }
    
    // Check corner handles
    const handles = [
      { x: bounds.x - padding, y: bounds.y - padding, type: 'resize-nw' },
      { x: bounds.x + bounds.width + padding, y: bounds.y - padding, type: 'resize-ne' },
      { x: bounds.x - padding, y: bounds.y + bounds.height + padding, type: 'resize-sw' },
      { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, type: 'resize-se' }
    ]
    
    for (const handle of handles) {
      if (Math.abs(tx - handle.x) <= handleSize && Math.abs(ty - handle.y) <= handleSize) {
        return handle.type
      }
    }
    
    return null
  }, [])

  /**
   * Find stroke at point (for selection)
   */
  const findStrokeAtPoint = useCallback((x, y) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i]
      if (!stroke) continue
      
      const bounds = getStrokeBounds(stroke, contextRef.current, imageCache.current)
      if (bounds) {
        const rotation = stroke.rotation || 0
        let tx = x, ty = y
        
        if (rotation !== 0) {
          const centerX = bounds.x + bounds.width / 2
          const centerY = bounds.y + bounds.height / 2
          const rad = -rotation * Math.PI / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          tx = cos * (x - centerX) - sin * (y - centerY) + centerX
          ty = sin * (x - centerX) + cos * (y - centerY) + centerY
        }
        
        if (tx >= bounds.x && tx <= bounds.x + bounds.width &&
            ty >= bounds.y && ty <= bounds.y + bounds.height) {
          return stroke
        }
      }
    }
    return null
  }, [strokes])

  /**
   * Start transform operation
   */
  const startTransform = useCallback((x, y, handleType) => {
    if (!selectedStroke) return false
    
    const bounds = getStrokeBounds(selectedStroke, contextRef.current, imageCache.current)
    if (!bounds) return false
    
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    
    originalStrokeRef.current = JSON.parse(JSON.stringify(selectedStroke))
    transformStart.current = {
      x, y,
      bounds: { ...bounds },
      originalStroke: originalStrokeRef.current,
      rotation: selectedStroke.rotation || 0,
      startAngle: Math.atan2(y - centerY, x - centerX)
    }
    
    return true
  }, [selectedStroke])

  /**
   * Start drag operation
   */
  const startDrag = useCallback((x, y, stroke) => {
    dragOffset.current = {
      x: x - stroke.startPoint.x,
      y: y - stroke.startPoint.y
    }
    originalStrokeRef.current = JSON.parse(JSON.stringify(stroke))
    return true
  }, [])

  /**
   * Handle transform (resize/rotate) during mouse move
   */
  const handleTransform = useCallback((x, y, transformMode) => {
    if (!transformStart.current || !originalStrokeRef.current) return null
    
    const { bounds, originalStroke } = transformStart.current
    let updatedStroke = { ...originalStroke }
    
    if (transformMode === 'rotate') {
      const centerX = bounds.x + bounds.width / 2
      const centerY = bounds.y + bounds.height / 2
      const currentAngle = Math.atan2(y - centerY, x - centerX)
      const deltaAngle = (currentAngle - transformStart.current.startAngle) * 180 / Math.PI
      let newRotation = (originalStroke.rotation || 0) + deltaAngle
      while (newRotation < 0) newRotation += 360
      while (newRotation >= 360) newRotation -= 360
      updatedStroke.rotation = newRotation
    } else {
      // Resize
      const dx = x - transformStart.current.x
      const dy = y - transformStart.current.y
      
      let newX = bounds.x
      let newY = bounds.y
      let newWidth = bounds.width
      let newHeight = bounds.height
      
      if (transformMode.includes('w')) {
        newX = bounds.x + dx
        newWidth = bounds.width - dx
      }
      if (transformMode.includes('e')) {
        newWidth = bounds.width + dx
      }
      if (transformMode.includes('n')) {
        newY = bounds.y + dy
        newHeight = bounds.height - dy
      }
      if (transformMode.includes('s')) {
        newHeight = bounds.height + dy
      }
      
      if (newWidth < 10) newWidth = 10
      if (newHeight < 10) newHeight = 10
      
      if (updatedStroke.tool === TOOLS.IMAGE) {
        updatedStroke.startPoint = { x: newX, y: newY }
        updatedStroke.width = newWidth
        updatedStroke.height = newHeight
      } else if (updatedStroke.tool === TOOLS.TEXT) {
        const scaleY = newHeight / bounds.height
        updatedStroke.fontSize = Math.max(8, Math.round((originalStroke.fontSize || 16) * scaleY))
        updatedStroke.startPoint = { x: newX, y: newY + newHeight }
      } else if (updatedStroke.startPoint && updatedStroke.endPoint) {
        updatedStroke.startPoint = { x: newX, y: newY }
        updatedStroke.endPoint = { x: newX + newWidth, y: newY + newHeight }
      }
    }
    
    pendingTransformStroke.current = updatedStroke
    
    // Redraw with updated stroke
    const updatedStrokes = strokesRef.current.map(s => 
      s.id === originalStroke.id ? updatedStroke : s
    )
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
    
    // Emit preview (throttled)
    const now = Date.now()
    if (socket && now - lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      lastTransformEmit.current = now
    }
    
    return updatedStroke
  }, [socket, redrawWithStrokes])

  /**
   * Handle drag during mouse move
   */
  const handleDrag = useCallback((x, y) => {
    if (!originalStrokeRef.current) return null
    
    const originalStroke = originalStrokeRef.current
    const newStartX = x - dragOffset.current.x
    const newStartY = y - dragOffset.current.y
    
    let updatedStroke = { ...originalStroke }
    
    if (originalStroke.startPoint && originalStroke.endPoint) {
      const dx = newStartX - originalStroke.startPoint.x
      const dy = newStartY - originalStroke.startPoint.y
      updatedStroke.startPoint = { x: newStartX, y: newStartY }
      updatedStroke.endPoint = {
        x: originalStroke.endPoint.x + dx,
        y: originalStroke.endPoint.y + dy
      }
    } else {
      updatedStroke.startPoint = { x: newStartX, y: newStartY }
    }
    
    pendingTransformStroke.current = updatedStroke
    
    // Redraw
    const updatedStrokes = strokesRef.current.map(s => 
      s.id === originalStroke.id ? updatedStroke : s
    )
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
    
    // Emit preview (throttled)
    const now = Date.now()
    if (socket && now - lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      lastTransformEmit.current = now
    }
    
    return updatedStroke
  }, [socket, redrawWithStrokes])

  /**
   * End transform/drag operation
   */
  const endTransform = useCallback(() => {
    const finalStroke = pendingTransformStroke.current
    
    // Cleanup
    transformStart.current = null
    originalStrokeRef.current = null
    pendingTransformStroke.current = null
    
    if (finalStroke) {
      setSelectedStroke(finalStroke)
      
      if (onStrokeUpdate) {
        onStrokeUpdate(finalStroke)
      }
      
      if (socket) {
        socket.emit('draw:update', { stroke: finalStroke })
      }
    }
    
    return finalStroke
  }, [socket, onStrokeUpdate, setSelectedStroke])

  return {
    // Refs
    transformStart,
    originalStrokeRef,
    pendingTransformStroke,
    dragOffset,
    
    // Methods
    getTransformHandleAtPoint,
    findStrokeAtPoint,
    startTransform,
    startDrag,
    handleTransform,
    handleDrag,
    endTransform
  }
}
