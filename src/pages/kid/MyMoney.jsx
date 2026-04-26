import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { getLevel, LEVELS } from '../../lib/levels'
import { X, ShoppingBag, Plus } from 'lucide-react'
import { syncWallet } from '../../lib/sheets'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log',  emoji: '📚', color:'#1CB0F6', bg:'#F0F9FF' },
  { key: 'planner',     label: 'Journal',       emoji: '📓', color:'#9333EA', bg:'#FAF5FF' },
  { key: 'mindfulness', label: 'Mindfulness',   emoji: '🧘', color:'#22C55E', bg:'#F0FDF4' },
]

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
              <div style={{
                fontFamily:'var(--font-display)', fontWeight:800, fontSize:11,
                color: isFuture ? '#D5D5D5' : earned > 0 ? '#22C55E' : '#AFAFAF',
              }}>
                {isFuture ? '' : e ? `$${earned}` : '—'}
              </div>
              {isToday && (
                <div style={{ width:4, height:4, borderRadius:2, background:'#22C55E' }} />
              )}
            </div>
          )
        })}
      </div>
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

function LogPurchaseModal({ onClose, onSave }) {
  const [amount, setAmount]   = useState('')
  const [desc, setDesc]       = useState('')
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await onSave({ amount: amt, description: desc.trim() || null, date })
    setSaving(false)
    if (err) { setError(err.message); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center px-4 pb-8"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:18, color:'var(--duo-text)' }}>
            🛒 Log a Purchase
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Amount Spent ($)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 3.50"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            What did you buy? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="e.g. Snacks from the store"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !amount}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Log Purchase'}
        </button>
      </div>
    </div>
  )
}

