import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getLevel, LEVELS } from '../../lib/levels'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log',  emoji: '📚', color:'#1CB0F6', bg:'#F0F9FF' },
  { key: 'planner',     label: 'Journal',       emoji: '📓', color:'#9333EA', bg:'#FAF5FF' },
  { key: 'mindfulness', label: 'Mindfulness',   emoji: '🧘', color:'#22C55E', bg:'#F0FDF4' },
]

export default function MyMoney() {
  const { profile } = useAuth()
  const [earnings, setEarnings]         = useState([])
  const [redemptions, setRedemptions]   = useState([])
  const [weekEarned, setWeekEarned]     = useState(0)
  const [weekPtsBalance, setWeekPtsBalance] = useState(0)
  const [todayLevel, setTodayLevel]     = useState(null)
  const [loading, setLoading]           = useState(true)
  const today    = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: earnsData } = await supabase.from('daily_earnings').select('*')
        .eq('kid_id', profile.id).gte('date', since).order('date', { ascending: false })
      setEarnings(earnsData || [])

      const wStart = format(startOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd')
      const wEnd   = format(endOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd')
      const wEarns = (earnsData||[]).filter(e => e.date >= wStart && e.date <= wEnd)
      setWeekEarned(wEarns.reduce((s,e) => s + (e.total_earned||0), 0))

      const { data: log } = await supabase.from('daily_logs').select('total_pts')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLevel(log ? getLevel(log.total_pts) : null)

      const { data: redeemData } = await supabase.from('canteen_redemptions')
        .select('*').eq('kid_id', profile.id).order('redeemed_at',{ascending:false}).limit(10)
      setRedemptions(redeemData || [])

      // Weekly point balance for canteen
      const { data: weekPtsData } = await supabase.from('daily_logs')
        .select('total_pts').eq('kid_id', profile.id).gte('date', wStart).lte('date', wEnd)
      const weekPtsTotal = (weekPtsData || []).reduce((s, l) => s + (l.total_pts || 0), 0)
      const { data: weekRedeemData } = await supabase.from('canteen_redemptions')
        .select('points_redeemed').eq('kid_id', profile.id).gte('redeemed_at', wStart)
      const weekRedeemed = (weekRedeemData || []).reduce((s, r) => s + (r.points_redeemed || 0), 0)
      setWeekPtsBalance(Math.max(0, weekPtsTotal - weekRedeemed))

      setLoading(false)
    }
    load()
  }, [profile?.id])

  const isRoleModel   = todayLevel === LEVELS.ROLEMODEL
  const canteenOpen   = isRoleModel && isSunday
  const totalEarned   = earnings.reduce((s,e) => s + (e.total_earned||0), 0)

  if (loading) return (
    <div className="text-center py-10" style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)' }}>
      Loading…
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)' }}>My Money</h1>

      {/* Big balance cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Allowance */}
        <div className="duo-card overflow-hidden" style={{ borderColor:'#22C55E66' }}>
          <div className="h-1.5" style={{ background:'#22C55E' }} />
          <div className="p-4 text-center">
            <div style={{ fontSize:36 }}>💵</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:30, color:'#22C55E', lineHeight:1, marginTop:4 }}>
              ${weekEarned.toFixed(2)}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--duo-text-lt)', textTransform:'uppercase', marginTop:2 }}>
              This Week
            </div>
          </div>
        </div>

        {/* Canteen */}
        <div className="duo-card overflow-hidden"
          style={{ borderColor: canteenOpen ? '#FF960066' : 'var(--duo-border)' }}>
          <div className="h-1.5" style={{ background: canteenOpen ? '#FF9600' : '#E5E5E5' }} />
          <div className="p-4 text-center">
            <div style={{ fontSize:36 }}>{canteenOpen ? '🛍️' : '🏪'}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:30,
                          color: canteenOpen ? '#FF9600' : '#AFAFAF', lineHeight:1, marginTop:4 }}>
              {weekPtsBalance}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, textTransform:'uppercase', marginTop:2,
                          color: canteenOpen ? '#FF9600' : 'var(--duo-text-lt)' }}>
              {canteenOpen ? '🎉 Open Now!' : isRoleModel ? 'Opens Sunday' : 'Role Model Only'}
            </div>
            <div style={{ fontFamily:'var(--font-body)', fontSize:10, color:'#AFAFAF', marginTop:2 }}>
              pts · resets Monday
            </div>
          </div>
        </div>
      </div>

      {/* How to earn */}
      <div className="duo-card p-4">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
          Earn up to $3/day
        </div>
        <div className="space-y-2">
          {TASKS.map(t => (
            <div key={t.key} className="flex items-center gap-3 rounded-2xl px-3 py-3"
              style={{ background: t.bg, border:`2px solid ${t.color}33` }}>
              <span style={{ fontSize:24 }}>{t.emoji}</span>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color: t.color, flex:1, fontSize:14 }}>
                {t.label}
              </span>
              <span className="rounded-full px-2 py-1"
                style={{ background: t.color, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13 }}>
                +$1
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent days */}
      {earnings.length > 0 && (
        <div className="duo-card p-4">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            Recent Earnings
          </div>
          <div className="space-y-3">
            {earnings.slice(0,7).map(e => (
              <div key={e.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:14 }}>
                    {format(new Date(e.date + 'T12:00:00'),'EEE, MMM d')}
                  </span>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'#22C55E', fontSize:16 }}>
                    ${(e.total_earned||0).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {TASKS.map(t => (
                    <div key={t.key} className="flex items-center gap-1 rounded-full px-2.5 py-1"
                      style={{
                        background: e[t.key] ? t.bg : '#F7F7F7',
                        border: `2px solid ${e[t.key] ? t.color+'66' : '#E5E5E5'}`,
                        fontFamily:'var(--font-display)', fontWeight:700, fontSize:11,
                        color: e[t.key] ? t.color : '#AFAFAF',
                      }}>
                      {t.emoji} {e[t.key] ? '+$1' : '—'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canteen history */}
      {redemptions.length > 0 && (
        <div className="duo-card p-4">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            Canteen History
          </div>
          <div className="space-y-2">
            {redemptions.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                style={{ background:'#FFFBEB', border:'2px solid #FCD34D' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:14 }}>
                    {r.notes || '🛍️ Store item'}
                  </div>
                  <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:12 }}>
                    {format(new Date(r.redeemed_at),'MMM d, yyyy')}
                  </div>
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'#FF9600', fontSize:15 }}>
                  −{r.points_redeemed} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {earnings.length === 0 && (
        <div className="duo-card p-10 text-center">
          <div style={{ fontSize:48 }}>💰</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:18, marginTop:8 }}>No earnings yet!</div>
          <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:14, marginTop:4 }}>Complete daily tasks to earn your allowance.</div>
        </div>
      )}
    </div>
  )
}
