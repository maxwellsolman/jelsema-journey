import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getLevel, LEVEL_CONFIG, progressToNextLevel, LEVELS } from '../../lib/levels'
import { isPrivilegeFrozen, freezeHoursRemaining } from '../../lib/points'
import { format, subDays } from 'date-fns'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { ShieldAlert } from 'lucide-react'

const LEVEL_GRADIENTS = {
  [LEVELS.ORIENTATION]: 'from-slate-400 to-slate-500',
  [LEVELS.REFOCUS]:     'from-blue-400 to-blue-600',
  [LEVELS.RISING]:      'from-amber-400 to-orange-500',
  [LEVELS.ROLEMODEL]:   'from-emerald-400 to-teal-500',
}

const LEVEL_GLOW = {
  [LEVELS.ORIENTATION]: 'shadow-slate-300/50',
  [LEVELS.REFOCUS]:     'shadow-blue-300/50',
  [LEVELS.RISING]:      'shadow-amber-300/50',
  [LEVELS.ROLEMODEL]:   'shadow-emerald-300/50',
}

const LEVEL_BG_LIGHT = {
  [LEVELS.ORIENTATION]: 'bg-slate-50',
  [LEVELS.REFOCUS]:     'bg-blue-50',
  [LEVELS.RISING]:      'bg-amber-50',
  [LEVELS.ROLEMODEL]:   'bg-emerald-50',
}

