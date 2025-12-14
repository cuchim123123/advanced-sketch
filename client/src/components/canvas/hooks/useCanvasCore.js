import { useRef, useEffect, useCallback } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants'
import { drawStroke, drawSelectionHighlight } from '../strokeRenderer'

/**
 * Preload all images in strokes to ensure correct layer order when rendering
 */
async function preloadImages(strokes, imageCache) {
  const imageStrokes = strokes.filter(s => s.tool === 'image' && s.imageData)
  
  const loadPromises = imageStrokes.map(stroke => {
    return new Promise((resolve) => {
      // Already cached
      if (imageCache.get(stroke.id)?.complete) {
        resolve()
        return
      }
      
      const img = new Image()
      img.onload = () => {
        imageCache.set(stroke.id, img)
        resolve()
      }
      img.onerror = () => {
        console.warn('Failed to load image:', stroke.id)
        resolve() // Resolve anyway to not block rendering
      }
      img.src = stroke.imageData
    })
  })
  
  await Promise.all(loadPromises)
}

/**
 * Core canvas setup, refs, and redraw logic
 */
export function useCanvasCore({ strokes, previewStrokes, selectedStroke, tool, transformMode, isDragging }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const contextRef = useRef(null)
  const strokesRef = useRef(strokes)
  const containerRectCache = useRef(null)
  const imageCache = useRef(new Map())
  const shapePreviewSnapshot = useRef(null)

  // Keep strokesRef in sync
  useEffect(() => {
    strokesRef.current = [...strokes, ...Object.values(previewStrokes)]
  }, [strokes, previewStrokes])

  // Redraw helper (sync version for immediate use)
  const redrawWithStrokes = useCallback((strokesArray) => {
    const ctx = contextRef.current
    if (!ctx) return

    const canvas = canvasRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    strokesArray.forEach(stroke => {
      if (stroke?.tool) {
        drawStroke(stroke, ctx, imageCache.current)
      }
    })
  }, [])

  // Preload images then redraw (for initial load)
  const preloadAndRedraw = useCallback(async (strokesArray) => {
    await preloadImages(strokesArray, imageCache.current)
    redrawWithStrokes(strokesArray)
  }, [redrawWithStrokes])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
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
      contextRef.current = ctx

      // Preload images before first render to maintain correct layer order
      preloadImages(strokesRef.current, imageCache.current).then(() => {
        redrawWithStrokes(strokesRef.current)
      })
    }
    
    setupCanvas()
    containerRectCache.current = container.getBoundingClientRect()
    
    const handleScroll = () => {
      containerRectCache.current = container.getBoundingClientRect()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    const resizeObserver = new ResizeObserver(() => {
      containerRectCache.current = container.getBoundingClientRect()
    })
    resizeObserver.observe(container)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return {
    canvasRef,
    containerRef,
    contextRef,
    strokesRef,
    containerRectCache,
    imageCache,
    shapePreviewSnapshot,
    redrawWithStrokes
  }
}
