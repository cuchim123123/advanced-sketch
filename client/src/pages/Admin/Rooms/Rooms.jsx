import React, { useState, useEffect } from 'react'
import { Search, Users as UsersIcon, Calendar, Settings, Trash2, Eye, X } from 'lucide-react'
import api from '@/services/api'
import { toast } from 'sonner'

const Rooms = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view')

  useEffect(() => {
    fetchRooms()
  }, [currentPage, searchQuery])

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/rooms', {
        params: {
          page: currentPage,
          limit: 10,
          search: searchQuery
        }
      })
      setRooms(response.data?.data?.rooms || [])
      setTotalPages(response.data?.data?.totalPages || 1)
    } catch (error) {
      toast.error('Failed to fetch rooms')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (roomId) => {
    try {
      await api.delete(`/admin/rooms/${roomId}`)
      toast.success('Room deleted successfully')
      fetchRooms()
      setShowModal(false)
    } catch (error) {
      toast.error('Failed to delete room')
      console.error(error)
    }
  }

  const openModal = (type, room) => {
    setModalType(type)
    setSelectedRoom(room)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRoom(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: 'white',
            marginBottom: '0.5rem'
          }}>
            Room Management
          </h1>
          <p style={{ 
            fontSize: '1rem', 
            color: 'rgba(255, 255, 255, 0.6)' 
          }}>
            Monitor and manage all collaboration rooms
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          flex: '1', 
          minWidth: '250px',
          position: 'relative'
        }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)'
            }} 
          />
          <input
            type="text"
            placeholder="Search rooms by name or owner..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            style={{
              width: '100%',
              padding: '0.875rem 1rem 0.875rem 3rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.08)'
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)'
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }}
          />
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      ) : rooms.length === 0 ? (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No rooms found</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {rooms.map((room) => (
              <div
                key={room._id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
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
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UsersIcon size={16} color="rgba(255, 255, 255, 0.6)" />
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: 'rgba(255, 255, 255, 0.6)' 
                    }}>
                      {room.participants?.length || 0} members
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} color="rgba(255, 255, 255, 0.6)" />
                    <span style={{ 
                      fontSize: '0.875rem', 
                      color: 'rgba(255, 255, 255, 0.6)' 
                    }}>
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
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '0.25rem'
                  }}>
                    Owner
                  </p>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {room.owner?.username || 'Unknown'}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openModal('view', room)
                    }}
                    style={{
                      ...actionButtonStyle,
                      flex: 1
                    }}
                  >
                    <Eye size={16} />
                    <span style={{ marginLeft: '0.5rem' }}>View</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openModal('delete', room)
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
            ))}
          </div>

          {/* Pagination */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '0.5rem',
            padding: '1.5rem'
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                ...paginationButtonStyle,
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                ...paginationButtonStyle,
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && selectedRoom && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'rgba(30, 30, 40, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
                {modalType === 'view' ? 'Room Details' : 'Delete Room'}
              </h2>
              <button onClick={closeModal} style={closeButtonStyle}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'view' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <DetailRow label="Room Name" value={selectedRoom.name} />
                <DetailRow label="Owner" value={selectedRoom.owner?.username || 'Unknown'} />
                <DetailRow label="Type" value={selectedRoom.isPublic ? 'Public' : 'Private'} />
                <DetailRow label="Participants" value={selectedRoom.participants?.length || 0} />
                <DetailRow label="Created" value={new Date(selectedRoom.createdAt).toLocaleString()} />
                {selectedRoom.password && (
                  <DetailRow label="Password Protected" value="Yes" />
                )}
              </div>
            )}

            {modalType === 'delete' && (
              <div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
                  Are you sure you want to delete room <strong>{selectedRoom.name}</strong>? 
                  This will remove all participants and cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button onClick={closeModal} style={cancelButtonStyle}>
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedRoom._id)}
                    style={deleteButtonStyle}
                  >
                    Delete Room
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component
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

// Styles
const actionButtonStyle = {
  padding: '0.75rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '500'
}

const paginationButtonStyle = {
  padding: '0.5rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
}

const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '8px',
  transition: 'all 0.2s'
}

const cancelButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
}

const deleteButtonStyle = {
  padding: '0.75rem 1.5rem',
  background: '#ef4444',
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
}

export default Rooms
