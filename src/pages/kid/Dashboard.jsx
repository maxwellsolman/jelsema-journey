import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getLevel, LEVEL_CONFIG, progressToNextLevel, LEVELS } from '../../lib/levels'
import { isPrivilegeFrozen, freezeHoursRemaining } from '../../lib/points'
import { format, subDays } from 'date-fns'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { ShieldAlert, Zap, CheckCircle, XCircle } from 'lucide-react'

// Duolingo-style level config — bright, fun colors, no black
const DUO_LEVEL = {
  [LEVELS.ORIENTATION]: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1', fill: '#94A3B8', label: 'Orientation', emoji: '🌱', gradient: 'linear-gradient(135deg,#94A3B8,#64748B)' },
  [LEVELS.REFOCUS]:     { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD', fill: '#3B82F6', label: 'Re-Focus',    emoji: '🔵', gradient: 'linear-gradient(135deg,#60A5FA,#2563EB)' },
  [LEVELS.RISING]:      { bg: '#FFFBEB', text: '#D97706', border: '#FCD34D', fill: '#F59E0B', label: 'Rising Star', emoji: '⭐', gradient: 'linear-gradient(135deg,#FDE68A,#F59E0B,#D97706)' },
  [LEVELS.ROLEMODEL]:   { bg: '#F0FDF4', text: '#16A34A', border: '#86EFAC', fill: '#22C55E', label: 'Role Model',  emoji: '🏆', gradient: 'linear-gradient(135deg,#4ADE80,#16A34A)' },
}

// Shift node colors (lesson-node style)
const SHIFT_COLORS = {
  complete: { bg: '#58CC02', border: '#46A302', text: '#FFFFFF' },
  partial:  { bg: '#FF9600', border: '#CC7700', text: '#FFFFFF' },
  empty:    { bg: '#E5E5E5', border: '#AFAFAF', text: '#AFAFAF' },
}

function ShiftNode({ label, pts, max, icon }) {
  const pct   = max > 0 ? pts / max : 0
  const style = pct === 1 ? SHIFT_COLORS.complete : pct > 0 ? SHIFT_COLORS.partial : SHIFT_COLORS.empty
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="shift-node"
        style={{ background: style.bg, borderColor: style.border, borderWidth: 3, borderStyle:'solid', color: style.text }}>
        <span className="text-xl mb-0.5">{icon}</span>
        <span style={{ fontSize:11, fontWeight:800, fontFamily:'var(--font-display)' }}>
          {pts}/{max}
        </span>
      </div>
      <span style={{ fontSize:11, fontWeight:700, color:'var(--duo-text-lt)', fontFamily:'var(--font-display)' }}>
        {label}
      </span>
    </div>
  )
}

function StatBubble({ icon, value, label, color, bg }) {
  return (
    <div className="duo-card flex flex-col items-center gap-1 py-4 px-2" style={{ borderColor: color + '33' }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-0.5"
        style={{ background: bg }}>
        {icon}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color, lineHeight:1 }}>
        {value}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
        {label}
      </div>
    </div>
  )
}

