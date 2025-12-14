import { RefreshCw } from 'lucide-react'

export function RefreshButton({ 
  onClick, 
  isRefreshing = false, 
  showText = true,
  className = '',
  title = 'Refresh'
}) {
  return (
    <button
      onClick={onClick}
      disabled={isRefreshing}
      className={`glass-button px-3 py-2.5 flex items-center gap-2 disabled:opacity-50 ${className}`}
      title={title}
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {showText && <span className="hidden sm:inline text-sm">Refresh</span>}
    </button>
  )
}

export default RefreshButton
