import type { Monitor } from '../types/monitor'

interface Props {
  monitor: Monitor
  onDelete: (id: string) => void
  onToggle: (id: string) => void
  onEdit: (monitor: Monitor) => void
}

export default function MonitorCard({
  monitor,
  onDelete,
  onToggle,
  onEdit,
}: Props) {
  return (
    <article className="monitor-card">
      <div className="monitor-card__header">
        <div>
          <p className="eyebrow">{monitor.type}</p>
          <h3>{monitor.name}</h3>
        </div>
        <span className={monitor.isActive ? 'badge badge--active' : 'badge badge--inactive'}>
          {monitor.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <p className="monitor-card__url">{monitor.url}</p>

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
          <dt>Workspace</dt>
          <dd>{monitor.workspaceId}</dd>
        </div>
      </dl>

      <div className="monitor-card__actions">
        <button type="button" onClick={() => onEdit(monitor)} className="button button--ghost">
          Edit
        </button>
        <button type="button" onClick={() => onToggle(monitor.id)} className="button button--primary">
          {monitor.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button type="button" onClick={() => onDelete(monitor.id)} className="button button--danger">
          Delete
        </button>
      </div>
    </article>
  )
}