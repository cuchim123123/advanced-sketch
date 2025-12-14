import { useRef } from 'react'

/**
 * Hook to manage all canvas refs
 */
export function useCanvasRefs(strokes) {
  return {
    // Canvas DOM refs
    canvasRef: useRef(null),
    containerRef: useRef(null),
    contextRef: useRef(null),
    
    // Stroke tracking
    strokesRef: useRef(strokes),
    currentStroke: useRef(null),
    startPoint: useRef(null),
    
    // Input refs
    textInputRef: useRef(null),
    imageInputRef: useRef(null),
    pendingImagePosition: useRef(null),
    imageCache: useRef(new Map()),
    
    // Cache
    containerRectCache: useRef(null),
    
    // Shape preview
    shapePreviewSnapshot: useRef(null),
    
    // RAF refs
    rafRef: useRef(null),
    drawRafId: useRef(null),
    transformRafId: useRef(null),
    
    // Point tracking
    pendingPoint: useRef(null),
    pendingDrawEvent: useRef(null),
    lastDrawPoint: useRef(null),
    pendingTransformStroke: useRef(null),
    
    // Throttle refs
    lastEmitTime: useRef(0),
    lastSentPointIndex: useRef(0),
    lastCursorEmit: useRef(0),
    lastTransformEmit: useRef(0)
  }
}
