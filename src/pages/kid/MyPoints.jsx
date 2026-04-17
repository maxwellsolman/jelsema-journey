import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS } from '../../lib/points'
import { getLevel, LEVELS } from '../../lib/levels'

const DUO_LEVEL = {
  [LEVELS.ORIENTATION]: { fill:'#94A3B8', bg:'#F1F5F9', text:'#64748B', label:'Orientation', emoji:'🌱' },
  [LEVELS.REFOCUS]:     { fill:'#3B82F6', bg:'#EFF6FF', text:'#2563EB', label:'Re-Focus',    emoji:'🔵' },
  [LEVELS.RISING]:      { fill:'#F59E0B', bg:'#FFFBEB', text:'#D97706', label:'Rising Star', emoji:'⭐' },
  [LEVELS.ROLEMODEL]:   { fill:'#22C55E', bg:'#F0FDF4', text:'#16A34A', label:'Role Model',  emoji:'🏆' },
}

function BehaviorRow({ label, earned }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm"
      style={{ background: earned ? '#F0FDF4' : '#F7F7F7', fontFamily:'var(--font-body)', fontWeight:600,
               color: earned ? '#16A34A' : '#AFAFAF', textDecoration: earned ? 'none' : 'line-through' }}>
      <span style={{ fontSize:15 }}>{earned ? '✅' : '❌'}</span>
      <span className="flex-1">{label}</span>
      <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color: earned ? '#58CC02' : '#AFAFAF' }}>
        {earned ? '+5' : '0'}
      </span>
    </div>
  )
}

