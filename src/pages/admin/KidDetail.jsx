import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { isPrivilegeFrozen, freezeHoursRemaining, AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS } from '../../lib/points'
import LevelBadge from '../../components/ui/LevelBadge'
import TrendChart from '../../components/charts/TrendChart'
import {
  ArrowLeft, ShieldAlert, Star, DollarSign, TrendingUp,
  Pin, PinOff, Send, Trash2, ClipboardList, ChevronDown, ChevronUp,
  Pencil, ShoppingBag, AlertCircle, X
} from 'lucide-react'

function LogPurchaseModal({ kidInitials, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [desc, setDesc]     = useState('')
  const [date, setDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true); setError('')
    const { error: err } = await onSave({ amount: amt, description: desc.trim() || null, date })
    setSaving(false)
    if (err) { setError(err.message); return }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-800">🛒 Log Purchase for {kidInitials}</div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Amount Spent ($)</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 3.50" autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">
            What was it? <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="e.g. Snacks from the store"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>}
        <button onClick={handleSubmit} disabled={saving || !amount}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">
          {saving ? 'Saving…' : 'Log Purchase'}
        </button>
      </div>
    </div>
  )
}

function TimelineTab({ kid, dailyLogs, redemptions, walletTx, notes }) {
  // Build a unified event list
  const events = []

  // Intake / onboard
  if (kid?.intake_date) {
    events.push({
      ts:    new Date(kid.intake_date + 'T08:00:00').toISOString(),
      kind:  'onboard',
      title: kid.is_existing ? 'Migrated from paper system' : 'Joined the program',
      detail: format(new Date(kid.intake_date + 'T12:00:00'), 'MMMM d, yyyy'),
    })
  }

  // Daily logs — one event per day with the result
  dailyLogs?.forEach(l => {
    const ts = new Date(l.date + 'T18:00:00').toISOString() // pin to end of day for ordering
    const lv = getLevel(l.total_pts)
    const cfg = LEVEL_CONFIG[lv]
    events.push({
      ts,
      kind:  'daily',
      title: `${cfg.emoji} ${cfg.label} day — ${l.total_pts} pts`,
      detail: `AM ${l.am_pts || 0} · PM ${l.pm_pts || 0} · OV ${l.ov_pts || 0}`,
      sub:   l.staff_notes || l.positive_experiences,
    })
    if (l.minor_infractions > 0 || l.major_infractions > 0) {
      const parts = []
      if (l.minor_infractions > 0) parts.push(`${l.minor_infractions}× Minor`)
      if (l.major_infractions > 0) parts.push(`${l.major_infractions}× Major`)
      events.push({
        ts:    new Date(l.date + 'T18:30:00').toISOString(),
        kind:  'infraction',
        title: `⚠️ ${parts.join(' + ')} infraction`,
        detail: format(new Date(l.date + 'T12:00:00'), 'EEE, MMM d'),
        sub:   l.staff_notes,
      })
    }
  })

  // Canteen redemptions
  redemptions?.forEach(r => {
    events.push({
      ts:    r.redeemed_at,
      kind:  'canteen',
      title: `🛍️ Canteen — ${r.points_redeemed} pts`,
      detail: format(new Date(r.redeemed_at), 'EEE, MMM d'),
      sub:   r.notes,
    })
  })

  // Wallet purchases
  walletTx?.forEach(w => {
    events.push({
      ts:    new Date(w.date + 'T15:00:00').toISOString(),
      kind:  'wallet',
      title: `💵 Purchase — $${parseFloat(w.amount).toFixed(2)}`,
      detail: format(new Date(w.date + 'T12:00:00'), 'EEE, MMM d'),
      sub:   w.description,
    })
  })

  // Staff notes
  notes?.forEach(n => {
    events.push({
      ts:    n.created_at,
      kind:  'note',
      title: `📝 Note from ${n.admin_name || 'Staff'}`,
      detail: format(new Date(n.created_at), 'EEE, MMM d · h:mma').toLowerCase(),
      sub:   n.body,
    })
  })

  events.sort((a, b) => new Date(b.ts) - new Date(a.ts))

  const KIND_COLORS = {
    daily:      'border-emerald-200 bg-emerald-50',
    infraction: 'border-red-200 bg-red-50',
    canteen:    'border-amber-200 bg-amber-50',
    wallet:     'border-blue-200 bg-blue-50',
    note:       'border-slate-200 bg-slate-50',
    onboard:    'border-purple-200 bg-purple-50',
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
        Nothing logged yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((e, i) => (
        <div key={i} className={`rounded-2xl border px-4 py-3 ${KIND_COLORS[e.kind] || 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-800 text-sm">{e.title}</div>
            <div className="text-xs text-slate-500 shrink-0">{e.detail}</div>
          </div>
          {e.sub && (
            <div className="text-xs text-slate-600 mt-1 leading-relaxed">{e.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function BehaviorRow({ label, earned }) {
  return (
    <div className={`flex items-center gap-2 text-xs py-0.5 ${earned ? 'text-emerald-700' : 'text-slate-400'}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${earned ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        {earned
          ? <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        }
      </div>
      <span className={earned ? '' : 'line-through'}>{label}</span>
    </div>
  )
}

function HistoryRow({ log, kidId, navigate }) {
  const [expanded, setExpanded] = useState(false)
  const lv   = log.level_achieved || getLevel(log.total_pts)
  const lcfg = LEVEL_CONFIG[lv]

  return (
    <div className="border-b border-slate-50 last:border-0">
      {/* Summary row */}
      <button
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl ${lcfg.badgeBg} flex items-center justify-center text-sm`}>{lcfg.emoji}</div>
          <span className="font-semibold text-slate-700 text-sm">{format(new Date(log.date + 'T12:00:00'), 'EEE, MMM d')}</span>
        </div>
        <div className="flex items-center gap-2">
          {(log.minor_infractions > 0 || log.major_infractions > 0) && (
            <span className="text-xs text-red-500 font-semibold">
              {log.minor_infractions > 0 && `⚠️${log.minor_infractions} `}
              {log.major_infractions > 0 && `🚨${log.major_infractions}`}
            </span>
          )}
          <span className={`text-xl font-black ${lcfg.textClass}`}>{log.total_pts}</span>
          <LevelBadge level={lv} size="sm" />
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 bg-slate-50/60">
          {/* Shift breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: '☀️ Morning', pts: log.am_pts || 0, max: 40 },
              { label: '🌆 Afternoon', pts: log.pm_pts || 0, max: 50 },
              { label: '🌙 Night', pts: log.ov_pts || 0, max: 10 },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.pts === s.max ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-100'}`}>
                <div className="text-xs text-slate-500 mb-0.5">{s.label}</div>
                <div className={`text-base font-black ${s.pts === s.max ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {s.pts}<span className="text-xs font-normal text-slate-400">/{s.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Behavior detail */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Morning</div>
              {AM_BEHAVIORS.map(b => <BehaviorRow key={b.key} label={b.label} earned={!!log[b.key]} />)}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Afternoon</div>
              {PM_BEHAVIORS.map(b => <BehaviorRow key={b.key} label={b.label} earned={!!log[b.key]} />)}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Overnight</div>
              {OVERNIGHT_BEHAVIORS.map(b => <BehaviorRow key={b.key} label={b.label} earned={!!log[b.key]} />)}
            </div>
          </div>

          {/* Notes */}
          {log.positive_experiences && (
            <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1.5">✨ {log.positive_experiences}</div>
          )}
          {log.staff_notes && (
            <div className="text-xs text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-1.5">📝 {log.staff_notes}</div>
          )}

          {/* Edit button */}
          <button
            onClick={() => navigate(`/admin/points?kid=${kidId}&date=${log.date}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={12} /> Edit this entry
          </button>
        </div>
      )}
    </div>
  )
}

export default function KidDetail() {
  const { kidId }  = useParams()
  const navigate   = useNavigate()
  const { profile } = useAuth()

  const [kid, setKid]               = useState(null)
  const [todayLog, setTodayLog]     = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [weekEarnings, setWeekEarnings] = useState([])
  const [weekRedemptions, setWeekRedemptions] = useState([])
  const [notes, setNotes]           = useState([])
  const [newNote, setNewNote]       = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [noteError, setNoteError]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('overview') // overview | timeline | history | notes
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [allRedemptions, setAllRedemptions] = useState([])
  const [walletTx, setWalletTx]             = useState([])

  async function handleLogPurchase({ amount, description, date: purchaseDate }) {
    const { error } = await supabase.from('wallet_transactions').insert({
      kid_id: kidId,
      amount,
      description,
      date: purchaseDate,
      created_by: profile?.user_id,
    })
    return { error }
  }

  const today   = format(new Date(), 'yyyy-MM-dd')
  const since30 = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const wStart  = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
  const wEnd    = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')

  useEffect(() => {
    load()
  }, [kidId])

  async function load() {
    const [
      { data: kidData },
      { data: logToday },
      { data: logs },
      { data: earns },
      { data: notesData },
      { data: redemptions },
    ] = await Promise.all([
      supabase.from('kids').select('*').eq('id', kidId).single(),
      supabase.from('daily_logs').select('*').eq('kid_id', kidId).eq('date', today).single(),
      supabase.from('daily_logs').select('*').eq('kid_id', kidId).gte('date', since30).order('date', { ascending: false }),
      supabase.from('daily_earnings').select('*').eq('kid_id', kidId).gte('date', wStart).lte('date', wEnd),
      supabase.from('kid_notes').select('*').eq('kid_id', kidId).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('canteen_redemptions').select('*').eq('kid_id', kidId).gte('redeemed_at', wStart),
    ])
    setKid(kidData)
    setTodayLog(logToday || null)
    setRecentLogs(logs || [])
    setWeekEarnings(earns || [])
    setNotes(notesData || [])
    setWeekRedemptions(redemptions || [])
    setLoading(false)

    // Fetch all-time canteen redemptions + wallet purchases for the timeline tab
    const [{ data: allR }, { data: allW }] = await Promise.all([
      supabase.from('canteen_redemptions').select('*').eq('kid_id', kidId).order('redeemed_at', { ascending: false }),
      supabase.from('wallet_transactions').select('*').eq('kid_id', kidId).order('date', { ascending: false }),
    ])
    setAllRedemptions(allR || [])
    setWalletTx(allW || [])
  }

  async function handlePostNote() {
    if (!newNote.trim()) return
    setPostingNote(true)
    setNoteError('')
    const { error } = await supabase.from('kid_notes').insert({
      kid_id:     kidId,
      admin_name: profile?.name || 'Staff',
      body:       newNote.trim(),
      pinned:     false,
      created_at: new Date().toISOString(),
    })
    setPostingNote(false)
    if (error) {
      setNoteError('Failed to post note: ' + error.message)
      return
    }
    setNewNote('')
    const { data } = await supabase.from('kid_notes').select('*').eq('kid_id', kidId)
      .order('pinned', { ascending: false }).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function handleTogglePin(note) {
    await supabase.from('kid_notes').update({ pinned: !note.pinned }).eq('id', note.id)
    setNotes(prev => prev
      .map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n)
      .sort((a, b) => b.pinned - a.pinned || new Date(b.created_at) - new Date(a.created_at))
    )
  }

  async function handleDeleteNote(noteId) {
    if (!confirm('Delete this note?')) return
    await supabase.from('kid_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  )
  if (!kid) return <div className="p-6 text-slate-400">Youth not found.</div>

  const pts       = todayLog?.total_pts ?? null
  const level     = pts !== null ? getLevel(pts) : null
  const cfg       = level ? LEVEL_CONFIG[level] : null
  const frozen    = isPrivilegeFrozen(todayLog?.privilege_freeze_until)
  const freezeHrs = freezeHoursRemaining(todayLog?.privilege_freeze_until)
  const openDollars = parseFloat(kid?.opening_dollars) || 0
  const openPoints  = parseInt(kid?.opening_points)    || 0
  const weekTotal = weekEarnings.reduce((s, e) => s + (e.total_earned || 0), 0) + openDollars
  const weekPts   = recentLogs.filter(l => l.date >= wStart && l.date <= wEnd).reduce((s, l) => s + l.total_pts, 0)
  const weekRedeemed = weekRedemptions.reduce((s, r) => s + (r.points_redeemed || 0), 0)
  const weekBalance = Math.max(0, weekPts + openPoints - weekRedeemed)
  const avg30     = recentLogs.length ? Math.round(recentLogs.reduce((s, l) => s + l.total_pts, 0) / recentLogs.length) : null
  const rmDays    = recentLogs.filter(l => l.level_achieved === 'rolemodel').length
  const pinnedNotes = notes.filter(n => n.pinned)

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">

      {/* Back */}
      <button onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors -ml-1">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Profile header */}
      <div className={`rounded-3xl p-5 ${cfg ? cfg.bgClass : 'bg-slate-50'} border-2 ${cfg ? cfg.borderClass : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${cfg ? cfg.badgeBg : 'bg-slate-100'}`}>
              {cfg ? cfg.emoji : '🌱'}
            </div>
            <div>
              <div className="text-3xl font-black text-slate-800">{kid.initials}</div>
              {level && <div className="mt-0.5"><LevelBadge level={level} size="md" /></div>}
              <div className="text-xs text-slate-400 mt-1 space-x-2">
                {kid.intake_date && <span>Intake: {format(new Date(kid.intake_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
                <span>·</span>
                <span className={kid.is_active ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
                  {kid.is_active ? 'Active' : 'Discharged'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {pts !== null ? (
              <>
                <div className={`text-5xl font-black leading-none ${cfg?.textClass || 'text-slate-800'}`}>{pts}</div>
                <div className="text-xs text-slate-400 mt-1">pts today</div>
              </>
            ) : (
              <div className="text-slate-300 text-sm">No entry today</div>
            )}
          </div>
        </div>

        {/* Freeze banner */}
        {frozen && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <ShieldAlert size={16} className="text-red-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-red-700">Privileges Suspended</span>
              <span className="text-red-400 ml-1">— {freezeHrs}h remaining · until {format(new Date(todayLog.privilege_freeze_until), 'h:mm a, MMM d')}</span>
            </div>
          </div>
        )}

        {/* Pinned notes preview */}
        {pinnedNotes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {pinnedNotes.map(n => (
              <div key={n.id} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                <Pin size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-amber-700">{n.admin_name}</span>
                  <span className="text-amber-600 ml-1">{n.body}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowPurchaseModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-100 transition-colors"
        >
          <DollarSign size={13} /> Log purchase for {kid?.initials}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: <Star size={14} />, value: weekPts, label: 'Wk Pts', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: <ShoppingBag size={14} />, value: weekBalance, label: 'Canteen Bal', color: weekBalance > 0 ? 'text-emerald-600' : 'text-slate-400', bg: 'bg-emerald-50' },
          { icon: <TrendingUp size={14} />, value: avg30 ?? '—', label: '30d Avg', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: <span className="text-xs">🏆</span>, value: rmDays, label: 'RM Days', color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3 text-center border border-white`}>
            <div className={`flex justify-center ${s.color} mb-0.5`}>{s.icon}</div>
            <div className={`text-xl font-black ${s.color} leading-tight`}>{s.value}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly canteen balance detail */}
      {weekRedeemed > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
          <span>Weekly earned: <strong className="text-slate-700">{weekPts} pts</strong></span>
          <span>Canteen spent: <strong className="text-red-500">−{weekRedeemed} pts</strong></span>
          <span>Balance: <strong className="text-emerald-600">{weekBalance} pts</strong></span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'timeline', label: 'Timeline' },
          { key: 'history',  label: 'History' },
          { key: 'notes',    label: `Notes ${notes.length > 0 ? `(${notes.length})` : ''}` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Today detail */}
          {todayLog && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide">Today's Shifts</h3>
                <button
                  onClick={() => navigate(`/admin/points?kid=${kidId}&date=${today}`)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: '☀️ Morning',   pts: todayLog.am_pts || 0, max: 40 },
                  { label: '🌆 Afternoon', pts: todayLog.pm_pts || 0, max: 50 },
                  { label: '🌙 Night',     pts: todayLog.ov_pts || 0, max: 10 },
                ].map(s => (
                  <div key={s.label} className={`rounded-2xl p-3 ${s.pts === s.max ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                    <div className={`text-xl font-black ${s.pts === s.max ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {s.pts}<span className="text-xs font-normal text-slate-400">/{s.max}</span>
                    </div>
                  </div>
                ))}
              </div>
              {todayLog.positive_experiences && (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">✨ {todayLog.positive_experiences}</div>
              )}
              {todayLog.staff_notes && (
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">📝 {todayLog.staff_notes}</div>
              )}
            </div>
          )}

          {/* 30-day chart */}
          {recentLogs.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide mb-4">30-Day Trend</h3>
              <TrendChart data={[...recentLogs].reverse()} height={180} />
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate(`/admin/points?kid=${kidId}&date=${today}`)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 text-sm font-bold transition-colors shadow flex items-center justify-center gap-2">
              <ClipboardList size={16} /> Enter / Edit Points
            </button>
            <button onClick={() => navigate('/admin/reports')}
              className="bg-slate-700 hover:bg-slate-800 text-white rounded-2xl py-3 text-sm font-bold transition-colors shadow flex items-center justify-center gap-2">
              <TrendingUp size={16} /> Full Reports
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'timeline' && (
        <TimelineTab
          kid={kid}
          dailyLogs={recentLogs}
          redemptions={allRedemptions}
          walletTx={walletTx}
          notes={notes}
        />
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-50 bg-slate-50/60">
            <p className="text-xs text-slate-400">Tap any row to see the full behavior breakdown · use Edit to correct entries</p>
          </div>
          {recentLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No logs in the last 30 days.</div>
          ) : (
            <div>
              {recentLogs.map(l => (
                <HistoryRow key={l.id} log={l} kidId={kidId} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES TAB ── */}
      {tab === 'notes' && (
        <div className="space-y-3">
          {/* New note input */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add a Note</div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostNote() }}
              placeholder="Write a note about this youth — behavior observations, milestones, concerns, anything relevant…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {noteError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                <AlertCircle size={12} /> {noteError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Cmd+Enter to post</span>
              <button
                onClick={handlePostNote}
                disabled={postingNote || !newNote.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                <Send size={14} />
                {postingNote ? 'Posting…' : 'Post Note'}
              </button>
            </div>
          </div>

          {/* Notes feed */}
          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
              No notes yet. Add the first one above.
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 space-y-2 transition-all ${note.pinned ? 'border-amber-300 bg-amber-50/40' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {note.admin_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-700 text-sm">{note.admin_name || 'Staff'}</span>
                        <span className="text-slate-400 text-xs ml-2">{format(new Date(note.created_at), 'MMM d, h:mm a')}</span>
                        {note.pinned && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-amber-600 font-semibold">
                            <Pin size={10} /> Pinned
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleTogglePin(note)}
                        className={`p-1.5 rounded-lg transition-colors ${note.pinned ? 'text-amber-500 bg-amber-100 hover:bg-amber-200' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                        title={note.pinned ? 'Unpin' : 'Pin to profile'}>
                        {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete note">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showPurchaseModal && (
        <LogPurchaseModal
          kidInitials={kid?.initials || ''}
          onClose={() => setShowPurchaseModal(false)}
          onSave={handleLogPurchase}
        />
      )}
    </div>
  )
}
