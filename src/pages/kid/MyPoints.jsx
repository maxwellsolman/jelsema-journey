import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays } from 'date-fns'
import LevelBadge from '../../components/ui/LevelBadge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS } from '../../lib/points'
import { LEVEL_CONFIG, getLevel } from '../../lib/levels'

function DayCard({ log }) {
  const [open, setOpen] = useState(false)
  const level = log.level_achieved || getLevel(log.total_pts)
  const cfg = LEVEL_CONFIG[level]

  return (
    <div className={`clay-card overflow-hidden ${open ? 'ring-2 ring-blue-200' : 'bg-white'}`}>
      <button className="w-full flex items-center justify-between px-4 py-4" onClick={() => setOpen(v => !v)}>
        <div className="text-left flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${cfg.badgeBg} flex items-center justify-center text-xl`}>{cfg.emoji}</div>
          <div>
            <div className="font-bold text-slate-800">{format(new Date(log.date), 'EEEE')}</div>
            <div className="text-xs text-slate-400">{format(new Date(log.date), 'MMM d, yyyy')}</div>
            <LevelBadge level={level} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className={`text-3xl font-black ${cfg.textClass}`}>{log.total_pts}</div>
            <div className="text-xs text-slate-400">pts</div>
          </div>
          <div className="text-slate-300">
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
          {[
            { label: '☀️ Morning (6am–2pm)',         behaviors: AM_BEHAVIORS,        pts: log.am_pts, max: 40 },
            { label: '🌆 Afternoon (2pm–10pm)',        behaviors: PM_BEHAVIORS,        pts: log.pm_pts, max: 50 },
            { label: '🌙 Overnight (10pm–6am)',        behaviors: OVERNIGHT_BEHAVIORS, pts: log.ov_pts, max: 10 },
          ].map(shift => (
            <div key={shift.label}>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>{shift.label}</span>
                <span className={shift.pts === shift.max ? 'text-emerald-600' : 'text-slate-400'}>
                  {shift.pts ?? 0}/{shift.max} pts {shift.pts === shift.max ? '🎉' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {shift.behaviors.map(b => (
                  <div key={b.key}
                    className={`flex items-center gap-2 text-xs py-1.5 px-3 rounded-xl font-medium
                      ${log[b.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400 line-through'}`}>
                    <span className="text-base">{log[b.key] ? '✅' : '❌'}</span>
                    {b.label}
                    <span className="ml-auto font-bold">{log[b.key] ? '+5' : '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(log.minor_infractions > 0 || log.major_infractions > 0) && (
            <div className="bg-red-50 rounded-2xl px-3 py-2.5 space-y-1">
              {log.minor_infractions > 0 && (
                <div className="flex justify-between text-xs text-orange-700 font-bold">
                  <span>⚠️ {log.minor_infractions}× Minor Infraction</span>
                  <span>−{log.minor_infractions * 20} pts</span>
                </div>
              )}
              {log.major_infractions > 0 && (
                <div className="flex justify-between text-xs text-red-700 font-bold">
                  <span>🚨 {log.major_infractions}× Major Infraction</span>
                  <span>−{log.major_infractions * 40} pts</span>
                </div>
              )}
            </div>
          )}

          {log.positive_experiences && (
            <div className="bg-emerald-50 rounded-2xl px-3 py-2.5 text-xs text-emerald-700">
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
    const since = range === 0 ? null : format(subDays(new Date(), range), 'yyyy-MM-dd')
    let query = supabase.from('daily_logs').select('*').eq('kid_id', profile.id).order('date', { ascending: false })
    if (since) query = query.gte('date', since)
    query.then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">My Points</h1>
        <div className="flex gap-1 bg-white/60 clay-card p-1 rounded-xl">
          {[7, 14, 30, 0].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${range === d ? 'bg-blue-500 text-white shadow' : 'text-slate-500'}`}>
              {d === 0 ? 'All' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="clay-card bg-white p-10 text-center">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-slate-400 font-semibold">No points logged yet</div>
          <div className="text-slate-300 text-sm mt-1">Ask your staff to log your daily points!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => <DayCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
