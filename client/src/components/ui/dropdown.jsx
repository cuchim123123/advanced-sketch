import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Dropdown({ 
  trigger, 
  children, 
  className,
  align = 'left' 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div 
          className={cn(
            "absolute z-50 mt-1 min-w-[160px] rounded-md border border-gray-200 bg-white shadow-lg",
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          <div className="py-1" onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ 
  children, 
  onClick, 
  className,
  active = false 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors",
        active && "bg-blue-50 text-blue-600",
        className
      )}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-gray-200" />
}
