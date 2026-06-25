import { useEffect, useMemo, useState } from 'react'
import {
  createMonitor,
  deleteMonitor,
  getMonitors,
  toggleMonitor,
  updateMonitor,
} from '../api/monitorApi'
import CreateMonitorModal from '../components/CreateMonitorModal'
import EditMonitorModal from '../components/EditMonitorModal'
import MonitorCard from '../components/MonitorCard'
import type { Monitor, MonitorFormValues, MonitorUpdateValues } from '../types/monitor'

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

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null)

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

  const stats = useMemo(() => {
    const activeCount = monitors.filter((monitor) => monitor.isActive).length
    const inactiveCount = monitors.length - activeCount
    const averageUptime = monitors.length
      ? Math.round(monitors.reduce((sum, monitor) => sum + (monitor.uptimePercent ?? 0), 0) / monitors.length)
      : 0

    return { activeCount, inactiveCount, averageUptime }
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
          <p className="eyebrow">Phase 2 Endpoint Dashboard</p>
          <h1>Monitor every endpoint from one place.</h1>
          <p className="hero__copy">
            Create monitors, edit them inline, toggle active state, and keep the dashboard usable even when the API is offline.
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
          <span className="stat__label">Monitors</span>
          <strong className="stat__value">{monitors.length}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Active</span>
          <strong className="stat__value">{stats.activeCount}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Inactive</span>
          <strong className="stat__value">{stats.inactiveCount}</strong>
        </article>
        <article className="stat panel">
          <span className="stat__label">Average uptime</span>
          <strong className="stat__value">{stats.averageUptime}%</strong>
        </article>
      </section>

      {error ? <div className="banner panel">{error}</div> : null}

      <section className="panel surface">
        <div className="surface__header">
          <div>
            <p className="eyebrow">Endpoint list</p>
            <h2>Manage monitors</h2>
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
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onEdit={setEditingMonitor}
              />
            ))}
          </div>
        )}
      </section>

      <CreateMonitorModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <EditMonitorModal open={Boolean(editingMonitor)} monitor={editingMonitor} onClose={() => setEditingMonitor(null)} onSave={handleSave} />
    </main>
  )
}