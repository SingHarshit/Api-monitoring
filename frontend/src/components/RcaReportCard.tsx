import { useCallback, useEffect, useState } from 'react'
import {
	enqueueIncidentRca,
	getIncidentRca,
} from '../api/incidentApi'
import { useRcaSocket } from '../hooks/useMonitorSocket'
import type {
	RcaCompletedEvent,
	RcaReport,
} from '../types/rca'
import RcaEvidence from './RcaEvidence'

type RcaReportCardProps = {
	monitorId: string
	workspaceId: string
	incidentId: string
	initialReport?: RcaReport | null
}

export default function RcaReportCard({
	monitorId,
	workspaceId,
	incidentId,
	initialReport = null,
}: RcaReportCardProps) {
	const [rcaReport, setRcaReport] = useState<RcaReport | null>(initialReport)
	const [isQueueingRca, setIsQueueingRca] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		setRcaReport(initialReport)
	}, [initialReport])

	useEffect(() => {
		if (initialReport) return

		let cancelled = false

		getIncidentRca(monitorId, incidentId)
			.then((report) => {
				if (!cancelled) setRcaReport(report)
			})
			.catch(() => {
				if (!cancelled) setError('Unable to load the RCA report.')
			})

		return () => {
			cancelled = true
		}
	}, [incidentId, initialReport, monitorId])

	const handleRcaCompleted = useCallback(
		(event: RcaCompletedEvent) => {
			if (event.incident.id === incidentId) {
				setRcaReport(event.rcaReport)
				setError('')
			}
		},
		[incidentId],
	)

	useRcaSocket(
		monitorId,
		workspaceId,
		handleRcaCompleted,
	)

	const handleRunRca = async () => {
		setIsQueueingRca(true)
		setError('')

		try {
			await enqueueIncidentRca(
				monitorId,
				incidentId,
				{
					windowHours: 1,
					maxIterations: 3,
				},
			)

			setRcaReport((current) => ({
				...(current ?? {
					id: '',
					incidentId,
					rootCause: null,
					explanation: null,
					confidence: null,
					hypotheses: null,
					evidence: null,
					validation: null,
					recommendedActions: null,
					alternativeHypotheses: null,
					errors: null,
					iterations: 0,
					startedAt: null,
					completedAt: null,
					createdAt: '',
					updatedAt: '',
				}),
				status: 'RUNNING',
			}))
		} catch (requestError) {
			console.error(requestError)
			setError('Unable to start the RCA investigation.')
		} finally {
			setIsQueueingRca(false)
		}
	}

	const confidence = rcaReport?.confidence

	return (
		<article className="panel surface">
			<div className="surface__header">
				<div>
					<p className="eyebrow">Root Cause Analysis</p>
					<h2>{rcaReport?.rootCause ?? 'No RCA report yet'}</h2>
				</div>
				<span className="surface__count">
					{rcaReport?.status ?? 'NOT_STARTED'}
				</span>
			</div>

			{error ? <div className="banner">{error}</div> : null}

			{confidence !== null && confidence !== undefined ? (
				<p>Confidence: {Math.round(confidence * 100)}%</p>
			) : null}

			{rcaReport?.explanation ? (
				<p>{rcaReport.explanation}</p>
			) : null}

			<RcaEvidence evidence={rcaReport?.evidence ?? null} />

			{rcaReport?.status === 'RUNNING' ? (
				<p>RCA investigation is running...</p>
			) : null}

			<button
				type="button"
				className="button button--primary"
				onClick={handleRunRca}
				disabled={isQueueingRca || rcaReport?.status === 'RUNNING'}
			>
				{isQueueingRca ? 'Starting RCA...' : 'Run RCA'}
			</button>
		</article>
	)
}
