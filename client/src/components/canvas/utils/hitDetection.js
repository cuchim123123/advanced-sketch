import { getStrokeBounds } from '../strokeRenderer'
import { rotatePointInverse } from './coordinates'

/**
 * Check if a point is inside a stroke's bounding box
 * @param {Object} stroke - The stroke to test
 * @param {number} x - Test point X
 * @param {number} y - Test point Y
 * @param {CanvasRenderingContext2D} ctx - Canvas context for text measurement
 * @param {Map} imageCache - Image cache for getting image dimensions
 * @returns {boolean} True if point is inside stroke bounds
 */
export function isPointInStroke(stroke, x, y, ctx, imageCache) {
  if (!stroke) return false
  
  const bounds = getStrokeBounds(stroke, ctx, imageCache)
  if (!bounds) return false
  
  // Apply rotation transform to test point if stroke is rotated
  const rotation = stroke.rotation || 0
  let tx = x, ty = y
  
  if (rotation !== 0) {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const transformed = rotatePointInverse(x, y, centerX, centerY, rotation)
    tx = transformed.x
    ty = transformed.y
  }
  
  return tx >= bounds.x && tx <= bounds.x + bounds.width &&
         ty >= bounds.y && ty <= bounds.y + bounds.height
}

/**
 * Find the topmost stroke at a given point
 * @param {Array} strokes - Array of strokes to search
 * @param {number} x - Test point X
 * @param {number} y - Test point Y
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Map} imageCache - Image cache
 * @returns {Object|null} The found stroke or null
 */
export function findStrokeAtPoint(strokes, x, y, ctx, imageCache) {
  // Search in reverse order (top-most first)
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i]
    if (isPointInStroke(stroke, x, y, ctx, imageCache)) {
      return stroke
    }
  }
  return null
}

/**
 * Check if a point is on a transform handle
 * @param {number} x - Test point X
 * @param {number} y - Test point Y
 * @param {Object} stroke - The selected stroke
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Map} imageCache - Image cache
 * @returns {string|null} Handle type ('resize-nw', 'resize-ne', etc.) or null
 */
export function getTransformHandleAtPoint(x, y, stroke, ctx, imageCache) {
  if (!stroke) return null
  
  const bounds = getStrokeBounds(stroke, ctx, imageCache)
  if (!bounds) return null
  
  const padding = 4
  const handleSize = 12 // Slightly larger hit area
  const rotation = stroke.rotation || 0
  
  // Transform point if rotation is applied
  let tx = x, ty = y
  if (rotation !== 0) {
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2
    const transformed = rotatePointInverse(x, y, centerX, centerY, rotation)
    tx = transformed.x
    ty = transformed.y
  }
  
  // Check rotation handle first
  const rotateHandleY = bounds.y - padding - 25
  const rotateHandleX = bounds.x + bounds.width / 2
  if (Math.hypot(tx - rotateHandleX, ty - rotateHandleY) <= 12) {
    return 'rotate'
  }
  
  // Check corner handles
  const handles = [
    { x: bounds.x - padding, y: bounds.y - padding, type: 'resize-nw' },
    { x: bounds.x + bounds.width + padding, y: bounds.y - padding, type: 'resize-ne' },
    { x: bounds.x - padding, y: bounds.y + bounds.height + padding, type: 'resize-sw' },
    { x: bounds.x + bounds.width + padding, y: bounds.y + bounds.height + padding, type: 'resize-se' }
  ]
  
  for (const handle of handles) {
    if (Math.abs(tx - handle.x) <= handleSize && Math.abs(ty - handle.y) <= handleSize) {
      return handle.type
    }
  }
  
  return null
}
