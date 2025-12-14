import { useRef, useCallback } from 'react'
import { TOOLS } from '../constants'
import { drawSelectionHighlight } from '../strokeRenderer'

/**
 * Hook to handle transform (resize/rotate) and drag operations
 */
export function useCanvasTransformHandler({
  contextRef, strokesRef, imageCache,
  selectedStroke, transformMode, transformStart, originalStrokeRef,
  isDragging, dragOffset,
  redrawWithStrokes,
  socket
}) {
  const lastTransformEmit = useRef(0)
  const pendingTransformStroke = useRef(null)

  const handleTransformMove = useCallback((x, y) => {
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
    
    const updatedStrokes = strokesRef.current.map(s => 
      s.id === originalStroke.id ? updatedStroke : s
    )
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
    
    const now = Date.now()
    if (socket && now - lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      lastTransformEmit.current = now
    }
    
    return updatedStroke
  }, [transformMode, redrawWithStrokes, socket])

  const handleDragMove = useCallback((x, y) => {
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
    
    const updatedStrokes = strokesRef.current.map(s => 
      s.id === originalStroke.id ? updatedStroke : s
    )
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, contextRef.current, imageCache.current)
    
    const now = Date.now()
    if (socket && now - lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      lastTransformEmit.current = now
    }
    
    return updatedStroke
  }, [redrawWithStrokes, socket])

  const getPendingStroke = useCallback(() => pendingTransformStroke.current, [])
  
  const clearPending = useCallback(() => {
    pendingTransformStroke.current = null
  }, [])

  return {
    handleTransformMove,
    handleDragMove,
    getPendingStroke,
    clearPending
  }
}
