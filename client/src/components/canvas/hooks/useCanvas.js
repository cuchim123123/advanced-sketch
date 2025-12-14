/**
 * Main Canvas Hook - Contains ALL canvas logic
 * 
 * Canvas.jsx only uses this hook and renders JSX
 */
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  TOOLS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from '../constants'
import {
  drawStroke,
  getStrokeBounds,
  drawSelectionHighlight
} from '../strokeRenderer'
import { generateCursor } from '../utils/cursor'
import { getCanvasCoordinates, canvasToScreenCoordinates, isWithinCanvas as isWithinCanvasUtil } from '../utils/coordinates'
import { findStrokeAtPoint as findStrokeUtil, getTransformHandleAtPoint as getTransformHandleUtil } from '../utils/hitDetection'
import { optimizeStrokeForTransmit } from '@/utils/strokeOptimization'
import { useCanvasState } from './useCanvasState'
import { useCanvasZoom } from './useCanvasZoom'
import { useCanvasKeyboard } from './useCanvasKeyboard'
import { useCanvasExport } from '@/hooks/useCanvasExport'

export function useCanvas({
  socket,
  strokes = [],
  previewStrokes = {},
  onStrokeAdd,
  onStrokeUpdate,
  onClear,
  disabled = false
}) {
  // ========== STATE HOOK ==========
  const state = useCanvasState()
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
  } = state

  // ========== REFS ==========
  const refs = {
    canvas: useRef(null),
    container: useRef(null),
    context: useRef(null),
    strokes: useRef(strokes),
    currentStroke: useRef(null),
    startPoint: useRef(null),
    textInput: useRef(null),
    imageInput: useRef(null),
    pendingImagePosition: useRef(null),
    imageCache: useRef(new Map()),
    containerRect: useRef(null),
    shapePreviewSnapshot: useRef(null),
    tool: useRef(tool),
    disabled: useRef(disabled),
    raf: useRef(null),
    drawRaf: useRef(null),
    transformRaf: useRef(null),
    pendingPoint: useRef(null),
    pendingDrawEvent: useRef(null),
    pendingTransformStroke: useRef(null),
    lastDrawPoint: useRef(null),
    lastEmitTime: useRef(0),
    lastSentPointIndex: useRef(0),
    lastCursorEmit: useRef(0),
    lastTransformEmit: useRef(0)
  }

  // Keep refs in sync
  useEffect(() => { refs.tool.current = tool }, [tool])
  useEffect(() => { refs.disabled.current = disabled }, [disabled])
  useEffect(() => { refs.strokes.current = [...strokes, ...Object.values(previewStrokes)] }, [strokes, previewStrokes])

  // ========== ZOOM HOOK ==========
  const zoom = useCanvasZoom(refs.container, isDrawingRef, { 
    toolRef: refs.tool, 
    disabledRef: refs.disabled 
  })

  // ========== COMPUTED ==========
  const cursor = useMemo(() => generateCursor(tool, strokeWidth, zoom.zoom), [tool, strokeWidth, zoom.zoom])

  // ========== HELPERS ==========
  const getCoordinates = useCallback((e) => {
    const rect = refs.containerRect.current || refs.container.current?.getBoundingClientRect()
    return getCanvasCoordinates(e, rect, zoom.zoom, zoom.pan)
  }, [zoom.zoom, zoom.pan])
  
  const canvasToScreen = useCallback((x, y) => {
    return canvasToScreenCoordinates(x, y, zoom.zoom, zoom.pan)
  }, [zoom.zoom, zoom.pan])
  
  const findStrokeAtPoint = useCallback((x, y) => {
    return findStrokeUtil(strokes, x, y, refs.context.current, refs.imageCache.current)
  }, [strokes])
  
  const getTransformHandle = useCallback((x, y, stroke) => {
    return getTransformHandleUtil(x, y, stroke, refs.context.current, refs.imageCache.current, 1)
  }, [])

  const redrawWithStrokes = useCallback((strokesArray) => {
    const ctx = refs.context.current
    if (!ctx) return
    const canvas = refs.canvas.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    strokesArray.forEach(stroke => {
      if (stroke?.tool) drawStroke(stroke, ctx, refs.imageCache.current)
    })
  }, [])

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const canvas = refs.canvas.current
    const container = refs.container.current
    if (!canvas || !container) return
    
    const setupCanvas = () => {
      const w = container.offsetWidth
      const h = container.offsetHeight
      if (w === 0 || h === 0) return
      
      canvas.width = CANVAS_WIDTH * 2
      canvas.height = CANVAS_HEIGHT * 2
      canvas.style.width = `${CANVAS_WIDTH}px`
      canvas.style.height = `${CANVAS_HEIGHT}px`

      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      refs.context.current = ctx
      redrawWithStrokes(refs.strokes.current)
      
      const centerX = (w - CANVAS_WIDTH) / 2
      const centerY = (h - CANVAS_HEIGHT) / 2
      zoom.setPan({ x: centerX, y: centerY })
    }
    
    setupCanvas()
    refs.containerRect.current = container.getBoundingClientRect()
    
    const handleScroll = () => { refs.containerRect.current = container.getBoundingClientRect() }
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    const resizeObserver = new ResizeObserver(() => {
      refs.containerRect.current = container.getBoundingClientRect()
    })
    resizeObserver.observe(container)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [zoom.setPan, redrawWithStrokes])

  // ========== REDRAW ON CHANGE ==========
  useEffect(() => {
    const ctx = refs.context.current
    if (!ctx) return
    if (transformMode || isDragging) return

    const allStrokes = [...strokes, ...Object.values(previewStrokes)]
    redrawWithStrokes(allStrokes)
    refs.shapePreviewSnapshot.current = null
    
    if (selectedStroke && tool === TOOLS.SELECT) {
      const currentStrokeData = strokes.find(s => s.id === selectedStroke.id)
      if (currentStrokeData) {
        drawSelectionHighlight(currentStrokeData, ctx, refs.imageCache.current)
      }
    }
  }, [strokes, previewStrokes, selectedStroke, tool, transformMode, isDragging, redrawWithStrokes])

  // Clear selection when switching tool
  useEffect(() => {
    if (tool !== TOOLS.SELECT) {
      setSelectedStroke(null)
      setIsDragging(false)
    }
  }, [tool, setSelectedStroke, setIsDragging])

  // ========== DRAWING ==========
  const startDrawing = useCallback((e) => {
    if (disabled) return

    const { x, y } = getCoordinates(e)
    
    // Hand tool - only for panning, no stroke creation
    if (tool === TOOLS.HAND) return
    
    // Select tool
    if (tool === TOOLS.SELECT) {
      if (selectedStroke) {
        const handleType = getTransformHandle(x, y, selectedStroke)
        if (handleType) {
          setTransformMode(handleType)
          const bounds = getStrokeBounds(selectedStroke, refs.context.current, refs.imageCache.current)
          const centerX = bounds.x + bounds.width / 2
          const centerY = bounds.y + bounds.height / 2
          originalStrokeRef.current = JSON.parse(JSON.stringify(selectedStroke))
          transformStart.current = {
            x, y, bounds: { ...bounds },
            originalStroke: originalStrokeRef.current,
            rotation: selectedStroke.rotation || 0,
            startAngle: Math.atan2(y - centerY, x - centerX)
          }
          return
        }
      }
      
      const hitStroke = findStrokeAtPoint(x, y)
      if (hitStroke) {
        setSelectedStroke(hitStroke)
        setIsDragging(true)
        dragOffset.current = { x: x - hitStroke.startPoint.x, y: y - hitStroke.startPoint.y }
        originalStrokeRef.current = JSON.parse(JSON.stringify(hitStroke))
      } else {
        setSelectedStroke(null)
      }
      return
    }

    // Text tool
    if (tool === TOOLS.TEXT) {
      if (!isWithinCanvasUtil(x, y)) return
      const container = refs.container.current
      const rect = container.getBoundingClientRect()
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      setTextInput({ show: true, x, y, screenX: clientX - rect.left, screenY: clientY - rect.top, value: '' })
      return
    }

    // Image tool
    if (tool === TOOLS.IMAGE) {
      if (!isWithinCanvasUtil(x, y)) return
      refs.pendingImagePosition.current = { x, y }
      refs.imageInput.current?.click()
      return
    }

    // Drawing
    if (!isWithinCanvasUtil(x, y)) return
    
    setIsDrawing(true)
    isDrawingRef.current = true
    refs.startPoint.current = { x, y }
    refs.lastSentPointIndex.current = 0

    refs.currentStroke.current = {
      id: uuidv4(),
      tool, color, strokeWidth,
      points: [{ x, y }],
      startPoint: { x, y }
    }

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      refs.context.current.lineCap = 'round'
      refs.context.current.lineJoin = 'round'
    }
  }, [disabled, tool, color, strokeWidth, selectedStroke, getCoordinates, getTransformHandle, findStrokeAtPoint, setSelectedStroke, setIsDragging, setTransformMode, setTextInput, setIsDrawing])

  const draw = useCallback((e) => {
    if (!isDrawingRef.current || !refs.currentStroke.current) return

    const { x, y } = getCoordinates(e)
    refs.pendingPoint.current = { x, y }

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const ctx = refs.context.current
      const prev = refs.lastDrawPoint.current || refs.currentStroke.current.startPoint
      
      ctx.beginPath()
      ctx.strokeStyle = tool === TOOLS.ERASER ? '#ffffff' : color
      ctx.lineWidth = strokeWidth
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      
      refs.lastDrawPoint.current = { x, y }
      
      // Limit points to prevent memory issues when drawing fast
      const MAX_CLIENT_POINTS = 5000
      if (refs.currentStroke.current.points.length < MAX_CLIENT_POINTS) {
        refs.currentStroke.current.points.push({ x, y })
      } else if (refs.currentStroke.current.points.length % 10 === 0) {
        // Sample every 10th point after limit
        refs.currentStroke.current.points.push({ x, y })
      }

      const now = Date.now()
      // Increase throttle from 50ms to 100ms for preview strokes
      if (socket?.connected && now - refs.lastEmitTime.current > 100) {
        // Only send delta points (new points since last emit) instead of all points
        const lastSentIdx = refs.lastSentPointIndex.current || 0
        const newPoints = refs.currentStroke.current.points.slice(lastSentIdx)
        refs.lastSentPointIndex.current = refs.currentStroke.current.points.length
        
        socket.emit('draw:stroke', { 
          stroke: {
            id: refs.currentStroke.current.id,
            tool: refs.currentStroke.current.tool,
            color: refs.currentStroke.current.color,
            strokeWidth: refs.currentStroke.current.strokeWidth,
            startPoint: refs.currentStroke.current.startPoint,
            points: newPoints, // Only new points
            pointsOffset: lastSentIdx, // Where these points start
          },
          isPreview: true
        })
        refs.lastEmitTime.current = now
      }
    } else {
      if (!refs.raf.current) {
        refs.raf.current = requestAnimationFrame(() => {
          refs.raf.current = null
          if (!refs.pendingPoint.current || !isDrawingRef.current || !refs.currentStroke.current) return
          drawShapePreview(refs.pendingPoint.current)
          const now = Date.now()
          if (socket?.connected && now - refs.lastEmitTime.current > 50) {
            refs.currentStroke.current.endPoint = { x: refs.pendingPoint.current.x, y: refs.pendingPoint.current.y }
            socket.emit('draw:stroke', { stroke: refs.currentStroke.current, isPreview: true })
            refs.lastEmitTime.current = now
          }
        })
      }
    }
  }, [tool, color, strokeWidth, socket, getCoordinates])

  const drawShapePreview = useCallback((point) => {
    const { x, y } = point
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) return
    if (!refs.startPoint.current) return
    
    const ctx = refs.context.current
    const canvas = refs.canvas.current
    
    if (!refs.shapePreviewSnapshot.current) {
      refs.shapePreviewSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } else {
      ctx.putImageData(refs.shapePreviewSnapshot.current, 0, 0)
    }
    
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth

    const sx = refs.startPoint.current.x
    const sy = refs.startPoint.current.y

    switch(tool) {
      case TOOLS.LINE:
        ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke()
        break
      case TOOLS.RECTANGLE:
        ctx.strokeRect(sx, sy, x - sx, y - sy)
        break
      case TOOLS.CIRCLE:
        const radius = Math.hypot(x - sx, y - sy)
        if (radius > 0) { ctx.arc(sx, sy, radius, 0, 2 * Math.PI); ctx.stroke() }
        break
      case TOOLS.TRIANGLE:
        ctx.moveTo((sx + x) / 2, sy); ctx.lineTo(x, y); ctx.lineTo(sx, y); ctx.closePath(); ctx.stroke()
        break
      case TOOLS.ARROW:
        ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke()
        const angle = Math.atan2(y - sy, x - sx)
        const headLen = 15
        ctx.beginPath(); ctx.moveTo(x, y)
        ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6)); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, y)
        ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6)); ctx.stroke()
        break
      case TOOLS.DIAMOND:
        const cx = (sx + x) / 2, cy = (sy + y) / 2
        ctx.moveTo(cx, sy); ctx.lineTo(x, cy); ctx.lineTo(cx, y); ctx.lineTo(sx, cy); ctx.closePath(); ctx.stroke()
        break
    }
  }, [tool, color, strokeWidth])

  const stopDrawing = useCallback(() => {
    if (!isDrawing && !isDrawingRef.current) return
    setIsDrawing(false)
    isDrawingRef.current = false

    if (refs.currentStroke.current) {
      const shapeTools = [TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.ARROW, TOOLS.DIAMOND]
      if (shapeTools.includes(tool) && refs.pendingPoint.current) {
        refs.currentStroke.current.endPoint = { x: refs.pendingPoint.current.x, y: refs.pendingPoint.current.y }
      }

      if (onStrokeAdd) onStrokeAdd(refs.currentStroke.current)

      if (socket?.connected) {
        const optimized = optimizeStrokeForTransmit(refs.currentStroke.current, { simplifyEpsilon: 1.0, useDelta: true })
        socket.emit('draw:stroke', { stroke: optimized, isPreview: false })
        socket.emit('draw:complete', { strokeId: refs.currentStroke.current.id })
      }
    }

    // Cleanup
    refs.currentStroke.current = null
    refs.startPoint.current = null
    refs.pendingPoint.current = null
    refs.pendingDrawEvent.current = null
    refs.lastDrawPoint.current = null
    refs.shapePreviewSnapshot.current = null
    if (refs.raf.current) { cancelAnimationFrame(refs.raf.current); refs.raf.current = null }
    if (refs.drawRaf.current) { cancelAnimationFrame(refs.drawRaf.current); refs.drawRaf.current = null }
  }, [isDrawing, tool, socket, onStrokeAdd, setIsDrawing])

  // ========== TRANSFORM ==========
  const handleTransformMove = useCallback((x, y) => {
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
      const dx = x - transformStart.current.x
      const dy = y - transformStart.current.y
      
      let newX = bounds.x, newY = bounds.y, newWidth = bounds.width, newHeight = bounds.height
      
      if (transformMode.includes('w')) { newX = bounds.x + dx; newWidth = bounds.width - dx }
      if (transformMode.includes('e')) { newWidth = bounds.width + dx }
      if (transformMode.includes('n')) { newY = bounds.y + dy; newHeight = bounds.height - dy }
      if (transformMode.includes('s')) { newHeight = bounds.height + dy }
      
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
    
    refs.pendingTransformStroke.current = updatedStroke
    
    const updatedStrokes = refs.strokes.current.map(s => s.id === originalStroke.id ? updatedStroke : s)
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, refs.context.current, refs.imageCache.current)
    
    const now = Date.now()
    if (socket?.connected && now - refs.lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      refs.lastTransformEmit.current = now
    }
  }, [transformMode, socket, redrawWithStrokes])

  const handleDragMove = useCallback((x, y) => {
    const originalStroke = originalStrokeRef.current
    const newStartX = x - dragOffset.current.x
    const newStartY = y - dragOffset.current.y
    
    let updatedStroke = { ...originalStroke }
    
    if (originalStroke.startPoint && originalStroke.endPoint) {
      const dx = newStartX - originalStroke.startPoint.x
      const dy = newStartY - originalStroke.startPoint.y
      updatedStroke.startPoint = { x: newStartX, y: newStartY }
      updatedStroke.endPoint = { x: originalStroke.endPoint.x + dx, y: originalStroke.endPoint.y + dy }
    } else {
      updatedStroke.startPoint = { x: newStartX, y: newStartY }
    }
    
    refs.pendingTransformStroke.current = updatedStroke
    
    const updatedStrokes = refs.strokes.current.map(s => s.id === originalStroke.id ? updatedStroke : s)
    redrawWithStrokes(updatedStrokes)
    drawSelectionHighlight(updatedStroke, refs.context.current, refs.imageCache.current)
    
    const now = Date.now()
    if (socket?.connected && now - refs.lastTransformEmit.current > 66) {
      socket.emit('draw:update', { stroke: updatedStroke, isPreview: true })
      refs.lastTransformEmit.current = now
    }
  }, [socket, redrawWithStrokes])

  // ========== MOUSE HANDLERS ==========
  const handleMouseMove = useCallback((e) => {
    if (isDrawing) {
      refs.pendingDrawEvent.current = e
      if (!refs.drawRaf.current) {
        refs.drawRaf.current = requestAnimationFrame(() => {
          refs.drawRaf.current = null
          if (refs.pendingDrawEvent.current && isDrawingRef.current) {
            draw(refs.pendingDrawEvent.current)
            const now = Date.now()
            if (socket?.connected && now - refs.lastCursorEmit.current > 33) {
              const { x, y } = getCoordinates(refs.pendingDrawEvent.current)
              socket.emit('cursor:move', { x, y, tool })
              refs.lastCursorEmit.current = now
            }
          }
        })
      }
      return
    }
    
    if (zoom.isPanning && zoom.lastPanPoint.current) {
      const dx = e.clientX - zoom.lastPanPoint.current.x
      const dy = e.clientY - zoom.lastPanPoint.current.y
      zoom.setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      zoom.lastPanPoint.current = { x: e.clientX, y: e.clientY }
      return
    }
    
    const now = Date.now()
    if (socket?.connected && !zoom.isPanning && now - refs.lastCursorEmit.current > 33) {
      const { x, y } = getCoordinates(e)
      socket.emit('cursor:move', { x, y, tool })
      refs.lastCursorEmit.current = now
    }
    
    if (transformMode && selectedStroke && transformStart.current) {
      const { x, y } = getCoordinates(e)
      handleTransformMove(x, y)
      return
    }
    
    if (isDragging && selectedStroke && originalStrokeRef.current) {
      const { x, y } = getCoordinates(e)
      handleDragMove(x, y)
      return
    }
  }, [isDrawing, zoom.isPanning, transformMode, isDragging, selectedStroke, tool, socket, draw, getCoordinates, handleTransformMove, handleDragMove])

  const handleMouseUp = useCallback(() => {
    if (refs.transformRaf.current) {
      cancelAnimationFrame(refs.transformRaf.current)
      refs.transformRaf.current = null
    }
    
    if (zoom.isPanning) {
      zoom.setIsPanning(false)
    } else if (transformMode && selectedStroke) {
      const finalStroke = refs.pendingTransformStroke.current || selectedStroke
      setTransformMode(null)
      transformStart.current = null
      originalStrokeRef.current = null
      refs.pendingTransformStroke.current = null
      setSelectedStroke(finalStroke)
      if (onStrokeUpdate) onStrokeUpdate(finalStroke)
      if (socket?.connected) socket.emit('draw:update', { stroke: finalStroke })
    } else if (isDragging && selectedStroke) {
      const finalStroke = refs.pendingTransformStroke.current || selectedStroke
      setIsDragging(false)
      originalStrokeRef.current = null
      refs.pendingTransformStroke.current = null
      setSelectedStroke(finalStroke)
      if (onStrokeUpdate) onStrokeUpdate(finalStroke)
      if (socket?.connected) socket.emit('draw:update', { stroke: finalStroke })
    } else {
      stopDrawing()
    }
  }, [zoom.isPanning, transformMode, isDragging, selectedStroke, socket, onStrokeUpdate, stopDrawing, setTransformMode, setSelectedStroke, setIsDragging])

  const handleMouseLeave = useCallback(() => {
    if (isDrawing) stopDrawing()
    zoom.setIsPanning(false)
  }, [isDrawing, stopDrawing])

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) startDrawing(e)
  }, [startDrawing])
  
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && !zoom.isPanning) {
      refs.pendingDrawEvent.current = e
      if (!refs.drawRaf.current) {
        refs.drawRaf.current = requestAnimationFrame(() => {
          refs.drawRaf.current = null
          if (refs.pendingDrawEvent.current && isDrawingRef.current) draw(refs.pendingDrawEvent.current)
        })
      }
    }
  }, [zoom.isPanning, draw])
  
  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      zoom.lastPinchDistance.current = null
      zoom.setIsPanning(false)
      stopDrawing()
    }
  }, [stopDrawing])

  // ========== ACTIONS ==========
  const handleClear = useCallback(() => {
    if (onClear) onClear()
    else if (socket?.connected) socket.emit('draw:clear')
  }, [onClear, socket])

  const handleUndo = useCallback(() => { if (socket?.connected) socket.emit('draw:undo') }, [socket])
  const handleRedo = useCallback(() => { if (socket?.connected) socket.emit('draw:redo') }, [socket])
  const handleResetZoom = useCallback(() => {
    zoom.handleResetZoom(refs.container, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [zoom.handleResetZoom])

  // Export
  const { handleExport: exportCanvas } = useCanvasExport(refs.canvas, strokes, refs.imageCache.current)
  const handleExport = useCallback((format = 'png') => { exportCanvas(format) }, [exportCanvas])

  // ========== KEYBOARD ==========
  useCanvasKeyboard({
    tool, setTool,
    setSpacePressed: zoom.setSpacePressed,
    setIsPanning: zoom.setIsPanning,
    setSelectedStroke, setShowShortcuts,
    onUndo: handleUndo, onRedo: handleRedo, onExport: handleExport,
    onZoomIn: zoom.handleZoomIn, onZoomOut: zoom.handleZoomOut, onResetZoom: handleResetZoom,
    disabled
  })

  // ========== TEXT ==========
  const handleTextSubmit = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput({ show: false, x: 0, y: 0, value: '' })
      return
    }

    const textStroke = {
      id: uuidv4(),
      tool: TOOLS.TEXT,
      color, fontSize,
      text: textInput.value,
      startPoint: { x: textInput.x, y: textInput.y }
    }

    if (onStrokeAdd) onStrokeAdd(textStroke)
    if (socket?.connected) {
      socket.emit('draw:stroke', { stroke: textStroke })
      socket.emit('draw:complete', { strokeId: textStroke.id })
    }
    setTextInput({ show: false, x: 0, y: 0, value: '' })
  }, [textInput, color, fontSize, onStrokeAdd, socket, setTextInput])

  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit() }
    else if (e.key === 'Escape') setTextInput({ show: false, x: 0, y: 0, value: '' })
  }, [handleTextSubmit, setTextInput])

  useEffect(() => {
    if (textInput.show && refs.textInput.current) {
      const timer = setTimeout(() => refs.textInput.current?.focus(), 10)
      return () => clearTimeout(timer)
    }
  }, [textInput.show])

  // ========== IMAGE ==========
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Image too large. Please select an image under 2MB.'); return }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageData = event.target.result
      const img = new Image()
      
      img.onload = () => {
        let width = img.width, height = img.height
        const maxDimension = 500
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = (height / width) * maxDimension; width = maxDimension }
          else { width = (width / height) * maxDimension; height = maxDimension }
        }

        const position = refs.pendingImagePosition.current || { x: 100, y: 100 }
        
        const imageStroke = {
          id: uuidv4(),
          tool: TOOLS.IMAGE,
          imageData, width, height,
          startPoint: position
        }

        if (onStrokeAdd) onStrokeAdd(imageStroke)
        if (socket?.connected) {
          socket.emit('draw:stroke', { stroke: imageStroke })
          socket.emit('draw:complete', { strokeId: imageStroke.id })
        }
        redrawWithStrokes([...refs.strokes.current, imageStroke])
        refs.pendingImagePosition.current = null
      }
      
      img.src = imageData
    }
    
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onStrokeAdd, socket, redrawWithStrokes])

  // ========== RETURN ==========
  return {
    // State
    state,
    zoom,
    
    // Refs
    refs,
    
    // Computed
    cursor,
    canvasToScreen,
    
    // Drawing
    startDrawing,
    stopDrawing,
    
    // Event handlers
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Actions
    handleClear,
    handleUndo,
    handleRedo,
    handleExport,
    handleResetZoom,
    
    // Text
    handleTextSubmit,
    handleTextKeyDown,
    
    // Image
    handleImageUpload
  }
}
