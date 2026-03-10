export default function AnaliseLoading() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex-shrink-0 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3.5 w-14 bg-zinc-800 rounded" />
          <div className="h-3 w-1 bg-zinc-800 rounded" />
          <div className="h-3.5 w-48 bg-zinc-800 rounded" />
        </div>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1">
            <div className="h-7 w-72 bg-zinc-800 rounded-lg mb-2" />
            <div className="h-4 w-44 bg-zinc-800 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-zinc-800 rounded-full" />
            <div className="h-6 w-28 bg-zinc-800 rounded-full" />
            <div className="h-6 w-36 bg-zinc-800 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="h-5 w-36 bg-zinc-800 rounded-lg" />
          <div className="h-5 w-28 bg-zinc-800 rounded-lg" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-4xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex gap-3">
              <div className="h-4 w-20 bg-zinc-800 rounded" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
              <div className="h-4 w-28 bg-zinc-800 rounded" />
            </div>
            <div className="p-6 space-y-3">
              <div className="h-5 w-64 bg-zinc-800 rounded mb-4" />
              {[100, 90, 75, 100, 85, 60, 100, 80, 70, 50].map((w, i) => (
                <div key={i} className="h-4 bg-zinc-800 rounded" style={{ width: `${w}%` }} />
              ))}
              <div className="h-5 w-48 bg-zinc-800 rounded mt-4 mb-2" />
              {[100, 88, 72, 95].map((w, i) => (
                <div key={i} className="h-4 bg-zinc-800 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="w-96 border-l border-zinc-800 bg-zinc-950 flex-shrink-0" />
      </div>
    </div>
  )
}
