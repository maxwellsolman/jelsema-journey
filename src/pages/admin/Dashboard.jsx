import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { isPrivilegeFrozen } from '../../lib/points'
import LevelBadge from '../../components/ui/LevelBadge'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ShieldAlert, Users, TrendingUp, ChevronRight, Pin, ShoppingBag, ClipboardList } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [kids, setKids]       = useState([])
  const [logs, setLogs]       = useState({})
  const [weekPtsMap, setWeekPtsMap] = useState({})
  const [weekRedeemedMap, setWeekRedeemedMap] = useState({})
  const [pinnedNotesMap, setPinnedNotesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const today  = format(new Date(), 'yyyy-MM-dd')
  const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('is_active', true)
        .order('initials')

      const kidIds = (kidsData || []).map(k => k.id)

      const [
        { data: logsData },
        { data: weekLogs },
        { data: redemptions },
        { data: pinnedNotes },
      ] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('date', today),
        supabase.from('daily_logs').select('kid_id, total_pts').gte('date', wStart).lte('date', wEnd),
        supabase.from('canteen_redemptions').select('kid_id, points_redeemed').gte('redeemed_at', wStart),
        supabase.from('kid_notes').select('kid_id, body, admin_name').eq('pinned', true),
      ])

      const logsMap = {}
      logsData?.forEach(l => { logsMap[l.kid_id] = l })

      const wPts = {}
      weekLogs?.forEach(l => { wPts[l.kid_id] = (wPts[l.kid_id] || 0) + (l.total_pts || 0) })

      const wRedeemed = {}
      redemptions?.forEach(r => { wRedeemed[r.kid_id] = (wRedeemed[r.kid_id] || 0) + (r.points_redeemed || 0) })

      const pinned = {}
      pinnedNotes?.forEach(n => {
        if (!pinned[n.kid_id]) pinned[n.kid_id] = []
        pinned[n.kid_id].push(n)
      })

      setKids(kidsData || [])
      setLogs(logsMap)
      setWeekPtsMap(wPts)
      setWeekRedeemedMap(wRedeemed)
      setPinnedNotesMap(pinned)
      setLoading(false)
    }
    load()
  }, [today])

  const frozen = kids.filter(k => isPrivilegeFrozen(logs[k.id]?.privilege_freeze_until))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-3xl font-bold text-slate-800">{kids.length}</div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-1"><Users size={12} /> Active Youth</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-3xl font-bold text-emerald-600">{Object.keys(logs).length}</div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-1"><TrendingUp size={12} /> Logged Today</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-3xl font-bold text-amber-500">
            {Object.values(logs).filter(l => getLevel(l.total_pts) === 'rolemodel').length}
          </div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-1">🏆 Role Models</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="text-3xl font-bold text-red-500">{frozen.length}</div>
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-1"><ShieldAlert size={12} /> Frozen</div>
        </div>
      </div>

      {/* Frozen banner */}
      {frozen.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <ShieldAlert className="text-red-500" size={18} />
          <span className="text-red-700 font-medium">
            {frozen.map(k => k.initials).join(', ')} {frozen.length === 1 ? 'has' : 'have'} active privilege suspension
          </span>
        </div>
      )}

      {/* Not yet logged today */}
      {!loading && (() => {
        const notLogged = kids.filter(k => !logs[k.id])
        if (notLogged.length === 0) return null
        return (
          <div>
            <h2 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ClipboardList size={14} /> Not yet logged today ({notLogged.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {notLogged.map(kid => (
                <button
                  key={kid.id}
                  onClick={() => navigate(`/admin/points?kid=${kid.id}&date=${today}`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-orange-200 hover:bg-orange-50 hover:border-orange-300 rounded-xl text-sm font-bold text-orange-700 transition-colors shadow-sm"
                >
                  <ClipboardList size={13} /> {kid.initials}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Kids grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Youth Overview</h2>
        {loading ? (
          <div className="text-slate-400 text-sm">Loading…</div>
        ) : kids.length === 0 ? (
          <div className="text-slate-400 text-sm bg-white rounded-2xl p-8 text-center border border-slate-100">
            No active youth. Add kids in <strong>Manage Kids</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {kids.map(kid => {
              const log      = logs[kid.id]
              const total    = log?.total_pts ?? null
              const level    = log ? getLevel(total, isOrientation(kid)) : null
              const cfg      = level ? LEVEL_CONFIG[level] : null
              const isFrozen = isPrivilegeFrozen(log?.privilege_freeze_until)
              const weekPts  = weekPtsMap[kid.id] || 0
              const weekRedeemed = weekRedeemedMap[kid.id] || 0
              const balance  = Math.max(0, weekPts - weekRedeemed)
              const pinned   = pinnedNotesMap[kid.id] || []

              return (
                <button
                  key={kid.id}
                  onClick={() => navigate(`/admin/kid/${kid.id}`)}
                  className={`w-full bg-white rounded-2xl shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isFrozen ? 'border-red-200' : 'border-slate-100'}`}
                >
                  {/* Card header */}
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 ${cfg ? cfg.badgeBg : 'bg-slate-100'}`}>
                        {cfg ? cfg.emoji : '?'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-base">{kid.initials}</div>
                        {level
                          ? <LevelBadge level={level} size="sm" />
                          : <span className="text-xs text-slate-400">Not logged yet</span>
                        }
                        {isFrozen && <div className="text-xs text-red-500 font-medium mt-0.5">⛔ Frozen</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {total !== null ? (
                        <>
                          <div className={`text-2xl font-black leading-none ${cfg?.textClass || 'text-slate-800'}`}>{total}</div>
                          <div className="text-xs text-slate-400">pts today</div>
                        </>
                      ) : (
                        <div className="text-slate-300 text-xl font-bold">—</div>
                      )}
                    </div>
                  </div>

                  {/* Card footer: weekly balance + intake */}
                  <div className="px-4 pb-3 space-y-2">
                    {/* Weekly balance bar */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ShoppingBag size={10} /> Wk balance
                      </span>
                      <span className={`font-bold ${balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {balance} / {weekPts} pts
                        {weekRedeemed > 0 && <span className="text-red-400 font-normal ml-1">(−{weekRedeemed} spent)</span>}
                      </span>
                    </div>

                    {/* Intake date */}
                    {kid.intake_date && (
                      <div className="text-xs text-slate-400">
                        Intake: {format(new Date(kid.intake_date + 'T12:00:00'), 'MMM d, yyyy')}
                        {isOrientation(kid) && (
                          <span className="ml-1.5 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">Orientation</span>
                        )}
                      </div>
                    )}

                    {/* Pinned notes */}
                    {pinned.length > 0 && (
                      <div className="space-y-1">
                        {pinned.slice(0, 1).map((n, i) => (
                          <div key={i} className="flex items-start gap-1.5 bg-amber-50 rounded-lg px-2 py-1.5 text-xs">
                            <Pin size={10} className="text-amber-500 mt-0.5 shrink-0" />
                            <span className="text-amber-700 line-clamp-1">{n.body}</span>
                          </div>
                        ))}
                        {pinned.length > 1 && (
                          <div className="text-xs text-amber-500 pl-1">+{pinned.length - 1} more pinned note{pinned.length > 2 ? 's' : ''}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-3 flex justify-end">
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function isOrientation(kid) {
  if (!kid.orientation_end_at) return false
  return new Date(kid.orientation_end_at) > new Date()
}
