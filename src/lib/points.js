// AM shift behaviors (6am-2pm) — 8 behaviors × 5pts = 40 max
export const AM_BEHAVIORS = [
  { key: 'am_follow_rules',          label: 'Follow program rules',           description: 'Followed all shelter rules during the shift' },
  { key: 'am_got_up_on_time',        label: 'Got up on time',                 description: 'Out of bed by wake-up time without prompting' },
  { key: 'am_left_on_time',          label: 'Left on time',                   description: 'Ready and left for school or outing on schedule' },
  { key: 'am_returned_hygiene',      label: 'Returned hygiene',               description: 'Returned all hygiene items to staff after use' },
  { key: 'am_no_contraband',         label: 'No contraband',                  description: 'No prohibited items found during the shift' },
  { key: 'am_respectful',            label: 'Being respectful',               description: 'Positive attitude, no cursing or disrespect toward staff/peers' },
  { key: 'am_make_bed',              label: 'Make bed / room tidy',           description: 'Bed made and room kept neat before leaving' },
  { key: 'am_appropriately_dressed', label: 'Appropriately dressed',          description: 'Wore clothing appropriate for the day and setting' },
]

// PM shift behaviors (2pm-10pm) — 10 behaviors × 5pts = 50 max
export const PM_BEHAVIORS = [
  { key: 'pm_follow_rules',          label: 'Follow program rules',           description: 'Followed all shelter rules during the shift' },
  { key: 'pm_group_participation',   label: 'Group participation',            description: 'Actively participated in group activity or extra-curricular' },
  { key: 'pm_no_contraband',         label: 'No contraband',                  description: 'No prohibited items found during the shift' },
  { key: 'pm_returned_hygiene',      label: 'Returned hygiene',               description: 'Returned all hygiene items to staff after use' },
  { key: 'pm_tech_use',              label: 'Appropriate tech use',           description: 'Used devices/technology appropriately within guidelines' },
  { key: 'pm_helped_clean',          label: 'Helped clean up',                description: 'Assisted with cleaning common areas without being asked' },
  { key: 'pm_appropriately_dressed', label: 'Appropriately dressed',          description: 'Wore clothing appropriate for the setting' },
  { key: 'pm_hall_behavior',         label: 'Appropriate hall behavior',      description: 'Walked calmly, no running or disruptive behavior in hallways' },
  { key: 'pm_no_horseplay',          label: 'No horseplay',                   description: 'No roughhousing, wrestling, or rough play with others' },
  { key: 'pm_respectful',            label: 'Being respectful',               description: 'Positive attitude, no cursing or disrespect toward staff/peers' },
]

// Overnight behaviors (10pm-6am) — 2 behaviors × 5pts = 10 max
export const OVERNIGHT_BEHAVIORS = [
  { key: 'ov_respectful',    label: 'Respectful / follow rules', description: 'Followed overnight rules and showed respect to night staff' },
  { key: 'ov_no_room_entry', label: 'No entry to other rooms',   description: 'Did not enter or attempt to enter other residents\' rooms' },
]

export const ALL_BEHAVIOR_KEYS = [
  ...AM_BEHAVIORS.map(b => b.key),
  ...PM_BEHAVIORS.map(b => b.key),
  ...OVERNIGHT_BEHAVIORS.map(b => b.key),
]

export const POINTS_PER_BEHAVIOR = 5

export const MINOR_DEDUCTION = 20
export const MAJOR_DEDUCTION = 40

export const MINOR_FREEZE_HOURS = 24
export const MAJOR_FREEZE_HOURS = 48

/**
 * Calculate points for a shift given a log object
 */
export function calcShiftPoints(log, behaviors) {
  return behaviors.reduce((sum, b) => sum + (log[b.key] ? POINTS_PER_BEHAVIOR : 0), 0)
}

/**
 * Calculate the final daily total after infractions
 */
export function calcDailyTotal(log) {
  const amPts = calcShiftPoints(log, AM_BEHAVIORS)
  const pmPts = calcShiftPoints(log, PM_BEHAVIORS)
  const ovPts = calcShiftPoints(log, OVERNIGHT_BEHAVIORS)
  const earned = amPts + pmPts + ovPts

  const minors = log.minor_infractions || 0
  const majors = log.major_infractions || 0
  const deductions = (minors * MINOR_DEDUCTION) + (majors * MAJOR_DEDUCTION)

  return Math.max(0, earned - deductions)
}

/**
 * Get privilege freeze end time based on infractions logged today
 */
export function calcFreezeUntil(log, logDate) {
  const minors = log.minor_infractions || 0
  const majors = log.major_infractions || 0
  if (majors > 0) {
    const d = new Date(logDate)
    d.setHours(d.getHours() + MAJOR_FREEZE_HOURS)
    return d.toISOString()
  }
  if (minors > 0) {
    const d = new Date(logDate)
    d.setHours(d.getHours() + MINOR_FREEZE_HOURS)
    return d.toISOString()
  }
  return null
}

/**
 * Returns whether privileges are currently frozen
 */
export function isPrivilegeFrozen(freezeUntil) {
  if (!freezeUntil) return false
  return new Date(freezeUntil) > new Date()
}

/**
 * Returns hours remaining in freeze (0 if not frozen)
 */
export function freezeHoursRemaining(freezeUntil) {
  if (!freezeUntil) return 0
  const diff = new Date(freezeUntil) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)))
}
