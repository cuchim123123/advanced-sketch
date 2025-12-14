import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
  return (
    <div className="flex-1 min-w-[250px] relative">
      <Search 
        size={18} 
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" 
      />
      <input
        type="text"
        placeholder="Search rooms by name or owner..."
        value={value}
        onChange={onChange}
        className="w-full py-3 px-4 pl-12 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 outline-none transition-all duration-200 focus:bg-white/[0.08] focus:border-white/20"
      />
    </div>
  )
}
