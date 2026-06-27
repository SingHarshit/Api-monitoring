import { useEffect, useMemo, useState } from 'react'
import type { Monitor } from '../types/monitor'
import { getMonitors } from '../api/monitorApi'
import {
getHistoryAnalytics,
getLatencyAnalytics,
getSuccessRateAnalytics,
getUptimeAnalytics,
type AnalyticsWindowResponse,
} from '../api/analyticsApi'
import AnalyticsGrid from '../components/analytics/AnalyticsGrid'
import StatCard from '../components/analytics/StatCard'
import Latency from '../components/analytics/Latency'
import SuccessPie from '../components/analytics/SuccessPie'
import UptimeChart from '../components/analytics/UptimeChart'

type AnalyticsData = {
  uptime: AnalyticsWindowResponse | null
  latency: AnalyticsWindowResponse | null
  history: AnalyticsWindowResponse | null
  successRate: AnalyticsWindowResponse | null
}

export default function Analytics() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [selectedMonitorId, setSelectedMonitorId] = useState('')
  const [hours, setHours] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    uptime: null,
    latency: null,
    history: null,
    successRate: null,
  })

  useEffect(() => {
    const loadMonitors = async () => {
      try {
        const data = await getMonitors()
        setMonitors(data)
        if (data.length > 0) {
          setSelectedMonitorId(data[0].id)
        }
      } catch (requestError) {
        console.error(requestError)
        setError('Unable to load monitors for analytics.')
      }
    }

    loadMonitors()
  }, [])

  useEffect(() => {
    if (!selectedMonitorId) return

    const loadAnalytics = async () => {
      setLoading(true)
      setError('')

      try {
        const [uptime, latency, history, successRate] = await Promise.all([
          getUptimeAnalytics(selectedMonitorId, hours),
          getLatencyAnalytics(selectedMonitorId, hours),
          getHistoryAnalytics(selectedMonitorId, hours),
          getSuccessRateAnalytics(selectedMonitorId, hours),
        ])

        setAnalytics({
          uptime,
          latency,
          history,
          successRate,
        })
      } catch (requestError) {
        console.error(requestError)
        setError('Unable to load analytics data.')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [selectedMonitorId, hours])

  const selectedMonitor = useMemo(
    () => monitors.find((monitor) => monitor.id === selectedMonitorId) ?? null,
    [monitors, selectedMonitorId],
  )

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Analytics Dashboard</p>
          <h1>Track uptime, latency, and success rate.</h1>
          <p className="hero__copy">
            Inspect historical monitor performance and compare the latest check trends over a selected time window.
          </p>
        </div>

        <div className="hero__actions">
          <select
            className="button button--ghost"
            value={selectedMonitorId}
            onChange={(event) => setSelectedMonitorId(event.target.value)}
          >
            {monitors.map((monitor) => (
              <option key={monitor.id} value={monitor.id}>
                {monitor.name}
              </option>
            ))}
          </select>

          <select
            className="button button--ghost"
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard
          label="Monitor"
          value={selectedMonitor ? selectedMonitor.name : 'No monitor selected'}
          hint={selectedMonitor ? selectedMonitor.url : 'Choose a monitor to see analytics'}
        />
        <StatCard
          label="Success Rate"
          value={`${analytics.successRate?.successRatePercent ?? 0}%`}
          hint={`${analytics.successRate?.successfulChecks ?? 0} successful checks`}
        />
        <StatCard
          label="Avg Latency"
          value={
            analytics.latency?.averageLatencyMs !== null && analytics.latency?.averageLatencyMs !== undefined
              ? `${analytics.latency.averageLatencyMs} ms`
              : 'N/A'
          }
          hint={`${analytics.latency?.sampleSize ?? 0} samples`}
        />
        <StatCard
          label="Uptime"
          value={`${analytics.uptime?.uptimePercent ?? 0}%`}
          hint={`${analytics.uptime?.totalChecks ?? 0} total checks`}
        />
      </section>

      {error ? <div className="banner panel">{error}</div> : null}

      <AnalyticsGrid loading={loading}>
        <UptimeChart data={analytics.history?.data ?? []} />
        <Latency data={analytics.history?.data ?? []} />
        <SuccessPie
          successfulChecks={analytics.successRate?.successfulChecks ?? 0}
          failedChecks={analytics.successRate?.failedChecks ?? 0}
          timeoutChecks={analytics.successRate?.timeoutChecks ?? 0}
        />
      </AnalyticsGrid>
    </main>
  )
}