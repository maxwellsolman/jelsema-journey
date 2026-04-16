import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { getLevel, LEVELS } from '../../lib/levels'
import { Zap, Trophy } from 'lucide-react'

const DUO_LEVEL = {
  [LEVELS.ORIENTATION]: { fill:'#94A3B8', bg:'#F1F5F9', text:'#64748B', emoji:'🌱' },
  [LEVELS.REFOCUS]:     { fill:'#3B82F6', bg:'#EFF6FF', text:'#2563EB', emoji:'🔵' },
  [LEVELS.RISING]:      { fill:'#F59E0B', bg:'#FFFBEB', text:'#D97706', emoji:'⭐' },
  [LEVELS.ROLEMODEL]:   { fill:'#22C55E', bg:'#F0FDF4', text:'#16A34A', emoji:'🏆' },
}

const MEDAL_COLORS = [
  { bg:'#FFD700', border:'#CC9900', text:'#664400' }, // gold
  { bg:'#C0C0C0', border:'#999999', text:'#444444' }, // silver
  { bg:'#CD7F32', border:'#996633', text:'#552200' }, // bronze
]

export default function Leaderboard() {
  const { profile } = useAuth()
  const [ranked, setRanked]       = useState([])
  const [lastWeekRanked, setLastWeekRanked] = useState([])
  const [kids, setKids]           = useState({})
  const [loading, setLoading]     = useState(true)

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
    const now   = new Date()
    const wStart = format(startOfWeek(now,{weekStartsOn:1}),'yyyy-MM-dd')
    const wEnd   = format(endOfWeek(now,{weekStartsOn:1}),'yyyy-MM-dd')
    const lwStart = format(startOfWeek(subWeeks(now,1),{weekStartsOn:1}),'yyyy-MM-dd')
    const lwEnd   = format(endOfWeek(subWeeks(now,1),{weekStartsOn:1}),'yyyy-MM-dd')

    function toRanked(logs) {
      const totals = {}
      logs?.forEach(l => { totals[l.kid_id] = (totals[l.kid_id]||0) + l.total_pts })
      return Object.entries(totals)
        .map(([id,total]) => ({ kid: kids[id], total }))
        .filter(e => e.kid)
        .sort((a,b) => b.total - a.total)
    }

    Promise.all([
      supabase.from('daily_logs').select('kid_id, total_pts').gte('date',wStart).lte('date',wEnd),
      supabase.from('daily_logs').select('kid_id, total_pts').gte('date',lwStart).lte('date',lwEnd),
    ]).then(([{ data: thisWeek }, { data: lastWeek }]) => {
      setRanked(toRanked(thisWeek))
      setLastWeekRanked(toRanked(lastWeek))
      setLoading(false)
    })
  }, [kids])

  const myIdx   = ranked.findIndex(r => r.kid?.id === profile?.id)
  const myEntry = myIdx >= 0 ? ranked[myIdx] : null
  const lastWeekWinner = lastWeekRanked[0] || null

  return (
    <div className="space-y-4">
      <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:24, color:'var(--duo-text)' }}>Leaderboard</h1>

      {/* Last week winner banner */}
      {lastWeekWinner && (
        <div className="duo-card p-4 flex items-center gap-3"
          style={{ borderColor:'#FFD70066', background:'#FFFBEB' }}>
          <Trophy size={22} color="#FF9600" />
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#CC7700', fontSize:12, textTransform:'uppercase' }}>
              Last Week's Winner
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, color:'#FF6B00', fontSize:18 }}>
              🥇 {lastWeekWinner.kid.initials} — {lastWeekWinner.total} pts
            </div>
          </div>
        </div>
      )}

      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, color:'var(--duo-text-lt)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
        This Week's Rankings
      </div>

      {/* My rank card */}
      {myEntry && (
        <div className="duo-card p-4 flex items-center justify-between"
          style={{ borderColor:'#1CB0F6', background:'#F0F9FF' }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1CB0F6', fontSize:12, textTransform:'uppercase' }}>Your rank</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'#1CB0F6', lineHeight:1 }}>
              #{myIdx + 1}
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'#1CB0F6', fontSize:12, textTransform:'uppercase' }}>XP</div>
            <div className="flex items-center gap-1">
              <Zap size={18} color="#FF9600" fill="#FF9600" />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:36, color:'#FF9600', lineHeight:1 }}>
                {myEntry.total}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10">
          <div style={{ fontSize:40 }}>🏆</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--duo-text-lt)', marginTop:8 }}>Loading…</div>
        </div>
      ) : ranked.length === 0 ? (
        <div className="duo-card p-10 text-center">
          <div style={{ fontSize:48 }}>😴</div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--duo-text)', fontSize:18, marginTop:8 }}>No scores yet!</div>
        </div>
      ) : (
        <>
          {/* Podium */}
          {ranked.length >= 2 && (
            <div className="duo-card p-6">
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:12, color:'var(--duo-text-lt)', textTransform:'uppercase', marginBottom:16, textAlign:'center' }}>
                Top Performers
              </div>
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
              const level  = getLevel(total)
              const d      = DUO_LEVEL[level]
              const isMe   = kid.id === profile?.id
              const medal  = i < 3 ? MEDAL_COLORS[i] : null

              return (
                <div key={kid.id} className="duo-card flex items-center justify-between px-4 py-3"
                  style={{ borderColor: isMe ? '#1CB0F6' : 'var(--duo-border)',
                           background: isMe ? '#F0F9FF' : '#fff' }}>
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: medal ? medal.bg : '#F7F7F7', border: `2px solid ${medal ? medal.border : '#E5E5E5'}` }}>
                      <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:12, color: medal ? medal.text : '#AFAFAF' }}>
                        {i+1}
                      </span>
                    </div>
                    {/* Level avatar */}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ background: d.bg }}>
                      {d.emoji}
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15,
                                    color: isMe ? '#1CB0F6' : 'var(--duo-text)' }}>
                        {kid.initials}{isMe ? ' 👈' : ''}
                      </div>
                      <div className="rounded-full px-1.5 py-0.5 inline-block"
                        style={{ background: d.bg, color: d.text, fontFamily:'var(--font-display)', fontWeight:700, fontSize:10 }}>
                        {d.emoji} {LEVELS[level] || level}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap size={14} color="#FF9600" fill="#FF9600" />
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:20,
                                   color: isMe ? '#1CB0F6' : 'var(--duo-text)' }}>
                      {total}
                    </span>
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
  const d     = DUO_LEVEL[level]
  const isMe  = kid.id === myId
  const heights = { 1:'h-20', 2:'h-14', 3:'h-10' }
  const medals  = { 1:'🥇', 2:'🥈', 3:'🥉' }
  const fills   = { 1:'#FFD700', 2:'#C0C0C0', 3:'#CD7F32' }

  return (
    <div className={`flex-1 flex flex-col items-center ${rank===1 ? '-mt-4' : 'mt-2'}`}>
      <div style={{ fontSize:24, lineHeight:1, marginBottom:4 }}>{medals[rank]}</div>
      <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl mb-1"
        style={{ background: d.bg, border: isMe ? '3px solid #1CB0F6' : `3px solid ${d.fill}`, width:52, height:52 }}>
        {d.emoji}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13,
                    color: isMe ? '#1CB0F6' : 'var(--duo-text)' }}>
        {kid.initials}
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:11, color:'var(--duo-text-lt)', marginBottom:6 }}>
        {total} pts
      </div>
      <div className={`w-full ${heights[rank]} rounded-t-2xl flex items-center justify-center`}
        style={{ background: fills[rank] }}>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:22, color:'#fff' }}>{rank}</span>
      </div>
    </div>
  )
}
