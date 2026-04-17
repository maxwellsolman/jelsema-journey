import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { CheckCircle2, Save } from 'lucide-react'

const TASKS = [
  { key: 'reading_log', label: 'Reading Log Completed', emoji: '📚', value: 1 },
  { key: 'planner',     label: 'Planner / Journal Completed', emoji: '📓', value: 1 },
  { key: 'mindfulness', label: '2 Minutes Mindfulness', emoji: '🧘', value: 1 },
]

function TaskCheck({ task, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border text-left ${checked ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200 hover:bg-slate-100'}`}
    >
      <span className="text-2xl">{task.emoji}</span>
      <div className="flex-1">
        <div className={`font-semibold text-sm ${checked ? 'text-emerald-700' : 'text-slate-700'}`}>{task.label}</div>
        <div className="text-xs text-slate-400">+$1.00</div>
      </div>
      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
        {checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </div>
    </button>
  )
}

export default function EnterEarnings() {
  const [kids, setKids]       = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [checks, setChecks]   = useState({ reading_log: false, planner: false, mindfulness: false })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      .then(({ data }) => setKids(data || []))
  }, [])

  useEffect(() => {
    if (!selectedKid || !date) return
    supabase.from('daily_earnings').select('*').eq('kid_id', selectedKid).eq('date', date).single()
      .then(({ data }) => {
        if (data) {
          setExisting(data)
          setChecks({ reading_log: !!data.reading_log, planner: !!data.planner, mindfulness: !!data.mindfulness })
        } else {
          setExisting(null)
          setChecks({ reading_log: false, planner: false, mindfulness: false })
        }
      })
  }, [selectedKid, date])

  const total = TASKS.reduce((s, t) => s + (checks[t.key] ? t.value : 0), 0)

  async function handleSave() {
    if (!selectedKid) return
    setSaving(true)
    setSaveError('')
    const payload = { kid_id: selectedKid, date, ...checks, total_earned: total }
    let err
    if (existing) {
      const res = await supabase.from('daily_earnings').update(payload).eq('id', existing.id)
      err = res.error
    } else {
      const res = await supabase.from('daily_earnings').insert(payload)
      err = res.error
    }
    setSaving(false)
    if (err) {
      setSaveError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      const { data } = await supabase.from('daily_earnings').select('*').eq('kid_id', selectedKid).eq('date', date).single()
      setExisting(data || null)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Enter Earnings</h1>
        <p className="text-slate-500 text-sm">Log daily allowance tasks (up to $3/day)</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Youth</label>
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">Select…</option>
            {kids.map(k => <option key={k.id} value={k.id}>{k.initials}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
      </div>

      {selectedKid && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-emerald-700">${total.toFixed(2)}</div>
              <div className="text-sm text-slate-500">earned today</div>
            </div>
            <div className="text-emerald-500 text-sm font-semibold">max $3.00/day</div>
          </div>

          <div className="space-y-2">
            {TASKS.map(task => (
              <TaskCheck key={task.key} task={task} checked={checks[task.key]}
                onChange={v => setChecks(c => ({ ...c, [task.key]: v }))} />
            ))}
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              ⚠️ Save failed: {saveError}
            </div>
          )}

          <button onClick={handleSave} disabled={saving}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all shadow-lg flex items-center justify-center gap-2
              ${saved ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-60`}>
            {saved ? <><CheckCircle2 size={20} /> Saved!</> : saving ? 'Saving…' : <><Save size={18} /> {existing ? 'Update Earnings' : 'Save Earnings'}</>}
          </button>
          {existing && <p className="text-xs text-center text-slate-400">Editing existing entry for this date</p>}
        </>
      )}
    </div>
  )
}
