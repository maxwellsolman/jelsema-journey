import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, parseISO } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white shadow-lg rounded-xl px-3 py-2 text-sm border border-slate-100">
        <div className="font-semibold text-slate-700">{label}</div>
        <div className="text-emerald-600 font-bold">{payload[0].value} pts</div>
      </div>
    )
  }
  return null
}

export default function TrendChart({ data = [], color = '#10b981', height = 200 }) {
  const formatted = data.map(d => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'MMM d'),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={86} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Role Model', position: 'right', fontSize: 10, fill: '#10b981' }} />
        <ReferenceLine y={66} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Rising', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
        <Line
          type="monotone"
          dataKey="total_pts"
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
