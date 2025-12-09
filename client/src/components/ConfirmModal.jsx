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
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={confirmState.onCancel}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
            <div className="p-6">
              {/* Icon */}
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                confirmState.type === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
              }`}>
                {confirmState.type === 'danger' ? (
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {confirmState.title}
              </h3>
              
              {/* Message */}
              <p className="text-gray-500 text-center">
                {confirmState.message}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 p-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={confirmState.onCancel}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={confirmState.onConfirm}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition ${
                  confirmState.type === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
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
