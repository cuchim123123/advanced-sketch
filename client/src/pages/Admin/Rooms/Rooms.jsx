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
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Room Management
          </h1>
          <p className="text-base text-white/60">
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
      <div className="flex gap-4 mb-6 flex-wrap">
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <RoomCardSkeleton key={i} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-white/60">No rooms found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 mb-8">
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
