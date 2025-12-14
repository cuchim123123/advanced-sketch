import { Link } from 'react-router-dom'
import { UserCircle } from 'lucide-react'

export default function GuestBanner() {
  return (
    <div className="glass-strong rounded-xl p-4 mb-6 border border-amber-300 bg-amber-50 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <UserCircle className="w-6 h-6 text-amber-600" />
        <p className="text-amber-700">
          You're browsing as a guest. Create an account to save your rooms and sketches!
        </p>
      </div>
      <Link
        to="/register"
        className="px-4 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 text-white rounded-lg hover:from-sky-600 hover:to-emerald-600 font-medium text-sm shadow-lg transition-all"
      >
        Create Account
      </Link>
    </div>
  )
}
