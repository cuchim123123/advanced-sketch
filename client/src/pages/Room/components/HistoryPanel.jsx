import { History } from 'lucide-react'

/**
 * History panel component for Room - shows snapshot versions
 */
export default function HistoryPanel({
  isOpen,
  onClose,
  historyList,
  historyLoading,
  onRestore
}) {
  if (!isOpen) return null

  return (
    <div className="fixed md:relative right-0 top-0 h-full z-20 glass-dark border-l border-white/10 w-72 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          Snapshots
        </h2>
        <button 
          onClick={onClose}
          className="text-white/40 hover:text-white/60 text-xl leading-none glass-dark-button w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>
      
      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : historyList.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-8">
          No snapshots yet. Click Save to create one.
        </p>
      ) : (
        <ul className="space-y-2">
          {historyList.map((h, i) => (
            <li
              key={h.version}
              className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">
                  Version {h.version}
                  {i === 0 && <span className="ml-2 text-xs text-green-400">(latest)</span>}
                </span>
                <button
                  onClick={() => onRestore(h.version)}
                  className="text-xs px-2 py-1 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors"
                  disabled={i === 0}
                >
                  Restore
                </button>
              </div>
              <div className="text-xs text-white/40">
                {new Date(h.createdAt).toLocaleString()}
              </div>
              <div className="text-xs text-white/30">
                by {h.createdBy}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
