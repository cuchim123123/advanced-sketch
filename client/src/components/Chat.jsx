import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageCircle } from 'lucide-react'

export default function Chat({ socket, roomCode, user, isOpen, onToggle }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

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

    const handleChatMessage = ({ message, user, timestamp }) => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        message,
        user,
        timestamp: new Date(timestamp)
      }])
    }

    socket.on('chat:message', handleChatMessage)

    return () => {
      socket.off('chat:message', handleChatMessage)
    }
  }, [socket])

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
    const now = new Date()
    const diff = now - date
    
    // If less than 1 minute ago
    if (diff < 60000) {
      return 'Just now'
    }
    
    // If today
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

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-sky-500 to-emerald-500 
                   text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 
                   flex items-center justify-center z-40"
        title="Open Chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-800 rounded-2xl shadow-2xl 
                    flex flex-col z-40 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-gradient-to-r from-sky-600 to-emerald-600 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold">Room Chat</h3>
        </div>
        <button
          onClick={onToggle}
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-800">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user.id === user?.id
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
              >
                {!isOwnMessage && (
                  <span className="text-xs text-sky-400 mb-1 px-2 font-medium">
                    {msg.user.username}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-br-md'
                      : 'bg-slate-700 text-slate-100 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
                <span className="text-xs text-slate-500 mt-1 px-2">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-xl 
                     text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 
                     focus:ring-1 focus:ring-sky-500 transition-colors"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-white 
                     rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 
                     disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
