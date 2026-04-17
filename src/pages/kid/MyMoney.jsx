import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { getLevel, LEVELS } from '../../lib/levels'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log',  emoji: '📚', color:'#1CB0F6', bg:'#F0F9FF' },
  { key: 'planner',     label: 'Journal',       emoji: '📓', color:'#9333EA', bg:'#FAF5FF' },
  { key: 'mindfulness', label: 'Mindfulness',   emoji: '🧘', color:'#22C55E', bg:'#F0FDF4' },
]

// ── Week earnings strip (Mon–Sun) ───────────────────────────────
function WeekEarningsStrip({ weekEarnings, wStart, today }) {
  const days = Array.from({ length:7 }, (_, i) =>
    format(addDays(new Date(wStart + 'T12:00:00'), i), 'yyyy-MM-dd')
  )
  const earnsMap = {}
  weekEarnings.forEach(e => { earnsMap[e.date] = e })

  return (
    <div className="slide-up duo-card p-4" style={{ '--delay':'120ms' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                    textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
        This Week's Tasks
      </div>

      {/* Day columns */}
      <div className="flex justify-between gap-1 mb-3">
        {days.map(date => {
          const e        = earnsMap[date]
          const isToday  = date === today
          const isFuture = date > today
          const dayName  = format(new Date(date + 'T12:00:00'), 'EEE')
          const earned   = e?.total_earned || 0

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, textTransform:'uppercase',
                            color: isToday ? '#22C55E' : 'var(--duo-text-lt)' }}>
                {dayName}
              </div>

              {/* Task dots */}
              <div className="flex flex-col gap-1 items-center">
                {TASKS.map(t => {
                  const done    = e ? !!e[t.key] : false
                  const unknown = !e || isFuture
                  return (
                    <div key={t.key} style={{
                      width: 20, height: 20, borderRadius: 6,
                      background: unknown ? '#F0F0F0' : done ? t.bg : '#F0F0F0',
                      border: unknown ? '1.5px solid #E5E5E5' : done ? `1.5px solid ${t.color}55` : '1.5px solid #E5E5E5',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: 11,
                      opacity: isFuture ? 0.4 : 1,
                    }}>
                      {!unknown && (done ? t.emoji : '·')}
                    </div>
                  )
                })}
              </div>

              {/* Earned */}
              <div style={{
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:11,
                color: isFuture ? '#D5D5D5' : earned > 0 ? '#22C55E' : '#AFAFAF',
              }}>
                {isFuture ? '' : e ? `$${earned}` : '—'}
              </div>

              {/* Today ring */}
              {isToday && (
                <div style={{ width:4, height:4, borderRadius:2, background:'#22C55E' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Task legend */}
      <div className="flex gap-2 justify-center flex-wrap">
        {TASKS.map(t => (
          <div key={t.key} className="flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: t.bg, border:`1.5px solid ${t.color}44` }}>
            <span style={{ fontSize:11 }}>{t.emoji}</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color: t.color }}>
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MyMoney() {
  const { profile } = useAuth()
  const [allEarnings, setAllEarnings]     = useState([])
  const [weekEarnings, setWeekEarnings]   = useState([])
  const [redemptions, setRedemptions]     = useState([])
  const [weekEarned, setWeekEarned]       = useState(0)
  const [weekPtsBalance, setWeekPtsBalance] = useState(0)
  const [todayLevel, setTodayLevel]       = useState(null)
  const [loading, setLoading]             = useState(true)

  const today    = format(new Date(), 'yyyy-MM-dd')
  const wStart   = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd     = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    if (!profile?.id) return
    async function load() {
      // All recent earnings (for history)
      const { data: earnsData } = await supabase.from('daily_earnings').select('*')
        .eq('kid_id', profile.id).gte('date', wStart).lte('date', wEnd).order('date')
      const allData = earnsData || []
      setWeekEarnings(allData)
      setAllEarnings(allData)
      const wkEarned = allData.reduce((s, e) => s + (e.total_earned || 0), 0)
      setWeekEarned(wkEarned)

      // Today's level for canteen eligibility
      const { data: log } = await supabase.from('daily_logs').select('total_pts')
        .eq('kid_id', profile.id).eq('date', today).single()
      setTodayLevel(log ? getLevel(log.total_pts) : null)

      // Canteen redemptions this week
      const { data: redeemData } = await supabase.from('canteen_redemptions')
        .select('*').eq('kid_id', profile.id).order('redeemed_at', { ascending: false }).limit(10)
      setRedemptions(redeemData || [])

      // Weekly point balance
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

  const isRoleModel = todayLevel === LEVELS.ROLEMODEL
  const canteenOpen = isRoleModel && isSunday

  if (loading) return (
    <div className="text-center py-10" style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)' }}>
      Loading…
    </div>
  )

  // Today's entry
  const todayEarning = weekEarnings.find(e => e.date === today)

  return (
    <div className="space-y-4">
      <h1 className="slide-up" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)', '--delay':'0ms' }}>
        My Money
      </h1>

      {/* Big balance cards */}
      <div className="slide-up grid grid-cols-2 gap-3" style={{ '--delay':'60ms' }}>
        {/* Allowance */}
        <div className="duo-card overflow-hidden" style={{ borderColor:'#22C55E66' }}>
          <div className="h-1.5" style={{ background:'#22C55E' }} />
          <div className="p-4 text-center">
            <div style={{ fontSize:36 }}>💵</div>
            <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:30, color:'#22C55E', lineHeight:1, marginTop:4, '--delay':'120ms' }}>
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
            <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:30,
                                            color: canteenOpen ? '#FF9600' : '#AFAFAF', lineHeight:1, marginTop:4, '--delay':'160ms' }}>
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

      {/* Week earnings strip */}
      <WeekEarningsStrip weekEarnings={weekEarnings} wStart={wStart} today={today} />

      {/* Today's tasks status */}
      <div className="slide-up duo-card p-4" style={{ '--delay':'200ms' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
          {todayEarning ? "Today's Tasks ✓" : "Today's Tasks"}
        </div>
        <div className="space-y-2">
          {TASKS.map(t => {
            const done    = todayEarning ? !!todayEarning[t.key] : null
            return (
              <div key={t.key} className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-all"
                style={{
                  background: done === null ? t.bg : done ? t.bg : '#F7F7F7',
                  border: `2px solid ${done === null ? t.color + '33' : done ? t.color + '55' : '#E5E5E5'}`,
                  opacity: done === null ? 0.6 : 1,
                }}>
                <span style={{ fontSize:24 }}>{t.emoji}</span>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:800, color: done ? t.color : '#AFAFAF', flex:1, fontSize:14 }}>
                  {t.label}
                </span>
                <div className="flex items-center gap-2">
                  {done === null ? (
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'#AFAFAF' }}>
                      Not logged yet
                    </span>
                  ) : done ? (
                    <span className="rounded-full px-2 py-1"
                      style={{ background: t.color, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13 }}>
                      +$1 ✓
                    </span>
                  ) : (
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'#AFAFAF' }}>
                      Not done
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!todayEarning && (
          <p style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--duo-text-lt)', marginTop:8, textAlign:'center' }}>
            Ask staff to log today's tasks to see your earnings!
          </p>
        )}
      </div>

      {/* How to earn */}
      <div className="slide-up duo-card p-4" style={{ '--delay':'260ms' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
          Earn up to $3/day
        </div>
        <div className="flex gap-3 justify-around">
          {TASKS.map(t => (
            <div key={t.key} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: t.bg, border:`2px solid ${t.color}44` }}>
                {t.emoji}
              </div>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:10, color: t.color, textAlign:'center' }}>
                {t.label}
              </span>
              <span className="rounded-full px-2 py-0.5"
                style={{ background: t.color, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:12 }}>
                +$1
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Canteen history */}
      {redemptions.length > 0 && (
        <div className="slide-up duo-card p-4" style={{ '--delay':'300ms' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                        textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
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
                    {format(new Date(r.redeemed_at), 'MMM d, yyyy')}
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

      {allEarnings.length === 0 && (
        <div className="duo-card p-10 text-center">
          <div style={{ fontSize:48 }}>💰</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:18, marginTop:8 }}>
            No earnings yet!
          </div>
          <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:14, marginTop:4 }}>
            Complete daily tasks to earn your allowance.
          </div>
        </div>
      )}
    </div>
  )
}
