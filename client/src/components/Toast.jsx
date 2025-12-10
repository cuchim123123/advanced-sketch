import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

// Toast types with their styles - glassmorphism
const toastStyles = {
  success: {
    bg: 'bg-green-500/20 backdrop-blur-xl border-green-500/30',
    icon: '✓',
    iconBg: 'bg-gradient-to-r from-green-400 to-emerald-500',
    text: 'text-green-200',
    progress: 'bg-gradient-to-r from-green-400 to-emerald-500'
  },
  error: {
    bg: 'bg-red-500/20 backdrop-blur-xl border-red-500/30',
    icon: '✕',
    iconBg: 'bg-gradient-to-r from-red-400 to-rose-500',
    text: 'text-red-200',
    progress: 'bg-gradient-to-r from-red-400 to-rose-500'
  },
  warning: {
    bg: 'bg-amber-500/20 backdrop-blur-xl border-amber-500/30',
    icon: '⚠',
    iconBg: 'bg-gradient-to-r from-amber-400 to-orange-500',
    text: 'text-amber-200',
    progress: 'bg-gradient-to-r from-amber-400 to-orange-500'
  },
  info: {
    bg: 'bg-blue-500/20 backdrop-blur-xl border-blue-500/30',
    icon: 'ℹ',
    iconBg: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    text: 'text-blue-200',
    progress: 'bg-gradient-to-r from-blue-400 to-cyan-500'
  }
}

function ToastItem({ toast, onDismiss }) {
  const style = toastStyles[toast.type] || toastStyles.info
  
  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 pr-10
        border rounded-2xl shadow-2xl
        animate-slide-in
        ${style.bg}
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${style.iconBg} flex items-center justify-center shadow-lg`}>
        <span className="text-white text-sm font-bold">{style.icon}</span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`font-semibold text-white`}>{toast.title}</p>
        )}
        <p className={`text-sm ${style.text} ${toast.title ? 'mt-1' : ''}`}>
          {toast.message}
        </p>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className={`absolute top-3 right-3 text-white/50 hover:text-white transition-colors`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={`h-full ${style.progress} animate-progress`}
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random()
    
    setToasts(prev => [...prev, { id, type, title, message, duration }])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    // Special method for kick notification - stays until dismissed
    kicked: () => addToast({ 
      type: 'error', 
      title: 'Kicked from Room',
      message: 'You have been kicked from the room!',
      duration: 0 // Won't auto-dismiss
    }),
    dismiss: dismissToast,
    dismissAll: () => setToasts([])
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Standalone toast for use outside React components (e.g., in socket handlers)
let globalToast = null

export function setGlobalToast(toast) {
  globalToast = toast
}

export function showToast(type, message, title) {
  if (globalToast) {
    globalToast[type]?.(message, title)
  } else {
    // Fallback to alert if toast not available
    window.alert(message)
  }
}
