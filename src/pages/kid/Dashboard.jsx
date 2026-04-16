import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getLevel, LEVEL_CONFIG, progressToNextLevel, LEVELS } from '../../lib/levels'
import { isPrivilegeFrozen } from '../../lib/points'
import ProgressBar from '../../components/ui/ProgressBar'
import FreezeBanner from '../../components/ui/FreezeBanner'
import { format, subDays } from 'date-fns'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

const LEVEL_COLORS = {
  [LEVELS.ORIENTATION]: '#94a3b8',
  [LEVELS.REFOCUS]:     '#3b82f6',
  [LEVELS.RISING]:      '#f59e0b',
  [LEVELS.ROLEMODEL]:   '#10b981',
}

export default function KidDashboard() {
  const { profile } = useAuth()
  const [todayLog, setTodayLog]     = useState(null)
  const [weekTotal, setWeekTotal]   = useState(0)
  const [balance, setBalance]       = useState(0)
  const [sparkData, setSparkData]   = useState([])
  const [streak, setStreak]         = useState(0)
  const [canteen, setCanteen]       = useState(0)
  const [loading, setLoading]       = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      // Today's log
      const { data: log } = await supabase.from('daily_logs').select('*')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLog(log)

      // Week total (Mon–today)
      const since = format(subDays(new Date(), 6), 'yyyy-MM-dd')
      const { data: weekLogs } = await supabase.from('daily_logs').select('date, total_pts')
        .eq('kid_id', profile.id).gte('date', since).order('date')
      setWeekTotal((weekLogs || []).reduce((s, l) => s + l.total_pts, 0))
      setSparkData(weekLogs || [])

      // Role Model streak
      let s = 0
      if (weekLogs) {
        for (const l of [...weekLogs].reverse()) {
          if (getLevel(l.total_pts) === LEVELS.ROLEMODEL) s++
          else break
        }
      }
      setStreak(s)

      // Money balance
      const { data: earns } = await supabase.from('daily_earnings').select('total_earned')
        .eq('kid_id', profile.id).gte('date', since)
      setBalance((earns || []).reduce((s, e) => s + (e.total_earned || 0), 0))

      // Canteen points redeemed
      const { data: redemptions } = await supabase.from('canteen_redemptions')
        .select('points_redeemed').eq('kid_id', profile.id)
      const totalRedeemed = (redemptions || []).reduce((s, r) => s + r.points_redeemed, 0)
      // Available canteen points = total earned pts this week - redeemed
      setCanteen(Math.max(0, weekTotal - totalRedeemed))

      setLoading(false)
    }
    load()
  }, [profile?.id, today])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading your journey…</div>
  )

  const pts = todayLog?.total_pts ?? null
  const level = pts !== null ? getLevel(pts, isOrientation(profile)) : null
  const cfg = level ? LEVEL_CONFIG[level] : LEVEL_CONFIG[LEVELS.REFOCUS]
  const progress = pts !== null ? progressToNextLevel(pts) : null
  const frozen = isPrivilegeFrozen(todayLog?.privilege_freeze_until)
  const isSunday = new Date().getDay() === 0

  return (
    <div className="space-y-4">
      {/* Freeze banner */}
      {frozen && <FreezeBanner freezeUntil={todayLog?.privilege_freeze_until} />}

      {/* Level hero card */}
      <div className={`relative ${cfg.bgClass} border-2 ${cfg.borderClass} rounded-3xl p-6 text-center overflow-hidden`}>
        {level === LEVELS.ROLEMODEL && (
          <div className="absolute inset-0 pointer-events-none">
            {['⭐','✨','🌟'].map((e, i) => (
              <span key={i} className="absolute text-xl animate-pulse-slow opacity-40"
                style={{ top: `${10 + i*25}%`, left: `${5 + i*40}%`, animationDelay: `${i*0.8}s` }}>{e}</span>
            ))}
          </div>
        )}
        <div className="text-6xl mb-2">{cfg.emoji}</div>
        <div className={`text-2xl font-black ${cfg.textClass}`}>{cfg.label}</div>
        <div className="text-slate-500 text-sm mt-0.5">{profile?.initials}</div>

        {pts !== null ? (
          <div className="mt-4">
            <div className={`text-5xl font-black ${cfg.textClass}`}>{pts}</div>
            <div className="text-slate-500 text-sm">points today</div>
          </div>
        ) : (
          <div className="mt-4 text-slate-400 text-sm">Today's points not logged yet</div>
        )}

        {progress && pts !== null && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress to {progress.nextLabel}</span>
              <span>{progress.ptsNeeded} pts needed</span>
            </div>
            <div className="h-3 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700`}
                style={{ width: `${progress.pct}%`, background: LEVEL_COLORS[level] }}
              />
            </div>
          </div>
        )}

        {level === LEVELS.ROLEMODEL && pts !== null && (
          <div className="mt-3 text-xs font-semibold text-emerald-600">
            You're at the top! Keep it up! 🏆
          </div>
        )}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="font-bold text-amber-700">{streak}-day Role Model streak!</div>
            <div className="text-xs text-amber-500">Keep going — you're on fire!</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-blue-600">{weekTotal}</div>
          <div className="text-xs text-slate-400 font-semibold mt-0.5">This Week</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="text-2xl font-bold text-emerald-600">${balance.toFixed(2)}</div>
          <div className="text-xs text-slate-400 font-semibold mt-0.5">Allowance</div>
        </div>
        <div className={`rounded-2xl p-4 shadow-sm border text-center ${isSunday && level === LEVELS.ROLEMODEL ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
          <div className={`text-2xl font-bold ${isSunday && level === LEVELS.ROLEMODEL ? 'text-emerald-600' : 'text-slate-400'}`}>{weekTotal}</div>
          <div className="text-xs text-slate-400 font-semibold mt-0.5">Store Pts</div>
          {isSunday && level === LEVELS.ROLEMODEL && <div className="text-xs text-emerald-500 font-semibold">Store Open!</div>}
        </div>
      </div>

      {/* Sparkline */}
      {sparkData.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Last 7 Days</div>
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={sparkData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Line type="monotone" dataKey="total_pts" stroke={LEVEL_COLORS[level || LEVELS.REFOCUS]} strokeWidth={2.5} dot={false} />
              <Tooltip
                content={({ active, payload }) => active && payload?.length
                  ? <div className="bg-white shadow rounded-lg px-2 py-1 text-xs font-bold text-slate-700">{payload[0].value} pts</div>
                  : null}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Today's breakdown (if logged) */}
      {todayLog && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Today's Shifts</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Morning', pts: todayLog.am_pts || 0, max: 40 },
              { label: 'Afternoon', pts: todayLog.pm_pts || 0, max: 50 },
              { label: 'Overnight', pts: todayLog.ov_pts || 0, max: 10 },
            ].map(s => (
              <div key={s.label}>
                <div className="text-lg font-bold text-slate-700">{s.pts}/{s.max}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
          {todayLog.positive_experiences && (
            <div className="mt-3 bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700">
              ✨ {todayLog.positive_experiences}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function isOrientation(kid) {
  if (!kid?.orientation_end_at) return false
  return new Date(kid.orientation_end_at) > new Date()
}
