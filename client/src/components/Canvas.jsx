import { useRef, useEffect, useState, useCallback } from 'react'
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
  cursors = {},
  showCursorNames = true
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
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setSpacePressed(true)
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
  }, [])

  // Keep strokesRef in sync with strokes prop
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

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

  const draw = (e) => {
    if (!isDrawing) return

    const { x, y } = getCoordinates(e)

    // Emit cursor position
    if (socket) {
      socket.emit('cursor:move', { x, y })
    }

    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const ctx = contextRef.current
      ctx.lineTo(x, y)
      ctx.stroke()
      currentStroke.current.points.push({ x, y })

      // Emit stroke update
      if (socket && currentStroke.current.points.length % 3 === 0) {
        socket.emit('draw:stroke', { stroke: currentStroke.current })
      }
    } else {
      // For shapes, preview by redrawing
      redrawCanvas()
      const ctx = contextRef.current
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
        // Limit size to prevent browser crash
        const maxSize = CANVAS_SIZE * 2
        const clampedWidth = Math.max(-maxSize, Math.min(maxSize, width))
        const clampedHeight = Math.max(-maxSize, Math.min(maxSize, height))
        ctx.strokeRect(startPoint.current.x, startPoint.current.y, clampedWidth, clampedHeight)
      } else if (tool === TOOLS.CIRCLE) {
        const radius = Math.sqrt(
          Math.pow(x - startPoint.current.x, 2) +
          Math.pow(y - startPoint.current.y, 2)
        )
        // Limit radius to prevent browser crash
        const maxRadius = CANVAS_SIZE
        const clampedRadius = Math.min(maxRadius, Math.max(0, radius))
        if (clampedRadius > 0) {
          ctx.arc(startPoint.current.x, startPoint.current.y, clampedRadius, 0, 2 * Math.PI)
          ctx.stroke()
        }
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
  }

  const handleClear = () => {
    if (socket) {
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
    if (socket && !isDrawing && !isPanning) {
      socket.emit('cursor:move', { x, y })
    }
    if (isDrawing) {
      draw(e)
    }
  }
  
  // Start panning
  const startPan = (e) => {
    setIsPanning(true)
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
  }
  
  // Check if should pan
  const shouldPan = () => spacePressed || tool === TOOLS.HAND
  
  // Zoom with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault()
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    
    // Get mouse position relative to container
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // Calculate zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta))
    
    // Adjust pan to zoom toward mouse position
    const zoomRatio = newZoom / zoom
    const newPanX = mouseX - (mouseX - pan.x) * zoomRatio
    const newPanY = mouseY - (mouseY - pan.y) * zoomRatio
    
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }
  
  // Touch handlers for pinch zoom and pan
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Start pinch zoom
      e.preventDefault()
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
      startDrawing(e)
    }
  }
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastPinchDistance.current) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      
      // Calculate new pinch distance
      const newDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      // Calculate pinch center
      const centerX = (touch1.clientX + touch2.clientX) / 2
      const centerY = (touch1.clientY + touch2.clientY) / 2
      
      // Calculate zoom
      const delta = newDistance / lastPinchDistance.current
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta))
      
      // Calculate pan (follow pinch center)
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const mouseX = centerX - rect.left
      const mouseY = centerY - rect.top
      
      const zoomRatio = newZoom / zoom
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio + (centerX - lastPanPoint.current.x)
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio + (centerY - lastPanPoint.current.y)
      
      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
      
      lastPinchDistance.current = newDistance
      lastPanPoint.current = { x: centerX, y: centerY }
    } else if (e.touches.length === 1 && !isPanning) {
      draw(e)
    }
  }
  
  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      lastPinchDistance.current = null
      setIsPanning(false)
      if (!isPanning) {
        stopDrawing(e)
      }
    } else if (e.touches.length === 1) {
      // Switched from pinch to single touch - don't start drawing
      lastPinchDistance.current = null
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
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white border-b p-3 flex flex-wrap items-center gap-4">
        {/* Tools */}
        <div className="flex gap-1">
          {Object.entries(TOOLS).map(([key, value]) => (
            <button
              key={key}
              onClick={() => setTool(value)}
              className={`p-2 rounded ${
                tool === value ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'
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
        <div className="w-px h-8 bg-gray-200" />

        {/* Colors */}
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${
                color === c ? 'border-indigo-500' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Stroke Width / Font Size */}
        {tool === TOOLS.TEXT ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Font:</span>
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-6">{fontSize}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24"
            />
            <span className="text-sm w-6">{strokeWidth}</span>
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            title="Undo"
          >
            ↩️
          </button>
          <button
            onClick={handleRedo}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            title="Redo"
          >
            ↪️
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
            title="Clear All"
          >
            🗑️
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded hover:bg-green-200"
            title="Export as PNG"
          >
            📥
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom Out"
          >
            ➖
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 min-w-[60px]"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded hover:bg-gray-100"
            title="Zoom In"
          >
            ➕
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden bg-gray-100 ${
          isPanning ? 'cursor-grabbing' : 
          (spacePressed || tool === TOOLS.HAND) ? 'cursor-grab' : ''
        }`}
        onWheel={handleWheel}
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

        {/* Zoom hint */}
        <div className="absolute bottom-4 left-4 text-xs text-gray-400 pointer-events-none select-none">
          Scroll to zoom • Space+drag to pan • Pinch on mobile
        </div>
      </div>
    </div>
  )
}

export { TOOLS, COLORS }
