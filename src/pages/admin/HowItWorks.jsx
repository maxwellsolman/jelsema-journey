import { LEVEL_CONFIG, LEVELS } from '../../lib/levels'
import { MINOR_DEDUCTION, MAJOR_DEDUCTION } from '../../lib/points'
import { BookOpen } from 'lucide-react'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <h2 className="font-bold text-slate-800 text-base">{title}</h2>
      {children}
    </div>
  )
}

function LevelCard({ level }) {
  const cfg = LEVEL_CONFIG[level]
  return (
    <div className={`rounded-xl border p-3 ${cfg.bgClass} ${cfg.borderClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{cfg.emoji}</span>
        <span className={`font-bold text-sm ${cfg.textClass}`}>{cfg.label}</span>
      </div>
      <div className={`text-xs ${cfg.textClass} opacity-80`}>{cfg.description}</div>
    </div>
  )
}

export default function HowItWorks() {
  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <BookOpen className="text-emerald-500" size={24} />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">How It Works</h1>
          <p className="text-slate-500 text-sm">Staff guide to the Jelsema Journey behavior system</p>
        </div>
      </div>

      <Section title="Overview">
        <p className="text-sm text-slate-600 leading-relaxed">
          The Jelsema Journey is a daily behavior point system used at FKCS to track youth progress across three shifts per day.
          Youth earn points for demonstrating positive behaviors in each shift. Their daily total determines their level, which
          affects their privileges and canteen access.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Staff enter points each day using <strong>Enter Points</strong>. You can select any past date to edit or correct previous entries.
        </p>
      </Section>

      <Section title="Daily Point System">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">☀️</div>
              <div className="font-bold text-slate-700">Morning</div>
              <div className="text-xs text-slate-400">6am – 2pm</div>
              <div className="text-lg font-black text-slate-700 mt-1">40 pts</div>
              <div className="text-xs text-slate-400">8 behaviors × 5</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">🌆</div>
              <div className="font-bold text-slate-700">Afternoon</div>
              <div className="text-xs text-slate-400">2pm – 10pm</div>
              <div className="text-lg font-black text-slate-700 mt-1">50 pts</div>
              <div className="text-xs text-slate-400">10 behaviors × 5</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <div className="text-xl mb-1">🌙</div>
              <div className="font-bold text-slate-700">Overnight</div>
              <div className="text-xs text-slate-400">10pm – 6am</div>
              <div className="text-lg font-black text-slate-700 mt-1">10 pts</div>
              <div className="text-xs text-slate-400">2 behaviors × 5</div>
            </div>
          </div>
          <p className="text-xs text-slate-400">Maximum possible daily score: <strong>100 points</strong></p>
        </div>
      </Section>

      <Section title="Behavior Levels">
        <p className="text-sm text-slate-600">A youth's level is determined by their total daily points:</p>
        <div className="grid grid-cols-2 gap-2">
          <LevelCard level={LEVELS.REFOCUS} />
          <LevelCard level={LEVELS.RISING} />
          <LevelCard level={LEVELS.ROLEMODEL} />
          <LevelCard level={LEVELS.ORIENTATION} />
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
          <p><strong>Re-Focus (0–65 pts):</strong> Youth needs to refocus their behavior. Restricted privileges.</p>
          <p><strong>Rising Star (66–85 pts):</strong> Youth is making progress. Standard privileges.</p>
          <p><strong>Role Model (86–100 pts):</strong> Youth is modeling excellent behavior. Full privileges + Canteen access.</p>
          <p><strong>Orientation:</strong> Automatically assigned during the first 48 hours after intake. Youth are learning the program.</p>
        </div>
      </Section>

      <Section title="Infractions">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="font-bold text-orange-700 mb-1">⚠️ Minor Infraction</div>
              <div className="text-xs text-orange-600 space-y-0.5">
                <div>−{MINOR_DEDUCTION} points from daily total</div>
                <div>24-hour privilege suspension</div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="font-bold text-red-700 mb-1">🚨 Major Infraction</div>
              <div className="text-xs text-red-600 space-y-0.5">
                <div>−{MAJOR_DEDUCTION} points from daily total</div>
                <div>48-hour privilege suspension</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">Points cannot go below 0. Multiple infractions stack the deductions but the freeze time is set to the longest applicable period.</p>
        </div>
      </Section>

      <Section title="Canteen Store">
        <div className="space-y-2 text-sm text-slate-600">
          <p>The Canteen Store is available on Sundays. Only youth who are at <strong>Role Model level</strong> on that day can redeem points.</p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1 text-xs text-emerald-700">
            <p className="font-bold">Weekly Point Balance System</p>
            <p>Each week, youth can earn up to <strong>700 points</strong> (100/day × 7 days).</p>
            <p>Their weekly balance = points earned this week − points already spent at canteen.</p>
            <p>Points spent at canteen come out of their weekly balance. Balance resets each Monday.</p>
          </div>
          <p className="text-xs text-slate-400">The system will block a redemption if the youth doesn't have sufficient weekly balance or isn't at Role Model level.</p>
        </div>
      </Section>

      <Section title="Privilege Freeze">
        <p className="text-sm text-slate-600">
          When a youth receives an infraction, their privileges are suspended for 24 hours (minor) or 48 hours (major).
          During a freeze, a red banner will appear on their profile and on the dashboard.
          Privileges are restored automatically when the freeze period ends.
        </p>
      </Section>

      <Section title="Editing Past Entries">
        <p className="text-sm text-slate-600">
          Any past entry can be edited. In <strong>Enter Points</strong>, select the youth and change the date to the day you want to correct.
          The form will load the existing entry and you can update the behaviors, infractions, or notes.
          You can also click <strong>Edit this entry</strong> from a youth's History tab to go directly to that day.
        </p>
      </Section>

      <Section title="Discharge vs. Delete">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <div className="font-bold text-orange-700 mb-1">Discharge</div>
            <div className="text-xs text-orange-600">Removes youth from the active dashboard. All history (points, notes, canteen) is preserved and can be viewed in the Discharged Alumni section. Use this when a youth leaves the program.</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="font-bold text-red-700 mb-1">Delete (X icon)</div>
            <div className="text-xs text-red-600">Permanently removes the youth and all of their historical data. This cannot be undone. Only use this for data entry errors (e.g., a duplicate profile was created).</div>
          </div>
        </div>
      </Section>

      <Section title="Kid of the Week / Month">
        <p className="text-sm text-slate-600">
          The <strong>Kid of the Week</strong> page shows an auto-ranked leaderboard of all active youth based on their total points for the current week or month.
          Rankings update in real-time as points are entered. Use this to recognize and motivate youth.
        </p>
      </Section>

      <Section title="Reports">
        <p className="text-sm text-slate-600">
          The <strong>Reports</strong> page provides aggregate data and trends across all youth and time periods.
          Individual 30-day trend charts are available on each youth's profile page.
        </p>
      </Section>
    </div>
  )
}
