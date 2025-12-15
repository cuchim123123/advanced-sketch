import { 
  MousePointerClick, 
  Brush, 
  Eraser, 
  Move, 
  CaseSensitive, 
  Image, 
  Minus, 
  RectangleHorizontal, 
  Circle, 
  Triangle, 
  MoveRight, 
  Diamond 
} from 'lucide-react'
import { TOOLS } from '../constants'

/**
 * Unified tool icon component - single source of truth for tool icons
 * Used in both toolbar and cursor overlay
 */
export function ToolIcon({ tool, size = 18, className = '' }) {
  const iconProps = { size, className }
  
  switch (tool) {
    case TOOLS.SELECT:
      return <MousePointerClick {...iconProps} />
    case TOOLS.PEN:
      return <Brush {...iconProps} />
    case TOOLS.ERASER:
      return <Eraser {...iconProps} />
    case TOOLS.HAND:
      return <Move {...iconProps} />
    case TOOLS.TEXT:
      return <CaseSensitive {...iconProps} />
    case TOOLS.IMAGE:
      return <Image {...iconProps} />
    case TOOLS.LINE:
      return <Minus {...iconProps} />
    case TOOLS.RECTANGLE:
      return <RectangleHorizontal {...iconProps} />
    case TOOLS.CIRCLE:
      return <Circle {...iconProps} />
    case TOOLS.TRIANGLE:
      return <Triangle {...iconProps} />
    case TOOLS.ARROW:
      return <MoveRight {...iconProps} />
    case TOOLS.DIAMOND:
      return <Diamond {...iconProps} />
    default:
      return <Brush {...iconProps} />
  }
}
