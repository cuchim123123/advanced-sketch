import { AlertTriangle, XCircle, AlertCircle, WifiOff, RefreshCw, X } from 'lucide-react'

/**
 * Inline Error Alert - For displaying errors within a page
 * Use this for API errors, form validation errors, etc.
 */

const variants = {
  error: {
    container: 'bg-red-500/10 border-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-400',
    title: 'text-red-300',
    message: 'text-red-200/80',
    button: 'bg-red-500/20 hover:bg-red-500/30 text-red-300',
    close: 'text-red-400/60 hover:text-red-300'
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    title: 'text-amber-300',
    message: 'text-amber-200/80',
    button: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300',
    close: 'text-amber-400/60 hover:text-amber-300'
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/30',
    icon: AlertCircle,
    iconColor: 'text-blue-400',
    title: 'text-blue-300',
    message: 'text-blue-200/80',
    button: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300',
    close: 'text-blue-400/60 hover:text-blue-300'
  },
  network: {
    container: 'bg-slate-500/10 border-slate-500/30',
    icon: WifiOff,
    iconColor: 'text-slate-400',
    title: 'text-slate-300',
    message: 'text-slate-200/80',
    button: 'bg-slate-500/20 hover:bg-slate-500/30 text-slate-300',
    close: 'text-slate-400/60 hover:text-slate-300'
  }
}

export function ErrorAlert({ 
  variant = 'error',
  title,
  message,
  onRetry,
  onDismiss,
  className = '',
  children
}) {
  const style = variants[variant] || variants.error
  const IconComponent = style.icon

  return (
    <div className={`relative flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm ${style.container} ${className}`}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold text-sm ${style.title}`}>{title}</h4>
        )}
        {message && (
          <p className={`text-sm ${style.message} ${title ? 'mt-1' : ''}`}>{message}</p>
        )}
        {children}
        
        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${style.button}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        )}
      </div>
      
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded-lg transition-colors ${style.close}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/**
 * Connection Error Banner - Full width banner for connection issues
 */
export function ConnectionErrorBanner({ onRetry, message }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-rose-600 text-white py-2 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>{message || 'Connection lost. Trying to reconnect...'}</span>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Empty State with Error - For when content fails to load
 */
export function EmptyStateError({ 
  title = 'Failed to load',
  message = 'Something went wrong while loading this content.',
  onRetry,
  icon: CustomIcon
}) {
  const IconComponent = CustomIcon || AlertTriangle

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors font-medium text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Form Error - Compact error for form fields
 */
export function FormError({ message, className = '' }) {
  if (!message) return null
  
  return (
    <p className={`text-sm text-red-400 mt-1 flex items-center gap-1.5 ${className}`}>
      <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {message}
    </p>
  )
}

/**
 * API Error Parser - Extracts user-friendly message from API errors
 */
export function parseApiError(error) {
  // Axios error response
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  
  // Axios error response array
  if (error?.response?.data?.errors?.[0]?.message) {
    return error.response.data.errors[0].message
  }
  
  // Network error
  if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }
  
  // Timeout
  if (error?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.'
  }
  
  // Generic error message
  if (error?.message) {
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

export default ErrorAlert
