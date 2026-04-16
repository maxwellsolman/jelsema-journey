import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { isPrivilegeFrozen } from '../../lib/points'
import LevelBadge from '../../components/ui/LevelBadge'
import { format } from 'date-fns'
import { ShieldAlert, Users, TrendingUp, DollarSign } from 'lucide-react'

export default function AdminDashboard() {
  const [kids, setKids]     = useState([])
  const [logs, setLogs]     = useState({})
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const { data: kidsData } = await supabase
        .from('kids')
        .select('*')
        .eq('is_active', true)
        .order('initials')

      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', today)

      const logsMap = {}
      logsData?.forEach(l => { logsMap[l.kid_id] = l })

      setKids(kidsData || [])
      setLogs(logsMap)
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Kids grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Today's Status</h2>
        {loading ? (
          <div className="text-slate-400 text-sm">Loading…</div>
        ) : kids.length === 0 ? (
          <div className="text-slate-400 text-sm bg-white rounded-2xl p-8 text-center border border-slate-100">
            No active youth. Add kids in <strong>Manage Kids</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {kids.map(kid => {
              const log = logs[kid.id]
              const total = log?.total_pts ?? null
              const level = log ? getLevel(total, isOrientation(kid)) : null
              const cfg = level ? LEVEL_CONFIG[level] : null
              const frozen = isPrivilegeFrozen(log?.privilege_freeze_until)

              return (
                <div
                  key={kid.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border ${frozen ? 'border-red-200' : 'border-slate-100'} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${cfg ? cfg.badgeBg : 'bg-slate-100'}`}>
                      {cfg ? cfg.emoji : '?'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{kid.initials}</div>
                      {level
                        ? <LevelBadge level={level} size="sm" />
                        : <span className="text-xs text-slate-400">Not logged yet</span>
                      }
                      {frozen && <div className="text-xs text-red-500 font-medium mt-0.5">⛔ Privileges frozen</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    {total !== null
                      ? <div className={`text-2xl font-bold ${cfg?.textClass || 'text-slate-800'}`}>{total}</div>
                      : <div className="text-slate-300 text-2xl font-bold">—</div>
                    }
                    <div className="text-xs text-slate-400">pts today</div>
                  </div>
                </div>
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
