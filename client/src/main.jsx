import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Global error handler - shows alert before crash
window.onerror = function(message, source, lineno, colno, error) {
  alert(`ERROR: ${message}\n\nFile: ${source}\nLine: ${lineno}\n\nStack: ${error?.stack || 'N/A'}`)
  return false
}

window.addEventListener('unhandledrejection', function(event) {
  alert(`UNHANDLED PROMISE: ${event.reason}\n\nStack: ${event.reason?.stack || 'N/A'}`)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
