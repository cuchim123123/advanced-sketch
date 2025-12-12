import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { v4 as uuidv4 } from 'uuid'

const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  IMAGE: 'image',
  HAND: 'hand'  // Pan tool
}

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6B6B',
  '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
]

export default function Canvas({ 
  socket, 
  roomCode, 
  strokes = [],  // Renamed from initialStrokes - parent manages this
  onStrokeAdd,   // Callback when user draws a stroke
  onClear,       // Callback for clear confirmation
  onSave,        // Callback for save
  cursors = {},
  showCursorNames = true,
  disabled = false  // Disable drawing when room is loading
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const contextRef = useRef(null)
  const strokesRef = useRef(strokes) // Keep ref to current strokes for resize handler
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState(TOOLS.PEN)
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [fontSize, setFontSize] = useState(16)
  const currentStroke = useRef(null)
  const startPoint = useRef(null)
  
  // Text input state
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' })
  const textInputRef = useRef(null)
  
  // Image upload ref
  const imageInputRef = useRef(null)
  const pendingImagePosition = useRef(null)
  const imageCache = useRef(new Map()) // Cache loaded images by stroke ID
  
  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const lastPanPoint = useRef(null)
  const lastPinchDistance = useRef(null)
  
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 4
  const CANVAS_SIZE = 2000 // Virtual canvas size
  
  // Handle spacebar for pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpacePressed(true)
      }
      
      // Keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              handleRedo() // Ctrl+Shift+Z = Redo
            } else {
              handleUndo() // Ctrl+Z = Undo
            }
            break
          case 'y':
            e.preventDefault()
            handleRedo() // Ctrl+Y = Redo
            break
          case 's':
            e.preventDefault()
            if (onSave) onSave() // Ctrl+S = Save
            break
          case 'e':
            e.preventDefault()
            handleExport() // Ctrl+E = Export
            break
        }
      } else {
        // Tool shortcuts (single keys)
        switch (e.key.toLowerCase()) {
          case 'p': setTool(TOOLS.PEN); break
          case 'e': setTool(TOOLS.ERASER); break
          case 'l': setTool(TOOLS.LINE); break
          case 'r': setTool(TOOLS.RECTANGLE); break
          case 'c': setTool(TOOLS.CIRCLE); break
          case 't': setTool(TOOLS.TEXT); break
          case 'i': setTool(TOOLS.IMAGE); break
          case 'h': setTool(TOOLS.HAND); break
          case '?': setShowShortcuts(prev => !prev); break
          case 'escape': setShowShortcuts(false); break
        }
      }
    }
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [onSave])

  // Keep strokesRef in sync with strokes prop
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  // Attach native event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Wheel handler needs passive: false to prevent scroll
    const wheelHandler = (e) => {
      e.preventDefault()
      handleWheelNative(e)
    }

    // Touch handlers need passive: false to prevent scroll/zoom on mobile
    const touchStartHandler = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault()
      }
      handleTouchStartNative(e)
    }

    const touchMoveHandler = (e) => {
      if (e.touches.length >= 1) {
        e.preventDefault()
      }
      handleTouchMoveNative(e)
    }

    container.addEventListener('wheel', wheelHandler, { passive: false })
    container.addEventListener('touchstart', touchStartHandler, { passive: false })
    container.addEventListener('touchmove', touchMoveHandler, { passive: false })

    return () => {
      container.removeEventListener('wheel', wheelHandler)
      container.removeEventListener('touchstart', touchStartHandler)
      container.removeEventListener('touchmove', touchMoveHandler)
    }
  }, [])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    
    const setupCanvas = () => {
      const w = container.offsetWidth
      const h = container.offsetHeight
      
      if (w === 0 || h === 0) return
      
      // Use fixed large canvas size for zoom
      canvas.width = CANVAS_SIZE * 2
      canvas.height = CANVAS_SIZE * 2
      canvas.style.width = `${CANVAS_SIZE}px`
      canvas.style.height = `${CANVAS_SIZE}px`

      const context = canvas.getContext('2d')
      context.scale(2, 2)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      contextRef.current = context

      // Use ref to get current strokes (not stale closure)
      redrawWithStrokes(strokesRef.current)
    }
    
    setupCanvas()
    
    // Use ResizeObserver for container size changes (sidebar toggle, etc.)
    const resizeObserver = new ResizeObserver(() => {
      // No need to resize canvas, just ensure it's visible
    })
    
    resizeObserver.observe(container)
    
    return () => resizeObserver.disconnect()
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
        drawStroke(stroke, context)
      }
    })
  }

  // Redraw when strokes change
  useEffect(() => {
    redrawWithStrokes(strokes)
  }, [strokes])
  
  // Alias for shape preview
  const redrawCanvas = () => redrawWithStrokes(strokesRef.current)

  const drawStroke = (stroke, ctx) => {
    if (!stroke || !stroke.tool) return
    
    ctx.beginPath()
    ctx.strokeStyle = stroke.tool === TOOLS.ERASER ? '#ffffff' : (stroke.color || '#000000')
    ctx.lineWidth = stroke.strokeWidth || 3

    if (stroke.tool === TOOLS.LINE) {
      ctx.moveTo(stroke.startPoint.x, stroke.startPoint.y)
      ctx.lineTo(stroke.endPoint.x, stroke.endPoint.y)
    } else if (stroke.tool === TOOLS.RECTANGLE) {
      const width = stroke.endPoint.x - stroke.startPoint.x
      const height = stroke.endPoint.y - stroke.startPoint.y
      // Limit size to prevent browser crash
      const maxSize = CANVAS_SIZE * 2
      const clampedWidth = Math.max(-maxSize, Math.min(maxSize, width))
      const clampedHeight = Math.max(-maxSize, Math.min(maxSize, height))
      ctx.strokeRect(stroke.startPoint.x, stroke.startPoint.y, clampedWidth, clampedHeight)
      return
    } else if (stroke.tool === TOOLS.CIRCLE) {
      const radius = Math.sqrt(
        Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
        Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
      )
      // Limit radius to prevent browser crash
      const maxRadius = CANVAS_SIZE
      const clampedRadius = Math.min(maxRadius, Math.max(0, radius))
      if (clampedRadius > 0) {
        ctx.arc(stroke.startPoint.x, stroke.startPoint.y, clampedRadius, 0, 2 * Math.PI)
      }
    } else if (stroke.tool === TOOLS.TEXT) {
      // Draw text
      ctx.font = `${stroke.fontSize || 16}px Arial, sans-serif`
      ctx.fillStyle = stroke.color || '#000000'
      ctx.fillText(stroke.text || '', stroke.startPoint.x, stroke.startPoint.y)
      return
    } else if (stroke.tool === TOOLS.IMAGE && stroke.imageData) {
      // Draw image with caching
      const cachedImg = imageCache.current.get(stroke.id)
      
      if (cachedImg && cachedImg.complete) {
        // Use cached image
        ctx.drawImage(
          cachedImg,
          stroke.startPoint.x,
          stroke.startPoint.y,
          stroke.width || cachedImg.width,
          stroke.height || cachedImg.height
        )
      } else {
        // Load and cache image
        const img = new Image()
        img.onload = () => {
          imageCache.current.set(stroke.id, img)
          ctx.drawImage(
            img,
            stroke.startPoint.x,
            stroke.startPoint.y,
            stroke.width || img.width,
            stroke.height || img.height
          )
        }
        img.src = stroke.imageData
      }
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
  }

  const getCoordinates = (e) => {
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    // Handle both mouse and touch events, including touchend (uses changedTouches)
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0
    
    // Convert screen coordinates to canvas coordinates (accounting for zoom and pan)
    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom
    return { x, y }
  }
  
  // Convert canvas coordinates to screen coordinates (for cursors)
  const canvasToScreen = (x, y) => {
    return {
      x: x * zoom + pan.x,
      y: y * zoom + pan.y
    }
  }

  const startDrawing = (e) => {
    // Don't allow drawing when disabled
    if (disabled) return

    // Handle text tool - show input instead of drawing
    if (tool === TOOLS.TEXT) {
      const { x, y } = getCoordinates(e)
      const screenPos = canvasToScreen(x, y)
      setTextInput({ show: true, x, y, screenX: screenPos.x, screenY: screenPos.y, value: '' })
      return
    }

    // Handle image tool - open file picker
    if (tool === TOOLS.IMAGE) {
      const { x, y } = getCoordinates(e)
      pendingImagePosition.current = { x, y }
      imageInputRef.current?.click()
      return
    }

    const { x, y } = getCoordinates(e)
    setIsDrawing(true)
    startPoint.current = { x, y }

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
      ctx.beginPath()
      ctx.strokeStyle = tool === TOOLS.ERASER ? '#ffffff' : color
      ctx.lineWidth = strokeWidth
      ctx.moveTo(x, y)
    }
  }

  // Use RAF for smoother drawing
  const rafRef = useRef(null)
  const pendingPoint = useRef(null)
  const lastEmitTime = useRef(0)
  const EMIT_THROTTLE = 50 // Emit every 50ms max
  
  const draw = (e) => {
    if (!isDrawing) return

    const { x, y } = getCoordinates(e)
    pendingPoint.current = { x, y }

    // Use requestAnimationFrame for smoother rendering
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        if (!pendingPoint.current || !isDrawing || !currentStroke.current) return
        
        const point = pendingPoint.current

        if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
          const ctx = contextRef.current
          ctx.lineTo(point.x, point.y)
          ctx.stroke()
          currentStroke.current.points.push(point)

          // Throttle socket emit to reduce network load
          const now = Date.now()
          if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
            socket.emit('draw:stroke', { stroke: currentStroke.current })
            lastEmitTime.current = now
          }
        } else {
          drawShapePreview(point)
        }
      })
    }
  }
  
  // Offscreen canvas for shape preview (avoid full redraw)
  const offscreenCanvasRef = useRef(null)
  const lastShapePreview = useRef(null)
  
  // Extracted shape preview for cleaner code - uses dirty rect approach
  const drawShapePreview = (point) => {
    const { x, y } = point
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) return
    if (!startPoint.current) return
    
    const ctx = contextRef.current
    const canvas = canvasRef.current
    
    // Clear previous shape preview by restoring from offscreen canvas
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas')
      offscreenCanvasRef.current.width = canvas.width
      offscreenCanvasRef.current.height = canvas.height
    }
    
    // On first preview, save current state to offscreen canvas
    if (!lastShapePreview.current) {
      const offCtx = offscreenCanvasRef.current.getContext('2d')
      offCtx.drawImage(canvas, 0, 0)
    } else {
      // Restore from offscreen canvas
      ctx.drawImage(offscreenCanvasRef.current, 0, 0)
    }
    
    lastShapePreview.current = { x, y }
    
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = strokeWidth

    if (tool === TOOLS.LINE) {
      ctx.moveTo(startPoint.current.x, startPoint.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (tool === TOOLS.RECTANGLE) {
      const width = x - startPoint.current.x
      const height = y - startPoint.current.y
      const maxSize = CANVAS_SIZE * 2
      const clampedWidth = Math.max(-maxSize, Math.min(maxSize, width))
      const clampedHeight = Math.max(-maxSize, Math.min(maxSize, height))
      ctx.strokeRect(startPoint.current.x, startPoint.current.y, clampedWidth, clampedHeight)
    } else if (tool === TOOLS.CIRCLE) {
      const radius = Math.sqrt(
        Math.pow(x - startPoint.current.x, 2) +
        Math.pow(y - startPoint.current.y, 2)
      )
      const maxRadius = CANVAS_SIZE
      const clampedRadius = Math.min(maxRadius, Math.max(0, radius))
      if (clampedRadius > 0) {
        ctx.arc(startPoint.current.x, startPoint.current.y, clampedRadius, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }
  }

  const stopDrawing = (e) => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (currentStroke.current) {
      if (tool === TOOLS.LINE || tool === TOOLS.RECTANGLE || tool === TOOLS.CIRCLE) {
        const { x, y } = getCoordinates(e)
        currentStroke.current.endPoint = { x, y }
      }

      // Notify parent to add stroke (parent manages state)
      if (onStrokeAdd) {
        onStrokeAdd(currentStroke.current)
      }

      // Emit final stroke to server
      if (socket) {
        socket.emit('draw:stroke', { stroke: currentStroke.current })
        socket.emit('draw:complete', { strokeId: currentStroke.current.id })
      }
    }

    currentStroke.current = null
    startPoint.current = null
    lastShapePreview.current = null // Reset shape preview state
    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
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

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a temporary link to download
    const link = document.createElement('a')
    link.download = `sketch-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Handle mouse leaving canvas
  const handleMouseLeave = () => {
    if (isDrawing) {
      stopDrawing({ clientX: 0, clientY: 0 })
    }
    setIsPanning(false)
  }

  // Throttle cursor updates (client-side)
  const lastCursorEmit = useRef(0)
  
  // Handle cursor move without drawing
  const handleMouseMove = (e) => {
    // Handle panning (space+drag, middle mouse, or hand tool)
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x
      const dy = e.clientY - lastPanPoint.current.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      return
    }
    
    const { x, y } = getCoordinates(e)
    // Throttle cursor emit to 30fps (33ms) to reduce network traffic
    const now = Date.now()
    if (socket && !isDrawing && !isPanning && now - lastCursorEmit.current > 33) {
      socket.emit('cursor:move', { x, y })
      lastCursorEmit.current = now
    }
    if (isDrawing) {
      draw(e)
    }
  }
  
  // Start panning
  const startPan = (e) => {
    if (disabled) return
    setIsPanning(true)
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
  }
  
  // Check if should pan
  const shouldPan = () => spacePressed || tool === TOOLS.HAND
  
  // Refs for native event handlers (to avoid stale closures)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const isDrawingRef = useRef(isDrawing)
  const isPanningRef = useRef(isPanning)
  const toolRef = useRef(tool)
  
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { isDrawingRef.current = isDrawing }, [isDrawing])
  useEffect(() => { isPanningRef.current = isPanning }, [isPanning])
  useEffect(() => { toolRef.current = tool }, [tool])
  
  // Native wheel handler (called from passive: false listener)
  const handleWheelNative = useCallback((e) => {
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const currentZoom = zoomRef.current
    const currentPan = panRef.current
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * delta))
    
    const zoomRatio = newZoom / currentZoom
    const newPanX = mouseX - (mouseX - currentPan.x) * zoomRatio
    const newPanY = mouseY - (mouseY - currentPan.y) * zoomRatio
    
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [])
  
  // Native touch handlers (called from passive: false listeners)
  const handleTouchStartNative = useCallback((e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      lastPinchDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      lastPanPoint.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
      setIsPanning(true)
    } else if (e.touches.length === 1) {
      setIsPanning(false)
      // Don't call startDrawing here - let React handler do it
    }
  }, [])
  
  const handleTouchMoveNative = useCallback((e) => {
    if (e.touches.length === 2 && lastPinchDistance.current) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      
      const newDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      const currentZoom = zoomRef.current
      const currentPan = panRef.current
      const delta = newDistance / lastPinchDistance.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom * delta))
      
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const mouseX = centerX - rect.left
      const mouseY = centerY - rect.top
      
      const zoomRatio = newZoom / currentZoom
      const newPanX = mouseX - (mouseX - currentPan.x) * zoomRatio + (centerX - lastPanPoint.current.x)
      const newPanY = mouseY - (mouseY - currentPan.y) * zoomRatio + (centerY - lastPanPoint.current.y)
      
      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
      
      lastPinchDistance.current = newDistance
      lastPanPoint.current = { x: centerX, y: centerY }
    }
    // Single touch drawing is handled by React onTouchMove
  }, [])
  
  // Legacy handlers kept for fallback (remove onWheel from JSX)
  const handleWheel = (e) => {
    // Handled by native listener
  }
  
  // Touch handlers for React (single touch drawing only)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      startDrawing(e)
    }
  }
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && !isPanning) {
      draw(e)
    }
  }
  
  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      lastPinchDistance.current = null
      setIsPanning(false)
      stopDrawing(e)
    }
  }
  
  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2))
  }
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2))
  }
  
  const handleResetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
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
      textInputRef.current.focus()
    }
  }, [textInput.show])

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Toolbar */}
      <div className="glass border-b border-slate-200 p-3 flex flex-wrap items-center gap-4">
        {/* Tools */}
        <div className="flex gap-1 p-1 glass rounded-xl">
          {Object.entries(TOOLS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setTool(value)}
              className={`p-2.5 rounded-lg transition-all duration-200 ${
                tool === value 
                  ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
              title={key}
            >
              {value === 'pen' && '✏️'}
              {value === 'eraser' && '🧹'}
              {value === 'line' && '📏'}
              {value === 'rectangle' && '⬜'}
              {value === 'circle' && '⭕'}
              {value === 'text' && '🔤'}
              {value === 'image' && '🖼️'}
              {value === 'hand' && '✋'}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Colors */}
        <div className="flex gap-1.5 p-1 glass rounded-xl">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-lg transition-all duration-200 ${
                color === c 
                  ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-white scale-110' 
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Stroke Width / Font Size */}
        {tool === TOOLS.TEXT ? (
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
            <span className="text-sm text-slate-500">Font:</span>
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-slate-600 w-6">{fontSize}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
            <span className="text-sm text-slate-500">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-slate-600 w-6">{strokeWidth}</span>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={handleUndo}
            className="glass-button px-3 py-2 text-sm"
            title="Undo (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            onClick={handleRedo}
            className="glass-button px-3 py-2 text-sm"
            title="Redo (Ctrl+Y)"
          >
            ↪️
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm bg-red-100 text-red-600 rounded-xl border border-red-200 
                     hover:bg-red-200 transition-all duration-200"
            title="Clear All"
          >
            🗑️
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200 
                     hover:bg-emerald-200 transition-all duration-200"
            title="Export as PNG (Ctrl+E)"
          >
            📥
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
            title="Zoom Out"
          >
            ➖
          </button>
          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-w-[60px] transition-all duration-200"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
            title="Zoom In"
          >
            ➕
          </button>
        </div>
      </div>

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
          if (isPanning) {
            setIsPanning(false)
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
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 ${
              isPanning ? 'cursor-grabbing' :
              (tool === TOOLS.HAND || spacePressed) ? 'cursor-grab' :
              tool === TOOLS.ERASER ? 'cursor-eraser' : 'cursor-pen'
            }`}
            style={{
              width: CANVAS_SIZE,
              height: CANVAS_SIZE
            }}
          />
        </div>

        {/* Other users' cursors */}
        {Object.entries(cursors).map(([userId, cursor]) => {
          const screenPos = canvasToScreen(cursor.x, cursor.y)
          return (
            <div
              key={userId}
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: screenPos.x,
                top: screenPos.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: cursor.color }}
              />
              {showCursorNames && (
                <span
                  className="absolute top-4 left-2 text-xs px-1 rounded whitespace-nowrap"
                  style={{ backgroundColor: cursor.color, color: 'white' }}
                >
                  {cursor.username}
                </span>
              )}
            </div>
          )
        })}

        {/* Text Input Overlay */}
        {textInput.show && (
          <div
            className="absolute z-20"
            style={{
              left: textInput.screenX,
              top: textInput.screenY,
              transform: 'translate(-4px, -50%)'
            }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={handleTextKeyDown}
              onBlur={handleTextSubmit}
              placeholder="Type text..."
              className="px-2 py-1 border-2 border-indigo-500 rounded outline-none min-w-[150px]"
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
        <div className="absolute bottom-4 left-4 glass rounded-xl px-4 py-2 text-xs text-white/50 pointer-events-none select-none">
          <div>Scroll to zoom • Space+drag to pan • Pinch on mobile</div>
          <div className="mt-1 text-white/30">Press ? for keyboard shortcuts</div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={() => setShowShortcuts(false)}
          >
            <div 
              className="glass-card p-6 max-w-md animate-scale-in"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
                <button 
                  onClick={() => setShowShortcuts(false)}
                  className="glass-button w-8 h-8 flex items-center justify-center text-white/50 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Tools</h4>
                  <div className="space-y-2 text-white/70">
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">P</kbd> Pen</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">E</kbd> Eraser</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">L</kbd> Line</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">R</kbd> Rectangle</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">C</kbd> Circle</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">T</kbd> Text</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">I</kbd> Image</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">H</kbd> Hand (pan)</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Actions</h4>
                  <div className="space-y-2 text-white/70">
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Ctrl+Z</kbd> Undo</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Ctrl+Y</kbd> Redo</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Ctrl+S</kbd> Save</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Ctrl+E</kbd> Export</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Space</kbd> Pan</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Scroll</kbd> Zoom</div>
                    <div><kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">Esc</kbd> Close modal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { TOOLS, COLORS }
