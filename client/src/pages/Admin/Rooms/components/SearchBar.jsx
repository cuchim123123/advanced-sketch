import { Search } from 'lucide-react'
import { searchInputStyle } from '../../styles/adminStyles'

export default function SearchBar({ value, onChange }) {
  return (
    <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
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
        value={value}
        onChange={onChange}
        style={searchInputStyle}
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
  )
}
