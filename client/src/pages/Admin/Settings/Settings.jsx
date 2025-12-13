import React from 'react'
import { Save, RefreshCw } from 'lucide-react'

const Settings = () => {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'white',
          marginBottom: '0.5rem'
        }}>
          System Settings
        </h1>
        <p style={{ 
          fontSize: '1rem', 
          color: 'rgba(255, 255, 255, 0.6)' 
        }}>
          Configure application settings and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* General Settings */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            General Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SettingItem 
              label="Application Name"
              description="The name displayed across the application"
              value="Advanced Sketch"
            />
            <SettingItem 
              label="Max Room Size"
              description="Maximum number of participants per room"
              value="10"
              type="number"
            />
            <SettingItem 
              label="Session Timeout"
              description="User session timeout in minutes"
              value="60"
              type="number"
            />
          </div>
        </div>

        {/* Security Settings */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            Security Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ToggleSetting 
              label="Require Email Verification"
              description="Force users to verify email before using the app"
              enabled={true}
            />
            <ToggleSetting 
              label="Allow Guest Access"
              description="Allow users to join rooms without creating an account"
              enabled={true}
            />
            <ToggleSetting 
              label="Two-Factor Authentication"
              description="Enable 2FA for all admin accounts"
              enabled={false}
            />
          </div>
        </div>

        {/* Room Settings */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: 'white',
            marginBottom: '1.5rem'
          }}>
            Room Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ToggleSetting 
              label="Auto-save Canvas"
              description="Automatically save canvas state every few minutes"
              enabled={true}
            />
            <ToggleSetting 
              label="Enable Chat"
              description="Allow participants to use chat in rooms"
              enabled={true}
            />
            <ToggleSetting 
              label="Public Rooms"
              description="Allow creation of public rooms"
              enabled={true}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'flex-end',
          paddingTop: '1rem'
        }}>
          <button
            style={{
              padding: '0.875rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.08)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
          >
            <RefreshCw size={16} />
            Reset to Defaults
          </button>
          <button
            style={{
              padding: '0.875rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = 'none'
            }}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper Components
const SettingItem = ({ label, description, value, type = 'text' }) => (
  <div style={{ 
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  }}>
    <div style={{ flex: 1, minWidth: '200px' }}>
      <p style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600',
        color: 'white',
        marginBottom: '0.25rem'
      }}>
        {label}
      </p>
      <p style={{ 
        fontSize: '0.75rem', 
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        {description}
      </p>
    </div>
    <input
      type={type}
      defaultValue={value}
      style={{
        padding: '0.5rem 0.75rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.875rem',
        outline: 'none',
        width: '150px'
      }}
    />
  </div>
)

const ToggleSetting = ({ label, description, enabled }) => (
  <div style={{ 
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  }}>
    <div style={{ flex: 1, minWidth: '200px' }}>
      <p style={{ 
        fontSize: '0.875rem', 
        fontWeight: '600',
        color: 'white',
        marginBottom: '0.25rem'
      }}>
        {label}
      </p>
      <p style={{ 
        fontSize: '0.75rem', 
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        {description}
      </p>
    </div>
    <label style={{ 
      position: 'relative', 
      display: 'inline-block', 
      width: '50px', 
      height: '26px',
      cursor: 'pointer'
    }}>
      <input 
        type="checkbox" 
        defaultChecked={enabled}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: enabled ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
        transition: '0.3s',
        borderRadius: '26px'
      }}>
        <span style={{
          position: 'absolute',
          content: '',
          height: '18px',
          width: '18px',
          left: enabled ? '28px' : '4px',
          bottom: '4px',
          background: 'white',
          transition: '0.3s',
          borderRadius: '50%'
        }} />
      </span>
    </label>
  </div>
)

export default Settings
