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
    let query = supabase.from('daily_logs').select('date, total_pts, level_achieved')
      .eq('kid_id', profile.id).order('date')
    if (range !== 0) query = query.gte('date', format(subDays(new Date(), range), 'yyyy-MM-dd'))
    query.then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  const levelCounts = logs.reduce((acc, l) => {
    const lv = l.level_achieved || getLevel(l.total_pts)
    acc[lv] = (acc[lv] || 0) + 1
    return acc
  }, {})

  const avg   = logs.length ? Math.round(logs.reduce((s, l) => s + l.total_pts, 0) / logs.length) : 0
  const best  = logs.length ? Math.max(...logs.map(l => l.total_pts)) : 0
  const rmDays = levelCounts[LEVELS.ROLEMODEL] || 0
  const rmPct  = logs.length ? Math.round((rmDays / logs.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">My Trends</h1>
        <div className="flex gap-1 bg-white/60 clay-card p-1 rounded-xl">
          {[14, 30, 90, 0].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === d ? 'bg-blue-500 text-white shadow' : 'text-slate-500'}`}>
              {d === 0 ? 'All' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="clay-card bg-white p-4 text-center">
          <div className="text-3xl font-black text-blue-600">{avg}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-1">Avg Points</div>
        </div>
        <div className="clay-card bg-white p-4 text-center">
          <div className="text-3xl font-black text-amber-600">{best}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-1">Best Day</div>
        </div>
        <div className="clay-card bg-white p-4 text-center">
          <div className="text-3xl font-black text-slate-700">{logs.length}</div>
          <div className="text-xs text-slate-400 font-bold uppercase mt-1">Days Logged</div>
        </div>
        <div className="clay-card bg-emerald-50 p-4 text-center">
          <div className="text-3xl font-black text-emerald-600">{rmDays}</div>
          <div className="text-xs text-emerald-600 font-bold uppercase mt-1">🏆 Role Model</div>
        </div>
      </div>

      {/* Chart */}
      <div className="clay-card bg-white p-5">
        <div className="text-sm font-bold text-slate-600 mb-4">
          Daily Points {range === 0 ? '(All Time)' : `(Last ${range} days)`}
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="text-3xl animate-bounce">📊</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data yet.</div>
        ) : (
          <TrendChart data={logs} height={200} />
        )}
      </div>

      {/* Role Model percentage card */}
      {logs.length > 0 && (
        <div className="clay-card bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-emerald-100 text-sm font-semibold">Role Model rate</div>
              <div className="text-5xl font-black mt-1">{rmPct}%</div>
              <div className="text-emerald-100 text-xs mt-1">{rmDays} of {logs.length} days</div>
            </div>
            <div className="text-7xl">🏆</div>
          </div>
          <div className="mt-3 h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${rmPct}%` }} />
          </div>
        </div>
      )}

      {/* Level breakdown */}
      {logs.length > 0 && (
        <div className="clay-card bg-white p-5">
          <div className="text-sm font-bold text-slate-600 mb-4">Level Breakdown</div>
          <div className="space-y-3">
            {[LEVELS.ROLEMODEL, LEVELS.RISING, LEVELS.REFOCUS].map(key => {
              const cfg   = LEVEL_CONFIG[key]
              const count = levelCounts[key] || 0
              const pct   = logs.length ? Math.round((count / logs.length) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-bold ${cfg.textClass}`}>{cfg.emoji} {cfg.label}</span>
                    <span className="text-slate-400 font-semibold">{count} days ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${cfg.gradient} transition-all duration-700`}
                      style={{ width: `${pct}%` }} />
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
