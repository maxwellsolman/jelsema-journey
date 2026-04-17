import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ShoppingBag, CheckCircle2, AlertCircle } from 'lucide-react'
import { getLevel, LEVELS } from '../../lib/levels'

export default function ICanTeen() {
  const [kids, setKids]           = useState([])
  const [selectedKid, setSelectedKid] = useState('')
  const [points, setPoints]       = useState('')
  const [notes, setNotes]         = useState('')
  const [history, setHistory]     = useState([])
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState('')

  // Per-kid eligibility data: { [kidId]: { weekPts, weekRedeemed, balance, isRoleModel } }
  const [kidData, setKidData]     = useState({})

  const today  = format(new Date(), 'yyyy-MM-dd')
  const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const isSunday = new Date().getDay() === 0

  async function load() {
    const { data: kidsData } = await supabase
      .from('kids')
      .select('id, initials')
      .eq('is_active', true)
      .order('initials')

    setKids(kidsData || [])

    if (!kidsData?.length) return

    // Today's logs for role model check
    const { data: todayLogs } = await supabase
      .from('daily_logs')
      .select('kid_id, total_pts')
      .eq('date', today)

    // This week's daily points per kid
    const { data: weekLogs } = await supabase
      .from('daily_logs')
      .select('kid_id, total_pts')
      .gte('date', wStart)
      .lte('date', wEnd)

    // This week's canteen redemptions per kid
    const { data: redemptions } = await supabase
      .from('canteen_redemptions')
      .select('kid_id, points_redeemed, redeemed_at')
      .gte('redeemed_at', wStart)

    // Build per-kid data map
    const todayMap = {}
    todayLogs?.forEach(l => { todayMap[l.kid_id] = l.total_pts })

    const weekPtsMap = {}
    weekLogs?.forEach(l => {
      weekPtsMap[l.kid_id] = (weekPtsMap[l.kid_id] || 0) + (l.total_pts || 0)
    })

    const redeemedMap = {}
    redemptions?.forEach(r => {
      redeemedMap[r.kid_id] = (redeemedMap[r.kid_id] || 0) + (r.points_redeemed || 0)
    })

    const dataMap = {}
    kidsData.forEach(k => {
      const todayPts = todayMap[k.id] ?? null
      const weekPts  = weekPtsMap[k.id] || 0
      const weekRedeemed = redeemedMap[k.id] || 0
      const balance  = Math.max(0, weekPts - weekRedeemed)
      const isRoleModel = todayPts !== null && getLevel(todayPts) === LEVELS.ROLEMODEL
      dataMap[k.id]  = { todayPts, weekPts, weekRedeemed, balance, isRoleModel }
    })

    setKidData(dataMap)

    // Redemption history
    const { data: hist } = await supabase
      .from('canteen_redemptions')
      .select('*, kids(initials)')
      .order('redeemed_at', { ascending: false })
      .limit(30)
    setHistory(hist || [])
  }

  useEffect(() => { load() }, [saved])

  const selected = kidData[selectedKid]
  const redeemAmount = parseInt(points) || 0
  const isRoleModel = selected?.isRoleModel ?? false
  const hasBalance  = selected ? selected.balance >= redeemAmount : false
  const canRedeem   = selectedKid && redeemAmount > 0 && isRoleModel && hasBalance

  async function handleRedeem() {
    if (!canRedeem) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('canteen_redemptions').insert({
      kid_id: selectedKid,
      redeemed_at: new Date().toISOString(),
      points_redeemed: redeemAmount,
      notes,
    })
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setSaved(true)
    setPoints(''); setNotes('')
    setTimeout(() => setSaved(false), 3000)
  }

  const roleModels = kids.filter(k => kidData[k.id]?.isRoleModel)

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <ShoppingBag className="text-emerald-500" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Canteen Store</h1>
          <p className="text-slate-500 text-sm">Role Model level only · Points come out of weekly balance</p>
        </div>
      </div>

      {!isSunday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          ⚠️ The Canteen Store is only open on Sundays. You can still log redemptions, but kids won't see the store until Sunday.
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

      {/* Weekly balances overview */}
      {kids.length > 0 && Object.keys(kidData).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Weekly Point Balances</div>
          <div className="divide-y divide-slate-50">
            {kids.map(k => {
              const d = kidData[k.id]
              if (!d) return null
              return (
                <div key={k.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${d.isRoleModel ? 'text-emerald-700' : 'text-slate-600'}`}>{k.initials}</span>
                    {d.isRoleModel && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Role Model</span>}
                    {d.todayPts === null && <span className="text-xs text-slate-400 italic">not logged today</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-400">{d.weekPts} earned</span>
                    {d.weekRedeemed > 0 && <span className="text-red-400">−{d.weekRedeemed} spent</span>}
                    <span className={`font-bold ${d.balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{d.balance} bal</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Log redemption */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h3 className="font-bold text-slate-700">Log Redemption</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Youth</label>
            <select value={selectedKid} onChange={e => { setSelectedKid(e.target.value); setPoints('') }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">Select…</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.initials}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Points to Redeem</label>
            <input type="number" value={points} onChange={e => setPoints(e.target.value)} min="1"
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>

        {/* Eligibility feedback */}
        {selectedKid && selected && (
          <div className="space-y-2">
            {!isRoleModel && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  {selected.todayPts === null
                    ? 'No points logged for today — must be Role Model level to redeem.'
                    : `Not eligible — ${selected.todayPts} pts today is below Role Model level (86+).`}
                </span>
              </div>
            )}
            {isRoleModel && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm">
                <span className="text-emerald-700 font-semibold">🏆 Eligible — Role Model today</span>
                <span className="text-emerald-600 font-bold">{selected.balance} pts available</span>
              </div>
            )}
            {isRoleModel && redeemAmount > 0 && !hasBalance && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 text-sm text-orange-700">
                <AlertCircle size={16} className="shrink-0" />
                Insufficient balance — only {selected.balance} pts available this week.
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did they get?"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700">⚠️ {saveError}</div>
        )}

        <button onClick={handleRedeem} disabled={saving || !canRedeem}
          className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2
            ${saved ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'} disabled:opacity-50`}>
          {saved ? <><CheckCircle2 size={18} /> Logged!</> : saving ? 'Saving…' : 'Log Redemption'}
        </button>
        {!canRedeem && selectedKid && redeemAmount > 0 && (
          <p className="text-xs text-center text-slate-400">
            {!isRoleModel ? 'Youth must be Role Model level today to redeem.' : !hasBalance ? 'Insufficient weekly balance.' : ''}
          </p>
        )}
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
                  <span className="text-emerald-600 font-bold">−{r.points_redeemed} pts</span>
                  <span className="text-slate-400 text-xs">{format(new Date(r.redeemed_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
