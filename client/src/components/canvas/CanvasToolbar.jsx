import { memo } from 'react'
import { Dropdown, DropdownItem, DropdownSeparator } from '../ui/dropdown'
import { ChevronDown } from 'lucide-react'
import { TOOLS, COLORS, SHAPE_TOOLS } from './constants'

/**
 * Canvas toolbar with tools, colors, and actions
 */
const CanvasToolbar = memo(function CanvasToolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fontSize,
  setFontSize,
  zoom,
  onUndo,
  onRedo,
  onClear,
  onExport,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  setSelectedStroke
}) {
  const toolButtonClass = (isActive) => `p-2.5 rounded-lg transition-all duration-200 ${
    isActive
      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
  }`

  const handleToolChange = (newTool) => {
    setTool(newTool)
    if (newTool === TOOLS.SELECT) {
      setSelectedStroke(null)
    }
  }

  return (
    <div className="glass border-b border-slate-200 p-3 flex flex-wrap items-center gap-4 relative z-50">
      {/* Basic Tools */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        <button
          onClick={() => handleToolChange(TOOLS.SELECT)}
          className={toolButtonClass(tool === TOOLS.SELECT)}
          title="Select/Move (V)"
        >
          👆
        </button>
        <button
          onClick={() => handleToolChange(TOOLS.PEN)}
          className={toolButtonClass(tool === TOOLS.PEN)}
          title="Pen (P)"
        >
          ✏️
        </button>
        <button
          onClick={() => handleToolChange(TOOLS.ERASER)}
          className={toolButtonClass(tool === TOOLS.ERASER)}
          title="Eraser (E)"
        >
          🧹
        </button>
        <button
          onClick={() => handleToolChange(TOOLS.HAND)}
          className={toolButtonClass(tool === TOOLS.HAND)}
          title="Hand (H)"
        >
          ✋
        </button>
      </div>

      {/* Shapes Dropdown */}
      <ShapesDropdown tool={tool} setTool={handleToolChange} />

      {/* Text & Image */}
      <div className="flex gap-1 p-1 glass rounded-xl">
        <button
          onClick={() => handleToolChange(TOOLS.TEXT)}
          className={toolButtonClass(tool === TOOLS.TEXT)}
          title="Text (T)"
        >
          🔤
        </button>
        <button
          onClick={() => handleToolChange(TOOLS.IMAGE)}
          className={toolButtonClass(tool === TOOLS.IMAGE)}
          title="Image (I)"
        >
          🖼️
        </button>
      </div>

      <Divider />

      {/* Color Picker */}
      <ColorPicker color={color} setColor={setColor} />

      <Divider />

      {/* Stroke Width / Font Size */}
      {tool === TOOLS.TEXT ? (
        <SizeSlider
          label="Font"
          value={fontSize}
          onChange={setFontSize}
          min={12}
          max={72}
        />
      ) : (
        <SizeSlider
          label="Size"
          value={strokeWidth}
          onChange={setStrokeWidth}
          min={1}
          max={20}
        />
      )}

      <Divider />

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={onUndo}
          className="glass-button px-3 py-2 text-sm"
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          onClick={onRedo}
          className="glass-button px-3 py-2 text-sm"
          title="Redo (Ctrl+Y)"
        >
          ↪️
        </button>
        <button
          onClick={onClear}
          className="px-3 py-2 text-sm bg-red-100 text-red-600 rounded-xl border border-red-200 hover:bg-red-200 transition-all duration-200"
          title="Clear All"
        >
          🗑️
        </button>

        {/* Export Dropdown */}
        <Dropdown
          trigger={
            <button
              className="px-3 py-2 text-sm bg-emerald-100 text-emerald-600 rounded-xl border border-emerald-200 hover:bg-emerald-200 transition-all duration-200 flex items-center gap-1"
              title="Export"
            >
              📥 <ChevronDown className="w-3 h-3" />
            </button>
          }
        >
          <DropdownItem onClick={() => onExport('png')}>
            <span className="flex items-center gap-2">🖼️ Export as PNG</span>
          </DropdownItem>
          <DropdownItem onClick={() => onExport('svg')}>
            <span className="flex items-center gap-2">📐 Export as SVG</span>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => onExport('pdf')}>
            <span className="flex items-center gap-2">📄 Export as PDF</span>
          </DropdownItem>
        </Dropdown>
      </div>

      <Divider />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 glass rounded-xl p-1">
        <button
          onClick={onZoomOut}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
          title="Zoom Out"
        >
          ➖
        </button>
        <button
          onClick={onResetZoom}
          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg min-w-[60px] transition-all duration-200"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
          title="Zoom In"
        >
          ➕
        </button>
      </div>
    </div>
  )
})

function Divider() {
  return <div className="w-px h-8 bg-slate-200" />
}

function ShapesDropdown({ tool, setTool }) {
  const isShapeTool = SHAPE_TOOLS.includes(tool)
  
  const getShapeIcon = () => {
    switch (tool) {
      case TOOLS.LINE: return '📏'
      case TOOLS.RECTANGLE: return '⬜'
      case TOOLS.CIRCLE: return '⭕'
      case TOOLS.TRIANGLE: return '🔺'
      case TOOLS.ARROW: return '➡️'
      case TOOLS.DIAMOND: return '🔷'
      default: return '⬜'
    }
  }

  return (
    <Dropdown
      trigger={
        <button
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            isShapeTool
              ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white shadow-lg'
              : 'glass text-slate-600 hover:bg-slate-100'
          }`}
        >
          {getShapeIcon()}
          <span className="text-sm">Shapes</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      }
    >
      <DropdownItem onClick={() => setTool(TOOLS.LINE)} active={tool === TOOLS.LINE}>
        <span className="flex items-center gap-2">
          📏 Line <span className="text-xs text-gray-400 ml-auto">L</span>
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => setTool(TOOLS.RECTANGLE)} active={tool === TOOLS.RECTANGLE}>
        <span className="flex items-center gap-2">
          ⬜ Rectangle <span className="text-xs text-gray-400 ml-auto">R</span>
        </span>
      </DropdownItem>
      <DropdownItem onClick={() => setTool(TOOLS.CIRCLE)} active={tool === TOOLS.CIRCLE}>
        <span className="flex items-center gap-2">
          ⭕ Circle <span className="text-xs text-gray-400 ml-auto">C</span>
        </span>
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem onClick={() => setTool(TOOLS.TRIANGLE)} active={tool === TOOLS.TRIANGLE}>
        <span className="flex items-center gap-2">🔺 Triangle</span>
      </DropdownItem>
      <DropdownItem onClick={() => setTool(TOOLS.ARROW)} active={tool === TOOLS.ARROW}>
        <span className="flex items-center gap-2">➡️ Arrow</span>
      </DropdownItem>
      <DropdownItem onClick={() => setTool(TOOLS.DIAMOND)} active={tool === TOOLS.DIAMOND}>
        <span className="flex items-center gap-2">🔷 Diamond</span>
      </DropdownItem>
    </Dropdown>
  )
}

function ColorPicker({ color, setColor }) {
  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 px-3 py-2.5 glass rounded-xl hover:bg-slate-100 transition-all duration-200">
          <div
            className="w-6 h-6 rounded-md border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-slate-600">Color</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      }
      className="min-w-[200px]"
    >
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                color === c
                  ? 'ring-2 ring-sky-500 ring-offset-2 scale-110'
                  : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    </Dropdown>
  )
}

function SizeSlider({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
      <span className="text-sm text-slate-500">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-24"
      />
      <span className="text-sm text-slate-600 w-6">{value}</span>
    </div>
  )
}

export default CanvasToolbar
