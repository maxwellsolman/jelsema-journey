import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getLevel, LEVEL_CONFIG, progressToNextLevel, LEVELS } from '../../lib/levels'
import { isPrivilegeFrozen, freezeHoursRemaining, AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS } from '../../lib/points'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { ShieldAlert } from 'lucide-react'

const DUO_LEVEL = {
  [LEVELS.ORIENTATION]: { bg:'#F1F5F9', text:'#64748B', border:'#CBD5E1', fill:'#94A3B8', label:'Orientation', emoji:'🌱', gradient:'linear-gradient(135deg,#94A3B8,#64748B)' },
  [LEVELS.REFOCUS]:     { bg:'#EFF6FF', text:'#2563EB', border:'#93C5FD', fill:'#3B82F6', label:'Re-Focus',    emoji:'🔵', gradient:'linear-gradient(135deg,#60A5FA,#2563EB)' },
  [LEVELS.RISING]:      { bg:'#FFFBEB', text:'#D97706', border:'#FCD34D', fill:'#F59E0B', label:'Rising Star', emoji:'⭐', gradient:'linear-gradient(135deg,#FDE68A,#F59E0B,#D97706)' },
  [LEVELS.ROLEMODEL]:   { bg:'#F0FDF4', text:'#16A34A', border:'#86EFAC', fill:'#22C55E', label:'Role Model',  emoji:'🏆', gradient:'linear-gradient(135deg,#4ADE80,#16A34A)' },
}
const SHIFT_COLORS = {
  complete: { bg:'#58CC02', border:'#46A302', text:'#FFFFFF' },
  partial:  { bg:'#FF9600', border:'#CC7700', text:'#FFFFFF' },
  empty:    { bg:'#E5E5E5', border:'#AFAFAF', text:'#AFAFAF' },
}
const CONFETTI_COLORS = ['#58CC02','#FFD700','#FF9600','#FF4B4B','#1CB0F6','#CE82FF','#22C55E','#F59E0B']

// ── Floating background particles ──────────────────────────────
const PARTICLE_CONFIG = [
  { emoji:'⭐', top:'6%',  left:'4%',  size:22, dur:4.2, del:0    },
  { emoji:'✨', top:'12%', left:'88%', size:16, dur:3.5, del:0.8  },
  { emoji:'🌟', top:'28%', left:'94%', size:20, dur:5.2, del:1.4  },
  { emoji:'💫', top:'48%', left:'3%',  size:18, dur:3.9, del:2.1  },
  { emoji:'⭐', top:'62%', left:'91%', size:13, dur:4.6, del:0.4  },
  { emoji:'✨', top:'78%', left:'6%',  size:20, dur:3.3, del:1.9  },
  { emoji:'💫', top:'18%', left:'48%', size:11, dur:6.1, del:2.8  },
  { emoji:'🌟', top:'72%', left:'52%', size:15, dur:4.1, del:1.1  },
  { emoji:'⭐', top:'90%', left:'78%', size:17, dur:3.7, del:0.6  },
]

function FloatingParticles() {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      {PARTICLE_CONFIG.map((p, i) => (
        <div key={i} className="float-particle"
          style={{ position:'absolute', top:p.top, left:p.left, fontSize:p.size, opacity:0.13,
                   '--dur':`${p.dur}s`, '--del':`${p.del}s` }}>
          {p.emoji}
        </div>
      ))}
    </div>
  )
}

