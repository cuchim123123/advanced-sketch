import { useEffect, useCallback } from 'react'
import { TOOLS } from '../constants'

/**
 * Hook to manage canvas keyboard shortcuts
 */
export function useCanvasKeyboard({
  tool,
  setTool,
  setSpacePressed,
  setIsPanning,
  setSelectedStroke,
  setShowShortcuts,
  onDelete,
  onUndo,
  onRedo,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  disabled = false
}) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (disabled) return
    
    // Check if typing in an input field
    const target = e.target
    const isTyping = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable
    
    if (isTyping) return
    
    // Space for hand tool / panning
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      setSpacePressed(true)
      return
    }
    
    // Delete selected stroke
    if ((e.key === 'Delete' || e.key === 'Backspace') && onDelete) {
      e.preventDefault()
      onDelete()
      return
    }
    
    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey && onRedo) {
            onRedo()
          } else if (onUndo) {
            onUndo()
          }
          break
        case 'y':
          e.preventDefault()
          if (onRedo) onRedo()
          break
        case 'e':
          e.preventDefault()
          if (onExport) onExport()
          break
        case '0':
          e.preventDefault()
          if (onResetZoom) onResetZoom()
          break
        case '=':
        case '+':
          e.preventDefault()
          if (onZoomIn) onZoomIn()
          break
        case '-':
          e.preventDefault()
          if (onZoomOut) onZoomOut()
          break
        default:
          break
      }
      return
    }
    
    // Tool shortcuts (single keys)
    switch (e.key.toLowerCase()) {
      case 'v':
        setTool(TOOLS.SELECT)
        if (setSelectedStroke) setSelectedStroke(null)
        break
      case 'p':
        setTool(TOOLS.PEN)
        break
      case 'e':
        setTool(TOOLS.ERASER)
        break
      case 'h':
        setTool(TOOLS.HAND)
        break
      case 'l':
        setTool(TOOLS.LINE)
        break
      case 'r':
        setTool(TOOLS.RECTANGLE)
        break
      case 'c':
        setTool(TOOLS.CIRCLE)
        break
      case 't':
        setTool(TOOLS.TEXT)
        break
      case 'i':
        setTool(TOOLS.IMAGE)
        break
      case '?':
        if (setShowShortcuts) setShowShortcuts(prev => !prev)
        break
      case 'escape':
        if (setShowShortcuts) setShowShortcuts(false)
        if (setSelectedStroke) setSelectedStroke(null)
        break
      default:
        break
    }
  }, [disabled, setTool, setSpacePressed, setSelectedStroke, setShowShortcuts, onDelete, onUndo, onRedo, onClear, onZoomIn, onZoomOut, onResetZoom, onExport])

  const handleKeyUp = useCallback((e) => {
    if (e.code === 'Space') {
      setSpacePressed(false)
      if (setIsPanning) setIsPanning(false)
    }
  }, [setSpacePressed, setIsPanning])

  // Attach keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return {
    handleKeyDown,
    handleKeyUp
  }
}
