export default function StatCard({ label, value, sub, icon, colorClass = 'text-slate-700', bgClass = 'bg-white' }) {
  return (
    <div className={`${bgClass} rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-1`}>
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
