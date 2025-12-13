import React, { useState, useEffect } from 'react'
import { Search, Filter, Edit, Trash2, Eye, Plus, X } from 'lucide-react'
import api from '@/services/api'
import { toast } from 'sonner'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('view') // 'view', 'edit', 'delete'

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchQuery])

  const fetchUsers = async () => {
    setLoading(true)
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
      toast.error('Failed to fetch users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`)
      toast.success('User deleted successfully')
      fetchUsers()
      setShowModal(false)
    } catch (error) {
      toast.error('Failed to delete user')
      console.error(error)
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
            User Management
          </h1>
          <p style={{ 
            fontSize: '1rem', 
            color: 'rgba(255, 255, 255, 0.6)' 
          }}>
            Manage all registered users and their permissions
          </p>
        </div>
      </div>

      {/* Search and Filters */}
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
            placeholder="Search users by name or email..."
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

      {/* Users Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No users found</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>Email</th>
                    <th style={tableHeaderStyle}>Role</th>
                    <th style={tableHeaderStyle}>Status</th>
                    <th style={tableHeaderStyle}>Joined</th>
                    <th style={tableHeaderStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr 
                      key={user._id}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                          }}>
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span style={{ fontWeight: '500' }}>{user.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={tableCellStyle}>{user.email || 'N/A'}</td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: user.role === 'admin' ? 
                            'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: user.role === 'admin' ? '#ef4444' : '#3b82f6'
                        }}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: user.verified ? 
                            'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                          color: user.verified ? '#10b981' : '#fbbf24'
                        }}>
                          {user.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => openModal('view', user)}
                            style={actionButtonStyle}
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openModal('delete', user)}
                            style={{ ...actionButtonStyle, background: 'rgba(239, 68, 68, 0.1)' }}
                            title="Delete User"
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      </div>

      {/* Modal */}
      {showModal && (
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
                {modalType === 'view' ? 'User Details' : 
                 modalType === 'edit' ? 'Edit User' : 'Delete User'}
              </h2>
              <button onClick={closeModal} style={closeButtonStyle}>
                <X size={20} />
              </button>
            </div>

            {modalType === 'view' && selectedUser && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <DetailRow label="Username" value={selectedUser.username} />
                <DetailRow label="Email" value={selectedUser.email} />
                <DetailRow label="Role" value={selectedUser.role} />
                <DetailRow label="Status" value={selectedUser.verified ? 'Verified' : 'Pending'} />
                <DetailRow label="Joined" value={new Date(selectedUser.createdAt).toLocaleString()} />
              </div>
            )}

            {modalType === 'delete' && selectedUser && (
              <div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
                  Are you sure you want to delete user <strong>{selectedUser.username}</strong>? 
                  This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button onClick={closeModal} style={cancelButtonStyle}>
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedUser._id)}
                    style={deleteButtonStyle}
                  >
                    Delete User
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
const tableHeaderStyle = {
  padding: '1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: 'rgba(255, 255, 255, 0.6)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tableCellStyle = {
  padding: '1rem',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '0.875rem'
}

const actionButtonStyle = {
  padding: '0.5rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255, 255, 255, 0.8)'
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

export default Users