// ── Confetti rain ───────────────────────────────────────────────
function ConfettiRain() {
  const pieces = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(i * 1.7) % 100}%`,
      delay: `${(i * 0.07) % 2.5}s`,
      duration: `${2.2 + (i % 5) * 0.35}s`,
      width: 8 + (i % 4) * 3,
      height: 10 + (i % 3) * 4,
      swayDuration: `${1.2 + (i % 4) * 0.3}s`,
    })), []
  )
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999, overflow:'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece"
          style={{ left:p.left, backgroundColor:p.color, width:p.width, height:p.height,
                   animationDuration:`${p.duration}, ${p.swayDuration}`,
                   animationDelay:`${p.delay}, ${p.delay}`,
                   animationIterationCount:'1, infinite' }} />
      ))}
    </div>
  )
}

// ── Shift node ──────────────────────────────────────────────────
function ShiftNode({ label, pts, max, icon, delay }) {
  const pct   = max > 0 ? pts / max : 0
  const style = pct === 1 ? SHIFT_COLORS.complete : pct > 0 ? SHIFT_COLORS.partial : SHIFT_COLORS.empty
  return (
    <div className="slide-up flex flex-col items-center gap-1.5" style={{ '--delay': delay }}>
      <div className="shift-node"
        style={{ background:style.bg, borderColor:style.border, borderWidth:3, borderStyle:'solid', color:style.text }}>
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

// ── Week strip (Mon–Sun) ────────────────────────────────────────
function WeekStrip({ weekLogs, wStart, today }) {
  const days = Array.from({ length:7 }, (_, i) =>
    format(addDays(new Date(wStart + 'T12:00:00'), i), 'yyyy-MM-dd')
  )
  const logsMap = {}
  weekLogs.forEach(l => { logsMap[l.date] = l })

  return (
    <div className="slide-up duo-card p-4" style={{ '--delay':'180ms' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                    textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
        This Week
      </div>
      <div className="flex justify-between gap-1">
        {days.map((date, i) => {
          const log      = logsMap[date]
          const isToday  = date === today
          const isFuture = date > today
          const pts      = log?.total_pts ?? null
          const lv       = pts !== null ? getLevel(pts) : null
          const duo      = lv ? DUO_LEVEL[lv] : null
          const dayName  = format(new Date(date + 'T12:00:00'), 'EEE')

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10,
                            color: isToday ? '#58CC02' : 'var(--duo-text-lt)', textTransform:'uppercase' }}>
                {dayName}
              </div>
              <div style={{
                width:36, height:36, borderRadius:12,
                background: isFuture ? '#F7F7F7' : duo ? duo.bg : '#F0F0F0',
                border: isToday
                  ? '3px solid #58CC02'
                  : duo ? `2px solid ${duo.fill}55` : '2px solid #E5E5E5',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: pts === 100 ? 18 : 14,
                boxShadow: isToday ? '0 0 0 3px rgba(88,204,2,0.15)' : 'none',
                transition:'all 200ms',
              }}>
                {isFuture
                  ? <span style={{ color:'#D5D5D5', fontSize:16 }}>·</span>
                  : pts !== null
                    ? <span>{duo?.emoji || '·'}</span>
                    : <span style={{ color:'#AFAFAF', fontSize:10 }}>—</span>}
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:11,
                            color: isFuture ? '#D5D5D5' : pts !== null ? (duo?.text || '#AFAFAF') : '#AFAFAF' }}>
                {isFuture ? '' : pts !== null ? pts : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Stat bubble ─────────────────────────────────────────────────
function StatBubble({ icon, value, label, color, bg, delay }) {
  return (
    <div className="slide-up duo-card flex flex-col items-center gap-1 py-4 px-2"
      style={{ borderColor: color + '33', '--delay': delay }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-0.5"
        style={{ background: bg }}>{icon}</div>
      <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color, lineHeight:1, '--delay': delay }}>
        {value}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color:'var(--duo-text-lt)',
                    textTransform:'uppercase', letterSpacing:'0.05em' }}>
        {label}
      </div>
    </div>
  )
}

// ── Game plan (missed behaviors) ────────────────────────────────
function GamePlanCard({ todayLog, currentPts }) {
  const allBehaviors = [
    { shift:'☀️ Morning',   behaviors: AM_BEHAVIORS,        earned: todayLog.am_pts || 0, max: 40 },
    { shift:'🌆 Afternoon', behaviors: PM_BEHAVIORS,        earned: todayLog.pm_pts || 0, max: 50 },
    { shift:'🌙 Night',     behaviors: OVERNIGHT_BEHAVIORS, earned: todayLog.ov_pts || 0, max: 10 },
  ]
  const missedByShift = allBehaviors
    .map(s => ({ shift:s.shift, missed:s.behaviors.filter(b => !todayLog[b.key]), potential:s.behaviors.filter(b => !todayLog[b.key]).length * 5 }))
    .filter(s => s.missed.length > 0)
  if (missedByShift.length === 0) return null
  const totalMissed = missedByShift.reduce((s, sh) => s + sh.potential, 0)
  const projectedScore = Math.min(100, currentPts + totalMissed)
  const wouldReachRM   = projectedScore >= 86

  return (
    <div className="slide-up fade-up duo-card p-4 space-y-3" style={{ borderColor:'#1CB0F666', '--delay':'340ms' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color:'#1CB0F6' }}>
        🎯 Game Plan for Tomorrow
      </div>
      <div className="space-y-3">
        {missedByShift.map(({ shift, missed, potential }) => (
          <div key={shift}>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)' }}>{shift}</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'#FF9600' }}>+{potential} pts available</span>
            </div>
            <div className="space-y-1">
              {missed.map(b => (
                <div key={b.key} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background:'#F7F7F7' }}>
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                  <span style={{ fontFamily:'var(--font-body)', fontSize:13, color:'var(--duo-text)', flex:1 }}>{b.label}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'#AFAFAF' }}>+5</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl px-4 py-3 text-center"
        style={{ background: wouldReachRM ? '#F0FDF4' : '#FFFBEB', border:`2px solid ${wouldReachRM ? '#86EFAC' : '#FCD34D'}` }}>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:14, color: wouldReachRM ? '#16A34A' : '#D97706' }}>
          {wouldReachRM
            ? `Get all of these → ${projectedScore} pts 🏆 Role Model!`
            : `Get all of these → ${projectedScore} pts${projectedScore >= 66 ? ' ⭐ Rising Star!' : '!'}`}
        </span>
      </div>
    </div>
  )
}

// ── Main dashboard ──────────────────────────────────────────────
export default function KidDashboard() {
  const { profile } = useAuth()
  const [todayLog, setTodayLog]           = useState(null)
  const [weekLogs, setWeekLogs]           = useState([])
  const [weekTotal, setWeekTotal]         = useState(0)
  const [balance, setBalance]             = useState(0)
  const [canteenBalance, setCanteenBalance] = useState(0)
  const [loading, setLoading]             = useState(true)
  const [showConfetti, setShowConfetti]   = useState(false)

  const today    = format(new Date(), 'yyyy-MM-dd')
  const wStart   = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd     = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const { data: log } = await supabase.from('daily_logs').select('*')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLog(log || null)

      const { data: wl } = await supabase.from('daily_logs')
        .select('date, total_pts, level_achieved').eq('kid_id', profile.id)
        .gte('date', wStart).lte('date', wEnd).order('date')
      const logs = wl || []
      setWeekLogs(logs)
      const wkPts = logs.reduce((s, l) => s + l.total_pts, 0)
      setWeekTotal(wkPts)

      const { data: earns } = await supabase.from('daily_earnings').select('total_earned')
        .eq('kid_id', profile.id).gte('date', wStart).lte('date', wEnd)
      setBalance((earns || []).reduce((s, e) => s + (e.total_earned || 0), 0))

      const { data: redemptions } = await supabase.from('canteen_redemptions')
        .select('points_redeemed').eq('kid_id', profile.id).gte('redeemed_at', wStart)
      const spent = (redemptions || []).reduce((s, r) => s + (r.points_redeemed || 0), 0)
      setCanteenBalance(Math.max(0, wkPts - spent))

      setLoading(false)
    }
    load()
  }, [profile?.id, today])

  // Confetti once per day at Role Model
  useEffect(() => {
    if (!todayLog) return
    const lv = getLevel(todayLog.total_pts, isOrientation(profile))
    if (lv !== LEVELS.ROLEMODEL) return
    const key = `confetti-${today}-${profile?.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setShowConfetti(true)
    const t = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [todayLog])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-5xl" style={{ animation:'bounceIn 600ms ease infinite alternate' }}>🌟</div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:15 }}>
        Loading your journey…
      </div>
    </div>
  )

  const pts       = todayLog?.total_pts ?? null
  const level     = pts !== null ? getLevel(pts, isOrientation(profile)) : LEVELS.REFOCUS
  const duo       = DUO_LEVEL[level]
  const progress  = pts !== null ? progressToNextLevel(pts) : null
  const frozen    = isPrivilegeFrozen(todayLog?.privilege_freeze_until)
  const freezeHrs = freezeHoursRemaining(todayLog?.privilege_freeze_until)
  const inOrientation = isOrientation(profile)
  const isRoleModel   = level === LEVELS.ROLEMODEL && pts !== null

  return (
    <div className="relative pb-2" style={{ minHeight: '100vh' }}>
      {/* Background floating particles */}
      <FloatingParticles />

      {showConfetti && <ConfettiRain />}

      {/* All content above particles */}
      <div className="relative space-y-4" style={{ zIndex: 1 }}>

        {/* Orientation banner */}
        {inOrientation && (
          <div className="slide-up fade-up duo-card p-4 flex items-center gap-3"
            style={{ borderColor:'#94A3B8', background:'#F1F5F9', '--delay':'0ms' }}>
            <span style={{ fontSize:28, lineHeight:1 }}>🌱</span>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#475569', fontSize:15 }}>
                You're in Orientation!
              </div>
              <div style={{ fontFamily:'var(--font-body)', color:'#64748B', fontSize:13 }}>
                First 48 hours — learn the program. Points start counting soon!
              </div>
            </div>
          </div>
        )}

        {/* Freeze banner */}
        {frozen && (
          <div className="slide-up duo-card p-4 flex items-center gap-3"
            style={{ borderColor:'#FF4B4B', background:'#FFF5F5', '--delay':'0ms' }}>
            <ShieldAlert size={24} color="#FF4B4B" />
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#FF4B4B', fontSize:15 }}>
                Privileges Suspended
              </div>
              <div style={{ color:'#FF7070', fontSize:13 }}>
                {freezeHrs} hr{freezeHrs !== 1 ? 's' : ''} remaining
              </div>
            </div>
          </div>
        )}

        {/* ── Level hero card ── */}
        <div className={`slide-up bounce-in duo-card overflow-hidden ${isRoleModel ? 'rm-glow' : ''}`}
          style={{ borderColor:duo.border, borderWidth:2.5, '--delay':'60ms' }}>
          <div className="h-2 w-full" style={{ background:duo.gradient }} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)',
                              fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  Current Level
                </div>
                <div className="level-badge-3d mt-1"
                  style={{ background:duo.bg, color:duo.text, borderColor:duo.border, borderBottomColor:duo.fill }}>
                  <span style={{ fontSize:20 }}>{duo.emoji}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18 }}>{duo.label}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:52,
                                                 color:duo.fill, lineHeight:1, '--delay':'200ms' }}>
                  {pts ?? '—'}
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', fontSize:12 }}>
                  pts today
                </div>
              </div>
            </div>

            {progress && pts !== null && (
              <div>
                <div className="flex justify-between mb-1.5"
                  style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'var(--duo-text-lt)' }}>
                  <span>{progress.ptsNeeded} pts to {progress.nextLabel}</span>
                  <span style={{ color:duo.fill }}>{progress.pct}%</span>
                </div>
                <div className="duo-progress">
                  <div className="duo-progress-fill" style={{ width:`${progress.pct}%`, background:duo.gradient,
                                                              transition:'width 800ms cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
              </div>
            )}

            {isRoleModel && (
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

        {/* ── Week strip ── */}
        <WeekStrip weekLogs={weekLogs} wStart={wStart} today={today} />

        {/* ── Today's shifts ── */}
        {todayLog && (
          <div className="slide-up duo-card p-5" style={{ '--delay':'260ms' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--duo-text-lt)',
                          textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>
              Today's Shifts
            </div>
            <div className="flex justify-around">
              <ShiftNode label="Morning"   pts={todayLog.am_pts||0} max={40} icon="☀️" delay="280ms" />
              <ShiftNode label="Afternoon" pts={todayLog.pm_pts||0} max={50} icon="🌆" delay="340ms" />
              <ShiftNode label="Night"     pts={todayLog.ov_pts||0} max={10} icon="🌙" delay="400ms" />
            </div>
            {todayLog.positive_experiences && (
              <div className="mt-4 rounded-2xl px-3 py-2.5 text-sm"
                style={{ background:'#F0FDF4', color:'#16A34A', fontFamily:'var(--font-display)', fontWeight:700 }}>
                ✨ {todayLog.positive_experiences}
              </div>
            )}
          </div>
        )}

        {/* ── Game plan ── */}
        {todayLog && level !== LEVELS.ROLEMODEL && pts !== null && (
          <GamePlanCard todayLog={todayLog} currentPts={pts} />
        )}

        {/* ── Stats bubbles ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatBubble icon="⚡" value={weekTotal}              label="This Week"  color="#2563EB" bg="#EFF6FF" delay="300ms" />
          <StatBubble icon="💵" value={`$${balance.toFixed(2)}`} label="Allowance" color="#16A34A" bg="#F0FDF4" delay="360ms" />
          <StatBubble
            icon={isSunday && isRoleModel ? '🛍️' : '🏪'}
            value={canteenBalance}
            label={isSunday && isRoleModel ? 'Store Open!' : 'Canteen Bal'}
            color={isSunday && isRoleModel ? '#D97706' : '#AFAFAF'}
            bg={isSunday && isRoleModel ? '#FFFBEB' : '#F7F7F7'}
            delay="420ms"
          />
        </div>

        {/* ── Level guide ── */}
        <div className="slide-up duo-card p-4 space-y-2" style={{ '--delay':'460ms' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                        textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
            Level Guide
          </div>
          {[
            { lv:LEVELS.REFOCUS,   range:'0–65 pts' },
            { lv:LEVELS.RISING,    range:'66–85 pts' },
            { lv:LEVELS.ROLEMODEL, range:'86–100 pts' },
          ].map(({ lv, range }) => {
            const d    = DUO_LEVEL[lv]
            const isMe = level === lv
            return (
              <div key={lv} className="flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all"
                style={{ background:isMe ? d.bg : '#F7F7F7', border:isMe ? `2px solid ${d.border}` : '2px solid transparent' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize:18 }}>{d.emoji}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color:isMe ? d.text : '#777', fontSize:14 }}>
                    {d.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'#AFAFAF', fontSize:12 }}>{range}</span>
                  {isMe && (
                    <span className="rounded-full px-2 py-0.5"
                      style={{ background:d.fill, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:10 }}>
                      YOU
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

function isOrientation(kid) {
  if (!kid?.orientation_end_at) return false
  return new Date(kid.orientation_end_at) > new Date()
}
