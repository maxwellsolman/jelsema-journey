import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ShoppingBag, CheckCircle2 } from 'lucide-react'
import { getLevel, LEVELS } from '../../lib/levels'

export default function ICanTeen() {
  const [kids, setKids]         = useState([])
  const [roleModels, setRoleModels] = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [points, setPoints]     = useState('')
  const [notes, setNotes]       = useState('')
  const [history, setHistory]   = useState([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    async function load() {
      const { data: kidsData } = await supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      setKids(kidsData || [])

      // Get today's Role Model kids
      const { data: logs } = await supabase.from('daily_logs').select('kid_id, total_pts')
        .eq('date', today)
      const roleMdl = (logs || []).filter(l => getLevel(l.total_pts) === LEVELS.ROLEMODEL)
        .map(l => (kidsData || []).find(k => k.id === l.kid_id)).filter(Boolean)
      setRoleModels(roleMdl)

      // Redemption history
      const { data: hist } = await supabase.from('canteen_redemptions')
        .select('*, kids(initials)').order('redeemed_at', { ascending: false }).limit(20)
      setHistory(hist || [])
    }
    load()
  }, [saved])

  async function handleRedeem() {
    if (!selectedKid || !points) return
    setSaving(true)
    await supabase.from('canteen_redemptions').insert({
      kid_id: selectedKid,
      redeemed_at: new Date().toISOString(),
      points_redeemed: parseInt(points),
      notes,
    })
    setSaving(false)
    setSaved(true)
    setPoints(''); setNotes('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <ShoppingBag className="text-emerald-500" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">iCanTeen Store</h1>
          <p className="text-slate-500 text-sm">Available Sundays · Role Model level only</p>
        </div>
      </div>

      {!isSunday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          ⚠️ The iCanTeen Store is only open on Sundays. You can still log redemptions, but kids won't see the store until Sunday.
        </div>
      )}

      {roleModels.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm">
          <div className="font-semibold text-emerald-700 mb-1">🏆 Role Models eligible today:</div>
          <div className="flex flex-wrap gap-2">
            {roleModels.map(k => (
              <span key={k.id} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-semibold">{k.initials}</span>
            ))}
          </div>
        </div>
      )}

      {/* Log redemption */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h3 className="font-bold text-slate-700">Log Redemption</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Youth</label>
            <select value={selectedKid} onChange={e => setSelectedKid(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">Select…</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.initials}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Points Redeemed</label>
            <input type="number" value={points} onChange={e => setPoints(e.target.value)} min="0" placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did they get?"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <button onClick={handleRedeem} disabled={saving || !selectedKid || !points}
          className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2
            ${saved ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-60`}>
          {saved ? <><CheckCircle2 size={18} /> Logged!</> : saving ? 'Saving…' : 'Log Redemption'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Redemptions</h2>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold text-slate-800">{r.kids?.initials}</span>
                  {r.notes && <span className="text-slate-400 ml-2">{r.notes}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-bold">{r.points_redeemed} pts</span>
                  <span className="text-slate-400 text-xs">{format(new Date(r.redeemed_at), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
