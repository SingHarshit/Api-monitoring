import { useEffect, useMemo, useState } from 'react'
import {
  createMonitor,
  deleteMonitor,
  getMonitors,
  toggleMonitor,
  updateMonitor,
} from '../api/monitorApi'
import { initializeSocket } from '../sockets/socket'
import { useAllMonitorsSocket, type MonitorStatusUpdate } from '../hooks/useMonitorSocket'
import CreateMonitorModal from '../components/CreateMonitorModal'
import EditMonitorModal from '../components/EditMonitorModal'
import MonitorCard from '../components/MonitorCard'
import RcaReportCard from '../components/RcaReportCard'
import type { Monitor, MonitorFormValues, MonitorUpdateValues } from '../types/monitor'
import type { Incident } from '../types/incident'
import { getIncidents } from '../api/incidentApi'

const demoMonitors: Monitor[] = [
  {
    id: 'demo-1',
    workspaceId: 'demo-workspace',
    name: 'Main API',
    url: 'https://api.example.com/health',
    type: 'HTTPS',
    method: 'GET',
    intervalSeconds: 60,
    timeoutMs: 5000,
    expectedStatus: '200',
    headers: null,
    requestBody: null,
    isActive: true,
    status: 'UP',
    lastCheckedAt: new Date().toISOString(),
    lastStatus: 'SUCCESS',
    lastLatencyMs: 132,
    consecutiveFails: 0,
    uptimePercent: 99.96,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    workspaceId: 'demo-workspace',
    name: 'Payments API',
    url: 'https://payments.example.com/health',
    type: 'HTTPS',
    method: 'GET',
    intervalSeconds: 120,
    timeoutMs: 6000,
    expectedStatus: '200',
    headers: null,
    requestBody: null,
    isActive: false,
    status: 'PAUSED',
    lastCheckedAt: null,
    lastStatus: null,
    lastLatencyMs: null,
    consecutiveFails: 0,
    uptimePercent: 98.4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function buildDemoMonitor(data: MonitorFormValues, index: number): Monitor {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    workspaceId: data.workspaceId,
    name: data.name,
    url: data.url,
    type: data.type,
    method: data.method,
    intervalSeconds: data.intervalSeconds,
    timeoutMs: data.timeoutMs,
    expectedStatus: data.expectedStatus || null,
    headers: null,
    requestBody: null,
    isActive: data.isActive,
    status: 'PAUSED',
    lastCheckedAt: null,
    lastStatus: null,
    lastLatencyMs: null,
    consecutiveFails: 0,
    uptimePercent: 100 - index,
    createdAt: now,
    updatedAt: now,
  }
}

function formatTime(isoString: string | null): string {
  if (!isoString) return 'Never'
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return date.toLocaleDateString()
}

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [incidentsByMonitor, setIncidentsByMonitor] = useState<Record<string, Incident[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [now, setNow] = useState<number>(() => Date.now())

  // Initialize socket connection on mount
  useEffect(() => {
    const socket = initializeSocket()
    
    const handleConnect = () => {
      console.log('Dashboard: Socket connected')
      setIsSocketConnected(true)
    }

    const handleDisconnect = () => {
      console.log('Dashboard: Socket disconnected')
      setIsSocketConnected(false)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    if (socket.connected) {
      setIsSocketConnected(true)
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [])

  const loadMonitors = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await getMonitors()
      setMonitors(data)
    } catch (requestError) {
      console.error(requestError)
      setMonitors(demoMonitors)
      setError('Showing local demo data because the API is unavailable or auth is missing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonitors()
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadIncidents = async () => {
      const entries = await Promise.all(
        monitors.map(async (monitor) => {
          try {
            return [monitor.id, await getIncidents(monitor.id)] as const
          } catch (requestError) {
            console.error(requestError)
            return [monitor.id, []] as const
          }
        }),
      )

      if (!cancelled) {
        setIncidentsByMonitor(Object.fromEntries(entries))
      }
    }

    if (monitors.length > 0) {
      loadIncidents()
    } else {
      setIncidentsByMonitor({})
    }

    return () => {
      cancelled = true
    }
  }, [monitors])

  // Get workspaceId from first monitor or localStorage
  const workspaceId = useMemo(() => {
    return monitors[0]?.workspaceId || localStorage.getItem('workspaceId') || 'demo-workspace'
  }, [monitors])

  // Handle real-time socket updates
  const handleMonitorStatusUpdate = (update: MonitorStatusUpdate) => {
    setMonitors((prev) =>
      prev.map((monitor) =>
        monitor.id === update.monitorId
          ? {
              ...monitor,
              status: update.status === 'UP' ? 'UP' : 'DOWN',
              lastCheckedAt: update.lastCheckedAt,
              lastStatus: update.lastStatus,
              lastLatencyMs: update.lastLatencyMs,
              consecutiveFails: update.consecutiveFails,
              uptimePercent: update.uptimePercent,
            }
          : monitor,
      ),
    )
  }

  // Subscribe to workspace socket updates
  useAllMonitorsSocket(workspaceId, handleMonitorStatusUpdate)

  const stats = useMemo(() => {
    const activeCount = monitors.filter((monitor) => monitor.isActive).length
    const inactiveCount = monitors.length - activeCount
    const upCount = monitors.filter((monitor) => monitor.status === 'UP').length
    const averageUptime = monitors.length
      ? Math.round(monitors.reduce((sum, monitor) => sum + (monitor.uptimePercent ?? 0), 0) / monitors.length)
      : 0

    return { activeCount, inactiveCount, upCount, averageUptime }
  }, [monitors])

  const handleCreate = async (data: MonitorFormValues) => {
    try {
      const created = await createMonitor(data)
      setMonitors((prev) => [created, ...prev])
      return
    } catch (requestError) {
      console.error(requestError)
    }

    setMonitors((prev) => [buildDemoMonitor(data, prev.length), ...prev])
  }

  const handleSave = async (id: string, data: Partial<MonitorUpdateValues>) => {
    try {
      const updated = await updateMonitor(id, data)
      setMonitors((prev) => prev.map((monitor) => (monitor.id === id ? updated : monitor)))
      return
    } catch (requestError) {
      console.error(requestError)
    }

    setMonitors((prev) =>
      prev.map((monitor) =>
        monitor.id === id
          ? {
              ...monitor,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : monitor,
      ),
    )
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMonitor(id)
    } catch (requestError) {
      console.error(requestError)
    }

    setMonitors((prev) => prev.filter((monitor) => monitor.id !== id))
  }

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleMonitor(id)
      setMonitors((prev) => prev.map((monitor) => (monitor.id === id ? updated : monitor)))
      return
    } catch (requestError) {
      console.error(requestError)
    }

    setMonitors((prev) =>
      prev.map((monitor) =>
        monitor.id === id
          ? {
              ...monitor,
              isActive: !monitor.isActive,
              updatedAt: new Date().toISOString(),
            }
          : monitor,
      ),
    )
  }

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Phase 5 Real-Time Dashboard {isSocketConnected && <span style={{ color: '#10b981' }}>● Live</span>}</p>
          <h1>Monitor every endpoint in real-time.</h1>
          <p className="hero__copy">
            Live status updates without page refresh. Watch response times, uptime, and check history update instantly as your endpoints are monitored.
          </p>
        </div>

        <div className="hero__actions">
          <button type="button" className="button button--primary" onClick={() => setCreateOpen(true)}>
            Create endpoint
          </button>
          <button type="button" className="button button--ghost" onClick={loadMonitors}>
            Refresh
          </button>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat panel">
          <span className="stat__label">Total Monitors</span>
          <strong className="stat__value">{monitors.length}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Status Up</span>
          <strong className="stat__value" style={{ color: '#10b981' }}>{stats.upCount}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Active</span>
          <strong className="stat__value">{stats.activeCount}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Average Uptime</span>
          <strong className="stat__value">{stats.averageUptime}%</strong>
        </article>
      </section>

      {error ? <div className="banner panel">{error}</div> : null}

      <section className="panel surface">
        <div className="surface__header">
          <div>
            <p className="eyebrow">Live Endpoint Status</p>
            <h2>Real-time monitoring</h2>
          </div>
          <span className="surface__count">{loading ? 'Loading...' : `${monitors.length} items`}</span>
        </div>

        {loading ? (
          <div className="empty-state">Loading monitors...</div>
        ) : monitors.length === 0 ? (
          <div className="empty-state">No monitors yet. Create the first endpoint to get started.</div>
        ) : (
          <div className="monitor-grid">
            {monitors.map((monitor) => (
              <div key={monitor.id} className="monitor-card-wrapper">
                <MonitorCard
                  monitor={monitor}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                  onEdit={setEditingMonitor}
                />
                
                {/* Live metrics overlay */}
                <div className="monitor-metrics">
                  <div className="metrics-row">
                    <div className="metric">
                      <span className="metric__label">Status</span>
                      <span className={`metric__value status-${monitor.status.toLowerCase()}`}>
                        <span className={`status-dot status-${monitor.status.toLowerCase()}`}></span>
                        {monitor.status}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric__label">Response Time</span>
                      <span className="metric__value">
                        {monitor.lastLatencyMs ? `${monitor.lastLatencyMs}ms` : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="metrics-row">
                    <div className="metric">
                      <span className="metric__label">Last Check</span>
                      <span className="metric__value">{formatTime(monitor.lastCheckedAt ?? null)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric__label">Uptime</span>
                      <span className="metric__value">{monitor.uptimePercent?.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {incidentsByMonitor[monitor.id]?.map((incident) => (
                  <RcaReportCard
                    key={incident.id}
                    monitorId={monitor.id}
                    workspaceId={monitor.workspaceId}
                    incidentId={incident.id}
                    initialReport={incident.rcaReport}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateMonitorModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <EditMonitorModal open={Boolean(editingMonitor)} monitor={editingMonitor} onClose={() => setEditingMonitor(null)} onSave={handleSave} />
    </main>
  )
}