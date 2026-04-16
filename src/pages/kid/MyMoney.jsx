import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getLevel, LEVELS } from '../../lib/levels'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log',   emoji: '📚' },
  { key: 'planner',     label: 'Journal',        emoji: '📓' },
  { key: 'mindfulness', label: 'Mindfulness',    emoji: '🧘' },
]

export default function MyMoney() {
  const { profile } = useAuth()
  const [earnings, setEarnings]       = useState([])
  const [redemptions, setRedemptions] = useState([])
  const [weekEarned, setWeekEarned]   = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [todayLevel, setTodayLevel]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: earnsData } = await supabase.from('daily_earnings').select('*')
        .eq('kid_id', profile.id).gte('date', since).order('date', { ascending: false })
      setEarnings(earnsData || [])

      const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const wEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const wEarns = (earnsData || []).filter(e => e.date >= wStart && e.date <= wEnd)
      setWeekEarned(wEarns.reduce((s, e) => s + (e.total_earned || 0), 0))
      setTotalEarned((earnsData || []).reduce((s, e) => s + (e.total_earned || 0), 0))

      const { data: log } = await supabase.from('daily_logs').select('total_pts')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLevel(log ? getLevel(log.total_pts) : null)

      const { data: redeemData } = await supabase.from('canteen_redemptions')
        .select('*').eq('kid_id', profile.id).order('redeemed_at', { ascending: false }).limit(10)
      setRedemptions(redeemData || [])

      setLoading(false)
    }
    load()
  }, [profile?.id])

  const isRoleModel = todayLevel === LEVELS.ROLEMODEL

  if (loading) return <div className="text-center py-10 text-slate-400">Loading…</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-slate-800">My Money</h1>

      {/* Big balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="clay-card bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white text-center">
          <div className="text-4xl mb-1">💵</div>
          <div className="text-3xl font-black">${weekEarned.toFixed(2)}</div>
          <div className="text-emerald-100 text-xs font-semibold mt-0.5">This Week</div>
        </div>
        <div className={`clay-card p-5 text-center ${isRoleModel && isSunday ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-white'}`}>
          <div className="text-4xl mb-1">{isRoleModel && isSunday ? '🛍️' : '🏪'}</div>
          <div className={`text-3xl font-black ${isRoleModel && isSunday ? '' : 'text-slate-300'}`}>{totalEarned}</div>
          <div className={`text-xs font-semibold mt-0.5 ${isRoleModel && isSunday ? 'text-amber-100' : 'text-slate-400'}`}>
            {isRoleModel && isSunday ? '🎉 Canteen Open!' : isRoleModel ? 'Opens Sunday' : 'Role Model only'}
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="clay-card bg-white p-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Earn up to $3/day</div>
        <div className="space-y-2">
          {TASKS.map(t => (
            <div key={t.key} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-3 py-2.5">
              <span className="text-2xl">{t.emoji}</span>
              <span className="font-semibold text-slate-700 flex-1 text-sm">{t.label}</span>
              <span className="font-bold text-emerald-600">+$1.00</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent earnings */}
      {earnings.length > 0 && (
        <div className="clay-card bg-white p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Recent Days</div>
          <div className="space-y-3">
            {earnings.slice(0, 7).map(e => (
              <div key={e.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-bold text-slate-700">{format(new Date(e.date), 'EEE, MMM d')}</span>
                  <span className="font-black text-emerald-600">${(e.total_earned || 0).toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  {TASKS.map(t => (
                    <div key={t.key}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold
                        ${e[t.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {t.emoji} {e[t.key] ? '+$1' : '—'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canteen redemptions */}
      {redemptions.length > 0 && (
        <div className="clay-card bg-white p-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Canteen History</div>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-amber-50 rounded-2xl px-3 py-2.5">
                <div>
                  <div className="font-bold text-sm text-slate-700">{r.notes || '🛍️ Store item'}</div>
                  <div className="text-xs text-slate-400">{format(new Date(r.redeemed_at), 'MMM d, yyyy')}</div>
                </div>
                <span className="font-black text-orange-500">−{r.points_redeemed} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {earnings.length === 0 && (
        <div className="clay-card bg-white p-10 text-center">
          <div className="text-4xl mb-2">💰</div>
          <div className="text-slate-400 font-semibold">No earnings yet</div>
          <div className="text-slate-300 text-sm mt-1">Complete daily tasks to earn your allowance!</div>
        </div>
      )}
    </div>
  )
}
