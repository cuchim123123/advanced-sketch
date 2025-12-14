import { memo } from 'react'

/**
 * Modal showing keyboard shortcuts
 */
const KeyboardShortcutsModal = memo(function KeyboardShortcutsModal({ 
  isOpen, 
  onClose 
}) {
  if (!isOpen) return null

  return (
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-card p-6 max-w-md animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="glass-button w-8 h-8 flex items-center justify-center text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Tools
            </h4>
            <div className="space-y-2 text-white/70">
              <ShortcutItem shortcut="P" description="Pen" />
              <ShortcutItem shortcut="E" description="Eraser" />
              <ShortcutItem shortcut="L" description="Line" />
              <ShortcutItem shortcut="R" description="Rectangle" />
              <ShortcutItem shortcut="C" description="Circle" />
              <ShortcutItem shortcut="T" description="Text" />
              <ShortcutItem shortcut="I" description="Image" />
              <ShortcutItem shortcut="H" description="Hand (pan)" />
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Actions
            </h4>
            <div className="space-y-2 text-white/70">
              <ShortcutItem shortcut="Ctrl+Z" description="Undo" />
              <ShortcutItem shortcut="Ctrl+Y" description="Redo" />
              <ShortcutItem shortcut="Ctrl+S" description="Save" />
              <ShortcutItem shortcut="Ctrl+E" description="Export" />
              <ShortcutItem shortcut="Space" description="Pan" />
              <ShortcutItem shortcut="Scroll" description="Zoom" />
              <ShortcutItem shortcut="Esc" description="Close modal" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

function ShortcutItem({ shortcut, description }) {
  return (
    <div>
      <kbd className="bg-white/10 px-2 py-0.5 rounded-lg border border-white/20 mr-2">
        {shortcut}
      </kbd>
      {description}
    </div>
  )
}

export default KeyboardShortcutsModal
