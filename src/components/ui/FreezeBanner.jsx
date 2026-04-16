import { ShieldAlert } from 'lucide-react'
import { freezeHoursRemaining } from '../../lib/points'

export default function FreezeBanner({ freezeUntil }) {
  const hours = freezeHoursRemaining(freezeUntil)
  if (!hours) return null

  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
      <ShieldAlert className="text-red-500 shrink-0" size={20} />
      <div>
        <div className="font-semibold text-red-700">Privileges Suspended</div>
        <div className="text-red-500 text-xs">{hours} hour{hours !== 1 ? 's' : ''} remaining</div>
      </div>
    </div>
  )
}
