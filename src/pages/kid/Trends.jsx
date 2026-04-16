import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays } from 'date-fns'
import TrendChart from '../../components/charts/TrendChart'
import { getLevel, LEVELS } from '../../lib/levels'

const DUO_LEVEL = {
  [LEVELS.ORIENTATION]: { fill:'#94A3B8', bg:'#F1F5F9', text:'#64748B', label:'Orientation', emoji:'🌱' },
  [LEVELS.REFOCUS]:     { fill:'#3B82F6', bg:'#EFF6FF', text:'#2563EB', label:'Re-Focus',    emoji:'🔵' },
  [LEVELS.RISING]:      { fill:'#F59E0B', bg:'#FFFBEB', text:'#D97706', label:'Rising Star', emoji:'⭐' },
  [LEVELS.ROLEMODEL]:   { fill:'#22C55E', bg:'#F0FDF4', text:'#16A34A', label:'Role Model',  emoji:'🏆' },
}

export default function Trends() {
  const { profile } = useAuth()
  const [logs, setLogs]     = useState([])
  const [range, setRange]   = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    let q = supabase.from('daily_logs')
      .select('date, total_pts, level_achieved').eq('kid_id', profile.id).order('date')
    if (range !== 0) q = q.gte('date', format(subDays(new Date(), range), 'yyyy-MM-dd'))
    q.then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  const levelCounts = logs.reduce((acc, l) => {
    const lv = l.level_achieved || getLevel(l.total_pts)
    acc[lv] = (acc[lv] || 0) + 1
    return acc
  }, {})

  const avg    = logs.length ? Math.round(logs.reduce((s,l) => s + l.total_pts, 0) / logs.length) : 0
  const best   = logs.length ? Math.max(...logs.map(l => l.total_pts)) : 0
  const rmDays = levelCounts[LEVELS.ROLEMODEL] || 0
  const rmPct  = logs.length ? Math.round((rmDays / logs.length) * 100) : 0

  const RANGES = [{v:14,label:'14d'},{v:30,label:'30d'},{v:90,label:'90d'},{v:0,label:'All'}]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)' }}>My Trends</h1>
        <div className="duo-card flex p-1 gap-1">
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              className="duo-btn px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: range === r.v ? '#58CC02' : 'transparent',
                color: range === r.v ? '#fff' : 'var(--duo-text-lt)',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:12,
                borderBottomColor: range === r.v ? '#46A302' : 'transparent',
                borderBottomWidth: range === r.v ? '3px' : '0px',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Avg Points', value: avg,    color:'#1CB0F6', bg:'#F0F9FF', icon:'📊' },
          { label:'Best Day',   value: best,   color:'#F59E0B', bg:'#FFFBEB', icon:'🌟' },
          { label:'Days Logged',value: logs.length, color:'#9333EA', bg:'#FAF5FF', icon:'📅' },
          { label:'Role Model', value: rmDays, color:'#22C55E', bg:'#F0FDF4', icon:'🏆' },
        ].map(s => (
          <div key={s.label} className="duo-card p-4 text-center" style={{ borderColor: s.color + '44' }}>
            <div style={{ fontSize:28, marginBottom:2 }}>{s.icon}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color: s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'var(--duo-text-lt)', textTransform:'uppercase', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="duo-card p-5">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
          Daily Points {range === 0 ? '— All Time' : `— Last ${range} days`}
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center" style={{ fontSize:36 }}>📊</div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <div style={{ fontSize:40 }}>😴</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)' }}>No data yet.</div>
          </div>
        ) : (
          <TrendChart data={logs} height={200} color="#58CC02" />
        )}
      </div>

      {/* Role Model rate */}
      {logs.length > 0 && (
        <div className="duo-card overflow-hidden">
          <div className="h-2" style={{ background:'linear-gradient(90deg,#58CC02,#16A34A)' }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Role Model Rate
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:44, color:'#22C55E', lineHeight:1 }}>
                  {rmPct}%
                </div>
                <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:13 }}>
                  {rmDays} of {logs.length} days
                </div>
              </div>
              <div style={{ fontSize:60 }}>🏆</div>
            </div>
            <div className="duo-progress">
              <div className="duo-progress-fill" style={{ width:`${rmPct}%`, background:'linear-gradient(90deg,#58CC02,#16A34A)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Level breakdown */}
      {logs.length > 0 && (
        <div className="duo-card p-5 space-y-3">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Level Breakdown
          </div>
          {[LEVELS.ROLEMODEL, LEVELS.RISING, LEVELS.REFOCUS].map(key => {
            const d     = DUO_LEVEL[key]
            const count = levelCounts[key] || 0
            const pct   = logs.length ? Math.round((count / logs.length) * 100) : 0
            return (
              <div key={key}>
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color: d.text, fontSize:13 }}>
                    {d.emoji} {d.label}
                  </span>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:12 }}>
                    {count} days ({pct}%)
                  </span>
                </div>
                <div className="duo-progress" style={{ height:12 }}>
                  <div className="duo-progress-fill" style={{ width:`${pct}%`, background: d.fill }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
