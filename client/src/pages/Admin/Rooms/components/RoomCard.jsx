import { Users as UsersIcon, Calendar, Eye, Trash2 } from 'lucide-react'

export default function RoomCard({ room, onView, onDelete }) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
      {/* Room Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-white text-lg font-semibold m-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {room.name}
        </h3>
        <span className={`
          py-1 px-3 rounded-full text-xs font-semibold ml-2
          ${room.isPublic 
            ? 'bg-emerald-500/10 text-emerald-500' 
            : 'bg-red-500/10 text-red-500'
          }
        `}>
          {room.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      {/* Room Stats */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon size={16} className="text-white/60" />
          <span className="text-sm text-white/60">
            {room.activeParticipants || 0} online
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-white/60" />
          <span className="text-sm text-white/60">
            {new Date(room.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Owner Info */}
      <div className="p-3 bg-white/[0.03] rounded-lg mb-4">
        <p className="text-xs text-white/50 mb-1">
          Owner
        </p>
        <p className="text-sm text-white font-medium">
          {room.owner?.username || 'Unknown'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(room)
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-white/10"
        >
          <Eye size={16} />
          <span>View</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(room)
          }}
          className="flex items-center justify-center p-2 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-500/20"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      </div>
    </div>
  )
}
