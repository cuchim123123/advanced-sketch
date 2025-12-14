// Shared styles for Admin components
export const cardStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '1.5rem',
  transition: 'all 0.3s',
  cursor: 'pointer'
}

export const actionButtonStyle = {
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

export const paginationButtonStyle = {
  padding: '0.5rem 1rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.2s'
}

export const modalOverlayStyle = {
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
}

export const modalContentStyle = {
  background: 'rgba(30, 30, 40, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '2rem',
  maxWidth: '500px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'auto'
}

export const closeButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '8px',
  transition: 'all 0.2s'
}

export const cancelButtonStyle = {
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

export const deleteButtonStyle = {
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

export const searchInputStyle = {
  width: '100%',
  padding: '0.875rem 1rem 0.875rem 3rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  color: 'white',
  fontSize: '0.875rem',
  outline: 'none',
  transition: 'all 0.2s'
}