function AchievementBadge({ emoji, label, sub }) {
  return (
    <div className="clay-card bg-white p-3 flex flex-col items-center gap-1 text-center">
      <span className="text-2xl">{emoji}</span>
      <div className="font-bold text-slate-800 text-sm leading-tight">{label}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
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
  const today = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const { data: log } = await supabase.from('daily_logs').select('*')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLog(log || null)

      const since = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const { data: wLogs } = await supabase.from('daily_logs').select('date, total_pts, level_achieved')
        .eq('kid_id', profile.id).gte('date', since).order('date')
      const wl = wLogs || []
      setWeekLogs(wl)
      setWeekTotal(wl.reduce((s, l) => s + l.total_pts, 0))

      let s = 0
      for (const l of [...wl].reverse()) {
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
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="text-4xl animate-bounce">🌟</div>
      <div className="text-slate-400 text-sm font-medium">Loading your journey…</div>
    </div>
  )

  const pts = todayLog?.total_pts ?? null
  const level = pts !== null ? getLevel(pts, isOrientation(profile)) : LEVELS.REFOCUS
  const cfg = LEVEL_CONFIG[level]
  const progress = pts !== null ? progressToNextLevel(pts) : null
  const frozen = isPrivilegeFrozen(todayLog?.privilege_freeze_until)
  const freezeHours = freezeHoursRemaining(todayLog?.privilege_freeze_until)

  return (
    <div className="space-y-4 pb-2">

      {/* Privilege freeze */}
      {frozen && (
        <div className="clay-card bg-red-50 border border-red-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="text-red-500" size={20} />
          </div>
          <div>
            <div className="font-bold text-red-700">Privileges Suspended</div>
            <div className="text-red-500 text-sm">{freezeHours} hour{freezeHours !== 1 ? 's' : ''} remaining</div>
          </div>
        </div>
      )}

      {/* Level hero card */}
      <div className={`clay-card bg-gradient-to-br ${LEVEL_GRADIENTS[level]} p-6 text-white relative overflow-hidden shadow-2xl ${LEVEL_GLOW[level]}`}
        style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.20), 0 1px 0 rgba(255,255,255,0.3) inset` }}>

        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-6 -translate-x-6" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white/70 text-sm font-semibold uppercase tracking-wider">Your Level</div>
              <div className="text-3xl font-extrabold mt-0.5">{cfg.label}</div>
            </div>
            <div className="text-6xl filter drop-shadow-lg">{cfg.emoji}</div>
          </div>

          {pts !== null ? (
            <div className="mb-4">
              <div className="text-6xl font-black tracking-tight">{pts}</div>
              <div className="text-white/70 text-sm">points today</div>
            </div>
          ) : (
            <div className="mb-4">
              <div className="text-2xl font-bold text-white/60">Not logged yet</div>
              <div className="text-white/50 text-sm">Check back after your shift</div>
            </div>
          )}

          {/* Progress bar */}
          {progress && pts !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-white/70 font-medium">
                <span>{progress.ptsNeeded} pts to {progress.nextLabel}</span>
                <span>{progress.pct}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}

          {level === LEVELS.ROLEMODEL && pts !== null && (
            <div className="mt-3 bg-white/20 rounded-2xl px-3 py-2 text-sm font-bold text-white text-center">
              🏆 You're at the top! Keep it up!
            </div>
          )}
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="clay-card bg-gradient-to-r from-orange-400 to-red-400 p-4 flex items-center gap-3 text-white">
          <span className="text-4xl">🔥</span>
          <div>
            <div className="font-extrabold text-lg">{streak}-day streak!</div>
            <div className="text-white/80 text-sm">You're on fire — Role Model {streak} day{streak !== 1 ? 's' : ''} in a row!</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="clay-card bg-white p-4 text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">This Week</div>
          <div className="text-3xl font-extrabold text-blue-600">{weekTotal}</div>
          <div className="text-xs text-slate-400 mt-0.5">points</div>
        </div>
        <div className="clay-card bg-white p-4 text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Allowance</div>
          <div className="text-3xl font-extrabold text-emerald-600">${balance.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-0.5">earned</div>
        </div>
        <div className={`clay-card p-4 text-center ${isSunday && level === LEVELS.ROLEMODEL ? 'bg-amber-50' : 'bg-white'}`}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Canteen</div>
          <div className={`text-3xl font-extrabold ${isSunday && level === LEVELS.ROLEMODEL ? 'text-amber-600' : 'text-slate-300'}`}>
            {weekTotal}
          </div>
          <div className="text-xs mt-0.5">
            {isSunday && level === LEVELS.ROLEMODEL
              ? <span className="text-amber-500 font-bold">Open today!</span>
              : level === LEVELS.ROLEMODEL
                ? <span className="text-slate-400">Opens Sunday</span>
                : <span className="text-slate-300">Role Model only</span>
            }
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {weekLogs.length > 1 && (
        <div className="clay-card bg-white p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Last 7 Days</div>
          <ResponsiveContainer width="100%" height={56}>
            <LineChart data={weekLogs} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <Line type="monotone" dataKey="total_pts" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            {weekLogs.map(l => (
              <span key={l.date}>{format(new Date(l.date), 'EEE')}</span>
            ))}
          </div>
        </div>
      )}

      {/* Today's shift breakdown */}
      {todayLog && (
        <div className="clay-card bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Today's Shifts</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '☀️ Morning',    pts: todayLog.am_pts || 0, max: 40 },
              { label: '🌆 Afternoon',  pts: todayLog.pm_pts || 0, max: 50 },
              { label: '🌙 Overnight',  pts: todayLog.ov_pts || 0, max: 10 },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-3 text-center ${s.pts === s.max ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className={`text-xl font-extrabold ${s.pts === s.max ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {s.pts}<span className="text-xs font-normal text-slate-400">/{s.max}</span>
                </div>
                {s.pts === s.max && <div className="text-xs text-emerald-500 font-bold">Perfect! ✓</div>}
              </div>
            ))}
          </div>
          {todayLog.positive_experiences && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl px-3 py-2 text-sm text-emerald-700">
              ✨ <em>{todayLog.positive_experiences}</em>
            </div>
          )}
        </div>
      )}

      {/* Level guide */}
      <div className="clay-card bg-white p-4 space-y-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Level Guide</div>
        <div className="space-y-2">
          {[
            { level: LEVELS.REFOCUS,   label: 'Re-Focus',   range: '0–65 pts',   emoji: '🔵' },
            { level: LEVELS.RISING,    label: 'Rising Star', range: '66–85 pts',  emoji: '⭐' },
            { level: LEVELS.ROLEMODEL, label: 'Role Model',  range: '86–100 pts', emoji: '🏆' },
          ].map(l => (
            <div key={l.level}
              className={`flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all ${level === l.level ? `${LEVEL_BG_LIGHT[l.level]} ring-2 ring-offset-1` : 'bg-slate-50'}`}
              style={level === l.level ? { ringColor: 'currentColor' } : {}}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{l.emoji}</span>
                <span className="font-bold text-sm text-slate-700">{l.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{l.range}</span>
                {level === l.level && <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">You're here!</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function isOrientation(kid) {
  if (!kid?.orientation_end_at) return false
  return new Date(kid.orientation_end_at) > new Date()
}
