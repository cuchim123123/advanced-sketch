import { useState, useRef } from 'react'
import { TOOLS } from '../constants'

/**
 * Hook to manage canvas state (tool, color, stroke settings)
 */
export function useCanvasState() {
  // Drawing tool state
  const [tool, setTool] = useState(TOOLS.PEN)
  const [color, setColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [fontSize, setFontSize] = useState(16)
  const [isDrawing, setIsDrawing] = useState(false)
  
  // Selection state
  const [selectedStroke, setSelectedStroke] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Transform state
  const [transformMode, setTransformMode] = useState(null)
  
  // Text input state
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, value: '' })
  
  // Keyboard shortcuts modal
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Refs
  const isDrawingRef = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const transformStart = useRef({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const originalStrokeRef = useRef(null)

  return {
    // Tool state
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    
    // Drawing state
    isDrawing,
    setIsDrawing,
    isDrawingRef,
    
    // Selection state
    selectedStroke,
    setSelectedStroke,
    isDragging,
    setIsDragging,
    dragOffset,
    
    // Transform state
    transformMode,
    setTransformMode,
    transformStart,
    originalStrokeRef,
    
    // Text input
    textInput,
    setTextInput,
    
    // Shortcuts modal
    showShortcuts,
    setShowShortcuts
  }
}