export default function KidDashboard() {
  const { profile } = useAuth()
  const [todayLog, setTodayLog]   = useState(null)
  const [weekLogs, setWeekLogs]   = useState([])
  const [weekTotal, setWeekTotal] = useState(0)
  const [balance, setBalance]     = useState(0)
  const [streak, setStreak]       = useState(0)
  const [loading, setLoading]     = useState(true)
  const today   = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const { data: log } = await supabase.from('daily_logs').select('*')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLog(log || null)

      const since = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const { data: wl } = await supabase.from('daily_logs')
        .select('date, total_pts, level_achieved').eq('kid_id', profile.id)
        .gte('date', since).order('date')
      const logs = wl || []
      setWeekLogs(logs)
      setWeekTotal(logs.reduce((s, l) => s + l.total_pts, 0))

      let s = 0
      for (const l of [...logs].reverse()) {
        if (getLevel(l.total_pts) === LEVELS.ROLEMODEL) s++
        else break
      }
      setStreak(s)

      const { data: earns } = await supabase.from('daily_earnings').select('total_earned')
        .eq('kid_id', profile.id).gte('date', since)
      setBalance((earns || []).reduce((s, e) => s + (e.total_earned || 0), 0))

      setLoading(false)
    }
    load()
  }, [profile?.id, today])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl" style={{ animation:'bounceIn 600ms ease infinite alternate' }}>🌟</div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:15 }}>
        Loading your journey…
      </div>
    </div>
  )

  const pts     = todayLog?.total_pts ?? null
  const level   = pts !== null ? getLevel(pts, isOrientation(profile)) : LEVELS.REFOCUS
  const duo     = DUO_LEVEL[level]
  const progress = pts !== null ? progressToNextLevel(pts) : null
  const frozen   = isPrivilegeFrozen(todayLog?.privilege_freeze_until)
  const freezeHrs = freezeHoursRemaining(todayLog?.privilege_freeze_until)

  return (
    <div className="space-y-4 pb-2">

      {/* ── Privilege freeze (hearts = broken) ── */}
      {frozen && (
        <div className="fade-up duo-card p-4 flex items-center gap-3"
          style={{ borderColor:'#FF4B4B', background:'#FFF5F5' }}>
          <ShieldAlert size={24} color="#FF4B4B" />
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#FF4B4B', fontSize:15 }}>
              Privileges Suspended
            </div>
            <div style={{ color:'#FF7070', fontSize:13 }}>{freezeHrs} hr{freezeHrs !== 1 ? 's' : ''} remaining</div>
          </div>
        </div>
      )}

      {/* ── Level hero card ── */}
      <div className="bounce-in duo-card overflow-hidden"
        style={{ borderColor: duo.border, borderWidth:2.5 }}>

        {/* Gradient top strip */}
        <div className="h-2 w-full" style={{ background: duo.gradient }} />

        <div className="p-5">
          {/* Level badge row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Current Level
              </div>
              <div className="level-badge-3d mt-1"
                style={{ background: duo.bg, color: duo.text, borderColor: duo.border, borderBottomColor: duo.fill }}>
                <span style={{ fontSize:20 }}>{duo.emoji}</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{duo.label}</span>
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:52, color: duo.fill, lineHeight:1 }}>
                {pts ?? '—'}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:12 }}>
                pts today
              </div>
            </div>
          </div>

          {/* Progress bar to next level */}
          {progress && pts !== null && (
            <div>
              <div className="flex justify-between mb-1.5"
                style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--duo-text-lt)' }}>
                <span>{progress.ptsNeeded} pts to {progress.nextLabel}</span>
                <span style={{ color: duo.fill }}>{progress.pct}%</span>
              </div>
              <div className="duo-progress">
                <div className="duo-progress-fill" style={{ width:`${progress.pct}%`, background: duo.gradient }} />
              </div>
            </div>
          )}

          {level === LEVELS.ROLEMODEL && pts !== null && (
            <div className="mt-3 rounded-2xl py-2.5 text-center ring-pulse"
              style={{ background:'#F0FDF4', color:'#16A34A', fontFamily:'var(--font-display)', fontWeight:800, fontSize:14 }}>
              🏆 You hit Role Model today — amazing!
            </div>
          )}

          {pts === null && (
            <div className="mt-2 rounded-2xl py-2.5 text-center"
              style={{ background:'#F7F7F7', color:'var(--duo-text-lt)', fontFamily:'var(--font-display)', fontWeight:700, fontSize:13 }}>
              Points not logged yet today
            </div>
          )}
        </div>
      </div>

      {/* ── Streak banner ── */}
      {streak > 0 && (
        <div className="fade-up duo-card p-4 flex items-center gap-3"
          style={{ borderColor:'#FF9600', background:'#FFFBF0' }}>
          <div style={{ fontSize:42, lineHeight:1 }}>🔥</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20, color:'#FF6B00' }}>
              {streak}-day streak!
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'#FF9600', fontSize:13 }}>
              Keep it up — you're on fire!
            </div>
          </div>
          <div className="ml-auto text-right">
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:28, color:'#FF6B00' }}>{streak}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'#FF9600', textTransform:'uppercase' }}>days</div>
          </div>
        </div>
      )}

      {/* ── Shift nodes (lesson-style) ── */}
      {todayLog && (
        <div className="fade-up duo-card p-5">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>
            Today's Shifts
          </div>
          <div className="flex justify-around">
            <ShiftNode label="Morning"   pts={todayLog.am_pts||0} max={40} icon="☀️" />
            <ShiftNode label="Afternoon" pts={todayLog.pm_pts||0} max={50} icon="🌆" />
            <ShiftNode label="Night"     pts={todayLog.ov_pts||0} max={10} icon="🌙" />
          </div>
          {todayLog.positive_experiences && (
            <div className="mt-4 rounded-2xl px-3 py-2.5 text-sm"
              style={{ background:'#F0FDF4', color:'#16A34A', fontFamily:'var(--font-display)', fontWeight:700 }}>
              ✨ {todayLog.positive_experiences}
            </div>
          )}
        </div>
      )}

      {/* ── Stats bubbles ── */}
      <div className="fade-up grid grid-cols-3 gap-3">
        <StatBubble icon="⚡" value={weekTotal} label="This Week"  color="#2563EB" bg="#EFF6FF" />
        <StatBubble icon="💵" value={`$${balance.toFixed(2)}`} label="Allowance" color="#16A34A" bg="#F0FDF4" />
        <StatBubble
          icon={isSunday && level === LEVELS.ROLEMODEL ? '🛍️' : '🏪'}
          value={weekTotal}
          label={isSunday && level === LEVELS.ROLEMODEL ? 'Store!' : 'Canteen'}
          color={isSunday && level === LEVELS.ROLEMODEL ? '#D97706' : '#AFAFAF'}
          bg={isSunday && level === LEVELS.ROLEMODEL ? '#FFFBEB' : '#F7F7F7'}
        />
      </div>

      {/* ── 7-day sparkline ── */}
      {weekLogs.length > 1 && (
        <div className="fade-up duo-card p-4">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
            Last 7 Days
          </div>
          <ResponsiveContainer width="100%" height={52}>
            <LineChart data={weekLogs} margin={{ top:4, right:4, left:4, bottom:4 }}>
              <Line type="monotone" dataKey="total_pts" stroke="#58CC02" strokeWidth={3}
                dot={{ fill:'#58CC02', r:4, strokeWidth:0 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-1"
            style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'var(--duo-text-lt)' }}>
            {weekLogs.map(l => <span key={l.date}>{format(new Date(l.date),'EEE')}</span>)}
          </div>
        </div>
      )}

      {/* ── Level guide ── */}
      <div className="fade-up duo-card p-4 space-y-2">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
          Level Guide
        </div>
        {[
          { lv: LEVELS.REFOCUS,   range:'0–65 pts' },
          { lv: LEVELS.RISING,    range:'66–85 pts' },
          { lv: LEVELS.ROLEMODEL, range:'86–100 pts' },
        ].map(({ lv, range }) => {
          const d = DUO_LEVEL[lv]
          const isMe = level === lv
          return (
            <div key={lv} className="flex items-center justify-between rounded-2xl px-3 py-2.5"
              style={{ background: isMe ? d.bg : '#F7F7F7', border: isMe ? `2px solid ${d.border}` : '2px solid transparent' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize:18 }}>{d.emoji}</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color: isMe ? d.text : '#777', fontSize:14 }}>{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'#AFAFAF', fontSize:12 }}>{range}</span>
                {isMe && (
                  <span className="rounded-full px-2 py-0.5"
                    style={{ background: d.fill, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:10 }}>
                    YOU
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function isOrientation(kid) {
  if (!kid?.orientation_end_at) return false
  return new Date(kid.orientation_end_at) > new Date()
}
