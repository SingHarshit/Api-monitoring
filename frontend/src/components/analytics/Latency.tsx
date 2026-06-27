import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type HistoryItem = {
  bucketStart: string
  bucketEnd: string
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  timeoutChecks: number
  averageLatencyMs: number | null
  successRatePercent?: number
  uptimePercent?: number
  downtimePercent?: number
}

type LatencyProps = {
  data: HistoryItem[]
}

export default function Latency({ data }: LatencyProps) {
  const chartData = data.map((item) => ({
    time: new Date(item.bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: item.averageLatencyMs ?? 0,
  }))

  return (
    <article className="chart-card">
      <div className="chart-card__header">
        <h3>Latency trend</h3>
        <p>Average response time by hour</p>
      </div>

      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
            />
            <Line type="monotone" dataKey="latency" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}