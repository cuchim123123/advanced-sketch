import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { optimizeStrokeForTransmit, deoptimizeStroke, getCompressionStats } from '../utils/strokeOptimization'
import { Dropdown, DropdownItem, DropdownSeparator } from './ui/dropdown'
import { ChevronDown } from 'lucide-react'

const TOOLS = {
  SELECT: 'select', // Selection/move tool
  PEN: 'pen',
  ERASER: 'eraser',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  ARROW: 'arrow',
  DIAMOND: 'diamond',
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
  previewStrokes = {}, // Shape previews from other users
  onStrokeAdd,   // Callback when user draws a stroke
  onStrokeUpdate, // Callback when user moves a stroke
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
  
  // Selection state for moving text/images
  const [selectedStroke, setSelectedStroke] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  // Transform state (resize/rotate)
  const [transformMode, setTransformMode] = useState(null) // 'resize-nw', 'resize-ne', 'resize-sw', 'resize-se', 'rotate'
  const transformStart = useRef({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  
  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const lastPanPoint = useRef(null)
  const lastPinchDistance = useRef(null)
  
  // Snapshot of canvas state for shape preview (must be declared before effects use it)
  const shapePreviewSnapshot = useRef(null)
  
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 4
  const CANVAS_WIDTH = 3000 // Virtual canvas width
  const CANVAS_HEIGHT = 1500 // Virtual canvas height
  
  // Generate dynamic cursor based on tool and stroke width
  const getCursor = useMemo(() => {
    const size = Math.max(strokeWidth * zoom, 4) // Minimum 4px for visibility
    const cursorSize = Math.min(Math.max(size + 8, 16), 64) // Canvas cursor size between 16-64px
    const center = cursorSize / 2
    const radius = Math.max(size / 2, 2)
    
    if (tool === TOOLS.SELECT) {
      return 'default'
    } else if (tool === TOOLS.ERASER) {
      // Eraser: circle matching stroke width
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><circle cx="${center}" cy="${center}" r="${radius}" fill="rgba(255,255,255,0.5)" stroke="%23333" stroke-width="1.5"/><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="white" stroke-width="3"/><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="%23333" stroke-width="1.5"/></svg>`
      return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}') ${center} ${center}, auto`
    } else if (tool === TOOLS.PEN) {
      // Pen: crosshair with dot matching stroke width
      const dotRadius = Math.max(radius, 1.5)
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><line x1="${center}" y1="2" x2="${center}" y2="${cursorSize-2}" stroke="white" stroke-width="3"/><line x1="2" y1="${center}" x2="${cursorSize-2}" y2="${center}" stroke="white" stroke-width="3"/><line x1="${center}" y1="2" x2="${center}" y2="${cursorSize-2}" stroke="%23333" stroke-width="1.5"/><line x1="2" y1="${center}" x2="${cursorSize-2}" y2="${center}" stroke="%23333" stroke-width="1.5"/><circle cx="${center}" cy="${center}" r="${dotRadius}" fill="%23333" stroke="white" stroke-width="1"/></svg>`
      return `url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, "%27")}') ${center} ${center}, crosshair`
    }
    return 'crosshair'
  }, [tool, strokeWidth, zoom])
  
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
          case 'v': setTool(TOOLS.SELECT); setSelectedStroke(null); break
          case 'p': setTool(TOOLS.PEN); break
          case 'e': setTool(TOOLS.ERASER); break
          case 'l': setTool(TOOLS.LINE); break
          case 'r': setTool(TOOLS.RECTANGLE); break
          case 'c': setTool(TOOLS.CIRCLE); break
          case 't': setTool(TOOLS.TEXT); break
          case 'i': setTool(TOOLS.IMAGE); break
          case 'h': setTool(TOOLS.HAND); break
          case '?': setShowShortcuts(prev => !prev); break
          case 'escape': 
            setShowShortcuts(false)
            setSelectedStroke(null)
            break
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

  // Redraw when strokes or preview strokes change
  useEffect(() => {
    const allStrokes = [...strokes, ...Object.values(previewStrokes)]
    redrawWithStrokes(allStrokes)
    // Invalidate shape preview snapshot so next draw uses fresh state
    shapePreviewSnapshot.current = null
    
    // Draw selection highlight if there's a selected stroke
    if (selectedStroke && tool === TOOLS.SELECT) {
      // Find the current position of the selected stroke in the updated strokes
      const currentStrokeData = strokes.find(s => s.id === selectedStroke.id)
      if (currentStrokeData) {
        drawSelectionHighlight(currentStrokeData)
      }
    }
  }, [strokes, previewStrokes, selectedStroke, tool])

  const drawStroke = (stroke, ctx) => {
    if (!stroke || !stroke.tool) return
    
    ctx.save()
    
    // Apply rotation if stroke has one
    if (stroke.rotation && stroke.startPoint && stroke.endPoint) {
      const bounds = getStrokeBounds(stroke)
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
      // Limit size to prevent browser crash
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
      // Limit radius to prevent browser crash
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
      // Draw triangle: top point at start, base at end Y
      ctx.moveTo((sx + ex) / 2, sy) // Top center
      ctx.lineTo(ex, ey) // Bottom right
      ctx.lineTo(sx, ey) // Bottom left
      ctx.closePath()
    } else if (stroke.tool === TOOLS.ARROW) {
      const sx = stroke.startPoint.x
      const sy = stroke.startPoint.y
      const ex = stroke.endPoint.x
      const ey = stroke.endPoint.y
      // Draw line
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      // Draw arrowhead
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
      const cx = (sx + ex) / 2
      const cy = (sy + ey) / 2
      const hw = Math.abs(ex - sx) / 2
      const hh = Math.abs(ey - sy) / 2
      ctx.moveTo(cx, sy) // Top
      ctx.lineTo(ex, cy) // Right
      ctx.lineTo(cx, ey) // Bottom
      ctx.lineTo(sx, cy) // Left
      ctx.closePath()
    } else if (stroke.tool === TOOLS.TEXT) {
      // Draw text
      ctx.font = `${stroke.fontSize || 16}px Arial, sans-serif`
      ctx.fillStyle = stroke.color || '#000000'
      ctx.fillText(stroke.text || '', stroke.startPoint.x, stroke.startPoint.y)
      ctx.restore()
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

  // Get bounds of any stroke for selection/transform
  const getStrokeBounds = (stroke) => {
    if (!stroke) return null
    const ctx = contextRef.current
    
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
      const cachedImg = imageCache.current.get(stroke.id)
      const width = stroke.width || cachedImg?.width || 100
      const height = stroke.height || cachedImg?.height || 100
      return {
        x: stroke.startPoint.x,
        y: stroke.startPoint.y,
        width: width,
        height: height
      }
    } else if (stroke.startPoint && stroke.endPoint) {
      // Shape tools (line, rect, circle, etc.)
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

  // Draw selection highlight with resize handles
  const drawSelectionHighlight = (stroke) => {
    if (!stroke) return
    const ctx = contextRef.current
    if (!ctx) return
    
    const bounds = getStrokeBounds(stroke)
    if (!bounds) return
    
    const padding = 4
    const handleSize = 8
    const rotation = stroke.rotation || 0
    
    ctx.save()
    
    // Apply rotation around center if needed
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
      { x: bounds.x - padding - handleSize/2, y: bounds.y - padding - handleSize/2, cursor: 'nw-resize', type: 'resize-nw' },
      { x: bounds.x + bounds.width + padding - handleSize/2, y: bounds.y - padding - handleSize/2, cursor: 'ne-resize', type: 'resize-ne' },
      { x: bounds.x - padding - handleSize/2, y: bounds.y + bounds.height + padding - handleSize/2, cursor: 'sw-resize', type: 'resize-sw' },
      { x: bounds.x + bounds.width + padding - handleSize/2, y: bounds.y + bounds.height + padding - handleSize/2, cursor: 'se-resize', type: 'resize-se' }
    ]
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)
    })
    
    // Rotation handle (circle above top center)
    const rotateHandleY = bounds.y - padding - 25
    const rotateHandleX = bounds.x + bounds.width / 2
    
    // Line connecting to rotation handle
    ctx.beginPath()
    ctx.moveTo(rotateHandleX, bounds.y - padding)
    ctx.lineTo(rotateHandleX, rotateHandleY + 8)
    ctx.stroke()
    
    // Rotation circle
    ctx.beginPath()
    ctx.arc(rotateHandleX, rotateHandleY, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    
    // Rotation icon (curved arrow)
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(rotateHandleX, rotateHandleY, 4, -Math.PI * 0.7, Math.PI * 0.3)
    ctx.stroke()
    
    ctx.restore()
  }

  // Check if point is on a transform handle
  const getTransformHandleAtPoint = (x, y, stroke) => {
    if (!stroke) return null
    const bounds = getStrokeBounds(stroke)
    if (!bounds) return null
    
    const padding = 4
    const handleSize = 12 // Slightly larger hit area
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

  // Hit detection for selecting text, images, and shapes
  const findStrokeAtPoint = (x, y) => {
    // Search in reverse order (top-most first)
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i]
      if (!stroke) continue
      
      const bounds = getStrokeBounds(stroke)
      if (bounds) {
        // Apply rotation transform to test point if stroke is rotated
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
          const bounds = getStrokeBounds(selectedStroke)
          transformStart.current = {
            x, y,
            bounds: { ...bounds },
            originalStroke: { ...selectedStroke },
            rotation: selectedStroke.rotation || 0
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
      } else {
        setSelectedStroke(null)
      }
      return
    }

    // Handle text tool - show input instead of drawing
    if (tool === TOOLS.TEXT) {
      const { x, y } = getCoordinates(e)
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
      pendingImagePosition.current = { x, y }
      imageInputRef.current?.click()
      return
    }

    const { x, y } = getCoordinates(e)
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
  
  // Ref to track drawing state for use in RAF callbacks (avoids stale closure)
  const isDrawingRef = useRef(false)
  
  const draw = (e) => {
    if (!isDrawingRef.current) return
    if (!currentStroke.current) return

    const { x, y } = getCoordinates(e)
    pendingPoint.current = { x, y }

    // For pen/eraser, draw immediately without RAF for lowest latency
    if (tool === TOOLS.PEN || tool === TOOLS.ERASER) {
      const ctx = contextRef.current
      ctx.lineTo(x, y)
      ctx.stroke()
      currentStroke.current.points.push({ x, y })

      // Throttle socket emit to reduce network load
      const now = Date.now()
      if (socket && now - lastEmitTime.current > EMIT_THROTTLE) {
        const optimized = optimizeStrokeForTransmit(currentStroke.current, {
          simplifyEpsilon: 1.5,
          useDelta: true
        })
        socket.emit('draw:stroke', { stroke: optimized })
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
    shapePreviewSnapshot.current = null // Reset shape preview snapshot
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

  // Export format state
  const [showExportMenu, setShowExportMenu] = useState(false)

  const handleExport = (format = 'png') => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const filename = `sketch-${new Date().toISOString().slice(0, 10)}`

    if (format === 'png') {
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else if (format === 'svg') {
      exportAsSVG(filename)
    } else if (format === 'pdf') {
      exportAsPDF(filename)
    }
    setShowExportMenu(false)
  }
  
  // Generate SVG from strokes
  const exportAsSVG = (filename) => {
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', CANVAS_WIDTH)
    svg.setAttribute('height', CANVAS_HEIGHT)
    svg.setAttribute('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`)
    svg.setAttribute('xmlns', svgNS)
    
    // White background
    const bg = document.createElementNS(svgNS, 'rect')
    bg.setAttribute('width', '100%')
    bg.setAttribute('height', '100%')
    bg.setAttribute('fill', 'white')
    svg.appendChild(bg)
    
    // Draw all strokes
    strokes.forEach(stroke => {
      if (!stroke) return
      
      const rotation = stroke.rotation || 0
      let group = null
      
      // Create group for rotation if needed
      if (rotation !== 0) {
        group = document.createElementNS(svgNS, 'g')
        const bounds = getStrokeBounds(stroke)
        if (bounds) {
          const cx = bounds.x + bounds.width / 2
          const cy = bounds.y + bounds.height / 2
          group.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`)
        }
      }
      
      let element = null
      
      if (stroke.tool === TOOLS.LINE && stroke.startPoint && stroke.endPoint) {
        element = document.createElementNS(svgNS, 'line')
        element.setAttribute('x1', stroke.startPoint.x)
        element.setAttribute('y1', stroke.startPoint.y)
        element.setAttribute('x2', stroke.endPoint.x)
        element.setAttribute('y2', stroke.endPoint.y)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('stroke-linecap', 'round')
      } else if (stroke.tool === TOOLS.RECTANGLE && stroke.startPoint && stroke.endPoint) {
        element = document.createElementNS(svgNS, 'rect')
        const x = Math.min(stroke.startPoint.x, stroke.endPoint.x)
        const y = Math.min(stroke.startPoint.y, stroke.endPoint.y)
        const w = Math.abs(stroke.endPoint.x - stroke.startPoint.x)
        const h = Math.abs(stroke.endPoint.y - stroke.startPoint.y)
        element.setAttribute('x', x)
        element.setAttribute('y', y)
        element.setAttribute('width', w)
        element.setAttribute('height', h)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('fill', 'none')
      } else if (stroke.tool === TOOLS.CIRCLE && stroke.startPoint && stroke.endPoint) {
        element = document.createElementNS(svgNS, 'circle')
        const radius = Math.sqrt(
          Math.pow(stroke.endPoint.x - stroke.startPoint.x, 2) +
          Math.pow(stroke.endPoint.y - stroke.startPoint.y, 2)
        )
        element.setAttribute('cx', stroke.startPoint.x)
        element.setAttribute('cy', stroke.startPoint.y)
        element.setAttribute('r', radius)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('fill', 'none')
      } else if (stroke.tool === TOOLS.TRIANGLE && stroke.startPoint && stroke.endPoint) {
        element = document.createElementNS(svgNS, 'polygon')
        const sx = stroke.startPoint.x
        const sy = stroke.startPoint.y
        const ex = stroke.endPoint.x
        const ey = stroke.endPoint.y
        const points = `${(sx + ex) / 2},${sy} ${ex},${ey} ${sx},${ey}`
        element.setAttribute('points', points)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('fill', 'none')
      } else if (stroke.tool === TOOLS.DIAMOND && stroke.startPoint && stroke.endPoint) {
        element = document.createElementNS(svgNS, 'polygon')
        const sx = stroke.startPoint.x
        const sy = stroke.startPoint.y
        const ex = stroke.endPoint.x
        const ey = stroke.endPoint.y
        const cx = (sx + ex) / 2
        const cy = (sy + ey) / 2
        const points = `${cx},${sy} ${ex},${cy} ${cx},${ey} ${sx},${cy}`
        element.setAttribute('points', points)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('fill', 'none')
      } else if (stroke.tool === TOOLS.ARROW && stroke.startPoint && stroke.endPoint) {
        const g = document.createElementNS(svgNS, 'g')
        const line = document.createElementNS(svgNS, 'line')
        line.setAttribute('x1', stroke.startPoint.x)
        line.setAttribute('y1', stroke.startPoint.y)
        line.setAttribute('x2', stroke.endPoint.x)
        line.setAttribute('y2', stroke.endPoint.y)
        line.setAttribute('stroke', stroke.color || '#000')
        line.setAttribute('stroke-width', stroke.strokeWidth || 3)
        g.appendChild(line)
        
        // Arrowhead
        const angle = Math.atan2(
          stroke.endPoint.y - stroke.startPoint.y,
          stroke.endPoint.x - stroke.startPoint.x
        )
        const headLen = 15
        const arrowhead = document.createElementNS(svgNS, 'polyline')
        const ax1 = stroke.endPoint.x - headLen * Math.cos(angle - Math.PI / 6)
        const ay1 = stroke.endPoint.y - headLen * Math.sin(angle - Math.PI / 6)
        const ax2 = stroke.endPoint.x - headLen * Math.cos(angle + Math.PI / 6)
        const ay2 = stroke.endPoint.y - headLen * Math.sin(angle + Math.PI / 6)
        arrowhead.setAttribute('points', `${ax1},${ay1} ${stroke.endPoint.x},${stroke.endPoint.y} ${ax2},${ay2}`)
        arrowhead.setAttribute('stroke', stroke.color || '#000')
        arrowhead.setAttribute('stroke-width', stroke.strokeWidth || 3)
        arrowhead.setAttribute('fill', 'none')
        g.appendChild(arrowhead)
        element = g
      } else if (stroke.tool === TOOLS.TEXT && stroke.startPoint) {
        element = document.createElementNS(svgNS, 'text')
        element.setAttribute('x', stroke.startPoint.x)
        element.setAttribute('y', stroke.startPoint.y)
        element.setAttribute('font-family', 'Arial, sans-serif')
        element.setAttribute('font-size', stroke.fontSize || 16)
        element.setAttribute('fill', stroke.color || '#000')
        element.textContent = stroke.text || ''
      } else if (stroke.tool === TOOLS.PEN && stroke.points?.length > 0) {
        element = document.createElementNS(svgNS, 'polyline')
        const points = stroke.points.map(p => `${p.x},${p.y}`).join(' ')
        element.setAttribute('points', points)
        element.setAttribute('stroke', stroke.color || '#000')
        element.setAttribute('stroke-width', stroke.strokeWidth || 3)
        element.setAttribute('stroke-linecap', 'round')
        element.setAttribute('stroke-linejoin', 'round')
        element.setAttribute('fill', 'none')
      } else if (stroke.tool === TOOLS.IMAGE && stroke.imageData) {
        element = document.createElementNS(svgNS, 'image')
        element.setAttribute('x', stroke.startPoint.x)
        element.setAttribute('y', stroke.startPoint.y)
        element.setAttribute('width', stroke.width || 100)
        element.setAttribute('height', stroke.height || 100)
        element.setAttributeNS('http://www.w3.org/1999/xlink', 'href', stroke.imageData)
      }
      
      if (element) {
        if (group) {
          group.appendChild(element)
          svg.appendChild(group)
        } else {
          svg.appendChild(element)
        }
      }
    })
    
    // Download SVG
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${filename}.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }
  
  // Export as PDF using canvas to image
  const exportAsPDF = async (filename) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Create PDF using jsPDF (dynamically imported)
    try {
      const { jsPDF } = await import('jspdf')
      
      // Create PDF with canvas dimensions (scaled to fit A4 or similar)
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: CANVAS_WIDTH > CANVAS_HEIGHT ? 'landscape' : 'portrait',
        unit: 'px',
        format: [CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2] // Scale down for reasonable file size
      })
      
      pdf.addImage(imgData, 'PNG', 0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      // Fallback: alert user to install jspdf
      alert('PDF export requires jspdf library. Falling back to PNG export.')
      handleExport('png')
    }
  }

  // Handle mouse leaving canvas
  const handleMouseLeave = () => {
    if (isDrawing) {
      stopDrawing({ clientX: 0, clientY: 0 })
    }
    setIsPanning(false)
  }

  // Cursor updates are now realtime (no throttle)
  
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
    
    // Emit cursor position and current tool in realtime
    if (socket && !isPanning) {
      socket.emit('cursor:move', { x, y, tool })
    }
    
    // Handle transform mode (resize/rotate)
    if (transformMode && selectedStroke && transformStart.current) {
      const { bounds, originalStroke } = transformStart.current
      let updatedStroke = { ...selectedStroke }
      
      if (transformMode === 'rotate') {
        // Calculate rotation angle from center
        const centerX = bounds.x + bounds.width / 2
        const centerY = bounds.y + bounds.height / 2
        const startAngle = Math.atan2(
          transformStart.current.y - centerY,
          transformStart.current.x - centerX
        )
        const currentAngle = Math.atan2(y - centerY, x - centerX)
        const deltaAngle = (currentAngle - startAngle) * 180 / Math.PI
        updatedStroke.rotation = ((originalStroke.rotation || 0) + deltaAngle) % 360
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
          // For text, just move the position (scaling text is complex)
          updatedStroke.startPoint = { x: newX, y: newY + newHeight }
        } else if (updatedStroke.startPoint && updatedStroke.endPoint) {
          // For shapes, update start and end points
          updatedStroke.startPoint = { x: newX, y: newY }
          updatedStroke.endPoint = { x: newX + newWidth, y: newY + newHeight }
        }
      }
      
      setSelectedStroke(updatedStroke)
      
      // Redraw with updated stroke
      const updatedStrokes = strokes.map(s => 
        s.id === selectedStroke.id ? updatedStroke : s
      )
      const allStrokes = [...updatedStrokes, ...Object.values(previewStrokes)]
      redrawWithStrokes(allStrokes)
      drawSelectionHighlight(updatedStroke)
      return
    }
    
    // Handle dragging selected element
    if (isDragging && selectedStroke) {
      // Calculate new startPoint position
      const newStartX = x - dragOffset.current.x
      const newStartY = y - dragOffset.current.y
      
      // Update stroke position locally for preview
      let updatedStroke = { ...selectedStroke }
      
      if (updatedStroke.startPoint && updatedStroke.endPoint) {
        // For shapes with startPoint and endPoint, move both points
        const dx = newStartX - selectedStroke.startPoint.x
        const dy = newStartY - selectedStroke.startPoint.y
        updatedStroke.startPoint = { x: newStartX, y: newStartY }
        updatedStroke.endPoint = {
          x: selectedStroke.endPoint.x + dx,
          y: selectedStroke.endPoint.y + dy
        }
      } else {
        // For text, images, and other single-point strokes
        updatedStroke.startPoint = { x: newStartX, y: newStartY }
      }
      
      setSelectedStroke(updatedStroke)
      
      // Redraw with updated position
      const updatedStrokes = strokes.map(s => 
        s.id === selectedStroke.id ? updatedStroke : s
      )
      const allStrokes = [...updatedStrokes, ...Object.values(previewStrokes)]
      redrawWithStrokes(allStrokes)
      
      // Draw selection highlight
      drawSelectionHighlight(updatedStroke)
      return
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
  const isPanningRef = useRef(isPanning)
  const toolRef = useRef(tool)
  
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { isPanningRef.current = isPanning }, [isPanning])
  useEffect(() => { toolRef.current = tool }, [tool])

  // Attach native event listeners with passive: false AFTER handlers are defined
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Wheel handler needs passive: false to prevent scroll
    const wheelHandler = (e) => {
      e.preventDefault()
      
      // Don't zoom while drawing
      if (isDrawingRef.current) return
      
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
    }

    // Touch handlers need passive: false to prevent scroll/zoom on mobile
    const touchStartHandler = (e) => {
      if (e.touches.length === 2) {
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
      }
    }

    const touchMoveHandler = (e) => {
      // Don't zoom while drawing
      if (isDrawingRef.current) return
      
      if (e.touches.length === 2 && lastPinchDistance.current) {
        e.preventDefault()
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
      } else if (e.touches.length === 1 && !isPanningRef.current) {
        e.preventDefault() // Prevent scroll while drawing
      }
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
    // Center canvas in viewport
    const container = containerRef.current
    if (container) {
      const w = container.offsetWidth
      const h = container.offsetHeight
      setPan({ x: (w - CANVAS_WIDTH) / 2, y: (h - CANVAS_HEIGHT) / 2 })
    } else {
      setPan({ x: 0, y: 0 })
    }
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
      <div className="glass border-b border-slate-200 p-3 flex flex-wrap items-center gap-4 relative z-50">
        {/* Basic Tools (Select, Pen, Eraser, Hand) */}
        <div className="flex gap-1 p-1 glass rounded-xl">
          <button
            onClick={() => { setTool(TOOLS.SELECT); setSelectedStroke(null); }}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.SELECT 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Select/Move (V)"
          >
            👆
          </button>
          <button
            onClick={() => setTool(TOOLS.PEN)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.PEN 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Pen (P)"
          >
            ✏️
          </button>
          <button
            onClick={() => setTool(TOOLS.ERASER)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.ERASER 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Eraser (E)"
          >
            🧹
          </button>
          <button
            onClick={() => setTool(TOOLS.HAND)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.HAND 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Hand (H)"
          >
            ✋
          </button>
        </div>

        {/* Shapes Dropdown */}
        <Dropdown 
          trigger={
            <button className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              [TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.ARROW, TOOLS.DIAMOND].includes(tool)
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'glass text-slate-600 hover:bg-slate-100'
            }`}>
              {tool === TOOLS.LINE && '📏'}
              {tool === TOOLS.RECTANGLE && '⬜'}
              {tool === TOOLS.CIRCLE && '⭕'}
              {tool === TOOLS.TRIANGLE && '🔺'}
              {tool === TOOLS.ARROW && '➡️'}
              {tool === TOOLS.DIAMOND && '🔷'}
              {![TOOLS.LINE, TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.TRIANGLE, TOOLS.ARROW, TOOLS.DIAMOND].includes(tool) && '⬜'}
              <span className="text-sm">Shapes</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          }
        >
          <DropdownItem 
            onClick={() => setTool(TOOLS.LINE)}
            active={tool === TOOLS.LINE}
          >
            <span className="flex items-center gap-2">
              📏 Line <span className="text-xs text-gray-400 ml-auto">L</span>
            </span>
          </DropdownItem>
          <DropdownItem 
            onClick={() => setTool(TOOLS.RECTANGLE)}
            active={tool === TOOLS.RECTANGLE}
          >
            <span className="flex items-center gap-2">
              ⬜ Rectangle <span className="text-xs text-gray-400 ml-auto">R</span>
            </span>
          </DropdownItem>
          <DropdownItem 
            onClick={() => setTool(TOOLS.CIRCLE)}
            active={tool === TOOLS.CIRCLE}
          >
            <span className="flex items-center gap-2">
              ⭕ Circle <span className="text-xs text-gray-400 ml-auto">C</span>
            </span>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem 
            onClick={() => setTool(TOOLS.TRIANGLE)}
            active={tool === TOOLS.TRIANGLE}
          >
            <span className="flex items-center gap-2">
              🔺 Triangle
            </span>
          </DropdownItem>
          <DropdownItem 
            onClick={() => setTool(TOOLS.ARROW)}
            active={tool === TOOLS.ARROW}
          >
            <span className="flex items-center gap-2">
              ➡️ Arrow
            </span>
          </DropdownItem>
          <DropdownItem 
            onClick={() => setTool(TOOLS.DIAMOND)}
            active={tool === TOOLS.DIAMOND}
          >
            <span className="flex items-center gap-2">
              🔷 Diamond
            </span>
          </DropdownItem>
        </Dropdown>

        {/* Text & Image */}
        <div className="flex gap-1 p-1 glass rounded-xl">
          <button
            onClick={() => setTool(TOOLS.TEXT)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.TEXT 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Text (T)"
          >
            🔤
          </button>
          <button
            onClick={() => setTool(TOOLS.IMAGE)}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              tool === TOOLS.IMAGE 
                ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
            title="Image (I)"
          >
            🖼️
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-200" />

        {/* Color Picker Dropdown */}
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 px-3 py-2.5 glass rounded-xl hover:bg-slate-100 transition-all duration-200">
              <div 
                className="w-6 h-6 rounded-md border-2 border-white shadow-sm" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-slate-600">Color</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          }
          className="min-w-[200px]"
        >
          <div className="px-4 py-3">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                    color === c 
                      ? 'ring-2 ring-sky-500 ring-offset-2 scale-110' 
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </Dropdown>

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
          
          {/* Export Dropdown */}
          <Dropdown
            trigger={
              <button
                className="px-3 py-2 text-sm bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200 
                         hover:bg-emerald-200 transition-all duration-200 flex items-center gap-1"
                title="Export"
              >
                📥 <ChevronDown className="w-3 h-3" />
              </button>
            }
          >
            <DropdownItem onClick={() => handleExport('png')}>
              <span className="flex items-center gap-2">
                🖼️ Export as PNG
              </span>
            </DropdownItem>
            <DropdownItem onClick={() => handleExport('svg')}>
              <span className="flex items-center gap-2">
                📐 Export as SVG
              </span>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => handleExport('pdf')}>
              <span className="flex items-center gap-2">
                📄 Export as PDF
              </span>
            </DropdownItem>
          </Dropdown>
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
          } else if (transformMode && selectedStroke) {
            // Finish transform - save the new state
            setTransformMode(null)
            transformStart.current = null
            
            // Update the stroke in parent state
            if (onStrokeUpdate) {
              onStrokeUpdate(selectedStroke)
            }
            
            // Emit update to server
            if (socket) {
              socket.emit('draw:update', { stroke: selectedStroke })
            }
          } else if (isDragging && selectedStroke) {
            // Finish dragging - save the new position
            setIsDragging(false)
            
            // Update the stroke in parent state
            if (onStrokeUpdate) {
              onStrokeUpdate(selectedStroke)
            }
            
            // Emit update to server
            if (socket) {
              socket.emit('draw:update', { stroke: selectedStroke })
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

        {/* Other users' cursors - realtime with will-change for GPU acceleration */}
        {Object.entries(cursors).map(([userId, cursor]) => {
          const screenPos = canvasToScreen(cursor.x, cursor.y)
          
          // Tool indicator emoji
          const toolIcon = {
            [TOOLS.PEN]: '✏️',
            [TOOLS.ERASER]: '🧹',
            [TOOLS.SELECT]: '👆',
            [TOOLS.LINE]: '📏',
            [TOOLS.RECTANGLE]: '⬜',
            [TOOLS.CIRCLE]: '⭕',
            [TOOLS.TRIANGLE]: '🔺',
            [TOOLS.ARROW]: '➡️',
            [TOOLS.DIAMOND]: '🔷',
            [TOOLS.TEXT]: '🔤',
            [TOOLS.IMAGE]: '🖼️',
            [TOOLS.HAND]: '✋'
          }[cursor.tool] || '✏️'
          
          return (
            <div
              key={userId}
              className="absolute pointer-events-none"
              style={{
                transform: `translate(${screenPos.x - 8}px, ${screenPos.y - 8}px)`,
                willChange: 'transform' // GPU accelerated
              }}
            >
              {/* Cursor dot */}
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: cursor.color }}
              />
              
              {/* Tool indicator */}
              <div 
                className="absolute -top-5 -right-5 w-6 h-6 flex items-center justify-center text-xs rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: cursor.color }}
              >
                {toolIcon}
              </div>
              
              {/* Username label */}
              {showCursorNames && (
                <span
                  className="absolute top-5 left-2 text-xs px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm"
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
