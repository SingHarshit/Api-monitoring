import axiosClient from './axiosClient'
export interface AnalyticsWindowResponse {
  monitorId: string
  windowHours: number
  totalChecks?: number
  successfulChecks?: number
  failedChecks?: number
  timeoutChecks?: number
  successRatePercent?: number
  uptimePercent?: number
  downtimePercent?: number
  sampleSize?: number
  averageLatencyMs?: number | null
  minLatencyMs?: number | null
  maxLatencyMs?: number | null
  from?: string
  to?: string
  data?: Array<{
    bucketStart: string
    bucketEnd: string
    totalChecks: number
    successfulChecks: number
    failedChecks: number
    timeoutChecks: number
    averageLatencyMs: number | null
    successRatePercent?: number
    uptimePercent?: number
    downtimePercent?: number
  }>
}

export const getUptimeAnalytics = async (monitorId: string, hours = 24) => {
  const res = await axiosClient.get(`/analytics/${monitorId}/uptime`, {
    params: { hours },
  })

  return res.data.data as AnalyticsWindowResponse
}

export const getLatencyAnalytics = async (monitorId: string, hours = 24) => {
  const res = await axiosClient.get(`/analytics/${monitorId}/latency`, {
    params: { hours },
  })

  return res.data.data as AnalyticsWindowResponse
}

export const getHistoryAnalytics = async (monitorId: string, hours = 24) => {
  const res = await axiosClient.get(`/analytics/${monitorId}/history`, {
    params: { hours },
  })

  return res.data.data as AnalyticsWindowResponse
}

export const getSuccessRateAnalytics = async (monitorId: string, hours = 24) => {
  const res = await axiosClient.get(`/analytics/${monitorId}/success-rate`, {
    params: { hours },
  })

  return res.data.data as AnalyticsWindowResponse
}