import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { MINOR_DEDUCTION, MAJOR_DEDUCTION } from '../../lib/points'

export default function Infractions() {
  const [kids, setKids]         = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [type, setType]         = useState('minor')
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [recentLogs, setRecentLogs] = useState([])

  useEffect(() => {
    supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      .then(({ data }) => setKids(data || []))
  }, [])

  useEffect(() => {
    // Show recent infractions (last 7 days)
    const since = format(new Date(Date.now() - 7 * 86400000), 'yyyy-MM-dd')
    supabase.from('daily_logs').select('*, kids(initials)')
      .gte('date', since)
      .or('minor_infractions.gt.0,major_infractions.gt.0')
      .order('date', { ascending: false })
      .limit(20)
      .then(({ data }) => setRecentLogs(data || []))
  }, [saved])

  async function handleLog() {
    if (!selectedKid) return
    setSaving(true)

    // Get or create today's log
    const { data: existing } = await supabase
      .from('daily_logs').select('*').eq('kid_id', selectedKid).eq('date', date).single()

    const deduction = type === 'minor' ? MINOR_DEDUCTION : MAJOR_DEDUCTION
    const freezeHours = type === 'minor' ? 24 : 48
    const freeze = new Date()
    freeze.setHours(freeze.getHours() + freezeHours)

    if (existing) {
      const newMinors = existing.minor_infractions + (type === 'minor' ? 1 : 0)
      const newMajors = existing.major_infractions + (type === 'major' ? 1 : 0)
      const newTotal = Math.max(0, existing.total_pts - deduction)
      await supabase.from('daily_logs').update({
        minor_infractions: newMinors,
        major_infractions: newMajors,
        total_pts: newTotal,
        privilege_freeze_until: freeze.toISOString(),
      }).eq('id', existing.id)
    } else {
      // No log yet for today — create one with just the infraction
      const base = 100 // They start at max, deduct
      await supabase.from('daily_logs').insert({
        kid_id: selectedKid,
        date,
        minor_infractions: type === 'minor' ? 1 : 0,
        major_infractions: type === 'major' ? 1 : 0,
        total_pts: Math.max(0, base - deduction),
        privilege_freeze_until: freeze.toISOString(),
      })
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Log Infraction</h1>
        <p className="text-slate-500 text-sm">Record behavior infractions and apply automatic deductions</p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setType('minor')}
          className={`p-4 rounded-2xl border-2 text-left transition-all ${type === 'minor' ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <AlertTriangle className={type === 'minor' ? 'text-orange-500' : 'text-slate-300'} size={24} />
          <div className={`font-bold mt-2 ${type === 'minor' ? 'text-orange-700' : 'text-slate-600'}`}>Minor</div>
          <div className="text-xs text-slate-400 mt-0.5">−{MINOR_DEDUCTION} pts · 24hr freeze</div>
        </button>
        <button
          onClick={() => setType('major')}
          className={`p-4 rounded-2xl border-2 text-left transition-all ${type === 'major' ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
        >
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

      {/* Recent infractions */}
      {recentLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent (7 days)</h2>
          <div className="space-y-2">
            {recentLogs.map(log => (
              <div key={log.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800">{log.kids?.initials}</span>
                  <span className="text-slate-400 ml-2">{format(new Date(log.date), 'MMM d')}</span>
                </div>
                <div className="flex gap-2">
                  {log.minor_infractions > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                      {log.minor_infractions}× minor
                    </span>
                  )}
                  {log.major_infractions > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      {log.major_infractions}× major
                    </span>
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
