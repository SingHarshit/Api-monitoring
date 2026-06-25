import axiosClient from './axiosClient'
import type { Monitor, MonitorFormValues, MonitorUpdateValues } from '../types/monitor'

export const getMonitors = async (): Promise<Monitor[]> => {
  const res = await axiosClient.get('/monitors')
  return res.data.data
}

export const createMonitor = async (data: MonitorFormValues) => {
  const res = await axiosClient.post('/monitors', data)

  return res.data.data as Monitor
}

export const updateMonitor = async (
  id: string,
  data: Partial<MonitorUpdateValues>
) => {
  const res = await axiosClient.put(`/monitors/${id}`, data)

  return res.data.data as Monitor
}

export const deleteMonitor = async (
  id: string
) => {
  await axiosClient.delete(`/monitors/${id}`)
}

export const toggleMonitor = async (
  id: string
) => {
  const res = await axiosClient.patch(`/monitors/${id}/toggle`)

  return res.data.data as Monitor
}