export default function ProgressBar({ pct, colorClass = 'bg-emerald-500', label, height = 'h-3' }) {
  const clamped = Math.min(100, Math.max(0, pct || 0))
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-slate-200 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${colorClass} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
