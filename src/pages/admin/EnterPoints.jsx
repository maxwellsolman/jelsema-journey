import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AM_BEHAVIORS, PM_BEHAVIORS, OVERNIGHT_BEHAVIORS, calcShiftPoints, calcDailyTotal, calcFreezeUntil, MINOR_DEDUCTION, MAJOR_DEDUCTION } from '../../lib/points'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Save, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function BehaviorCheck({ label, checked, onChange }) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${checked ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
        {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
      <span className={`text-sm font-medium flex-1 ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-xs font-bold ${checked ? 'text-emerald-500' : 'text-slate-300'}`}>+5</span>
    </label>
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
              checked={!!state[b.key]}
              onChange={v => setState(s => ({ ...s, [b.key]: v }))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function EnterPoints() {
  const { profile } = useAuth()
  const [kids, setKids] = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amOpen, setAmOpen]   = useState(true)
  const [pmOpen, setPmOpen]   = useState(false)
  const [ovOpen, setOvOpen]   = useState(false)

  const [amState, setAmState] = useState({})
  const [pmState, setPmState] = useState({})
  const [ovState, setOvState] = useState({})
  const [minors, setMinors]   = useState(0)
  const [majors, setMajors]   = useState(0)
  const [notes, setNotes]     = useState('')
  const [posExp, setPosExp]   = useState('')

  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    supabase.from('kids').select('id, initials, is_active').eq('is_active', true).order('initials')
      .then(({ data }) => setKids(data || []))
  }, [])

  // Load existing log when kid+date changes
  useEffect(() => {
    if (!selectedKid || !date) return
    supabase
      .from('daily_logs')
      .select('*')
      .eq('kid_id', selectedKid)
      .eq('date', date)
      .single()
      .then(({ data }) => {
        if (data) {
          setExisting(data)
          // Pre-populate checkboxes
          const amKeys = AM_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {})
          const pmKeys = PM_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {})
          const ovKeys = OVERNIGHT_BEHAVIORS.reduce((o, b) => ({ ...o, [b.key]: !!data[b.key] }), {})
          setAmState(amKeys); setPmState(pmKeys); setOvState(ovKeys)
          setMinors(data.minor_infractions || 0)
          setMajors(data.major_infractions || 0)
          setNotes(data.staff_notes || '')
          setPosExp(data.positive_experiences || '')
        } else {
          setExisting(null)
          setAmState({}); setPmState({}); setOvState({})
          setMinors(0); setMajors(0); setNotes(''); setPosExp('')
        }
      })
  }, [selectedKid, date])

  const combinedLog = { ...amState, ...pmState, ...ovState, minor_infractions: minors, major_infractions: majors }
  const total = calcDailyTotal(combinedLog)
  const level = getLevel(total)
  const cfg = LEVEL_CONFIG[level]

  async function handleSave() {
    if (!selectedKid) return
    setSaving(true)

    const amPts = calcShiftPoints(amState, AM_BEHAVIORS)
    const pmPts = calcShiftPoints(pmState, PM_BEHAVIORS)
    const ovPts = calcShiftPoints(ovState, OVERNIGHT_BEHAVIORS)
    const freezeUntil = calcFreezeUntil({ minor_infractions: minors, major_infractions: majors }, new Date().toISOString())

    const payload = {
      kid_id: selectedKid,
      date,
      ...amState,
      ...pmState,
      ...ovState,
      am_pts: amPts,
      pm_pts: pmPts,
      ov_pts: ovPts,
      minor_infractions: minors,
      major_infractions: majors,
      total_pts: total,
      level_achieved: level,
      privilege_freeze_until: freezeUntil,
      positive_experiences: posExp,
      staff_notes: notes,
      entered_by: profile?.id || null,
    }

    if (existing) {
      await supabase.from('daily_logs').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('daily_logs').insert(payload)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Enter Points</h1>
        <p className="text-slate-500 text-sm">Log daily behavior points per shift</p>
      </div>

      {/* Kid + Date selector */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Youth</label>
          <select
            value={selectedKid}
            onChange={e => setSelectedKid(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Select…</option>
            {kids.map(k => <option key={k.id} value={k.id}>{k.initials}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {selectedKid && (
        <>
          {/* Live score */}
          <div className={`${cfg.bgClass} ${cfg.borderClass} border rounded-2xl p-4 flex items-center justify-between`}>
            <div>
              <div className={`text-4xl font-bold ${cfg.textClass}`}>{total}</div>
              <div className="text-sm text-slate-500">points today</div>
            </div>
            <div className={`px-4 py-2 rounded-xl ${cfg.badgeBg} ${cfg.badgeText} font-bold text-lg`}>
              {cfg.emoji} {cfg.label}
            </div>
          </div>

          {/* Shift sections */}
          <ShiftSection title="Morning Shift" time="6:00 AM – 2:00 PM" behaviors={AM_BEHAVIORS} state={amState} setState={setAmState} open={amOpen} setOpen={setAmOpen} maxPts={40} />
          <ShiftSection title="Afternoon/Evening" time="2:00 PM – 10:00 PM" behaviors={PM_BEHAVIORS} state={pmState} setState={setPmState} open={pmOpen} setOpen={setPmOpen} maxPts={50} />
          <ShiftSection title="Overnight" time="10:00 PM – 6:00 AM" behaviors={OVERNIGHT_BEHAVIORS} state={ovState} setState={setOvState} open={ovOpen} setOpen={setOvOpen} maxPts={10} />

          {/* Infractions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <h3 className="font-bold text-slate-700">Infractions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-orange-600 mb-1.5">Minor ({MINOR_DEDUCTION} pts each)</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMinors(m => Math.max(0, m - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg font-bold flex items-center justify-center">−</button>
                  <span className="text-2xl font-bold text-slate-800 w-8 text-center">{minors}</span>
                  <button type="button" onClick={() => setMinors(m => m + 1)} className="w-9 h-9 rounded-xl bg-orange-100 hover:bg-orange-200 text-lg font-bold text-orange-600 flex items-center justify-center">+</button>
                </div>
                {minors > 0 && <div className="text-xs text-orange-500 mt-1">−{minors * MINOR_DEDUCTION} pts · 24hr freeze</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-red-600 mb-1.5">Major ({MAJOR_DEDUCTION} pts each)</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMajors(m => Math.max(0, m - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-lg font-bold flex items-center justify-center">−</button>
                  <span className="text-2xl font-bold text-slate-800 w-8 text-center">{majors}</span>
                  <button type="button" onClick={() => setMajors(m => m + 1)} className="w-9 h-9 rounded-xl bg-red-100 hover:bg-red-200 text-lg font-bold text-red-600 flex items-center justify-center">+</button>
                </div>
                {majors > 0 && <div className="text-xs text-red-500 mt-1">−{majors * MAJOR_DEDUCTION} pts · 48hr freeze</div>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Positive Experiences</label>
              <textarea
                rows={2}
                value={posExp}
                onChange={e => setPosExp(e.target.value)}
                placeholder="Note any highlights, wins, or great moments today…"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Staff Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes for the record…"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all shadow-lg flex items-center justify-center gap-2
              ${saved ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-60`}
          >
            {saved
              ? <><CheckCircle2 size={20} /> Saved!</>
              : saving
                ? 'Saving…'
                : <><Save size={18} /> Save Points</>
            }
          </button>
          {existing && <p className="text-xs text-center text-slate-400">Editing existing entry for this date</p>}
        </>
      )}
    </div>
  )
}
