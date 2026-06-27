import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type SuccessPieProps = {
  successfulChecks: number
  failedChecks: number
  timeoutChecks: number
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b']

export default function SuccessPie({ successfulChecks, failedChecks, timeoutChecks }: SuccessPieProps) {
  const data = [
    { name: 'Success', value: successfulChecks },
    { name: 'Failed', value: failedChecks },
    { name: 'Timeout', value: timeoutChecks },
  ]

  return (
    <article className="chart-card">
      <div className="chart-card__header">
        <h3>Outcome split</h3>
        <p>Check result distribution</p>
      </div>

      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}