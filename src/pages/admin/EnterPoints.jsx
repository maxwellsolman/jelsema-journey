import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS,
  calcShiftPoints, calcDailyTotal, calcFreezeUntil,
  MINOR_DEDUCTION, MAJOR_DEDUCTION,
} from '../../lib/points'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { format, addDays, subDays } from 'date-fns'
import { ChevronDown, ChevronUp, Save, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const TODAY = format(new Date(), 'yyyy-MM-dd')

function BehaviorCheck({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors text-left ${checked ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
    >
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
        {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</div>
        {description && (
          <div className={`text-xs mt-0.5 ${checked ? 'text-emerald-500' : 'text-slate-400'}`}>{description}</div>
        )}
      </div>
      <span className={`text-xs font-bold shrink-0 ${checked ? 'text-emerald-500' : 'text-slate-300'}`}>+5</span>
    </button>
  )
}

function ShiftSection({ title, time, behaviors, state, setState, open, setOpen, maxPts }) {
  const earned = calcShiftPoints(state, behaviors)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={() => setOpen(v => !v)}
      >
        <div className="text-left">
          <div className="font-bold text-slate-800">{title}</div>
          <div className="text-xs text-slate-400">{time}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-lg ${earned === maxPts ? 'text-emerald-500' : 'text-slate-700'}`}>
            {earned}/{maxPts}
          </span>
          {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {behaviors.map(b => (
            <BehaviorCheck
              key={b.key}
              label={b.label}
              description={b.description}
              checked={!!state[b.key]}
              onChange={v => setState(s => ({ ...s, [b.key]: v }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function resetForm() {
  return {
    amState: {}, pmState: {}, ovState: {},
    minors: 0, majors: 0, staffNotes: '', posExp: '', existing: null,
  }
}

export default function EnterPoints() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()

  const [kids, setKids]           = useState([])
  const [selectedKid, setSelectedKid] = useState(searchParams.get('kid') || '')
  const [date, setDate]           = useState(searchParams.get('date') || TODAY)

  // Per-day logged status: { kidId: total_pts }
  const [loggedKids, setLoggedKids] = useState({})

  // Form state
  const [amState, setAmState]     = useState({})
  const [pmState, setPmState]     = useState({})
  const [ovState, setOvState]     = useState({})
  const [minors, setMinors]       = useState(0)
  const [majors, setMajors]       = useState(0)
  const [staffNotes, setStaffNotes] = useState('')
  const [posExp, setPosExp]       = useState('')
  const [existing, setExisting]   = useState(null)

  // Accordion
  const [amOpen, setAmOpen] = useState(true)
  const [pmOpen, setPmOpen] = useState(false)
  const [ovOpen, setOvOpen] = useState(false)

  // Save state
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load kids list once
  useEffect(() => {
    supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      .then(({ data }) => setKids(data || []))
  }, [])

  // Load which kids have been logged for the current date
  useEffect(() => {
    if (!date) return
    supabase.from('daily_logs').select('kid_id, total_pts').eq('date', date)
      .then(({ data }) => {
        const map = {}
        data?.forEach(l => { map[l.kid_id] = l.total_pts })
        setLoggedKids(map)
      })
  }, [date])

  // Load existing log when kid+date changes, reset form if none
  useEffect(() => {
    if (!selectedKid || !date) return
    supabase.from('daily_logs').select('*')
      .eq('kid_id', selectedKid).eq('date', date).single()
      .then(({ data }) => {
        if (data) {
          setExisting(data)
          setAmState(AM_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {}))
          setPmState(PM_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {}))
          setOvState(OVERNIGHT_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {}))
          setMinors(data.minor_infractions || 0)
          setMajors(data.major_infractions || 0)
          setStaffNotes(data.staff_notes || '')
          setPosExp(data.positive_experiences || '')
        } else {
          setExisting(null)
          setAmState({}); setPmState({}); setOvState({})
          setMinors(0); setMajors(0); setStaffNotes(''); setPosExp('')
        }
      })
  }, [selectedKid, date])

  const combinedLog = { ...amState, ...pmState, ...ovState, minor_infractions: minors, major_infractions: majors }
  const total = calcDailyTotal(combinedLog)
  const level = getLevel(total)
  const cfg   = LEVEL_CONFIG[level]

  // Next unlogged kid after the current one
  const nextUnlogged = (() => {
    if (!selectedKid || kids.length === 0) return null
    const idx = kids.findIndex(k => k.id === selectedKid)
    for (let i = idx + 1; i < kids.length; i++) {
      if (!(kids[i].id in loggedKids)) return kids[i]
    }
    for (let i = 0; i < idx; i++) {
      if (!(kids[i].id in loggedKids)) return kids[i]
    }
    return null
  })()

  const loggedCount = Object.keys(loggedKids).length

  async function handleSave(andNext = false) {
    if (!selectedKid) return
    setSaving(true)
    setSaveError('')

    const amPts = calcShiftPoints(amState, AM_BEHAVIORS)
    const pmPts = calcShiftPoints(pmState, PM_BEHAVIORS)
    const ovPts = calcShiftPoints(ovState, OVERNIGHT_BEHAVIORS)
    const freezeUntil = calcFreezeUntil(
      { minor_infractions: minors, major_infractions: majors },
      new Date(date + 'T12:00:00').toISOString()
    )

    const payload = {
      kid_id: selectedKid, date,
      ...amState, ...pmState, ...ovState,
      am_pts: amPts, pm_pts: pmPts, ov_pts: ovPts,
      minor_infractions: minors, major_infractions: majors,
      total_pts: total, level_achieved: level,
      privilege_freeze_until: freezeUntil,
      positive_experiences: posExp,
      staff_notes: staffNotes,
      entered_by: profile?.id || null,
    }

    let err
    if (existing) {
      const res = await supabase.from('daily_logs').update(payload).eq('id', existing.id)
      err = res.error
    } else {
      const res = await supabase.from('daily_logs').insert(payload)
      err = res.error
    }

    setSaving(false)

    if (err) {
      setSaveError(err.message)
      return
    }

    // Update logged status panel
    setLoggedKids(prev => ({ ...prev, [selectedKid]: total }))

    if (andNext && nextUnlogged) {
      setSelectedKid(nextUnlogged.id)
      // form will repopulate via useEffect
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      const { data } = await supabase.from('daily_logs').select('*')
        .eq('kid_id', selectedKid).eq('date', date).single()
      setExisting(data || null)
    }
  }

  function handlePrevDay() {
    setDate(format(subDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd'))
  }
  function handleNextDay() {
    const next = format(addDays(new Date(date + 'T12:00:00'), 1), 'yyyy-MM-dd')
    if (next <= TODAY) setDate(next)
  }

  const dateObj   = new Date(date + 'T12:00:00')
  const isToday   = date === TODAY

  const selectedKidObj = kids.find(k => k.id === selectedKid)

  return (
    <div className="flex min-h-full">

      {/* ── Center column ── */}
      <div className="flex-1 min-w-0 max-w-2xl">

        {/* Sticky date navigator */}
        <div className="sticky top-14 md:top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <button
              onClick={handlePrevDay}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <div className="font-bold text-slate-800 text-sm md:text-base">
                {format(dateObj, 'EEEE, MMMM d')}
              </div>
              {isToday
                ? <div className="text-xs text-emerald-500 font-bold">Today</div>
                : <div className="text-xs text-slate-400">{format(dateObj, 'yyyy')}</div>
              }
            </div>
            <button
              onClick={handleNextDay}
              disabled={isToday}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Mobile kid chip strip */}
        <div className="md:hidden flex gap-2 px-4 py-3 overflow-x-auto border-b border-slate-100 bg-slate-50 scrollbar-hide">
          {kids.length === 0 && (
            <span className="text-xs text-slate-400 py-1">No active youth</span>
          )}
          {kids.map(kid => {
            const isLogged   = kid.id in loggedKids
            const isSelected = kid.id === selectedKid
            return (
              <button
                key={kid.id}
                onClick={() => setSelectedKid(kid.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0
                  ${isSelected
                    ? 'bg-emerald-500 text-white shadow'
                    : isLogged
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                {isLogged && !isSelected && <CheckCircle2 size={11} />}
                {kid.initials}
                {isLogged && <span className="opacity-80">{loggedKids[kid.id]}</span>}
              </button>
            )
          })}
        </div>

        {/* Form */}
        <div className="p-5 md:p-6 space-y-5">

          {!selectedKid && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
              <div className="text-3xl mb-3">👆</div>
              <div className="font-bold text-slate-700 mb-1">Select a youth to get started</div>
              <div className="text-sm text-slate-400 md:hidden">Tap a name in the strip above</div>
              <div className="text-sm text-slate-400 hidden md:block">Pick a name from the panel on the right</div>
            </div>
          )}

          {selectedKid && (
            <>
              {/* Who + status */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xl font-black text-slate-800">{selectedKidObj?.initials}</span>
                  {existing && (
                    <span className="ml-2 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                      ✏️ Editing existing entry
                    </span>
                  )}
                </div>
                {loggedCount > 0 && (
                  <span className="text-xs text-slate-500 font-semibold">
                    {loggedCount}/{kids.length} logged today
                  </span>
                )}
              </div>

              {/* Live score */}
              <div className={`${cfg.bgClass} ${cfg.borderClass} border rounded-2xl p-4 flex items-center justify-between`}>
                <div>
                  <div className={`text-4xl font-bold ${cfg.textClass}`}>{total}</div>
                  <div className="text-sm text-slate-500">pts</div>
                </div>
                <div className={`px-4 py-2 rounded-xl ${cfg.badgeBg} ${cfg.badgeText} font-bold text-lg`}>
                  {cfg.emoji} {cfg.label}
                </div>
              </div>

              {/* Shifts */}
              <ShiftSection title="Morning Shift"     time="6:00 AM – 2:00 PM"   behaviors={AM_BEHAVIORS}        state={amState} setState={setAmState} open={amOpen} setOpen={setAmOpen} maxPts={40} />
              <ShiftSection title="Afternoon/Evening" time="2:00 PM – 10:00 PM"  behaviors={PM_BEHAVIORS}        state={pmState} setState={setPmState} open={pmOpen} setOpen={setPmOpen} maxPts={50} />
              <ShiftSection title="Overnight"         time="10:00 PM – 6:00 AM"  behaviors={OVERNIGHT_BEHAVIORS} state={ovState} setState={setOvState} open={ovOpen} setOpen={setOvOpen} maxPts={10} />

              {/* Infractions */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">Infractions</h3>
                  <span className="text-xs text-slate-400">Use − to remove a mistaken entry</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-orange-600 mb-1.5">⚠️ Minor (−{MINOR_DEDUCTION} pts · 24hr freeze)</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setMinors(m => Math.max(0, m - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg font-bold flex items-center justify-center">−</button>
                      <span className="text-2xl font-bold text-slate-800 w-8 text-center">{minors}</span>
                      <button type="button" onClick={() => setMinors(m => m + 1)} className="w-9 h-9 rounded-xl bg-orange-100 hover:bg-orange-200 text-lg font-bold text-orange-600 flex items-center justify-center">+</button>
                    </div>
                    {minors > 0 && <div className="text-xs text-orange-500 mt-1 font-semibold">−{minors * MINOR_DEDUCTION} pts</div>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-red-600 mb-1.5">🚨 Major (−{MAJOR_DEDUCTION} pts · 48hr freeze)</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setMajors(m => Math.max(0, m - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg font-bold flex items-center justify-center">−</button>
                      <span className="text-2xl font-bold text-slate-800 w-8 text-center">{majors}</span>
                      <button type="button" onClick={() => setMajors(m => m + 1)} className="w-9 h-9 rounded-xl bg-red-100 hover:bg-red-200 text-lg font-bold text-red-600 flex items-center justify-center">+</button>
                    </div>
                    {majors > 0 && <div className="text-xs text-red-500 mt-1 font-semibold">−{majors * MAJOR_DEDUCTION} pts</div>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Positive Experiences</label>
                  <textarea rows={2} value={posExp} onChange={e => setPosExp(e.target.value)}
                    placeholder="Note any highlights, wins, or great moments today…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Staff Notes</label>
                  <textarea rows={2} value={staffNotes} onChange={e => setStaffNotes(e.target.value)}
                    placeholder="Infraction details, behavior notes, anything relevant for the record…"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  ⚠️ Save failed: {saveError}
                </div>
              )}

              {/* Save buttons */}
              <div className={`grid gap-3 ${nextUnlogged ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className={`py-4 rounded-2xl font-bold text-white text-sm transition-all shadow flex items-center justify-center gap-2
                    ${saved ? 'bg-emerald-500' : 'bg-slate-700 hover:bg-slate-800'} disabled:opacity-60`}
                >
                  {saved ? <><CheckCircle2 size={18} /> Saved!</> : saving ? 'Saving…' : <><Save size={16} /> {existing ? 'Update' : 'Save'}</>}
                </button>

                {nextUnlogged && (
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="py-4 rounded-2xl font-bold text-white text-sm bg-emerald-500 hover:bg-emerald-600 transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Save size={16} /> Save & Next
                    <span className="opacity-75 text-xs font-semibold ml-0.5">→ {nextUnlogged.initials}</span>
                  </button>
                )}
              </div>

              {/* All done */}
              {!nextUnlogged && loggedCount === kids.length && kids.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 font-semibold text-center">
                  ✅ All {kids.length} youth logged for {isToday ? 'today' : format(dateObj, 'MMM d')}!
                </div>
              )}
            </>
          )}

          {/* Bottom padding so save buttons clear the page */}
          <div className="h-8" />
        </div>
      </div>

      {/* ── Right kid panel (desktop only) ── */}
      <div className="hidden md:flex flex-col w-48 shrink-0 border-l border-slate-100 bg-slate-50/60">
        <div className="sticky top-0 flex flex-col h-screen overflow-y-auto p-4 space-y-1.5">

          {/* Header */}
          <div className="pb-2 border-b border-slate-100 mb-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Youth</div>
            {kids.length > 0 && (
              <div className="text-xs text-slate-500 mt-0.5">
                <span className={`font-bold ${loggedCount === kids.length ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {loggedCount}
                </span>
                <span> / {kids.length} logged</span>
              </div>
            )}
          </div>

          {kids.map(kid => {
            const isLogged   = kid.id in loggedKids
            const isSelected = kid.id === selectedKid
            const pts        = loggedKids[kid.id]
            const kidLevel   = isLogged ? getLevel(pts) : null
            const kidCfg     = kidLevel ? LEVEL_CONFIG[kidLevel] : null

            return (
              <button
                key={kid.id}
                onClick={() => setSelectedKid(kid.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all
                  ${isSelected
                    ? 'bg-slate-800 text-white shadow'
                    : isLogged
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {/* Avatar / check */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isSelected
                    ? 'bg-white/20 text-white'
                    : isLogged
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'}`}>
                  {isLogged
                    ? <CheckCircle2 size={14} />
                    : <span>{kid.initials.slice(0, 2)}</span>}
                </div>

                {/* Name + score */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                    {kid.initials}
                  </div>
                  {isLogged && (
                    <div className={`text-xs font-semibold ${isSelected ? 'text-white/70' : 'text-emerald-600'}`}>
                      {kidCfg?.emoji} {pts} pts
                    </div>
                  )}
                  {!isLogged && (
                    <div className={`text-xs ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                      not logged
                    </div>
                  )}
                </div>
              </button>
            )
          })}

          {/* All done banner in panel */}
          {kids.length > 0 && loggedCount === kids.length && (
            <div className="mt-2 bg-emerald-500 rounded-xl px-3 py-2 text-center">
              <div className="text-white text-xs font-bold">✅ All done!</div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
