import { useRef, useCallback } from 'react'
import { TOOLS } from '../constants'

/**
 * Hook to handle text input operations
 */
export function useCanvasText({
  canvasRef, containerRef, scale, offset, currentColor,
  socket, roomId, addToast
}) {
  const textInputRef = useRef(null)
  const activeTextPosition = useRef(null)
  const showTextInput = useRef(false)
  const textContent = useRef('')

  const startTextInput = useCallback((x, y) => {
    activeTextPosition.current = { x, y }
    showTextInput.current = true
    textContent.current = ''
  }, [])

  const handleTextChange = useCallback((e) => {
    textContent.current = e.target.value
  }, [])

  const handleTextKeyDown = useCallback((e, { fontSize, fontFamily, fontStyle }) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      
      if (textContent.current.trim() && activeTextPosition.current) {
        const textStroke = {
          id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tool: TOOLS.TEXT,
          text: textContent.current,
          startPoint: activeTextPosition.current,
          color: currentColor,
          fontSize: fontSize || 16,
          fontFamily: fontFamily || 'Arial',
          fontStyle: fontStyle || 'normal',
          rotation: 0,
          timestamp: Date.now()
        }
        
        if (socket && roomId) {
          socket.emit('draw:stroke', { roomId, stroke: textStroke })
        }
        
        return textStroke
      }
      
      // Close text input
      showTextInput.current = false
      activeTextPosition.current = null
      textContent.current = ''
      return null
    }
    
    if (e.key === 'Escape') {
      showTextInput.current = false
      activeTextPosition.current = null
      textContent.current = ''
    }
    
    return null
  }, [currentColor, socket, roomId])

  const handleTextBlur = useCallback(() => {
    // Don't immediately close - let Enter handle submission
    // Only close if clicking elsewhere
    setTimeout(() => {
      if (!textContent.current.trim()) {
        showTextInput.current = false
        activeTextPosition.current = null
      }
    }, 100)
  }, [])

  const getTextInputPosition = useCallback(() => {
    if (!activeTextPosition.current || !containerRef.current) return null
    
    const rect = containerRef.current.getBoundingClientRect()
    return {
      left: activeTextPosition.current.x * scale + offset.x,
      top: activeTextPosition.current.y * scale + offset.y
    }
  }, [scale, offset])

  const cancelTextInput = useCallback(() => {
    showTextInput.current = false
    activeTextPosition.current = null
    textContent.current = ''
  }, [])

  return {
    textInputRef,
    activeTextPosition,
    showTextInput,
    textContent,
    startTextInput,
    handleTextChange,
    handleTextKeyDown,
    handleTextBlur,
    getTextInputPosition,
    cancelTextInput
  }
}
