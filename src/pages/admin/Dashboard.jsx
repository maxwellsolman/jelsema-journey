import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import { isPrivilegeFrozen } from '../../lib/points'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ShieldAlert, Pin, ArrowRight, Trophy, Users } from 'lucide-react'

// Returns 'am' | 'pm' | 'ov' for the current local hour.
function currentShift(d = new Date()) {
  const h = d.getHours()
  if (h >= 6  && h < 14) return 'am'
  if (h >= 14 && h < 22) return 'pm'
  return 'ov'
}

const SHIFT_META = {
  am: { label: 'Morning Shift',     time: '6 AM – 2 PM',  emoji: '🌅', savedKey: 'am_saved_at', color: 'amber'   },
  pm: { label: 'Afternoon Shift',   time: '2 PM – 10 PM', emoji: '🌇', savedKey: 'pm_saved_at', color: 'orange'  },
  ov: { label: 'Overnight Shift',   time: '10 PM – 6 AM', emoji: '🌙', savedKey: 'ov_saved_at', color: 'indigo'  },
}

function ShiftDots({ log, size = 'sm' }) {
  const dots = [
    { key: 'am', filled: !!log?.am_saved_at, label: 'AM' },
    { key: 'pm', filled: !!log?.pm_saved_at, label: 'PM' },
    { key: 'ov', filled: !!log?.ov_saved_at, label: 'OV' },
  ]
  const px = size === 'lg' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'
  return (
    <div className="flex items-center gap-1" title="AM · PM · OV">
      {dots.map(d => (
        <span
          key={d.key}
          className={`${px} rounded-full ${d.filled ? 'bg-emerald-500' : 'bg-slate-300'}`}
        />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [kids, setKids]       = useState([])
  const [logs, setLogs]       = useState({})       // by kid_id, today
  const [weekPtsMap, setWeekPtsMap] = useState({})
  const [pinnedNotesMap, setPinnedNotesMap] = useState({})
  const [loading, setLoading] = useState(true)

  const today  = format(new Date(), 'yyyy-MM-dd')
  const wStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const wEnd   = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const shift     = currentShift()
  const shiftMeta = SHIFT_META[shift]

  useEffect(() => {
    async function load() {
      const { data: kidsData } = await supabase
        .from('kids').select('*').eq('is_active', true).order('initials')

      const [{ data: logsData }, { data: weekLogs }, { data: pinnedNotes }] = await Promise.all([
        supabase.from('daily_logs').select('*').eq('date', today),
        supabase.from('daily_logs').select('kid_id, total_pts').gte('date', wStart).lte('date', wEnd),
        supabase.from('kid_notes').select('kid_id, body').eq('pinned', true),
      ])

      const logsMap = {}
      logsData?.forEach(l => { logsMap[l.kid_id] = l })

      const wPts = {}
      weekLogs?.forEach(l => { wPts[l.kid_id] = (wPts[l.kid_id] || 0) + (l.total_pts || 0) })

      const pinned = {}
      pinnedNotes?.forEach(n => {
        if (!pinned[n.kid_id]) pinned[n.kid_id] = []
        pinned[n.kid_id].push(n)
      })

      setKids(kidsData || [])
      setLogs(logsMap)
      setWeekPtsMap(wPts)
      setPinnedNotesMap(pinned)
      setLoading(false)
    }
    load()
  }, [today])

  const frozen = kids.filter(k => isPrivilegeFrozen(logs[k.id]?.privilege_freeze_until))

  // Current shift progress
  const shiftDone = kids.filter(k => !!logs[k.id]?.[shiftMeta.savedKey]).length
  const shiftRemaining = kids.length - shiftDone
  const shiftPct = kids.length ? Math.round((shiftDone / kids.length) * 100) : 0

  const roleModelCount = Object.values(logs).filter(l => getLevel(l.total_pts) === 'rolemodel').length

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Active Youth</div>
          <div className="text-2xl font-black text-slate-800">{kids.length}</div>
        </div>
      </div>

      {/* Alerts row — only renders if there's something to flag */}
      {(frozen.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm">
          <ShieldAlert className="text-red-500 shrink-0" size={18} />
          <span className="text-red-700">
            <strong>{frozen.map(k => k.initials).join(', ')}</strong> {frozen.length === 1 ? 'has' : 'have'} an active privilege freeze
          </span>
        </div>
      )}

      {/* Hero — current shift status */}
      <button
        onClick={() => navigate(`/admin/points?date=${today}`)}
        className="w-full bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-3xl px-6 py-5 shadow-lg hover:shadow-xl transition-all text-left group"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300">
              <span>{shiftMeta.emoji}</span>
              <span>{shiftMeta.label}</span>
              <span className="text-slate-500">· {shiftMeta.time}</span>
            </div>
            <div className="mt-2 text-3xl font-black">
              {shiftRemaining === 0
                ? <>All caught up <span className="text-emerald-400">✓</span></>
                : <>{shiftRemaining} of {kids.length} still to log</>}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {shiftRemaining === 0
                ? 'Every youth has their shift logged.'
                : 'Tap to continue logging this shift.'}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-slate-300 group-hover:text-white">
            <span className="text-2xl font-bold">{shiftPct}%</span>
            <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all"
            style={{ width: `${shiftPct}%` }}
          />
        </div>
      </button>

      {/* Secondary stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
          <Trophy className="text-amber-500" size={18} />
          <div>
            <div className="text-lg font-bold text-slate-800 leading-none">{roleModelCount}</div>
            <div className="text-xs text-slate-400 mt-1">Role models today</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
          <ShieldAlert className={frozen.length ? 'text-red-500' : 'text-slate-300'} size={18} />
          <div>
            <div className="text-lg font-bold text-slate-800 leading-none">{frozen.length}</div>
            <div className="text-xs text-slate-400 mt-1">Frozen</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-3">
          <Users className="text-emerald-500" size={18} />
          <div>
            <div className="text-lg font-bold text-slate-800 leading-none">{Object.keys(logs).length}</div>
            <div className="text-xs text-slate-400 mt-1">Started today</div>
          </div>
        </div>
      </div>

      {/* Kid grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Youth Overview</h2>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShiftDots log={{ am_saved_at: 1, pm_saved_at: 1, ov_saved_at: 1 }} />
            <span>AM · PM · OV today</span>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading…</div>
        ) : kids.length === 0 ? (
          <div className="text-slate-400 text-sm bg-white rounded-2xl p-8 text-center border border-slate-100">
            No active youth. Add kids in <strong>Manage Kids</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {kids.map(kid => {
              const log      = logs[kid.id]
              const total    = log?.total_pts ?? null
              const level    = total != null ? getLevel(total, isOrientation(kid)) : null
              const cfg      = level ? LEVEL_CONFIG[level] : null
              const isFrozen = isPrivilegeFrozen(log?.privilege_freeze_until)
              const weekPts  = weekPtsMap[kid.id] || 0
              const pinned   = pinnedNotesMap[kid.id] || []

              return (
                <button
                  key={kid.id}
                  onClick={() => navigate(`/admin/points?kid=${kid.id}&date=${today}`)}
                  className={`relative bg-white rounded-2xl border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    isFrozen ? 'border-red-200' : 'border-slate-100'
                  }`}
                >
                  {/* Top: initials + level */}
                  <div className="px-3 pt-3 flex items-start justify-between">
                    <div className="font-black text-slate-800 text-lg leading-none">{kid.initials}</div>
                    {cfg ? (
                      <span className="text-base leading-none" title={cfg.label}>{cfg.emoji}</span>
                    ) : (
                      <span className="text-base leading-none text-slate-300" title="No log yet">·</span>
                    )}
                  </div>

                  {/* Middle: weekly points */}
                  <div className="px-3 pt-2">
                    <div className="text-2xl font-bold text-slate-800 leading-none">{weekPts}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">pts this week</div>
                  </div>

                  {/* Bottom: dots + frozen + pinned */}
                  <div className="px-3 pb-3 mt-3 flex items-center justify-between">
                    <ShiftDots log={log} size="lg" />
                    <div className="flex items-center gap-1">
                      {isFrozen && <ShieldAlert size={12} className="text-red-500" />}
                      {pinned.length > 0 && <Pin size={12} className="text-amber-500" />}
                    </div>
                  </div>

                  {/* Tiny "Details" link, doesn't trigger main click */}
                  <span
                    role="link"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/kid/${kid.id}`) }}
                    className="absolute bottom-1.5 right-2 text-[10px] text-slate-300 hover:text-slate-600 hover:underline"
                  >
                    details
                  </span>
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
