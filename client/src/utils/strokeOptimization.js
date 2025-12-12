/**
 * Stroke Optimization Utilities
 * 
 * Techniques implemented:
 * 1. Douglas-Peucker point simplification - reduce points while keeping shape
 * 2. Delta compression - send only differences between points
 * 3. Point batching - group points for fewer emits
 * 4. Binary encoding - compact point representation
 */

/**
 * Douglas-Peucker algorithm for path simplification
 * Reduces number of points while preserving the shape
 * 
 * @param {Array<{x: number, y: number}>} points - Array of points
 * @param {number} epsilon - Tolerance distance (higher = more simplification)
 * @returns {Array<{x: number, y: number}>} Simplified points
 */
export function simplifyPath(points, epsilon = 1.5) {
  if (points.length <= 2) return points
  
  // Find the point with the maximum distance from the line
  let maxDistance = 0
  let maxIndex = 0
  
  const start = points[0]
  const end = points[points.length - 1]
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }
  
  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), epsilon)
    const right = simplifyPath(points.slice(maxIndex), epsilon)
    
    // Combine results (remove duplicate point at junction)
    return [...left.slice(0, -1), ...right]
  }
  
  // All points are within epsilon, return just start and end
  return [start, end]
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y)
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)
  const clampedT = Math.max(0, Math.min(1, t))
  
  const nearestX = lineStart.x + clampedT * dx
  const nearestY = lineStart.y + clampedT * dy
  
  return Math.hypot(point.x - nearestX, point.y - nearestY)
}

/**
 * Delta compression - encode points as differences from previous point
 * First point is absolute, rest are relative
 * 
 * @param {Array<{x: number, y: number}>} points - Absolute points
 * @returns {{base: {x, y}, deltas: Array<{dx, dy}>}} Compressed data
 */
export function deltaCompress(points) {
  if (points.length === 0) return { base: null, deltas: [] }
  
  const base = points[0]
  const deltas = []
  
  for (let i = 1; i < points.length; i++) {
    deltas.push({
      dx: Math.round((points[i].x - points[i - 1].x) * 10) / 10,
      dy: Math.round((points[i].y - points[i - 1].y) * 10) / 10
    })
  }
  
  return { base, deltas }
}

/**
 * Decompress delta-encoded points back to absolute coordinates
 */
export function deltaDecompress({ base, deltas }) {
  if (!base) return []
  
  const points = [base]
  let current = { ...base }
  
  for (const delta of deltas) {
    current = {
      x: current.x + delta.dx,
      y: current.y + delta.dy
    }
    points.push({ ...current })
  }
  
  return points
}

/**
 * Pack points into a compact binary-like string
 * Format: "x1,y1|x2,y2|..." with rounded values
 * 
 * @param {Array<{x: number, y: number}>} points 
 * @returns {string} Packed string
 */
export function packPoints(points) {
  return points
    .map(p => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`)
    .join('|')
}

/**
 * Unpack points from compact string
 */
export function unpackPoints(packed) {
  if (!packed) return []
  return packed.split('|').map(pair => {
    const [x, y] = pair.split(',').map(Number)
    return { x, y }
  })
}

/**
 * Create optimized stroke data for transmission
 * Combines simplification + delta compression
 * 
 * @param {Object} stroke - Full stroke object
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized stroke for transmission
 */
export function optimizeStrokeForTransmit(stroke, options = {}) {
  const { 
    simplifyEpsilon = 1.5,
    useDelta = true,
    roundPrecision = 1
  } = options
  
  // Don't optimize non-pen strokes (shapes, text, images)
  if (!stroke.points || stroke.points.length === 0) {
    return stroke
  }
  
  // Step 1: Simplify path
  let optimizedPoints = simplifyPath(stroke.points, simplifyEpsilon)
  
  // Step 2: Round to reduce decimal places
  optimizedPoints = optimizedPoints.map(p => ({
    x: Math.round(p.x * roundPrecision) / roundPrecision,
    y: Math.round(p.y * roundPrecision) / roundPrecision
  }))
  
  // Step 3: Delta compress
  if (useDelta && optimizedPoints.length > 2) {
    const compressed = deltaCompress(optimizedPoints)
    return {
      ...stroke,
      points: undefined, // Remove full points
      compressed: compressed, // Add compressed data
      _optimized: true
    }
  }
  
  return {
    ...stroke,
    points: optimizedPoints
  }
}

/**
 * Restore optimized stroke to full format
 */
export function deoptimizeStroke(stroke) {
  if (!stroke._optimized || !stroke.compressed) {
    return stroke
  }
  
  const points = deltaDecompress(stroke.compressed)
  return {
    ...stroke,
    points,
    compressed: undefined,
    _optimized: undefined
  }
}

/**
 * Calculate compression ratio for logging/debugging
 */
export function getCompressionStats(original, optimized) {
  const originalSize = JSON.stringify(original).length
  const optimizedSize = JSON.stringify(optimized).length
  const ratio = ((1 - optimizedSize / originalSize) * 100).toFixed(1)
  
  return {
    originalSize,
    optimizedSize,
    savedBytes: originalSize - optimizedSize,
    compressionRatio: `${ratio}%`,
    originalPoints: original.points?.length || 0,
    optimizedPoints: optimized.points?.length || optimized.compressed?.deltas?.length + 1 || 0
  }
}
