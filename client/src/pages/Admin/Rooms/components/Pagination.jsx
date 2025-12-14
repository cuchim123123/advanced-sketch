export default function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex justify-center items-center gap-2 p-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`
          py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium transition-all duration-200
          ${currentPage === 1 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-white/10'
          }
        `}
      >
        Previous
      </button>
      <span className="text-white/60 text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`
          py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-medium transition-all duration-200
          ${currentPage === totalPages 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:bg-white/10'
          }
        `}
      >
        Next
      </button>
    </div>
  )
}
