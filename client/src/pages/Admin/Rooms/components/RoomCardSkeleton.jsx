import { cardStyle } from '../../styles/adminStyles'

const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '4px'
}

export default function RoomCardSkeleton() {
  return (
    <div style={cardStyle}>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
      
      {/* Header skeleton */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ ...shimmerStyle, width: '60%', height: '24px' }} />
        <div style={{ ...shimmerStyle, width: '60px', height: '24px', borderRadius: '20px' }} />
      </div>

      {/* Stats skeleton */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ ...shimmerStyle, width: '80px', height: '20px' }} />
        <div style={{ ...shimmerStyle, width: '100px', height: '20px' }} />
      </div>

      {/* Owner skeleton */}
      <div style={{ 
        padding: '0.75rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{ ...shimmerStyle, width: '40px', height: '14px', marginBottom: '0.5rem' }} />
        <div style={{ ...shimmerStyle, width: '100px', height: '18px' }} />
      </div>

      {/* Actions skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ ...shimmerStyle, flex: 1, height: '36px', borderRadius: '8px' }} />
        <div style={{ ...shimmerStyle, width: '80px', height: '36px', borderRadius: '8px' }} />
      </div>
    </div>
  )
}
