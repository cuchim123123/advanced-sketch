// =============================================================================
// COMPONENTS BARREL FILE
// Re-export all components for cleaner imports
// =============================================================================

// UI Components (primitives)
export * from './ui'

// Canvas Components
export { default as Canvas } from './Canvas'
export * from './canvas'

// Common Components  
export { default as Chat } from './Chat'
export { default as ConfirmModal, ConfirmProvider, useConfirm } from './ConfirmModal'
export { default as OTPModal } from './OTPModal'
export { default as RoomSettingsModal } from './RoomSettingsModal'
export { ToastProvider, useToast } from './Toast'
export { default as ErrorBoundary, withErrorBoundary } from './ErrorBoundary'
export { default as ErrorAlert } from './ErrorAlert'
