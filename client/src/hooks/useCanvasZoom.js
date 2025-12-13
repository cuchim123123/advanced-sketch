import { useState, useRef, useEffect, useCallback } from 'react'
import { MIN_ZOOM, MAX_ZOOM, CANVAS_WIDTH, CANVAS_HEIGHT } from '../components/canvas/constants'

/**
 * Hook for handling zoom and pan in the canvas
 */
export function useCanvasZoom(containerRef, isDrawingRef) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  
  const lastPanPoint = useRef(null)
  const lastPinchDistance = useRef(null)
  
  // Refs for native event handlers (avoid stale closures)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const isPanningRef = useRef(isPanning)

  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { isPanningRef.current = isPanning }, [isPanning])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev * 1.2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev / 1.2))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
    const container = containerRef.current
    if (container) {
      const w = container.offsetWidth
      const h = container.offsetHeight
      setPan({ x: (w - CANVAS_WIDTH) / 2, y: (h - CANVAS_HEIGHT) / 2 })
    } else {
      setPan({ x: 0, y: 0 })
    }
  }, [containerRef])

  // Start panning
  const startPan = useCallback((e) => {
    setIsPanning(true)
    lastPanPoint.current = { x: e.clientX, y: e.clientY }
  }, [])

  // Handle panning during mouse move
  const handlePanMove = useCallback((e) => {
    if (isPanning && lastPanPoint.current) {
      const dx = e.clientX - lastPanPoint.current.x
      const dy = e.clientY - lastPanPoint.current.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPanPoint.current = { x: e.clientX, y: e.clientY }
      return true
    }
    return false
  }, [isPanning])

  // Should pan check
  const shouldPan = useCallback(() => {
    return spacePressed
  }, [spacePressed])

  // Attach native event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wheelHandler = (e) => {
      e.preventDefault()
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
        e.preventDefault()
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
  }, [containerRef, isDrawingRef])

  // Reset pinch on touch end
  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null
    setIsPanning(false)
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
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    startPan,
    handlePanMove,
    shouldPan,
    handleTouchEnd,
    lastPanPoint
  }
}
