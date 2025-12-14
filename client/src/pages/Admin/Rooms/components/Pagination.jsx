import { paginationButtonStyle } from '../../styles/adminStyles'

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      gap: '0.5rem',
      padding: '1.5rem'
    }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
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
        onClick={() => onPageChange(currentPage + 1)}
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
  )
}
