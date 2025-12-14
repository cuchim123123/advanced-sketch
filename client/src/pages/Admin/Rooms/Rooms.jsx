import React, { useState, useCallback } from 'react'
import { api } from '@/services'
import { toast } from 'sonner'
import { usePolling } from '@/hooks'
import { RefreshButton } from '@/components/ui'
import { RoomCard, RoomCardSkeleton, RoomModal, SearchBar, Pagination } from './components'

const Rooms = () => {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view')

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await api.get('/admin/rooms', {
        params: { page: currentPage, limit: 10, search: searchQuery }
      })
      setRooms(response.data?.data?.rooms || [])
      setTotalPages(response.data?.data?.totalPages || 1)
    } catch (error) {
      if (!silent) toast.error('Failed to fetch rooms')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentPage, searchQuery])

  // Auto-polling with visibility awareness
  const { isRefreshing, manualRefresh } = usePolling(fetchRooms, {
    pollInterval: 10000,
    debounceTime: 3000
  })

  const handleDelete = async (roomId) => {
    try {
      await api.delete(`/admin/rooms/${roomId}`)
      toast.success('Room deleted successfully')
      manualRefresh()
      closeModal()
    } catch (error) {
      toast.error('Failed to delete room')
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
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
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>
            Room Management
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Monitor and manage all collaboration rooms
          </p>
        </div>
        <RefreshButton
          onClick={manualRefresh}
          isRefreshing={isRefreshing}
          title="Refresh rooms"
        />
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[...Array(6)].map((_, i) => (
            <RoomCardSkeleton key={i} />
          ))}
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
              <RoomCard
                key={room._id}
                room={room}
                onView={(r) => openModal('view', r)}
                onDelete={(r) => openModal('delete', r)}
              />
            ))}
          </div>

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Modal */}
      {showModal && (
        <RoomModal
          room={selectedRoom}
          type={modalType}
          onClose={closeModal}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default Rooms
