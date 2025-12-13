import { memo } from 'react'
import { TOOL_ICONS } from './constants'

/**
 * Overlay showing other users' cursors
 */
const CursorOverlay = memo(function CursorOverlay({ 
  cursors, 
  canvasToScreen, 
  showCursorNames = true 
}) {
  return (
    <>
      {Object.entries(cursors).map(([userId, cursor]) => {
        const screenPos = canvasToScreen(cursor.x, cursor.y)
        const toolIcon = TOOL_ICONS[cursor.tool] || '✏️'

        return (
          <div
            key={userId}
            className="absolute pointer-events-none"
            style={{
              transform: `translate(${screenPos.x - 8}px, ${screenPos.y - 8}px)`,
              willChange: 'transform'
            }}
          >
            {/* Cursor dot */}
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: cursor.color }}
            />

            {/* Tool indicator */}
            <div
              className="absolute -top-5 -right-5 w-6 h-6 flex items-center justify-center text-xs rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: cursor.color }}
            >
              {toolIcon}
            </div>

            {/* Username label */}
            {showCursorNames && (
              <span
                className="absolute top-5 left-2 text-xs px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm"
                style={{ backgroundColor: cursor.color, color: 'white' }}
              >
                {cursor.username}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
})

export default CursorOverlay
