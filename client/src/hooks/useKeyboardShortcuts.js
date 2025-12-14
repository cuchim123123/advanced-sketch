import { useEffect, useCallback } from 'react'
import { TOOLS } from '@/components/canvas/constants'

/**
 * Hook for handling keyboard shortcuts in the canvas
 */
export function useKeyboardShortcuts({
  onToolChange,
  onUndo,
  onRedo,
  onExport,
  onToggleShortcuts,
  onEscape,
  setSpacePressed,
  setIsPanning
}) {
  const handleKeyDown = useCallback((e) => {
    // Ignore if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      setSpacePressed(true)
    }

    // Keyboard shortcuts with modifiers
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault()
          if (e.shiftKey) {
            onRedo?.()
          } else {
            onUndo?.()
          }
          break
        case 'y':
          e.preventDefault()
          onRedo?.()
          break
        case 'e':
          e.preventDefault()
          onExport?.()
          break
      }
    } else {
      // Tool shortcuts (single keys)
      switch (e.key.toLowerCase()) {
        case 'v':
          onToolChange(TOOLS.SELECT)
          break
        case 'p':
          onToolChange(TOOLS.PEN)
          break
        case 'e':
          onToolChange(TOOLS.ERASER)
          break
        case 'l':
          onToolChange(TOOLS.LINE)
          break
        case 'r':
          onToolChange(TOOLS.RECTANGLE)
          break
        case 'c':
          onToolChange(TOOLS.CIRCLE)
          break
        case 't':
          onToolChange(TOOLS.TEXT)
          break
        case 'i':
          onToolChange(TOOLS.IMAGE)
          break
        case 'h':
          onToolChange(TOOLS.HAND)
          break
        case '?':
          onToggleShortcuts?.()
          break
        case 'escape':
          onEscape?.()
          break
      }
    }
  }, [onToolChange, onUndo, onRedo, onExport, onToggleShortcuts, onEscape, setSpacePressed])

  const handleKeyUp = useCallback((e) => {
    if (e.code === 'Space') {
      setSpacePressed(false)
      setIsPanning(false)
    }
  }, [setSpacePressed, setIsPanning])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
