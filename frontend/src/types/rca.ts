export type RcaStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'

export interface RcaReport {
  id: string
  incidentId: string
  status: RcaStatus
  rootCause: string | null
  explanation: string | null
  confidence: number | null
  hypotheses: unknown[] | null
  evidence: RcaEvidenceItem[] | null
  validation: unknown | null
  recommendedActions: string[] | null
  alternativeHypotheses: string[] | null
  errors: string[] | null
  iterations: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EnqueueRcaResponse {
  incidentId: string
  jobId: string
  status: 'QUEUED'
}

export interface RcaCompletedEvent {
  type: 'RCA_COMPLETED'
  incident: {
    id: string
    monitorId: string
    workspaceId?: string
    severity: string
    status: string
  }
  rcaReport: RcaReport
}

export interface RcaEvidenceItem {
  source: string
  tool: string
  summary: string
  data: Record<string, unknown>
  relevance: number
  collectedAt?: string | null
}export interface RcaReport {
  id: string
  incidentId: string
  status: RcaStatus
  rootCause: string | null
  explanation: string | null
  confidence: number | null
  hypotheses: unknown[] | null
  evidence: RcaEvidenceItem[] | null
  validation: unknown | null
  recommendedActions: string[] | null
  alternativeHypotheses: string[] | null
  errors: string[] | null
  iterations: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}