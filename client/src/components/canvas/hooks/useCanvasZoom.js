import { useState, useRef, useEffect } from 'react'
import { MIN_ZOOM, MAX_ZOOM } from '../constants'

/**
 * Hook to manage canvas zoom and pan
 */
export function useCanvasZoom(containerRef, isDrawingRef) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  
  const lastPanPoint = useRef(null)
  const lastPinchDistance = useRef(null)
  
  // Refs for native event handlers (to avoid stale closures)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const isPanningRef = useRef(isPanning)
  
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { isPanningRef.current = isPanning }, [isPanning])

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2))
  }
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2))
  }
  
  const handleResetZoom = (containerRef, canvasWidth, canvasHeight) => {
    setZoom(1)
    // Center canvas in viewport
    const container = containerRef.current
    if (container) {
      const w = container.offsetWidth
      const h = container.offsetHeight
      setPan({ x: (w - canvasWidth) / 2, y: (h - canvasHeight) / 2 })
    } else {
      setPan({ x: 0, y: 0 })
    }
  }

  // Start panning
  const startPan = (e) => {
    setIsPanning(true)
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
  }
  
  // Handle panning movement
  const handlePanMove = (e) => {
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x
      const dy = e.clientY - lastPanPoint.current.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      return true // Handled
    }
    return false
  }
  
  // Check if should pan
  const shouldPan = () => spacePressed

  // Attach native wheel/touch events for zoom
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

    // Touch handlers for pinch zoom
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

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    spacePressed,
    setSpacePressed,
    lastPanPoint,
    lastPinchDistance,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    startPan,
    handlePanMove,
    shouldPan
  }
}
