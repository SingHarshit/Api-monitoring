import axiosClient from './axiosClient'
import type {
  EnqueueRcaResponse,
  RcaReport,
} from '../types/rca'
import type { Incident } from '../types/incident'

export async function getIncidents(
  monitorId: string,
): Promise<Incident[]> {
  const response = await axiosClient.get(
    `/incidents/${monitorId}/incidents`,
  )

  return response.data.data
}

export async function getIncidentRca(
  monitorId: string,
  incidentId: string,
): Promise<RcaReport | null> {
  const response = await axiosClient.get(
    `/incidents/${monitorId}/incidents/${incidentId}/rca`,
  )

  return response.data.data
}

export async function enqueueIncidentRca(
  monitorId: string,
  incidentId: string,
  options: {
    windowHours?: number
    maxIterations?: number
  } = {},
): Promise<EnqueueRcaResponse> {
  const response = await axiosClient.post(
    `/incidents/${monitorId}/incidents/${incidentId}/rca`,
    options,
  )

  return response.data.data
}