export default function RoomCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-[60%] h-6 rounded animate-shimmer" />
        <div className="w-[60px] h-6 rounded-full animate-shimmer" />
      </div>

      {/* Stats skeleton */}
      <div className="flex gap-4 mb-4">
        <div className="w-20 h-5 rounded animate-shimmer" />
        <div className="w-[100px] h-5 rounded animate-shimmer" />
      </div>

      {/* Owner skeleton */}
      <div className="p-3 bg-white/[0.03] rounded-lg mb-4">
        <div className="w-10 h-3.5 mb-2 rounded animate-shimmer" />
        <div className="w-[100px] h-[18px] rounded animate-shimmer" />
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-2">
        <div className="flex-1 h-9 rounded-lg animate-shimmer" />
        <div className="w-20 h-9 rounded-lg animate-shimmer" />
      </div>
    </div>
  )
}
