export type MonitorType = 'HTTP' | 'HTTPS' | 'TCP' | 'PING'

export type MonitorMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'PAUSED'

export type CheckStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT'

export interface Monitor {
  id: string
  workspaceId: string
  name: string
  url: string
  type: MonitorType
  method: MonitorMethod
  intervalSeconds: number
  timeoutMs: number
  expectedStatus?: string | null
  headers?: Record<string, unknown> | null
  requestBody?: Record<string, unknown> | null
  isActive: boolean
  status: MonitorStatus
  lastCheckedAt?: string | null
  lastStatus?: CheckStatus | null
  lastLatencyMs?: number | null
  consecutiveFails?: number
  uptimePercent?: number
  createdAt: string
  updatedAt: string
}

export interface MonitorFormValues {
  workspaceId: string
  name: string
  url: string
  type: MonitorType
  method: MonitorMethod
  intervalSeconds: number
  timeoutMs: number
  expectedStatus: string
  isActive: boolean
}

export interface MonitorUpdateValues {
  name: string
  url: string
  type: MonitorType
  method: MonitorMethod
  intervalSeconds: number
  timeoutMs: number
  expectedStatus: string
  isActive: boolean
}