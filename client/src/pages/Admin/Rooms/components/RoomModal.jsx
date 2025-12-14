import { X } from 'lucide-react'
import { 
  modalOverlayStyle, 
  modalContentStyle, 
  closeButtonStyle, 
  cancelButtonStyle, 
  deleteButtonStyle 
} from '../../styles/adminStyles'

const DetailRow = ({ label, value }) => (
  <div>
    <p style={{ 
      fontSize: '0.75rem', 
      color: 'rgba(255, 255, 255, 0.5)',
      marginBottom: '0.25rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </p>
    <p style={{ color: 'white', fontSize: '1rem' }}>{value}</p>
  </div>
)

export default function RoomModal({ room, type, onClose, onDelete }) {
  if (!room) return null

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
            {type === 'view' ? 'Room Details' : 'Delete Room'}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>

        {type === 'view' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete room <strong>{room.name}</strong>? 
              This will remove all participants and cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={cancelButtonStyle}>
                Cancel
              </button>
              <button onClick={() => onDelete(room._id)} style={deleteButtonStyle}>
                Delete Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
