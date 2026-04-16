import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { DollarSign, ShoppingBag } from 'lucide-react'
import { getLevel, LEVELS } from '../../lib/levels'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log', emoji: '📚' },
  { key: 'planner',     label: 'Planner/Journal', emoji: '📓' },
  { key: 'mindfulness', label: 'Mindfulness', emoji: '🧘' },
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
      // Last 30 days of earnings
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: earnsData } = await supabase.from('daily_earnings').select('*')
        .eq('kid_id', profile.id).gte('date', since).order('date', { ascending: false })
      setEarnings(earnsData || [])

      // This week's total
      const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const wEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const wEarns = (earnsData || []).filter(e => e.date >= wStart && e.date <= wEnd)
      setWeekEarned(wEarns.reduce((s, e) => s + (e.total_earned || 0), 0))
      setTotalEarned((earnsData || []).reduce((s, e) => s + (e.total_earned || 0), 0))

      // Today's level for canteen access
      const { data: log } = await supabase.from('daily_logs').select('total_pts')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLevel(log ? getLevel(log.total_pts) : null)

      // Redemption history
      const { data: redeemData } = await supabase.from('canteen_redemptions')
        .select('*').eq('kid_id', profile.id).order('redeemed_at', { ascending: false }).limit(10)
      setRedemptions(redeemData || [])

      setLoading(false)
    }
    load()
  }, [profile?.id])

  const isRoleModel = todayLevel === LEVELS.ROLEMODEL

  if (loading) return <div className="text-slate-400 text-sm text-center py-10">Loading…</div>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">My Money</h1>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <DollarSign className="text-emerald-500 mx-auto mb-1" size={22} />
          <div className="text-3xl font-black text-emerald-700">${weekEarned.toFixed(2)}</div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">This Week</div>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${isRoleModel && isSunday ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <ShoppingBag className={`mx-auto mb-1 ${isRoleModel && isSunday ? 'text-amber-500' : 'text-slate-300'}`} size={22} />
          <div className={`text-3xl font-black ${isRoleModel && isSunday ? 'text-amber-700' : 'text-slate-400'}`}>{totalEarned}</div>
          <div className="text-xs text-slate-500 font-semibold mt-0.5">Canteen Pts</div>
          {isRoleModel && isSunday && <div className="text-xs text-amber-600 font-bold">Store is OPEN!</div>}
          {!isRoleModel && <div className="text-xs text-slate-400">Role Model only</div>}
          {isRoleModel && !isSunday && <div className="text-xs text-slate-400">Opens Sunday</div>}
        </div>
      </div>

      {/* This week's task breakdown */}
      {earnings.slice(0, 7).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Days</div>
          <div className="space-y-3">
            {earnings.slice(0, 7).map(e => (
              <div key={e.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-slate-700">{format(new Date(e.date), 'EEE, MMM d')}</span>
                  <span className="font-bold text-emerald-600">${(e.total_earned || 0).toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  {TASKS.map(t => (
                    <div key={t.key} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${e[t.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      <span>{t.emoji}</span>
                      {e[t.key] ? '+$1' : '—'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redemption history */}
      {redemptions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">iCanTeen Redemptions</div>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-slate-700">{r.notes || 'Store item'}</span>
                  <div className="text-xs text-slate-400">{format(new Date(r.redeemed_at), 'MMM d, yyyy')}</div>
                </div>
                <span className="font-bold text-orange-500">−{r.points_redeemed} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {earnings.length === 0 && (
        <div className="text-slate-400 text-sm text-center bg-white rounded-2xl p-10 border border-slate-100">
          No earnings logged yet. Complete daily tasks to earn allowance!
        </div>
      )}
    </div>
  )
}