export default function MyMoney() {
  const { profile } = useAuth()
  const [allEarnings, setAllEarnings]       = useState([])
  const [weekEarnings, setWeekEarnings]     = useState([])
  const [transactions, setTransactions]     = useState([])
  const [totalEarned, setTotalEarned]       = useState(0)
  const [totalSpent, setTotalSpent]         = useState(0)
  const [weekEarned, setWeekEarned]         = useState(0)
  const [weekPtsBalance, setWeekPtsBalance] = useState(0)
  const [todayLevel, setTodayLevel]         = useState(null)
  const [loading, setLoading]               = useState(true)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  const today    = format(new Date(), 'yyyy-MM-dd')
  const wStart   = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd     = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  async function load() {
    if (!profile?.id) return

    // All-time earnings (cumulative balance)
    const { data: allEarnsData } = await supabase.from('daily_earnings')
      .select('*').eq('kid_id', profile.id).order('date', { ascending: false })
    const allData = allEarnsData || []
    setAllEarnings(allData)
    const earned = allData.reduce((s, e) => s + (e.total_earned || 0), 0)
    setTotalEarned(earned)

    // This week's earnings for the strip
    const weekData = allData.filter(e => e.date >= wStart && e.date <= wEnd)
    setWeekEarnings(weekData)
    setWeekEarned(weekData.reduce((s, e) => s + (e.total_earned || 0), 0))

    // All-time wallet transactions (spending)
    const { data: txData } = await supabase.from('wallet_transactions')
      .select('*').eq('kid_id', profile.id).order('date', { ascending: false })
    const txList = txData || []
    setTransactions(txList)
    setTotalSpent(txList.reduce((s, t) => s + parseFloat(t.amount || 0), 0))

    // Today's level for canteen eligibility
    const { data: log } = await supabase.from('daily_logs').select('total_pts')
      .eq('kid_id', profile.id).eq('date', today).single()
    setTodayLevel(log ? getLevel(log.total_pts) : null)

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

  useEffect(() => { load() }, [profile?.id])

  async function handleLogPurchase({ amount, description, date: purchaseDate }) {
    const { error } = await supabase.from('wallet_transactions').insert({
      kid_id: profile.id,
      amount,
      description,
      date: purchaseDate,
      created_by: profile.user_id,
    })
    if (!error) {
      syncWallet({ kid_id: profile.id, amount, description, date: purchaseDate, kid_initials: profile.initials || '' })
      setTotalSpent(s => s + amount)
      setTransactions(prev => [
        { id: Date.now(), amount, description, date: purchaseDate, created_at: new Date().toISOString() },
        ...prev,
      ])
    }
    return { error }
  }

  const isRoleModel  = todayLevel === LEVELS.ROLEMODEL
  const canteenOpen  = isRoleModel && isSunday
  const walletBalance = Math.max(0, totalEarned - totalSpent)

  if (loading) return (
    <div className="text-center py-10" style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)' }}>
      Loading…
    </div>
  )

  const todayEarning = weekEarnings.find(e => e.date === today)

  return (
    <div className="space-y-4">
      {showPurchaseModal && (
        <LogPurchaseModal
          onClose={() => setShowPurchaseModal(false)}
          onSave={handleLogPurchase}
        />
      )}

      <h1 className="slide-up" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)', '--delay':'0ms' }}>
        My Money
      </h1>

      {/* Balance cards */}
      <div className="slide-up grid grid-cols-2 gap-3" style={{ '--delay':'60ms' }}>
        {/* Wallet balance (cumulative) */}
        <div className="duo-card overflow-hidden col-span-2" style={{ borderColor:'#22C55E66' }}>
          <div className="h-1.5" style={{ background:'#22C55E' }} />
          <div className="p-4 flex items-center justify-between">
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Wallet Balance
              </div>
              <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:38, color:'#22C55E', lineHeight:1, marginTop:4, '--delay':'120ms' }}>
                ${walletBalance.toFixed(2)}
              </div>
              <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'#AFAFAF', marginTop:2 }}>
                ${totalEarned.toFixed(2)} earned − ${totalSpent.toFixed(2)} spent
              </div>
            </div>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors"
              style={{ background:'#22C55E' }}
            >
              <Plus size={15} />
              Log Purchase
            </button>
          </div>
        </div>

        {/* Canteen points */}
        <div className="duo-card overflow-hidden col-span-2"
          style={{ borderColor: canteenOpen ? '#FF960066' : 'var(--duo-border)' }}>
          <div className="h-1.5" style={{ background: canteenOpen ? '#FF9600' : '#E5E5E5' }} />
          <div className="p-4 flex items-center justify-between">
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                Canteen Points {canteenOpen ? '🎉 Open Now!' : isRoleModel ? '· Opens Sunday' : '· Role Model Only'}
              </div>
              <div className="pop-in" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:38,
                                              color: canteenOpen ? '#FF9600' : '#AFAFAF', lineHeight:1, marginTop:4, '--delay':'160ms' }}>
                {weekPtsBalance}
              </div>
              <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'#AFAFAF', marginTop:2 }}>
                pts this week · resets Monday
              </div>
            </div>
            <div style={{ fontSize:36 }}>{canteenOpen ? '🛍️' : '🏪'}</div>
          </div>
        </div>
      </div>

      {/* Week earnings strip */}
      <WeekEarningsStrip weekEarnings={weekEarnings} wStart={wStart} today={today} />

      {/* Today's tasks */}
      <div className="slide-up duo-card p-4" style={{ '--delay':'200ms' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                      textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
          {todayEarning ? "Today's Tasks ✓" : "Today's Tasks"}
        </div>
        <div className="space-y-2">
          {TASKS.map(t => {
            const done = todayEarning ? !!todayEarning[t.key] : null
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
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'#AFAFAF' }}>Not logged yet</span>
                  ) : done ? (
                    <span className="rounded-full px-2 py-1"
                      style={{ background: t.color, color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:13 }}>
                      +$1 ✓
                    </span>
                  ) : (
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:12, color:'#AFAFAF' }}>Not done</span>
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

      {/* Earn guide */}
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

      {/* Purchase / spending history */}
      {transactions.length > 0 && (
        <div className="slide-up duo-card p-4" style={{ '--delay':'300ms' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)',
                        textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
            <ShoppingBag size={13} className="inline mr-1" />
            Purchase History
          </div>
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                style={{ background:'#FFF5F5', border:'2px solid #FFCCCC' }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:14 }}>
                    {tx.description || '🛒 Purchase'}
                  </div>
                  <div style={{ fontFamily:'var(--font-body)', color:'var(--duo-text-lt)', fontSize:12 }}>
                    {format(new Date(tx.date + 'T12:00:00'), 'MMM d, yyyy')}
                  </div>
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'#EF4444', fontSize:15 }}>
                  −${parseFloat(tx.amount).toFixed(2)}
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
