import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import LevelBadge from '../../components/ui/LevelBadge'
import { Star } from 'lucide-react'

const TABS = [
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all',   label: 'All Time' },
]

export default function Leaderboard() {
  const { profile } = useAuth()
  const [tab, setTab]       = useState('week')
  const [ranked, setRanked] = useState([])
  const [kids, setKids]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('kids').select('id, initials').eq('is_active', true)
      .then(({ data }) => {
        const map = {}
        data?.forEach(k => { map[k.id] = k })
        setKids(map)
      })
  }, [])

  useEffect(() => {
    if (!Object.keys(kids).length) return
    setLoading(true)

    let query = supabase.from('daily_logs').select('kid_id, total_pts')
    const now = new Date()

    if (tab === 'week') {
      query = query
        .gte('date', format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
        .lte('date', format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
    } else if (tab === 'month') {
      query = query
        .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(now), 'yyyy-MM-dd'))
    }
    // 'all' — no date filter

    query.then(({ data }) => {
      const totals = {}
      data?.forEach(l => { totals[l.kid_id] = (totals[l.kid_id] || 0) + l.total_pts })
      const r = Object.entries(totals)
        .map(([kidId, total]) => ({ kid: kids[kidId], total }))
        .filter(e => e.kid)
        .sort((a, b) => b.total - a.total)
      setRanked(r)
      setLoading(false)
    })
  }, [tab, kids])

  const myRank  = ranked.findIndex(r => r.kid?.id === profile?.id) + 1
  const myEntry = ranked.find(r => r.kid?.id === profile?.id)
  const medals  = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-slate-800">Leaderboard</h1>

      {/* Tab selector */}
      <div className="flex gap-1.5 bg-white/60 backdrop-blur p-1.5 rounded-2xl clay-card">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.key
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* My position banner */}
      {myEntry && (
        <div className="clay-card bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex items-center justify-between text-white">
          <div>
            <div className="text-sm font-semibold text-blue-100">Your rank</div>
            <div className="text-3xl font-black">#{myRank}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-100">Your points</div>
            <div className="text-3xl font-black">{myEntry.total}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div className="text-3xl animate-bounce">🏆</div>
          <div className="text-slate-400 text-sm mt-2">Loading rankings…</div>
        </div>
      ) : ranked.length === 0 ? (
        <div className="clay-card bg-white p-10 text-center">
          <div className="text-4xl mb-2">😴</div>
          <div className="text-slate-400 font-semibold">No points logged yet!</div>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {ranked.length >= 2 && (
            <div className="clay-card bg-white p-6">
              <div className="flex items-end gap-2 justify-center">
                {/* Silver */}
                {ranked[1] && <PodiumSlot rank={2} entry={ranked[1]} myId={profile?.id} />}
                {/* Gold */}
                {ranked[0] && <PodiumSlot rank={1} entry={ranked[0]} myId={profile?.id} />}
                {/* Bronze */}
                {ranked[2] && <PodiumSlot rank={3} entry={ranked[2]} myId={profile?.id} />}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="space-y-2">
            {ranked.map(({ kid, total }, i) => {
              const level = getLevel(total)
              const cfg   = LEVEL_CONFIG[level]
              const isMe  = kid.id === profile?.id

              return (
                <div key={kid.id}
                  className={`clay-card flex items-center justify-between px-4 py-3.5 transition-all
                    ${isMe ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center font-bold">
                      {i < 3 ? medals[i] : <span className="text-slate-400 text-base">#{i+1}</span>}
                    </span>
                    <div className={`w-10 h-10 rounded-2xl ${cfg.badgeBg} flex items-center justify-center text-lg`}>
                      {cfg.emoji}
                    </div>
                    <div>
                      <div className={`font-bold text-sm ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                        {kid.initials}{isMe ? ' 👈 you' : ''}
                      </div>
                      <LevelBadge level={level} size="sm" />
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-xl font-black ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>
                    {total}
                    <Star size={14} className="text-amber-400 fill-amber-400 mb-0.5" />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PodiumSlot({ rank, entry, myId }) {
  const { kid, total } = entry
  const level = getLevel(total)
  const cfg   = LEVEL_CONFIG[level]
  const isMe  = kid.id === myId
  const heights  = { 1: 'h-20', 2: 'h-14', 3: 'h-10' }
  const sizesCls = { 1: 'w-16 h-16 text-2xl', 2: 'w-13 h-13 text-xl', 3: 'w-12 h-12 text-lg' }
  const medals   = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className={`flex-1 flex flex-col items-center ${rank === 1 ? '-mt-4' : 'mt-2'}`}>
      <div className="text-2xl mb-1">{medals[rank]}</div>
      <div className={`w-14 h-14 rounded-2xl ${cfg.badgeBg} ${isMe ? 'ring-2 ring-blue-400' : ''} flex items-center justify-center text-2xl mb-1 shadow`}>
        {cfg.emoji}
      </div>
      <div className={`font-bold text-sm ${isMe ? 'text-blue-600' : 'text-slate-700'}`}>{kid.initials}</div>
      <div className="text-xs text-slate-400 mb-1">{total} pts</div>
      <div className={`w-full ${heights[rank]} bg-gradient-to-t ${cfg.gradient} rounded-t-xl flex items-center justify-center`}>
        <span className="text-white font-black text-lg">{rank}</span>
      </div>
    </div>
  )
}
