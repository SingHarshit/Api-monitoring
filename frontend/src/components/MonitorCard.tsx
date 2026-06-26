import type { Monitor } from '../types/monitor'

interface Props {
  monitor: Monitor
  onDelete: (id: string) => void
  onToggle: (id: string) => void
  onEdit: (monitor: Monitor) => void
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'UP':
      return '#10b981'
    case 'DOWN':
      return '#ef4444'
    case 'DEGRADED':
      return '#f59e0b'
    case 'PAUSED':
      return '#6b7280'
    default:
      return '#64748b'
  }
}

export default function MonitorCard({
  monitor,
  onDelete,
  onToggle,
  onEdit,
}: Props) {
  const statusColor = getStatusColor(monitor.status)
  const isHealthy = monitor.status === 'UP'
  const isDegraded = monitor.status === 'DEGRADED'
  const isDown = monitor.status === 'DOWN'

  return (
    <article className="monitor-card">
      {/* Status Header */}
      <div className="monitor-card__header">
        <div className="monitor-card__title">
          <p className="eyebrow">{monitor.type}</p>
          <h3>{monitor.name}</h3>
        </div>
        <div className="monitor-card__status-group">
          <div className="monitor-card__status" style={{ borderColor: statusColor }}>
            <span
              className="monitor-card__status-dot"
              style={{ backgroundColor: statusColor }}
            />
            <span className="monitor-card__status-text">{monitor.status}</span>
          </div>
          <span className={monitor.isActive ? 'badge badge--active' : 'badge badge--inactive'}>
            {monitor.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* URL */}
      <p className="monitor-card__url" title={monitor.url}>
        {monitor.url}
      </p>

      {/* Live Metrics */}
      <div className="monitor-card__metrics">
        <div className="metric-item">
          <span className="metric-item__label">Response Time</span>
          <span className="metric-item__value">
            {monitor.lastLatencyMs ? `${monitor.lastLatencyMs}ms` : '-'}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-item__label">Last Check</span>
          <span className="metric-item__value">{formatTime(monitor.lastCheckedAt)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-item__label">Uptime</span>
          <span className="metric-item__value">{monitor.uptimePercent?.toFixed(2)}%</span>
        </div>
        {monitor.consecutiveFails > 0 && (
          <div className="metric-item metric-item--alert">
            <span className="metric-item__label">Failures</span>
            <span className="metric-item__value">{monitor.consecutiveFails}</span>
          </div>
        )}
      </div>

      {/* Configuration */}
      <dl className="monitor-card__meta">
        <div>
          <dt>Method</dt>
          <dd>{monitor.method}</dd>
        </div>
        <div>
          <dt>Interval</dt>
          <dd>{monitor.intervalSeconds}s</dd>
        </div>
        <div>
          <dt>Timeout</dt>
          <dd>{monitor.timeoutMs}ms</dd>
        </div>
        <div>
          <dt>Last Status</dt>
          <dd>{monitor.lastStatus || '-'}</dd>
        </div>
      </dl>

      {/* Health Indicator Bar */}
      {monitor.isActive && (
        <div className="monitor-card__health-bar">
          <div
            className={`health-bar ${isHealthy ? 'health-bar--healthy' : isDegraded ? 'health-bar--degraded' : isDown ? 'health-bar--down' : ''}`}
            style={{
              width: `${monitor.uptimePercent ?? 0}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="monitor-card__actions">
        <button
          type="button"
          onClick={() => onEdit(monitor)}
          className="button button--ghost"
          title="Edit monitor configuration"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onToggle(monitor.id)}
          className="button button--primary"
          title={monitor.isActive ? 'Pause monitoring' : 'Resume monitoring'}
        >
          {monitor.isActive ? 'Pause' : 'Resume'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(monitor.id)}
          className="button button--danger"
          title="Delete monitor"
        >
          Delete
        </button>
      </div>
    </article>
  )
}