import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, subDays } from 'date-fns'
import TrendChart from '../../components/charts/TrendChart'
import LevelBadge from '../../components/ui/LevelBadge'
import { getLevel } from '../../lib/levels'

export default function Reports() {
  const [kids, setKids]           = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [range, setRange]         = useState(30)
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    supabase.from('kids').select('id, initials, is_active').order('is_active', { ascending: false }).order('initials')
      .then(({ data }) => {
        const visible = data || []
        setKids(visible)
        if (visible[0]) setSelectedKid(visible[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedKid) return
    setLoading(true)
    const sinceClause = range === 0
      ? {} // all-time: no date filter
      : { gte: format(subDays(new Date(), range), 'yyyy-MM-dd') }

    let query = supabase.from('daily_logs')
      .select('date, total_pts, level_achieved, minor_infractions, major_infractions, am_pts, pm_pts, ov_pts')
      .eq('kid_id', selectedKid)
      .order('date')

    if (range !== 0) query = query.gte('date', format(subDays(new Date(), range), 'yyyy-MM-dd'))

    query.then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [selectedKid, range])

  const kid = kids.find(k => k.id === selectedKid)
  const avg = logs.length ? Math.round(logs.reduce((s, l) => s + l.total_pts, 0) / logs.length) : 0
  const best = logs.length ? Math.max(...logs.map(l => l.total_pts)) : 0
  const roleMdlDays = logs.filter(l => l.level_achieved === 'rolemodel').length

  const visibleKids = showInactive ? kids : kids.filter(k => k.is_active)

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Reports & Trends</h1>
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
            className="rounded" />
          Show discharged
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 min-w-[140px]">
          {visibleKids.map(k => (
            <option key={k.id} value={k.id}>{k.initials}{!k.is_active ? ' (discharged)' : ''}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[7, 14, 30, 90, 0].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range === d ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
              {d === 0 ? 'All' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {kid && (
        <>
          {!kid.is_active && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
              This youth has been discharged. Showing historical data only.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Days Logged', value: logs.length, color: 'text-slate-800' },
              { label: 'Avg Daily Pts', value: avg, color: 'text-blue-600' },
              { label: 'Best Day', value: best, color: 'text-amber-600' },
              { label: 'Role Model Days', value: roleMdlDays, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-700 mb-4">
              Daily Points — {range === 0 ? 'All Time' : `Last ${range} Days`}
            </h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data for this period.</div>
            ) : (
              <TrendChart data={logs} height={220} />
            )}
          </div>

          {logs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-700">Daily Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="text-left px-5 py-2 text-xs font-semibold text-slate-400 uppercase">Date</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase">AM</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase">PM</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Night</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Total</th>
                      <th className="text-center px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...logs].reverse().map(l => (
                      <tr key={l.date} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-2.5 text-slate-600">{format(new Date(l.date), 'EEE, MMM d')}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500">{l.am_pts ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500">{l.pm_pts ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500">{l.ov_pts ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-800">{l.total_pts}</td>
                        <td className="px-4 py-2.5 text-center"><LevelBadge level={l.level_achieved} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
