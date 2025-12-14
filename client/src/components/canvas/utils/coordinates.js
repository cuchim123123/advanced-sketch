import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants'

/**
 * Convert screen coordinates to canvas coordinates
 * @param {MouseEvent|TouchEvent} e - Event with clientX/clientY
 * @param {DOMRect} containerRect - Cached container bounding rect
 * @param {number} zoom - Current zoom level
 * @param {{x: number, y: number}} pan - Current pan offset
 * @returns {{x: number, y: number}} Canvas coordinates
 */
export function getCanvasCoordinates(e, containerRect, zoom, pan) {
  // Handle both mouse and touch events
  const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0
  const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.changedTouches?.[0]?.clientY ?? 0
  
  // Convert screen coordinates to canvas coordinates (accounting for zoom and pan)
  const x = (clientX - containerRect.left - pan.x) / zoom
  const y = (clientY - containerRect.top - pan.y) / zoom
  
  return { x, y }
}

/**
 * Convert canvas coordinates to screen coordinates
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 * @param {number} zoom - Current zoom level
 * @param {{x: number, y: number}} pan - Current pan offset
 * @returns {{x: number, y: number}} Screen coordinates
 */
export function canvasToScreenCoordinates(x, y, zoom, pan) {
  return {
    x: x * zoom + pan.x,
    y: y * zoom + pan.y
  }
}

/**
 * Check if coordinates are within canvas bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [width=CANVAS_WIDTH] - Canvas width
 * @param {number} [height=CANVAS_HEIGHT] - Canvas height
 * @returns {boolean}
 */
export function isWithinCanvas(x, y, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  return x >= 0 && x <= width && y >= 0 && y <= height
}

/**
 * Clamp coordinates to canvas bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [width=CANVAS_WIDTH] - Canvas width
 * @param {number} [height=CANVAS_HEIGHT] - Canvas height
 * @returns {{x: number, y: number}} Clamped coordinates
 */
export function clampToCanvas(x, y, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  return {
    x: Math.max(0, Math.min(width, x)),
    y: Math.max(0, Math.min(height, y))
  }
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1)
}

/**
 * Transform a point by inverse rotation around a center
 * Used for hit detection on rotated elements
 * @param {number} x - Point X
 * @param {number} y - Point Y
 * @param {number} centerX - Rotation center X
 * @param {number} centerY - Rotation center Y
 * @param {number} rotationDeg - Rotation in degrees
 * @returns {{x: number, y: number}} Transformed point
 */
export function rotatePointInverse(x, y, centerX, centerY, rotationDeg) {
  if (rotationDeg === 0) return { x, y }
  
  const rad = -rotationDeg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  
  return {
    x: cos * (x - centerX) - sin * (y - centerY) + centerX,
    y: sin * (x - centerX) + cos * (y - centerY) + centerY
  }
}

/**
 * Calculate zoom based on pinch distance
 * @param {Touch} touch1 - First touch point
 * @param {Touch} touch2 - Second touch point
 * @returns {number} Distance between touches
 */
export function getPinchDistance(touch1, touch2) {
  return Math.hypot(
    touch2.clientX - touch1.clientX,
    touch2.clientY - touch1.clientY
  )
}

/**
 * Get center point between two touches
 * @param {Touch} touch1 - First touch point
 * @param {Touch} touch2 - Second touch point
 * @returns {{x: number, y: number}} Center point
 */
export function getPinchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  }
}
