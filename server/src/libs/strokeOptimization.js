/**
 * Stroke Optimization Utilities (Server-side)
 * 
 * Decompresses optimized strokes from client
 */

/**
 * Decompress delta-encoded points back to absolute coordinates
 */
function deltaDecompress({ base, deltas }) {
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
 * Restore optimized stroke to full format
 */
function deoptimizeStroke(stroke) {
  if (!stroke._optimized || !stroke.compressed) {
    return stroke
  }
  
  const points = deltaDecompress(stroke.compressed)
  const deoptimized = { ...stroke, points }
  delete deoptimized.compressed
  delete deoptimized._optimized
  return deoptimized
}

/**
 * Process incoming stroke - decompress if needed
 */
function processIncomingStroke(stroke) {
  // Decompress if optimized
  if (stroke._optimized) {
    return deoptimizeStroke(stroke)
  }
  return stroke
}

module.exports = {
  deltaDecompress,
  deoptimizeStroke,
  processIncomingStroke
}
