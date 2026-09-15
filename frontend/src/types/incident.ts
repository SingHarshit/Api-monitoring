import type { RcaReport } from './rca'

export interface Incident {
  id: string
  monitorId: string
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  reason: string | null
  startedAt: string
  lastEventAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  rcaReport: RcaReport | null
}