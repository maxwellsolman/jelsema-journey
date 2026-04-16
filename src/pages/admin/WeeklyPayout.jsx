import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { DollarSign, CheckCircle2 } from 'lucide-react'

function getWeekDates(refDate) {
  const start = startOfWeek(refDate, { weekStartsOn: 1 }) // Monday
  const end   = endOfWeek(refDate, { weekStartsOn: 1 })
  return { start, end, days: eachDayOfInterval({ start, end }) }
}

export default function WeeklyPayout() {
  const [refDate, setRefDate] = useState(new Date())
  const [kids, setKids]       = useState([])
  const [earnings, setEarnings] = useState([])
  const [paid, setPaid]       = useState({}) // kidId → bool
  const [loading, setLoading] = useState(true)

  const { start, end, days } = getWeekDates(refDate)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: kidsData } = await supabase.from('kids').select('id, initials').eq('is_active', true).order('initials')
      const { data: earningsData } = await supabase
        .from('daily_earnings').select('*')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
      setKids(kidsData || [])
      setEarnings(earningsData || [])
      setLoading(false)
    }
    load()
  }, [start.toISOString(), end.toISOString()])

  // Build map: kidId → { date → total_earned }
  const earningsMap = {}
  earnings.forEach(e => {
    if (!earningsMap[e.kid_id]) earningsMap[e.kid_id] = {}
    earningsMap[e.kid_id][e.date] = e.total_earned
  })

  const weekTotal = (kidId) =>
    days.reduce((s, d) => s + (earningsMap[kidId]?.[format(d, 'yyyy-MM-dd')] || 0), 0)

  const grandTotal = kids.reduce((s, k) => s + weekTotal(k.id), 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Weekly Payout</h1>
          <p className="text-slate-500 text-sm">
            Week of {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRefDate(d => new Date(d.getTime() - 7 * 86400000))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">← Prev</button>
          <button onClick={() => setRefDate(new Date())}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">This Week</button>
          <button onClick={() => setRefDate(d => new Date(d.getTime() + 7 * 86400000))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Next →</button>
        </div>
      </div>

      {/* Grand total */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
        <DollarSign className="text-emerald-500" size={24} />
        <div>
          <div className="text-2xl font-bold text-emerald-700">${grandTotal.toFixed(2)}</div>
          <div className="text-sm text-slate-500">total to pay out this week</div>
        </div>
      </div>

      {/* Payout table */}
      {loading ? (
        <div className="text-slate-400 text-sm">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-semibold text-slate-500">Youth</th>
                  {days.map(d => (
                    <th key={d.toISOString()} className="text-center px-2 py-3 font-semibold text-slate-400 text-xs">
                      {format(d, 'EEE')}
                    </th>
                  ))}
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-500">Paid</th>
                </tr>
              </thead>
              <tbody>
                {kids.map((kid, i) => {
                  const total = weekTotal(kid.id)
                  return (
                    <tr key={kid.id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-5 py-3 font-bold text-slate-800">{kid.initials}</td>
                      {days.map(d => {
                        const earned = earningsMap[kid.id]?.[format(d, 'yyyy-MM-dd')]
                        return (
                          <td key={d.toISOString()} className="text-center px-2 py-3 text-slate-500">
                            {earned != null ? `$${earned.toFixed(0)}` : <span className="text-slate-200">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-right px-5 py-3 font-bold text-emerald-600">
                        ${total.toFixed(2)}
                      </td>
                      <td className="text-center px-4 py-3">
                        <button
                          onClick={() => setPaid(p => ({ ...p, [kid.id]: !p[kid.id] }))}
                          className={`p-1.5 rounded-full transition-colors ${paid[kid.id] ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                        >
                          <CheckCircle2 size={20} strokeWidth={paid[kid.id] ? 2.5 : 1.5} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
