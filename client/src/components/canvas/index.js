/**
 * Canvas feature module
 * Enterprise-level folder structure:
 * 
 * canvas/
 * ├── components/          # UI Sub-components
 * │   ├── CanvasToolbar.jsx
 * │   ├── CursorOverlay.jsx
 * │   └── KeyboardShortcutsModal.jsx
 * ├── hooks/               # Custom React hooks
 * │   ├── useCanvasState.js
 * │   ├── useCanvasZoom.js
 * │   ├── useCanvasKeyboard.js
 * │   ├── useCanvasDrawing.js
 * │   └── useCanvasTransform.js
 * ├── utils/               # Pure utility functions
 * │   ├── coordinates.js
 * │   ├── hitDetection.js
 * │   └── cursor.js
 * ├── constants.js         # Constants and enums
 * ├── strokeRenderer.js    # Canvas rendering utilities
 * ├── Canvas.jsx           # Main component (orchestrator)
 * └── index.js             # Public API
 */

// Constants
export { 
  TOOLS, 
  COLORS, 
  SHAPE_TOOLS, 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  EMIT_THROTTLE, 
  CURSOR_THROTTLE
} from './constants'

// Stroke renderer utilities
export { 
  drawStroke, 
  getStrokeBounds, 
  drawSelectionHighlight, 
  redrawCanvas, 
  drawShapePreview 
} from './strokeRenderer'

// Sub-components
export { default as CursorOverlay } from './components/CursorOverlay'
export { default as KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
export { default as CanvasToolbar } from './components/CanvasToolbar'

// Hooks
export * from './hooks'

// Utils
export * from './utils'
