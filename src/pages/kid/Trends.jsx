import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays } from 'date-fns'
import TrendChart from '../../components/charts/TrendChart'
import { getLevel, LEVEL_CONFIG, LEVELS } from '../../lib/levels'

export default function Trends() {
  const { profile } = useAuth()
  const [logs, setLogs]     = useState([])
  const [range, setRange]   = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    const since = format(subDays(new Date(), range), 'yyyy-MM-dd')
    supabase.from('daily_logs').select('date, total_pts, level_achieved')
      .eq('kid_id', profile.id).gte('date', since).order('date')
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  // Level distribution
  const levelCounts = logs.reduce((acc, l) => {
    const lv = l.level_achieved || getLevel(l.total_pts)
    acc[lv] = (acc[lv] || 0) + 1
    return acc
  }, {})

  const avg = logs.length ? Math.round(logs.reduce((s, l) => s + l.total_pts, 0) / logs.length) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">My Trends</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[14, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === d ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-slate-800">{logs.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">Days Logged</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-blue-600">{avg}</div>
          <div className="text-xs text-slate-400 mt-0.5">Avg Points</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-emerald-600">{levelCounts[LEVELS.ROLEMODEL] || 0}</div>
          <div className="text-xs text-slate-400 mt-0.5">Role Model Days</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="text-sm font-semibold text-slate-600 mb-4">Daily Points</div>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet.</div>
        ) : (
          <TrendChart data={logs} height={200} />
        )}
      </div>

      {/* Level breakdown */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="text-sm font-semibold text-slate-600 mb-4">Level Breakdown</div>
          <div className="space-y-3">
            {Object.entries(LEVEL_CONFIG).filter(([k]) => k !== LEVELS.ORIENTATION).map(([key, cfg]) => {
              const count = levelCounts[key] || 0
              const pct = logs.length ? Math.round((count / logs.length) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-semibold ${cfg.textClass}`}>{cfg.emoji} {cfg.label}</span>
                    <span className="text-slate-500">{count} days ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
