import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageSquare, MessagesSquare, User } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function Chat({ socket, roomCode, user, isOpen, onToggle }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const isOpenRef = useRef(isOpen)

  // Clear messages when room changes
  useEffect(() => {
    setMessages([])
    setUnreadCount(0)
    setInputValue('')
  }, [roomCode])

  // Keep ref in sync with isOpen prop
  useEffect(() => {
    isOpenRef.current = isOpen
    // Reset unread count when chat opens
    if (isOpen) {
      setUnreadCount(0)
    }
  }, [isOpen])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return

    const handleChatMessage = ({ message, user: msgUser, timestamp }) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        message,
        user: msgUser,
        timestamp: new Date(timestamp)
      }])
      
      // Increment unread count if chat is closed and message is from someone else
      if (!isOpenRef.current && msgUser.id !== user?.id) {
        setUnreadCount(prev => prev + 1)
      }
    }

    socket.on('chat:message', handleChatMessage)

    return () => {
      socket.off('chat:message', handleChatMessage)
    }
  }, [socket, user?.id])

  const handleSendMessage = (e) => {
    e.preventDefault()
    
    if (!inputValue.trim() || !socket) return

    // Send message to server
    socket.emit('chat:send', {
      roomCode,
      message: inputValue.trim()
    })

    // Clear input
    setInputValue('')
  }

  const formatTime = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) {
      return ''
    }
    
    const now = new Date()
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    
    // Otherwise show date and time
    return date.toLocaleString('en-US', { 
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Floating chat button (collapsed state)
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-sky-500 hover:bg-sky-600 
                   text-white rounded-full shadow-lg z-[9999] flex items-center justify-center
                   transition-colors"
        title="Open Chat"
      >
        <MessageSquare className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 
                         bg-red-500 text-white text-xs font-semibold rounded-full 
                         flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[480px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl 
                    flex flex-col z-[9999] border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">Room Chat</h3>
          <span className="text-xs text-slate-500">
            ({messages.length})
          </span>
        </div>
        <button
          onClick={onToggle}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white dark:bg-slate-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessagesSquare className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user.id === user?.id
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  isOwnMessage ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                  isOwnMessage 
                    ? "bg-sky-500 text-white" 
                    : "bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                )}>
                  {msg.user.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
                
                {/* Message content */}
                <div className={cn(
                  "flex flex-col max-w-[75%]",
                  isOwnMessage ? "items-end" : "items-start"
                )}>
                  {!isOwnMessage && (
                    <span className="text-xs text-slate-500 mb-0.5 px-1">
                      {msg.user.username}
                    </span>
                  )}
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-sm",
                    isOwnMessage
                      ? "bg-sky-500 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm"
                  )}>
                    <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 px-3 text-sm rounded-md border border-slate-300 dark:border-slate-600 
                       bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-md bg-sky-500 hover:bg-sky-600 
                       text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
