import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays } from 'date-fns'
import LevelBadge from '../../components/ui/LevelBadge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS } from '../../lib/points'

function DayCard({ log }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-4" onClick={() => setOpen(v => !v)}>
        <div className="text-left">
          <div className="font-bold text-slate-800">{format(new Date(log.date), 'EEEE, MMM d')}</div>
          <LevelBadge level={log.level_achieved} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-black text-slate-800">{log.total_pts}</div>
            <div className="text-xs text-slate-400">pts</div>
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-50 px-4 pb-4 pt-3 space-y-4">
          {/* Shift breakdown */}
          {[
            { label: 'Morning (6am–2pm)', behaviors: AM_BEHAVIORS, pts: log.am_pts, max: 40 },
            { label: 'Afternoon/Evening (2pm–10pm)', behaviors: PM_BEHAVIORS, pts: log.pm_pts, max: 50 },
            { label: 'Overnight (10pm–6am)', behaviors: OVERNIGHT_BEHAVIORS, pts: log.ov_pts, max: 10 },
          ].map(shift => (
            <div key={shift.label}>
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>{shift.label}</span>
                <span>{shift.pts ?? 0}/{shift.max} pts</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {shift.behaviors.map(b => (
                  <div key={b.key} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${log[b.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400 line-through'}`}>
                    <span>{log[b.key] ? '✓' : '✗'}</span>
                    {b.label}
                    <span className="ml-auto font-semibold">{log[b.key] ? '+5' : '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Infractions */}
          {(log.minor_infractions > 0 || log.major_infractions > 0) && (
            <div className="bg-red-50 rounded-xl px-3 py-2 space-y-1">
              {log.minor_infractions > 0 && (
                <div className="flex justify-between text-xs text-orange-700 font-semibold">
                  <span>⚠️ {log.minor_infractions}× Minor Infraction</span>
                  <span>−{log.minor_infractions * 20} pts</span>
                </div>
              )}
              {log.major_infractions > 0 && (
                <div className="flex justify-between text-xs text-red-700 font-semibold">
                  <span>🚨 {log.major_infractions}× Major Infraction</span>
                  <span>−{log.major_infractions * 40} pts</span>
                </div>
              )}
            </div>
          )}

          {/* Positive experiences */}
          {log.positive_experiences && (
            <div className="bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700">
              ✨ {log.positive_experiences}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MyPoints() {
  const { profile } = useAuth()
  const [logs, setLogs]     = useState([])
  const [range, setRange]   = useState(14)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    const since = format(subDays(new Date(), range), 'yyyy-MM-dd')
    supabase.from('daily_logs').select('*').eq('kid_id', profile.id)
      .gte('date', since).order('date', { ascending: false })
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">My Points</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === d ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-10">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-slate-400 text-sm text-center bg-white rounded-2xl p-10 border border-slate-100">
          No points logged yet. Ask your staff!
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => <DayCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
