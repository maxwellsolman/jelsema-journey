import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { AlertTriangle, ShieldAlert, CheckCircle2, Undo2 } from 'lucide-react'
import { MINOR_DEDUCTION, MAJOR_DEDUCTION } from '../../lib/points'

export default function Infractions() {
  const [kids, setKids]             = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [type, setType]             = useState('minor')
  const [date, setDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [recentLogs, setRecentLogs] = useState([])
  const [removing, setRemoving]     = useState(null) // log id being removed

  useEffect(() => {
    supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      .then(({ data }) => setKids(data || []))
  }, [])

  useEffect(() => {
    loadRecent()
  }, [saved, removing])

  async function loadRecent() {
    const since = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
    const { data } = await supabase.from('daily_logs').select('*, kids(initials)')
      .gte('date', since)
      .or('minor_infractions.gt.0,major_infractions.gt.0')
      .order('date', { ascending: false })
      .limit(20)
    setRecentLogs(data || [])
  }

  async function handleLog() {
    if (!selectedKid) return
    setSaving(true)

    const { data: existing } = await supabase
      .from('daily_logs').select('*').eq('kid_id', selectedKid).eq('date', date).single()

    const deduction   = type === 'minor' ? MINOR_DEDUCTION : MAJOR_DEDUCTION
    const freezeHours = type === 'minor' ? 24 : 48
    const freeze = new Date()
    freeze.setHours(freeze.getHours() + freezeHours)

    if (existing) {
      const newMinors = existing.minor_infractions + (type === 'minor' ? 1 : 0)
      const newMajors = existing.major_infractions + (type === 'major' ? 1 : 0)
      const newTotal  = Math.max(0, existing.total_pts - deduction)
      await supabase.from('daily_logs').update({
        minor_infractions:    newMinors,
        major_infractions:    newMajors,
        total_pts:            newTotal,
        privilege_freeze_until: freeze.toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('daily_logs').insert({
        kid_id: selectedKid, date,
        minor_infractions:    type === 'minor' ? 1 : 0,
        major_infractions:    type === 'major' ? 1 : 0,
        total_pts:            Math.max(0, 100 - deduction),
        privilege_freeze_until: freeze.toISOString(),
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // Remove one infraction of the given type from a log
  async function handleRemove(log, removeType) {
    setRemoving(log.id + removeType)

    const isMinor     = removeType === 'minor'
    const deduction   = isMinor ? MINOR_DEDUCTION : MAJOR_DEDUCTION
    const newMinors   = Math.max(0, log.minor_infractions - (isMinor ? 1 : 0))
    const newMajors   = Math.max(0, log.major_infractions - (!isMinor ? 1 : 0))
    const newTotal    = Math.min(100, log.total_pts + deduction)

    // Recalculate freeze: if no infractions left, clear it; otherwise keep it
    const noInfractions = newMinors === 0 && newMajors === 0
    const newFreeze = noInfractions ? null : log.privilege_freeze_until

    await supabase.from('daily_logs').update({
      minor_infractions:    newMinors,
      major_infractions:    newMajors,
      total_pts:            newTotal,
      privilege_freeze_until: newFreeze,
    }).eq('id', log.id)

    setRemoving(null)
    loadRecent()
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Infractions</h1>
        <p className="text-slate-500 text-sm">Log or remove behavior infractions</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setType('minor')}
          className={`p-4 rounded-2xl border-2 text-left transition-all ${type === 'minor' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
          <AlertTriangle className={type === 'minor' ? 'text-orange-500' : 'text-slate-300'} size={24} />
          <div className={`font-bold mt-2 ${type === 'minor' ? 'text-orange-700' : 'text-slate-600'}`}>Minor</div>
          <div className="text-xs text-slate-400 mt-0.5">−{MINOR_DEDUCTION} pts · 24hr freeze</div>
        </button>
        <button onClick={() => setType('major')}
          className={`p-4 rounded-2xl border-2 text-left transition-all ${type === 'major' ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
          <ShieldAlert className={type === 'major' ? 'text-red-500' : 'text-slate-300'} size={24} />
          <div className={`font-bold mt-2 ${type === 'major' ? 'text-red-700' : 'text-slate-600'}`}>Major</div>
          <div className="text-xs text-slate-400 mt-0.5">−{MAJOR_DEDUCTION} pts · 48hr freeze</div>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Youth</label>
          <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400">
            <option value="">Select…</option>
            {kids.map(k => <option key={k.id} value={k.id}>{k.initials}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
      </div>

      <button onClick={handleLog} disabled={saving || !selectedKid}
        className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2
          ${saved ? 'bg-emerald-500' : type === 'major' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:opacity-60`}>
        {saved ? <><CheckCircle2 size={20} /> Logged!</> : saving ? 'Saving…' : `Log ${type === 'major' ? 'Major' : 'Minor'} Infraction`}
      </button>

      {/* Recent infractions with remove buttons */}
      {recentLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent (7 days) — tap to remove</h2>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{log.kids?.initials}</span>
                    <span className="text-slate-400 text-sm ml-2">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                  </div>
                  <span className="text-xs text-slate-400">{log.total_pts} pts after deductions</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {log.minor_infractions > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5">
                      <span className="text-orange-700 text-xs font-bold">{log.minor_infractions}× Minor</span>
                      <button
                        onClick={() => handleRemove(log, 'minor')}
                        disabled={removing === log.id + 'minor'}
                        className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-red-600 hover:bg-orange-100 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40"
                        title="Remove one minor infraction">
                        <Undo2 size={12} />
                        {removing === log.id + 'minor' ? '…' : 'Remove one'}
                      </button>
                    </div>
                  )}
                  {log.major_infractions > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
                      <span className="text-red-700 text-xs font-bold">{log.major_infractions}× Major</span>
                      <button
                        onClick={() => handleRemove(log, 'major')}
                        disabled={removing === log.id + 'major'}
                        className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-100 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40"
                        title="Remove one major infraction">
                        <Undo2 size={12} />
                        {removing === log.id + 'major' ? '…' : 'Remove one'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
