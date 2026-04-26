import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks } from 'date-fns'
import { Trophy, Star, TrendingUp, CheckCircle2 } from 'lucide-react'
import { LEVEL_CONFIG, getLevel } from '../../lib/levels'

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      {['🎉','⭐','🌟','🏆','✨','🎊','💫'].map((e, i) => (
        <span
          key={i}
          className="absolute text-2xl animate-bounce"
          style={{
            left: `${10 + i * 13}%`,
            top: `${5 + (i % 3) * 20}%`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${1.5 + (i % 3) * 0.3}s`,
          }}
        >
          {e}
        </span>
      ))}
    </div>
  )
}

function WinnerCard({ kid, total, rank, period }) {
  if (!kid) return null
  const level = getLevel(total)
  const cfg = LEVEL_CONFIG[level]

  return (
    <div className={`relative ${cfg.bgClass} border-2 ${cfg.borderClass} rounded-3xl p-8 text-center overflow-hidden`}>
      <Confetti />
      <div className="relative z-10">
        <div className="text-5xl mb-3">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
        <div className={`text-6xl font-black ${cfg.textClass} mb-2`}>{kid.initials}</div>
        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText} font-bold text-sm mb-3`}>
          {cfg.emoji} {cfg.label}
        </div>
        <div className="text-3xl font-bold text-slate-800">{total} pts</div>
        <div className="text-sm text-slate-500 mt-1">{period} winner</div>
      </div>
    </div>
  )
}

const MONTH_OPTIONS = (() => {
  const opts = []
  const now = new Date()
  for (let i = -11; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    opts.push(format(d, 'MMMM yyyy'))
  }
  return opts.reverse()
})()

function KidOfMonthSetter({ kids }) {
  const [selectedKid, setSelectedKid] = useState('')
  const [monthLabel, setMonthLabel]   = useState(format(new Date(), 'MMMM yyyy'))
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [current, setCurrent]         = useState(null)

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'kid_of_month').single()
      .then(({ data }) => { if (data?.value) { setCurrent(data.value); setMonthLabel(data.value.month_label || format(new Date(), 'MMMM yyyy')) } })
  }, [saved])

  async function handleSave() {
    if (!selectedKid) return
    const kid = kids[selectedKid]
    if (!kid) return
    setSaving(true)
    await supabase.from('settings').upsert({
      key: 'kid_of_month',
      value: { kid_id: selectedKid, kid_initials: kid.initials, month_label: monthLabel },
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    setSaved(v => !v)
    setSelectedKid('')
  }

  async function handleClear() {
    await supabase.from('settings').delete().eq('key', 'kid_of_month')
    setCurrent(null)
  }

  const kidList = Object.values(kids)

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-amber-900 text-base flex items-center gap-2">
            🏆 Kid of the Month
          </div>
          <div className="text-xs text-amber-700 mt-0.5">Staff vote — set manually, not calculated from points</div>
        </div>
        {current && (
          <div className="text-right">
            <div className="text-xs text-amber-600 font-semibold">Currently set:</div>
            <div className="font-black text-amber-900 text-lg">{current.kid_initials}</div>
            <div className="text-xs text-amber-700">{current.month_label}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-amber-800 mb-1.5">Select Youth</label>
          <select
            value={selectedKid}
            onChange={e => setSelectedKid(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="">-- Pick a kid --</option>
            {kidList.map(k => (
              <option key={k.id} value={k.id}>{k.initials}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-amber-800 mb-1.5">Month</label>
          <select
            value={monthLabel}
            onChange={e => setMonthLabel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            {MONTH_OPTIONS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !selectedKid}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : <><CheckCircle2 size={15} /> Set Kid of the Month</>}
        </button>
        {current && (
          <button
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

export default function KidOfWeek() {
  const [tab, setTab]         = useState('week')
  const [weekly, setWeekly]   = useState([])
  const [monthly, setMonthly] = useState([])
  const [improved, setImproved] = useState([])
  const [loading, setLoading] = useState(true)
  const [kids, setKids]       = useState({})

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: kidsData } = await supabase.from('kids').select('id, initials').eq('is_active', true)
      const kidsMap = {}
      kidsData?.forEach(k => { kidsMap[k.id] = k })
      setKids(kidsMap)

      const now     = new Date()
      const wStart  = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const wEnd    = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const lwStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const lwEnd   = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const mStart  = format(startOfMonth(now), 'yyyy-MM-dd')
      const mEnd    = format(endOfMonth(now), 'yyyy-MM-dd')

      const [
        { data: wLogs },
        { data: lwLogs },
        { data: mLogs },
      ] = await Promise.all([
        supabase.from('daily_logs').select('kid_id, total_pts').gte('date', wStart).lte('date', wEnd),
        supabase.from('daily_logs').select('kid_id, total_pts').gte('date', lwStart).lte('date', lwEnd),
        supabase.from('daily_logs').select('kid_id, total_pts').gte('date', mStart).lte('date', mEnd),
      ])

      function toRanked(logs) {
        const totals = {}
        logs?.forEach(l => { totals[l.kid_id] = (totals[l.kid_id] || 0) + (l.total_pts || 0) })
        return Object.entries(totals)
          .map(([kidId, total]) => ({ kid: kidsMap[kidId], total }))
          .filter(e => e.kid)
          .sort((a, b) => b.total - a.total)
      }

      const wRanked  = toRanked(wLogs)
      const lwRanked = toRanked(lwLogs)
      const mRanked  = toRanked(mLogs)

      // Most improved: this week vs last week
      const lwMap = {}
      lwRanked.forEach(e => { lwMap[e.kid.id] = e.total })

      const improvedRanked = wRanked.map(e => ({
        kid: e.kid,
        thisWeek: e.total,
        lastWeek: lwMap[e.kid.id] ?? null,
        delta: e.total - (lwMap[e.kid.id] ?? 0),
      }))
        .filter(e => e.lastWeek !== null) // only kids with last week data
        .sort((a, b) => b.delta - a.delta)

      setWeekly(wRanked)
      setMonthly(mRanked)
      setImproved(improvedRanked)
      setLoading(false)
    }
    load()
  }, [tab]) // reload when tab changes so data stays fresh

  const ranked = tab === 'week' ? weekly : tab === 'month' ? monthly : []
  const period = tab === 'week' ? 'Weekly' : 'Monthly'

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Kid of the Week</h1>
        <p className="text-slate-500 text-sm">Rankings below are based on points only — not an official vote</p>
      </div>

      <KidOfMonthSetter kids={kids} />

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'week',     label: 'This Week' },
          { key: 'month',    label: 'This Month' },
          { key: 'improved', label: '📈 Most Improved' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 flex items-center gap-2">
        <span>📊</span>
        <span><strong>Note:</strong> These rankings are calculated automatically from points logged. They are a reference tool — Kid of the Month is a separate staff decision set above.</span>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : tab === 'improved' ? (
        /* ── MOST IMPROVED TAB ── */
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Compared to last week's total. Only youth who were logged both weeks appear.</p>
          {improved.length === 0 ? (
            <div className="text-slate-400 text-sm bg-white rounded-2xl p-8 text-center border border-slate-100">
              Need at least two weeks of data to show improvements.
            </div>
          ) : (
            <>
              {/* Top improver hero card */}
              {improved[0]?.delta > 0 && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-6 text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <div className="text-5xl font-black text-emerald-700 mb-1">{improved[0].kid.initials}</div>
                  <div className="text-2xl font-bold text-emerald-600">+{improved[0].delta} pts improvement</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {improved[0].lastWeek} → {improved[0].thisWeek} pts
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Full Rankings</h2>
                {improved.map(({ kid, thisWeek, lastWeek, delta }, i) => (
                  <div key={kid.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg w-7 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <span className="font-bold text-slate-800">{kid.initials}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400">{lastWeek} → {thisWeek}</span>
                      <span className={`font-bold flex items-center gap-1 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        <TrendingUp size={14} className={delta < 0 ? 'rotate-180' : ''} />
                        {delta >= 0 ? '+' : ''}{delta} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : ranked.length === 0 ? (
        <div className="text-slate-400 text-sm bg-white rounded-2xl p-8 text-center border border-slate-100">
          No points logged yet for this period.
        </div>
      ) : (
        /* ── WEEK / MONTH TABS ── */
        <>
          {ranked[0] && <WinnerCard kid={ranked[0].kid} total={ranked[0].total} rank={1} period={period} />}

          {ranked.length > 1 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Full Rankings</h2>
              {ranked.map(({ kid, total }, i) => (
                <div key={kid.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span className="font-bold text-slate-800">{kid.initials}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    {total} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
