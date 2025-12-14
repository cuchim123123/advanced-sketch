import React from 'react'
import { Save, RefreshCw } from 'lucide-react'

const Settings = () => {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          System Settings
        </h1>
        <p className="text-base text-white/60">
          Configure application settings and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="flex flex-col gap-6">
        {/* General Settings */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            General Settings
          </h2>
          <div className="flex flex-col gap-4">
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
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Security Settings
          </h2>
          <div className="flex flex-col gap-4">
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
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Room Settings
          </h2>
          <div className="flex flex-col gap-4">
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
        <div className="flex gap-4 justify-end pt-4">
          <button className="py-3.5 px-6 bg-white/5 border border-white/10 rounded-[10px] text-white text-sm font-semibold cursor-pointer transition-all duration-200 flex items-center gap-2 hover:bg-white/[0.08]">
            <RefreshCw size={16} />
            Reset to Defaults
          </button>
          <button className="py-3.5 px-6 bg-gradient-to-br from-indigo-500 to-purple-600 border-none rounded-[10px] text-white text-sm font-semibold cursor-pointer transition-all duration-200 flex items-center gap-2 hover:scale-105 hover:shadow-[0_8px_20px_rgba(102,126,234,0.4)]">
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
  <div className="p-4 bg-white/[0.03] rounded-[10px] flex justify-between items-center gap-4 flex-wrap">
    <div className="flex-1 min-w-[200px]">
      <p className="text-sm font-semibold text-white mb-1">
        {label}
      </p>
      <p className="text-xs text-white/50">
        {description}
      </p>
    </div>
    <input
      type={type}
      defaultValue={value}
      className="py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none w-[150px] focus:bg-white/10 focus:border-white/20 transition-all duration-200"
    />
  </div>
)

const ToggleSetting = ({ label, description, enabled }) => (
  <div className="p-4 bg-white/[0.03] rounded-[10px] flex justify-between items-center gap-4 flex-wrap">
    <div className="flex-1 min-w-[200px]">
      <p className="text-sm font-semibold text-white mb-1">
        {label}
      </p>
      <p className="text-xs text-white/50">
        {description}
      </p>
    </div>
    <label className="relative inline-block w-[50px] h-[26px] cursor-pointer">
      <input 
        type="checkbox" 
        defaultChecked={enabled}
        className="sr-only peer"
      />
      <span className="absolute inset-0 bg-white/10 rounded-full transition-all duration-300 peer-checked:bg-indigo-500">
        <span className={`
          absolute w-[18px] h-[18px] bottom-1 bg-white rounded-full transition-all duration-300
          ${enabled ? 'left-7' : 'left-1'}
          peer-checked:left-7
        `} />
      </span>
    </label>
  </div>
)

export default Settings
