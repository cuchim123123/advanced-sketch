import React, { useState, useCallback, useRef } from 'react'
import { Search, Trash2, Eye } from 'lucide-react'
import { api } from '@/services'
import { toast } from 'sonner'
import { usePolling } from '@/hooks'
import { RefreshButton } from '@/components/ui'
import { Modal } from '../components'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view')
  const searchTimeoutRef = useRef(null)

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchInput(value)
    
    // Debounce search query
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
      setCurrentPage(1)
    }, 500)
  }

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await api.get('/admin/users', {
        params: {
          page: currentPage,
          limit: 10,
          search: searchQuery
        }
      })
      setUsers(response.data?.data?.users || [])
      setTotalPages(response.data?.data?.totalPages || 1)
    } catch (error) {
      if (!silent) toast.error('Failed to fetch users')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentPage, searchQuery])

  const { isRefreshing, manualRefresh } = usePolling(fetchUsers, {
    pollInterval: 10000,
    debounceTime: 1000
  })

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success('User deleted successfully')
      manualRefresh()
      setShowModal(false)
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const openModal = (type, user) => {
    setModalType(type)
    setSelectedUser(user)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedUser(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">User Management</h1>
          <p className="text-base text-white/60">Manage all registered users and their permissions</p>
        </div>
        <RefreshButton
          onClick={manualRefresh}
          isRefreshing={isRefreshing}
          title="Refresh users"
        />
      </div>

      {/* Search */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none transition-all focus:bg-white/[0.08] focus:border-white/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10">
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Email</th>
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Role</th>
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Joined</th>
                  <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="p-4 text-white/80 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full animate-shimmer" />
                        <div className="w-[120px] h-[18px] rounded animate-shimmer" />
                      </div>
                    </td>
                    <td className="p-4"><div className="w-[180px] h-[18px] rounded animate-shimmer" /></td>
                    <td className="p-4"><div className="w-[60px] h-6 rounded-full animate-shimmer" /></td>
                    <td className="p-4"><div className="w-[70px] h-6 rounded-full animate-shimmer" /></td>
                    <td className="p-4"><div className="w-[90px] h-[18px] rounded animate-shimmer" /></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-md animate-shimmer" />
                        <div className="w-8 h-8 rounded-md animate-shimmer" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/60">No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.03] border-b border-white/10">
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Name</th>
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Email</th>
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Role</th>
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Joined</th>
                    <th className="p-4 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr 
                      key={user._id}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="p-4 text-white/80 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium">{user.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/80 text-sm">{user.email || 'N/A'}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.isEmailVerified 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-amber-400/10 text-amber-400'
                        }`}>
                          {user.isEmailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-white/80 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal('view', user)}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-all flex items-center justify-center text-white/80 hover:bg-white/10"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openModal('delete', user)}
                            className="p-2 bg-red-500/10 border border-white/10 rounded-lg cursor-pointer transition-all flex items-center justify-center hover:bg-red-500/20"
                            title="Delete User"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 p-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm cursor-pointer transition-all hover:bg-white/10 ${
                  currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Previous
              </button>
              <span className="text-white/60 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm cursor-pointer transition-all hover:bg-white/10 ${
                  currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={closeModal} 
        title={modalType === 'view' ? 'User Details' : modalType === 'edit' ? 'Edit User' : 'Delete User'}
      >
        {modalType === 'view' && selectedUser && (
          <div className="flex flex-col gap-4">
            <DetailRow label="Username" value={selectedUser.username} />
            <DetailRow label="Email" value={selectedUser.email} />
            <DetailRow label="Role" value={selectedUser.role} />
            <DetailRow label="Status" value={selectedUser.verified ? 'Verified' : 'Pending'} />
            <DetailRow label="Joined" value={new Date(selectedUser.createdAt).toLocaleString()} />
          </div>
        )}

        {modalType === 'delete' && selectedUser && (
          <div>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete user <strong>{selectedUser.username}</strong>? 
              This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={closeModal} 
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-semibold cursor-pointer transition-all hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(selectedUser._id)}
                className="px-6 py-3 bg-red-500 border-none rounded-lg text-white text-sm font-semibold cursor-pointer transition-all hover:bg-red-600"
              >
                Delete User
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-white/50 mb-1 uppercase tracking-wider">{label}</p>
    <p className="text-white text-base">{value}</p>
  </div>
)

export default Users
