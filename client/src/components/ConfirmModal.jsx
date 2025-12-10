import { useState, useCallback, createContext, useContext } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'default', // 'default', 'danger'
    onConfirm: null,
    onCancel: null
  })

  const confirm = useCallback(({ title, message, confirmText, cancelText, type = 'default' }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText: confirmText || 'Confirm',
        cancelText: cancelText || 'Cancel',
        type,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        }
      })
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      
      {/* Confirm Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={confirmState.onCancel}
          />
          
          {/* Modal */}
          <div className="relative glass-card w-full max-w-md animate-scale-in">
            <div className="p-6">
              {/* Icon */}
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                confirmState.type === 'danger' 
                  ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30'
              }`}>
                {confirmState.type === 'danger' ? (
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-semibold text-white text-center mb-2">
                {confirmState.title}
              </h3>
              
              {/* Message */}
              <p className="text-white/60 text-center">
                {confirmState.message}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-white/10">
              <button
                onClick={confirmState.onCancel}
                className="flex-1 px-4 py-3 glass-button text-white/70 font-medium"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={confirmState.onConfirm}
                className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all duration-300 ${
                  confirmState.type === 'danger' 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}
