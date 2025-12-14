/**
 * Canvas Component - Pure Orchestrator
 * 
 * This file ONLY imports hooks and renders JSX.
 * All logic is in useCanvas hook.
 */
import { TOOLS, COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from './canvas/constants'
import { useCanvas } from './canvas/hooks/useCanvas'
import CanvasToolbar from './canvas/components/CanvasToolbar'
import CursorOverlay from './canvas/components/CursorOverlay'
import KeyboardShortcutsModal from './canvas/components/KeyboardShortcutsModal'

export default function Canvas({ 
  socket, 
  roomCode, 
  strokes = [],
  previewStrokes = {},
  onStrokeAdd,
  onStrokeUpdate,
  onClear,
  cursors = {},
  showCursorNames = true,
  disabled = false
}) {
  // Single hook contains ALL logic
  const canvas = useCanvas({
    socket,
    strokes,
    previewStrokes,
    onStrokeAdd,
    onStrokeUpdate,
    onClear,
    disabled
  })

  const {
    state: {
      tool, setTool,
      color, setColor,
      strokeWidth, setStrokeWidth,
      fontSize, setFontSize,
      selectedStroke, setSelectedStroke,
      isDragging,
      textInput, setTextInput,
      showShortcuts, setShowShortcuts
    },
    zoom: {
      zoom, pan,
      isPanning,
      spacePressed,
      startPan,
      shouldPan,
      handleZoomIn,
      handleZoomOut
    },
    refs,
    cursor,
    canvasReady,
    canvasToScreen,
    startDrawing,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleClear,
    handleUndo,
    handleRedo,
    handleExport,
    handleResetZoom,
    handleTextSubmit,
    handleTextKeyDown,
    handleImageUpload
  } = canvas

  return (
    <div className="flex flex-col h-full bg-slate-100">
      {/* Toolbar */}
      <CanvasToolbar
        tool={tool} setTool={setTool}
        color={color} setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        fontSize={fontSize} setFontSize={setFontSize}
        zoom={zoom}
        onUndo={handleUndo} onRedo={handleRedo}
        onClear={handleClear} onExport={handleExport}
        onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetZoom={handleResetZoom}
        setSelectedStroke={setSelectedStroke}
      />

      {/* Canvas Container */}
      <div 
        ref={refs.container}
        className={`flex-1 relative overflow-hidden bg-slate-50 ${
          isPanning ? 'cursor-grabbing' : 
          (spacePressed || tool === TOOLS.HAND) ? 'cursor-grab' : ''
        }`}
        style={{ pointerEvents: canvasReady ? 'auto' : 'none' }}
        onMouseDown={(e) => {
          if (!canvasReady) return
          if (e.button === 1 || shouldPan()) { e.preventDefault(); startPan(e) }
          else startDrawing(e)
        }}
        onMouseMove={(e) => { if (canvasReady) handleMouseMove(e) }}
        onMouseUp={(e) => { if (canvasReady) handleMouseUp(e) }}
        onMouseLeave={(e) => { if (canvasReady) handleMouseLeave(e) }}
        onTouchStart={(e) => { if (canvasReady) handleTouchStart(e) }}
        onTouchMove={(e) => { if (canvasReady) handleTouchMove(e) }}
        onTouchEnd={(e) => { if (canvasReady) handleTouchEnd(e) }}
      >
        {/* Canvas Background */}
        <div 
          className={`absolute bg-white shadow-lg ${
            isPanning ? 'cursor-grabbing' : 
            (spacePressed || tool === TOOLS.HAND) ? 'cursor-grab' : ''
          }`}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <canvas
            ref={refs.canvas}
            className="absolute inset-0"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              cursor: isPanning ? 'grabbing' :
                (tool === TOOLS.HAND || spacePressed) ? 'grab' :
                tool === TOOLS.SELECT ? (isDragging ? 'grabbing' : 'default') :
                (tool === TOOLS.PEN || tool === TOOLS.ERASER) ? cursor : 'crosshair'
            }}
          />
        </div>

        {/* Other Users' Cursors */}
        <CursorOverlay
          cursors={cursors}
          canvasToScreen={canvasToScreen}
          showCursorNames={showCursorNames}
        />

        {/* Text Input Overlay */}
        {textInput.show && (
          <div
            className="absolute z-50"
            style={{
              left: textInput.screenX,
              top: textInput.screenY,
              transform: 'translate(-4px, -50%)'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              ref={refs.textInput}
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={handleTextKeyDown}
              onBlur={() => setTimeout(() => handleTextSubmit(), 100)}
              placeholder="Type text..."
              className="px-2 py-1 border-2 border-sky-500 rounded outline-none min-w-[150px] bg-white shadow-lg"
              style={{ fontSize: `${fontSize}px`, color }}
            />
          </div>
        )}

        {/* Hidden Image Input */}
        <input
          ref={refs.imageInput}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Hints */}
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-xl px-4 py-2 text-xs text-slate-300 pointer-events-none select-none shadow-lg">
          <div>Scroll to zoom • Space+drag to pan • Pinch on mobile</div>
          <div className="mt-1 text-slate-400">Press ? for keyboard shortcuts</div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
      </div>
    </div>
  )
}

export { TOOLS, COLORS }
