import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { getLevel, LEVEL_CONFIG } from '../../lib/levels'
import LevelBadge from '../../components/ui/LevelBadge'

function PodiumCard({ rank, kid, total }) {
  if (!kid) return <div className="flex-1" />
  const level = getLevel(total)
  const cfg = LEVEL_CONFIG[level]
  const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className={`flex-1 flex flex-col items-center ${rank === 1 ? '-mt-4' : 'mt-4'}`}>
      <div className="text-2xl mb-1">{medals[rank]}</div>
      <div className={`w-14 h-14 rounded-2xl ${cfg.badgeBg} flex items-center justify-center text-xl mb-1`}>{cfg.emoji}</div>
      <div className="font-bold text-slate-800 text-sm">{kid.initials}</div>
      <div className="text-xs text-slate-500">{total} pts</div>
      <div className={`w-full ${heights[rank]} ${cfg.bgClass} border ${cfg.borderClass} rounded-t-xl mt-2 flex items-center justify-center text-lg font-black ${cfg.textClass}`}>
        {rank}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { profile } = useAuth()
  const [tab, setTab]       = useState('week')
  const [ranked, setRanked] = useState([])
  const [kids, setKids]     = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadKids() {
      const { data } = await supabase.from('kids').select('id, initials').eq('is_active', true)
      const map = {}
      data?.forEach(k => { map[k.id] = k })
      setKids(map)
    }
    loadKids()
  }, [])

  useEffect(() => {
    if (!Object.keys(kids).length) return
    setLoading(true)

    const now = new Date()
    let start, end
    if (tab === 'week') {
      start = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
      end   = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    } else {
      start = format(startOfMonth(now), 'yyyy-MM-dd')
      end   = format(endOfMonth(now), 'yyyy-MM-dd')
    }

    supabase.from('daily_logs').select('kid_id, total_pts')
      .gte('date', start).lte('date', end)
      .then(({ data }) => {
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

  const myRank = ranked.findIndex(r => r.kid?.id === profile?.id) + 1
  const myEntry = ranked.find(r => r.kid?.id === profile?.id)

  const top3 = [ranked[1], ranked[0], ranked[2]] // Silver, Gold, Bronze positions

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Leaderboard</h1>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {['week', 'month'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
            {t === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* My rank banner */}
      {myEntry && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-blue-700">
            You're #{myRank} this {tab === 'week' ? 'week' : 'month'}!
          </div>
          <div className="font-black text-blue-700">{myEntry.total} pts</div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-10">Loading…</div>
      ) : ranked.length === 0 ? (
        <div className="text-slate-400 text-sm text-center bg-white rounded-2xl p-10 border border-slate-100">
          No points logged yet this {tab}.
        </div>
      ) : (
        <>
          {/* Podium */}
          {ranked.length >= 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-end gap-2">
                {top3.map((entry, i) => {
                  const rank = i === 0 ? 2 : i === 1 ? 1 : 3
                  return <PodiumCard key={rank} rank={rank} kid={entry?.kid} total={entry?.total || 0} />
                })}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="space-y-2">
            {ranked.map(({ kid, total }, i) => {
              const level = getLevel(total)
              const cfg = LEVEL_CONFIG[level]
              const isMe = kid.id === profile?.id
              const medals = ['🥇', '🥈', '🥉']

              return (
                <div key={kid.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border shadow-sm transition-all ${
                    isMe ? 'bg-blue-50 border-blue-200 scale-[1.01]' : 'bg-white border-slate-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{i < 3 ? medals[i] : `${i + 1}`}</span>
                    <div className={`w-10 h-10 rounded-xl ${cfg.badgeBg} flex items-center justify-center text-lg`}>{cfg.emoji}</div>
                    <div>
                      <div className={`font-bold text-sm ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                        {kid.initials}{isMe && ' (you)'}
                      </div>
                      <LevelBadge level={level} size="sm" />
                    </div>
                  </div>
                  <div className={`text-xl font-black ${isMe ? 'text-blue-700' : 'text-slate-700'}`}>{total}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
