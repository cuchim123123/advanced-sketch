import { useCallback, useRef } from 'react'
import { TOOLS } from '../constants'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Hook to handle image upload operations
 */
export function useCanvasImage({
  canvasRef, scale, offset,
  socket, roomId, addToast
}) {
  const fileInputRef = useRef(null)
  const pendingImagePosition = useRef(null)

  const triggerImageUpload = useCallback((x, y) => {
    pendingImagePosition.current = { x, y }
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [])

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      addToast?.('Chỉ hỗ trợ PNG, JPEG, GIF, WebP', 'error')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      addToast?.('Ảnh phải nhỏ hơn 5MB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const maxWidth = 400
        const maxHeight = 400
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const position = pendingImagePosition.current || { x: 100, y: 100 }
        
        const imageStroke = {
          id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tool: TOOLS.IMAGE,
          imageData: event.target.result,
          startPoint: position,
          width,
          height,
          rotation: 0,
          timestamp: Date.now()
        }

        if (socket && roomId) {
          socket.emit('draw:stroke', { roomId, stroke: imageStroke })
        }

        pendingImagePosition.current = null
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [socket, roomId, addToast])

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          // Create fake event for handleImageUpload
          const fakeEvent = {
            target: {
              files: [file]
            }
          }
          
          // Use center of visible canvas area
          if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            pendingImagePosition.current = {
              x: (rect.width / 2 - offset.x) / scale,
              y: (rect.height / 2 - offset.y) / scale
            }
          }
          
          handleImageUpload(fakeEvent)
        }
        break
      }
    }
  }, [handleImageUpload, canvasRef, scale, offset])

  return {
    fileInputRef,
    triggerImageUpload,
    handleImageUpload,
    handlePaste
  }
}
