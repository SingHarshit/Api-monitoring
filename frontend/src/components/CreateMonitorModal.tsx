import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { MonitorFormValues } from '../types/monitor'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (data: MonitorFormValues) => Promise<void> | void
}

export default function CreateMonitorModal({
  onCreate,
  onClose,
  open,
}: Props) {
  const [form, setForm] = useState<MonitorFormValues>({
    workspaceId: 'demo-workspace',
    name: '',
    url: '',
    type: 'HTTP',
    method: 'GET',
    intervalSeconds: 60,
    timeoutMs: 5000,
    expectedStatus: '200',
    isActive: true,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    setForm({
      workspaceId: 'demo-workspace',
      name: '',
      url: '',
      type: 'HTTP',
      method: 'GET',
      intervalSeconds: 60,
      timeoutMs: 5000,
      expectedStatus: '200',
      isActive: true,
    })
  }, [open])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await onCreate(form)
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <p className="eyebrow">Create Endpoint</p>
            <h2 className="modal__title">Add a new monitor</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close create dialog">
            ×
          </button>
        </div>

        <div className="field-grid">
          <label className="field">
            <span className="field__label">Workspace ID</span>
            <input className="field__input" value={form.workspaceId} onChange={(event) => setForm({ ...form, workspaceId: event.target.value })} placeholder="demo-workspace" required />
          </label>

          <label className="field">
            <span className="field__label">Name</span>
            <input className="field__input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Checkout API" required />
          </label>

          <label className="field field--wide">
            <span className="field__label">URL</span>
            <input className="field__input" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://api.example.com/health" required />
          </label>

          <label className="field">
            <span className="field__label">Type</span>
            <select className="field__input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MonitorFormValues['type'] })}>
              <option value="HTTP">HTTP</option>
              <option value="HTTPS">HTTPS</option>
              <option value="TCP">TCP</option>
              <option value="PING">PING</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">Method</span>
            <select className="field__input" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as MonitorFormValues['method'] })}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">Interval seconds</span>
            <input className="field__input" type="number" min="10" value={form.intervalSeconds} onChange={(event) => setForm({ ...form, intervalSeconds: Number(event.target.value) })} required />
          </label>

          <label className="field">
            <span className="field__label">Timeout ms</span>
            <input className="field__input" type="number" min="1000" value={form.timeoutMs} onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })} required />
          </label>

          <label className="field">
            <span className="field__label">Expected status</span>
            <input className="field__input" value={form.expectedStatus} onChange={(event) => setForm({ ...form, expectedStatus: event.target.value })} placeholder="200" />
          </label>

          <label className="field field--checkbox">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            <span className="field__label">Start active</span>
          </label>
        </div>

        <div className="modal__footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary">
            Create endpoint
          </button>
        </div>
      </form>
    </div>
  )
}