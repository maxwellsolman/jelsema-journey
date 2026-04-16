import { LEVEL_CONFIG } from '../../lib/levels'

export default function LevelBadge({ level, size = 'md', showDescription = false }) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.refocus

  const sizeClasses = {
    sm:  'text-xs px-2 py-0.5 rounded-full',
    md:  'text-sm px-3 py-1 rounded-full font-semibold',
    lg:  'text-base px-4 py-1.5 rounded-full font-bold',
    xl:  'text-xl px-5 py-2 rounded-full font-bold',
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className={`inline-flex items-center gap-1.5 ${cfg.badgeBg} ${cfg.badgeText} ${sizeClasses[size]}`}>
        <span>{cfg.emoji}</span>
        {cfg.label}
      </span>
      {showDescription && (
        <span className="text-xs text-slate-500">{cfg.description}</span>
      )}
    </div>
  )
}
