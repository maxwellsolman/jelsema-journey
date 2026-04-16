import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { isPrivilegeFrozen, freezeHoursRemaining } from '../../lib/points'
import LevelBadge from '../../components/ui/LevelBadge'
import TrendChart from '../../components/charts/TrendChart'
import {
  ArrowLeft, ShieldAlert, Star, DollarSign, TrendingUp,
  Pin, PinOff, Send, Trash2, ClipboardList
} from 'lucide-react'

export default function KidDetail() {
  const { kidId }  = useParams()
  const navigate   = useNavigate()
  const { profile } = useAuth()

  const [kid, setKid]               = useState(null)
  const [todayLog, setTodayLog]     = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [weekEarnings, setWeekEarnings] = useState([])
  const [notes, setNotes]           = useState([])
  const [newNote, setNewNote]       = useState('')
  const [postingNote, setPostingNote] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('overview') // overview | history | notes

  const today   = format(new Date(), 'yyyy-MM-dd')
  const since30 = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const wStart  = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd    = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    load()
  }, [kidId])

  async function load() {
    const [{ data: kidData }, { data: logToday }, { data: logs }, { data: earns }, { data: notesData }] = await Promise.all([
      supabase.from('kids').select('*').eq('id', kidId).single(),
      supabase.from('daily_logs').select('*').eq('kid_id', kidId).eq('date', today).single(),
      supabase.from('daily_logs').select('*').eq('kid_id', kidId).gte('date', since30).order('date', { ascending: false }),
      supabase.from('daily_earnings').select('*').eq('kid_id', kidId).gte('date', wStart).lte('date', wEnd),
      supabase.from('kid_notes').select('*').eq('kid_id', kidId).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setKid(kidData)
    setTodayLog(logToday || null)
    setRecentLogs(logs || [])
    setWeekEarnings(earns || [])
    setNotes(notesData || [])
    setLoading(false)
  }

  async function handlePostNote() {
    if (!newNote.trim()) return
    setPostingNote(true)
    await supabase.from('kid_notes').insert({
      kid_id:     kidId,
      admin_name: profile?.name || 'Staff',
      body:       newNote.trim(),
      pinned:     false,
    })
    setNewNote('')
    setPostingNote(false)
    // Reload notes
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
  const weekTotal = weekEarnings.reduce((s, e) => s + (e.total_earned || 0), 0)
  const weekPts   = recentLogs.filter(l => l.date >= wStart && l.date <= wEnd).reduce((s, l) => s + l.total_pts, 0)
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
                {kid.intake_date && <span>Intake: {format(new Date(kid.intake_date), 'MMM d, yyyy')}</span>}
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

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: <Star size={14} />, value: weekPts,          label: 'Wk Pts',  color: 'text-blue-600',   bg: 'bg-blue-50' },
          { icon: <DollarSign size={14} />, value: `$${weekTotal.toFixed(0)}`, label: 'Earned', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: <TrendingUp size={14} />, value: avg30 ?? '—', label: '30d Avg', color: 'text-amber-600',  bg: 'bg-amber-50' },
          { icon: <span className="text-xs">🏆</span>, value: rmDays, label: 'RM Days', color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-3 text-center border border-white`}>
            <div className={`flex justify-center ${s.color} mb-0.5`}>{s.icon}</div>
            <div className={`text-xl font-black ${s.color} leading-tight`}>{s.value}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {[
          { key: 'overview', label: 'Overview' },
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
              <h3 className="font-bold text-slate-600 text-xs uppercase tracking-wide">Today's Shifts</h3>
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
            <button onClick={() => navigate('/admin/points')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 text-sm font-bold transition-colors shadow flex items-center justify-center gap-2">
              <ClipboardList size={16} /> Enter Points
            </button>
            <button onClick={() => navigate('/admin/reports')}
              className="bg-slate-700 hover:bg-slate-800 text-white rounded-2xl py-3 text-sm font-bold transition-colors shadow flex items-center justify-center gap-2">
              <TrendingUp size={16} /> Full Reports
            </button>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {recentLogs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No logs in the last 30 days.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentLogs.map(l => {
                const lv   = l.level_achieved || getLevel(l.total_pts)
                const lcfg = LEVEL_CONFIG[lv]
                return (
                  <div key={l.id} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl ${lcfg.badgeBg} flex items-center justify-center text-sm`}>{lcfg.emoji}</div>
                        <span className="font-semibold text-slate-700 text-sm">{format(new Date(l.date), 'EEE, MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(l.minor_infractions > 0 || l.major_infractions > 0) && (
                          <span className="text-xs text-red-500 font-semibold">
                            {l.minor_infractions > 0 && `⚠️${l.minor_infractions} `}
                            {l.major_infractions > 0 && `🚨${l.major_infractions}`}
                          </span>
                        )}
                        <span className={`text-xl font-black ${lcfg.textClass}`}>{l.total_pts}</span>
                        <LevelBadge level={lv} size="sm" />
                      </div>
                    </div>
                    {l.positive_experiences && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1">✨ {l.positive_experiences}</div>
                    )}
                    {l.staff_notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1">📝 {l.staff_notes}</div>
                    )}
                  </div>
                )
              })}
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
    </div>
  )
}
