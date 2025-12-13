// Canvas tools enum
export const TOOLS = {
  SELECT: 'select',
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
  HAND: 'hand'
}

// Shape tools that have startPoint and endPoint
export const SHAPE_TOOLS = [
  TOOLS.LINE,
  TOOLS.RECTANGLE,
  TOOLS.CIRCLE,
  TOOLS.TRIANGLE,
  TOOLS.ARROW,
  TOOLS.DIAMOND
]

// Available colors
export const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FF6B6B',
  '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
]

// Canvas dimensions
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080
export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 4

// Throttle settings
export const EMIT_THROTTLE = 50 // ms between socket emits
export const CURSOR_THROTTLE = 33 // ~30fps for cursor updates

// Tool icons for cursor overlay
export const TOOL_ICONS = {
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
}
