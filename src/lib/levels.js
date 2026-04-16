/**
 * Level definitions for the Jelsema Journey behavior management system
 */

export const LEVELS = {
  ORIENTATION: 'orientation',
  REFOCUS:     'refocus',
  RISING:      'rising',
  ROLEMODEL:   'rolemodel',
}

export const LEVEL_CONFIG = {
  [LEVELS.ORIENTATION]: {
    label:       'Orientation',
    description: 'First 48 hours',
    minPts:      null,
    maxPts:      null,
    color:       'slate',
    bgClass:     'bg-slate-100',
    textClass:   'text-slate-600',
    borderClass: 'border-slate-300',
    badgeBg:     'bg-slate-200',
    badgeText:   'text-slate-700',
    ringClass:   'ring-slate-300',
    emoji:       '🌱',
    gradient:    'from-slate-400 to-slate-500',
  },
  [LEVELS.REFOCUS]: {
    label:       'Re-Focus',
    description: '0 – 65 points',
    minPts:      0,
    maxPts:      65,
    color:       'blue',
    bgClass:     'bg-blue-50',
    textClass:   'text-blue-700',
    borderClass: 'border-blue-300',
    badgeBg:     'bg-blue-100',
    badgeText:   'text-blue-800',
    ringClass:   'ring-blue-300',
    emoji:       '🔵',
    gradient:    'from-blue-400 to-blue-600',
  },
  [LEVELS.RISING]: {
    label:       'Rising Star',
    description: '66 – 85 points',
    minPts:      66,
    maxPts:      85,
    color:       'amber',
    bgClass:     'bg-amber-50',
    textClass:   'text-amber-700',
    borderClass: 'border-amber-300',
    badgeBg:     'bg-amber-100',
    badgeText:   'text-amber-800',
    ringClass:   'ring-amber-300',
    emoji:       '⭐',
    gradient:    'from-amber-400 to-amber-500',
  },
  [LEVELS.ROLEMODEL]: {
    label:       'Role Model',
    description: '86 – 100 points',
    minPts:      86,
    maxPts:      100,
    color:       'emerald',
    bgClass:     'bg-emerald-50',
    textClass:   'text-emerald-700',
    borderClass: 'border-emerald-300',
    badgeBg:     'bg-emerald-100',
    badgeText:   'text-emerald-800',
    ringClass:   'ring-emerald-300',
    emoji:       '🏆',
    gradient:    'from-emerald-400 to-emerald-600',
  },
}

/**
 * Determine level from daily point total.
 * Pass isOrientation=true for kids within their first 48 hours.
 */
export function getLevel(pts, isOrientation = false) {
  if (isOrientation) return LEVELS.ORIENTATION
  if (pts <= 65) return LEVELS.REFOCUS
  if (pts <= 85) return LEVELS.RISING
  return LEVELS.ROLEMODEL
}

/**
 * Progress toward the next level (0–100%)
 * Returns null if already at Role Model (max level)
 */
export function progressToNextLevel(pts) {
  if (pts <= 65) {
    // Re-Focus → Rising Star: need 66
    return { pct: Math.round((pts / 66) * 100), nextLabel: 'Rising Star', ptsNeeded: Math.max(0, 66 - pts) }
  }
  if (pts <= 85) {
    // Rising Star → Role Model: 66–85 range, need 86
    return { pct: Math.round(((pts - 65) / (86 - 65)) * 100), nextLabel: 'Role Model', ptsNeeded: Math.max(0, 86 - pts) }
  }
  return null // Already Role Model
}

/**
 * Check if kid can access iCanTeen store (Role Model only, Sundays)
 */
export function canAccessiCanTeen(level, date = new Date()) {
  if (level !== LEVELS.ROLEMODEL) return false
  return date.getDay() === 0 // Sunday
}
