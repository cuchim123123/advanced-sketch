import { useNavigate } from 'react-router-dom'
import { Globe, Lock, Users, Settings, Share2, Trash } from 'lucide-react'

export function MyRoomCard({ room, onEdit, onDelete, onCopyLink }) {
  const navigate = useNavigate()

  return (
    <div className="glass p-4 hover:bg-slate-50 transition-all duration-300 group border-2 border-slate-200 shadow-md hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-slate-800">{room.name}</h3>
        <div className="flex gap-1 items-center">
          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-lg flex items-center gap-1 border border-sky-300">
            <Users className="w-3 h-3" />
            {room.participantCount || 0}/{room.maxParticipants}
          </span>
          {room.isPublic ? (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-300">
              <Globe className="w-3 h-3" /> Public
            </span>
          ) : (
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-200">
              <Lock className="w-3 h-3" /> Private
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-4 font-mono">Code: {room.code}</p>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/room/${room.code}`)}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm
                   hover:from-sky-600 hover:to-sky-700 transition-all duration-300"
        >
          Enter
        </button>
        <button
          onClick={() => onEdit(room)}
          className="px-3 py-2 glass-button text-sm"
          title="Edit room settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={() => onCopyLink(room.code)}
          className="px-3 py-2 glass-button text-sm"
          title="Copy invite link"
        >
          <Share2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(room.code)}
          className="px-3 py-2 bg-red-500/20 text-red-600 text-sm rounded-xl hover:bg-red-500/30 
                   border border-red-500/30 transition-all duration-300"
          title="Delete room"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function PublicRoomCard({ room }) {
  const navigate = useNavigate()

  return (
    <div className="glass p-4 hover:bg-slate-50 transition-all duration-300 group border-2 border-slate-200 shadow-md hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg text-slate-800">{room.name}</h3>
        <div className="flex gap-1 items-center">
          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-lg flex items-center gap-1 border border-sky-300">
            <Users className="w-3 h-3" />
            {room.participantCount || 0}/{room.maxParticipants}
          </span>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-1">
        by {room.owner?.username || 'Unknown'}
      </p>
      <p className="text-xs text-slate-400 mb-4 font-mono">Code: {room.code}</p>
      <button
        onClick={() => navigate(`/room/${room.code}`)}
        className="w-full px-3 py-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white text-sm
                 hover:from-sky-600 hover:to-sky-700 transition-all duration-300"
      >
        Join Room
      </button>
    </div>
  )
}
