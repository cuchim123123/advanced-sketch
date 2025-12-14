import { Users as UsersIcon, Calendar, Eye, Trash2 } from 'lucide-react'
import { cardStyle, actionButtonStyle } from '../../styles/adminStyles'

export default function RoomCard({ room, onView, onDelete }) {
  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Room Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <h3 style={{ 
          color: 'white', 
          fontSize: '1.125rem', 
          fontWeight: '600',
          margin: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {room.name}
        </h3>
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          background: room.isPublic ? 
            'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: room.isPublic ? '#10b981' : '#ef4444',
          marginLeft: '0.5rem'
        }}>
          {room.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      {/* Room Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UsersIcon size={16} color="rgba(255, 255, 255, 0.6)" />
          <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            {room.participants?.length || 0} members
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} color="rgba(255, 255, 255, 0.6)" />
          <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            {new Date(room.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Owner Info */}
      <div style={{ 
        padding: '0.75rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.25rem' }}>
          Owner
        </p>
        <p style={{ fontSize: '0.875rem', color: 'white', fontWeight: '500' }}>
          {room.owner?.username || 'Unknown'}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onView(room)
          }}
          style={{ ...actionButtonStyle, flex: 1 }}
        >
          <Eye size={16} />
          <span style={{ marginLeft: '0.5rem' }}>View</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(room)
          }}
          style={{
            ...actionButtonStyle,
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.2)'
          }}
        >
          <Trash2 size={16} color="#ef4444" />
        </button>
      </div>
    </div>
  )
}
