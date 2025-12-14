import { Modal } from '../../components'

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">{label}</p>
    <p className="text-white text-base">{value}</p>
  </div>
)

export default function RoomModal({ room, type, onClose, onDelete }) {
  if (!room) return null

  const title = type === 'view' ? 'Room Details' : 'Delete Room'

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      {type === 'view' && (
        <div className="flex flex-col gap-4">
          <DetailRow label="Room Name" value={room.name} />
          <DetailRow label="Owner" value={room.owner?.username || 'Unknown'} />
          <DetailRow label="Type" value={room.isPublic ? 'Public' : 'Private'} />
          <DetailRow label="Participants" value={room.participants?.length || 0} />
          <DetailRow label="Created" value={new Date(room.createdAt).toLocaleString()} />
          {room.password && <DetailRow label="Password Protected" value="Yes" />}
        </div>
      )}

      {type === 'delete' && (
        <div>
          <p className="text-white/70 mb-6">
            Are you sure you want to delete room <strong>{room.name}</strong>? 
            This will remove all participants and cannot be undone.
          </p>
          <div className="flex gap-4 justify-end">
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-semibold cursor-pointer transition-all hover:bg-white/10"
            >
              Cancel
            </button>
            <button 
              onClick={() => onDelete(room._id)} 
              className="px-6 py-3 bg-red-500 border-none rounded-lg text-white text-sm font-semibold cursor-pointer transition-all hover:bg-red-600"
            >
              Delete Room
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
