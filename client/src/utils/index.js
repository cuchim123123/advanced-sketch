// =============================================================================
// UTILS BARREL FILE
// Re-export all utility functions for cleaner imports
// =============================================================================

// Classname utility (like shadcn)
export { cn } from './cn'

// Stroke optimization utilities
export { 
  optimizeStrokeForTransmit, 
  deoptimizeStroke 
} from './strokeOptimization'