function DayCard({ log }) {
  const [open, setOpen] = useState(false)
  const level = log.level_achieved || getLevel(log.total_pts)
  const d = DUO_LEVEL[level]

  return (
    <div className="duo-card overflow-hidden" style={{ borderColor: open ? d.fill + '66' : 'var(--duo-border)' }}>
      {/* Color top strip */}
      <div className="h-1.5" style={{ background: d.fill }} />

      <button className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
        onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: d.bg }}>
            {d.emoji}
          </div>
          <div className="text-left">
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:15 }}>
              {format(new Date(log.date + 'T12:00:00'), 'EEEE')}
            </div>
            <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:12 }}>
              {format(new Date(log.date + 'T12:00:00'), 'MMM d, yyyy')}
            </div>
            <div className="mt-0.5 rounded-full px-2 py-0.5 inline-block"
              style={{ background: d.bg, color: d.text, fontFamily:'var(--font-display)', fontWeight:800, fontSize:11 }}>
              {d.emoji} {d.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:32, color: d.fill, lineHeight:1 }}>
              {log.total_pts}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'var(--duo-text-lt)', textTransform:'uppercase' }}>pts</div>
          </div>
          <div style={{ color:'#AFAFAF' }}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</div>
        </div>
      </button>

      {open && (
        <div className="border-t-2 border-[--duo-border] px-4 pb-4 pt-3 space-y-4">
          {[
            { label: '☀️ Morning (6am–2pm)',    behaviors: AM_BEHAVIORS,        pts: log.am_pts, max: 40 },
            { label: '🌆 Afternoon (2pm–10pm)', behaviors: PM_BEHAVIORS,        pts: log.pm_pts, max: 50 },
            { label: '🌙 Night (10pm–6am)',      behaviors: OVERNIGHT_BEHAVIORS, pts: log.ov_pts, max: 10 },
          ].map(shift => (
            <div key={shift.label}>
              <div className="flex justify-between mb-2"
                style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12,
                         color: shift.pts === shift.max ? '#58CC02' : 'var(--duo-text-lt)' }}>
                <span>{shift.label}</span>
                <span>{shift.pts ?? 0}/{shift.max} pts {shift.pts === shift.max ? '🎉' : ''}</span>
              </div>
              {/* mini progress bar */}
              <div className="duo-progress mb-2" style={{ height:8 }}>
                <div className="duo-progress-fill" style={{ width:`${((shift.pts||0)/shift.max)*100}%`,
                  background: shift.pts === shift.max ? '#58CC02' : '#FF9600' }} />
              </div>
              <div className="space-y-1">
                {shift.behaviors.map(b => <BehaviorRow key={b.key} label={b.label} earned={!!log[b.key]} />)}
              </div>
            </div>
          ))}

          {(log.minor_infractions > 0 || log.major_infractions > 0) && (
            <div className="rounded-2xl px-3 py-3 space-y-1.5" style={{ background:'#FFF5F5', border:'2px solid #FFCCCC' }}>
              {log.minor_infractions > 0 && (
                <div className="flex justify-between" style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#FF6B00', fontSize:13 }}>
                  <span>⚠️ {log.minor_infractions}× Minor Infraction</span>
                  <span>−{log.minor_infractions * 20} pts</span>
                </div>
              )}
              {log.major_infractions > 0 && (
                <div className="flex justify-between" style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#FF4B4B', fontSize:13 }}>
                  <span>🚨 {log.major_infractions}× Major Infraction</span>
                  <span>−{log.major_infractions * 40} pts</span>
                </div>
              )}
            </div>
          )}

          {log.positive_experiences && (
            <div className="rounded-2xl px-3 py-2.5"
              style={{ background:'#F0FDF4', color:'#16A34A', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13 }}>
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
  const [logs, setLogs]       = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [range, setRange]     = useState(14)
  const [loading, setLoading] = useState(true)

  // Load all-time logs once for personal bests
  useEffect(() => {
    if (!profile?.id) return
    supabase.from('daily_logs').select('total_pts, level_achieved, date')
      .eq('kid_id', profile.id).order('date', { ascending: false })
      .then(({ data }) => setAllLogs(data || []))
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    let q = supabase.from('daily_logs').select('*').eq('kid_id', profile.id).order('date', { ascending: false })
    if (range !== 0) q = q.gte('date', format(subDays(new Date(), range), 'yyyy-MM-dd'))
    q.then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [profile?.id, range])

  const bestDay    = allLogs.length ? Math.max(...allLogs.map(l => l.total_pts)) : null
  const rmDaysEver = allLogs.filter(l => (l.level_achieved || getLevel(l.total_pts)) === LEVELS.ROLEMODEL).length
  const totalDays  = allLogs.length

  const RANGES = [{ v:7,label:'7d'},{v:14,label:'14d'},{v:30,label:'30d'},{v:0,label:'All'}]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)' }}>
          My Points
        </h1>
        <div className="flex gap-1 p-1 rounded-2xl duo-card">
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              className="px-3 py-1.5 rounded-xl transition-all duo-btn"
              style={{
                background: range === r.v ? '#58CC02' : 'transparent',
                color: range === r.v ? '#fff' : 'var(--duo-text-lt)',
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:12,
                borderBottomWidth: range === r.v ? '3px' : '0px',
                borderBottomColor: '#46A302',
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal bests */}
      {allLogs.length > 0 && (
        <div className="duo-card p-4" style={{ borderColor:'#FFD70066', background:'#FFFDF0' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'#CC8800', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            🏅 Personal Bests
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl py-3 px-2" style={{ background:'#FFF4CC' }}>
              <div style={{ fontSize:24 }}>🏆</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:26, color:'#CC8800', lineHeight:1, marginTop:4 }}>
                {bestDay ?? '—'}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'#AA7700', textTransform:'uppercase', marginTop:2 }}>
                Best Day
              </div>
            </div>
            <div className="rounded-2xl py-3 px-2" style={{ background:'#F0FDF4' }}>
              <div style={{ fontSize:24 }}>🌟</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:26, color:'#16A34A', lineHeight:1, marginTop:4 }}>
                {rmDaysEver}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'#15803D', textTransform:'uppercase', marginTop:2 }}>
                Role Model Days
              </div>
            </div>
            <div className="rounded-2xl py-3 px-2" style={{ background:'#EFF6FF' }}>
              <div style={{ fontSize:24 }}>📅</div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:26, color:'#2563EB', lineHeight:1, marginTop:4 }}>
                {totalDays}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'#1D4ED8', textTransform:'uppercase', marginTop:2 }}>
                Days Logged
              </div>
            </div>
          </div>
          {bestDay === 100 && (
            <div className="mt-3 text-center rounded-2xl py-2"
              style={{ background:'#FFF4CC', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'#CC8800' }}>
              🎉 You had a perfect 100-point day!
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10" style={{ color:'var(--duo-text-lt)', fontFamily:'var(--font-display)', fontWeight:700 }}>
          Loading…
        </div>
      ) : logs.length === 0 ? (
        <div className="duo-card p-10 text-center">
          <div style={{ fontSize:48 }}>📋</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:18, marginTop:8 }}>No points yet!</div>
          <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:14, marginTop:4 }}>Ask your staff to log your daily points.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => <DayCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  )
}
