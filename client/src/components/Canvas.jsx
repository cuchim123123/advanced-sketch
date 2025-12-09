import { useRef, useEffect, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle'
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
  cursors = {}
}) {
  const canvasRef = useRef(null)
  const contextRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState(TOOLS.PEN)
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const currentStroke = useRef(null)
  const startPoint = useRef(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    // Store dimensions before modifying
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    
    canvas.width = width * 2
    canvas.height = height * 2
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    context.scale(2, 2)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    contextRef.current = context

    redrawCanvas()
    
    // Handle window resize
    const handleResize = () => {
      const w = canvas.parentElement.offsetWidth
      const h = canvas.parentElement.offsetHeight
      canvas.width = w * 2
      canvas.height = h * 2
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      context.scale(2, 2)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      redrawCanvas()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Redraw when strokes change
  useEffect(() => {
    redrawCanvas()
  }, [strokes])

  const redrawCanvas = useCallback(() => {
    const context = contextRef.current
    if (!context) return

    const canvas = canvasRef.current
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    strokes.forEach(stroke => {
      if (stroke && stroke.tool) {
        drawStroke(stroke, context)
      }
    })
  }, [strokes])

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
      ctx.strokeRect(stroke.startPoint.x, stroke.startPoint.y, width, height)
      return
    } else if (stroke.tool === TOOLS.CIRCLE) {
      const radius = Math.sqrt(
        Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
        Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
      )
      ctx.arc(stroke.startPoint.x, stroke.startPoint.y, radius, 0, 2 * Math.PI)
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
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    // Handle both mouse and touch events, including touchend (uses changedTouches)
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0
    const x = clientX - rect.left
    const y = clientY - rect.top
    return { x, y }
  }

  const startDrawing = (e) => {
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
        ctx.strokeRect(startPoint.current.x, startPoint.current.y, width, height)
      } else if (tool === TOOLS.CIRCLE) {
        const radius = Math.sqrt(
          Math.pow(x - startPoint.current.x, 2) +
          Math.pow(y - startPoint.current.y, 2)
        )
        ctx.arc(startPoint.current.x, startPoint.current.y, radius, 0, 2 * Math.PI)
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

  // Handle mouse leaving canvas
  const handleMouseLeave = () => {
    if (isDrawing) {
      stopDrawing({ clientX: 0, clientY: 0 })
    }
  }

  // Handle cursor move without drawing
  const handleMouseMove = (e) => {
    const { x, y } = getCoordinates(e)
    if (socket && !isDrawing) {
      socket.emit('cursor:move', { x, y })
    }
    if (isDrawing) {
      draw(e)
    }
  }

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

        {/* Stroke Width */}
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

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            ↩️ Undo
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${
            tool === TOOLS.ERASER ? 'cursor-eraser' : 'cursor-pen'
          }`}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Other users' cursors */}
        {Object.entries(cursors).map(([userId, cursor]) => (
          <div
            key={userId}
            className="absolute pointer-events-none transition-all duration-75"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: cursor.color }}
            />
            <span
              className="absolute top-4 left-2 text-xs px-1 rounded whitespace-nowrap"
              style={{ backgroundColor: cursor.color, color: 'white' }}
            >
              {cursor.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { TOOLS, COLORS }
