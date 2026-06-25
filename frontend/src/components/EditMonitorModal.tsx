import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Monitor, MonitorUpdateValues } from '../types/monitor'

interface Props {
	monitor: Monitor | null
	open: boolean
	onClose: () => void
	onSave: (id: string, data: Partial<MonitorUpdateValues>) => Promise<void> | void
}

export default function EditMonitorModal({ monitor, open, onClose, onSave }: Props) {
	const [form, setForm] = useState<MonitorUpdateValues>({
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
		if (!monitor) {
			return
		}

		setForm({
			name: monitor.name,
			url: monitor.url,
			type: monitor.type,
			method: monitor.method,
			intervalSeconds: monitor.intervalSeconds,
			timeoutMs: monitor.timeoutMs,
			expectedStatus: monitor.expectedStatus ?? '200',
			isActive: monitor.isActive,
		})
	}, [monitor])

	if (!open || !monitor) {
		return null
	}

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await onSave(monitor.id, form)
		onClose()
	}

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<form className="modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
				<div className="modal__header">
					<div>
						<p className="eyebrow">Edit Endpoint</p>
						<h2 className="modal__title">Update monitor details</h2>
					</div>
					<button type="button" className="icon-button" onClick={onClose} aria-label="Close edit dialog">
						×
					</button>
				</div>

				<div className="field-grid">
					<label className="field">
						<span className="field__label">Name</span>
						<input className="field__input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
					</label>

					<label className="field field--wide">
						<span className="field__label">URL</span>
						<input className="field__input" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required />
					</label>

					<label className="field">
						<span className="field__label">Type</span>
						<select className="field__input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MonitorUpdateValues['type'] })}>
							<option value="HTTP">HTTP</option>
							<option value="HTTPS">HTTPS</option>
							<option value="TCP">TCP</option>
							<option value="PING">PING</option>
						</select>
					</label>

					<label className="field">
						<span className="field__label">Method</span>
						<select className="field__input" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as MonitorUpdateValues['method'] })}>
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
						<input className="field__input" value={form.expectedStatus} onChange={(event) => setForm({ ...form, expectedStatus: event.target.value })} />
					</label>

					<label className="field field--checkbox">
						<input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
						<span className="field__label">Active</span>
					</label>
				</div>

				<div className="modal__footer">
					<button type="button" className="button button--ghost" onClick={onClose}>
						Cancel
					</button>
					<button type="submit" className="button button--primary">
						Save changes
					</button>
				</div>
			</form>
		</div>
	)
}
