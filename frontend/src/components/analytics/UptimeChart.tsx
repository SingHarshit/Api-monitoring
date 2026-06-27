import {
  Area,
  AreaChart,
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

type UptimeChartProps = {
  data: HistoryItem[]
}

export default function UptimeChart({ data }: UptimeChartProps) {
  const chartData = data.map((item) => ({
    time: new Date(item.bucketStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    uptime: item.uptimePercent ?? 0,
  }))

  return (
    <article className="chart-card">
      <div className="chart-card__header">
        <h3>Uptime trend</h3>
        <p>Hourly uptime percentage</p>
      </div>

      <div className="chart-card__body">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="uptimeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
            />
            <Area type="monotone" dataKey="uptime" stroke="#22c55e" fill="url(#uptimeFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}