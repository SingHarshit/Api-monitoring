import { useEffect } from 'react'
import { getSocket } from '../sockets/socket'
import type { Monitor, CheckStatus } from '../types/monitor'

export interface MonitorStatusUpdate {
  monitorId: string
  status: 'UP' | 'DOWN'
  latencyMs: number
  httpStatusCode?: number
  lastCheckedAt: string
  lastStatus: CheckStatus
  lastLatencyMs: number
  consecutiveFails: number
  uptimePercent: number
}

function applyUpdateOrArray(data: any, onStatusUpdate: (u: MonitorStatusUpdate) => void) {
  if (!data) return
  if (Array.isArray(data)) {
    data.forEach((d) => onStatusUpdate(d))
    return
  }
  if (Array.isArray(data?.monitors)) {
    data.monitors.forEach((d: MonitorStatusUpdate) => onStatusUpdate(d))
    return
  }


  onStatusUpdate(data as MonitorStatusUpdate)
}

export function useMonitorSocket(
  monitorId: string | null,
  workspaceId: string | null,
  onStatusUpdate: (update: MonitorStatusUpdate) => void,
) {
  const socket = getSocket()

  useEffect(() => {
    if (!socket) return

    if (workspaceId) {
      socket.emit('join-workspace', workspaceId)
      console.log(`Joined workspace: ${workspaceId}`)
    }

    if (monitorId) {
      socket.emit('join-monitor', monitorId)
      console.log(`Joined monitor: ${monitorId}`)
    }

    return () => {
      if (monitorId) {
        socket.emit('leave-monitor', monitorId)
      }
      if (workspaceId) {
        socket.emit('leave-workspace', workspaceId)
      }
    }
  }, [monitorId, workspaceId, socket])

  useEffect(() => {
    if (!socket) return

    const handleMonitorStatus = (data: MonitorStatusUpdate) => {
      console.log('Monitor status update:', data)
      onStatusUpdate(data)
    }

    const handleWorkspaceStatus = (data: any) => {
      console.log('Workspace status update:', data)
      applyUpdateOrArray(data, onStatusUpdate)
    }

    socket.on('monitor-status', handleMonitorStatus)
    socket.on('workspace-status', handleWorkspaceStatus)

    return () => {
      socket.off('monitor-status', handleMonitorStatus)
      socket.off('workspace-status', handleWorkspaceStatus)
    }
  }, [socket, onStatusUpdate])
}

export function useAllMonitorsSocket(
  workspaceId: string | null,
  onStatusUpdate: (update: MonitorStatusUpdate) => void,
) {
  const socket = getSocket()

  useEffect(() => {
    if (!socket || !workspaceId) return

    socket.emit('join-workspace', workspaceId)
    console.log(`Joined workspace for all monitors: ${workspaceId}`)

    return () => {
      socket.emit('leave-workspace', workspaceId)
    }
  }, [workspaceId, socket])

  useEffect(() => {
    if (!socket) return

    const handleMonitorStatus = (data: MonitorStatusUpdate) => {
      onStatusUpdate(data)
    }

    const handleWorkspaceStatus = (data: any) => {
      applyUpdateOrArray(data, onStatusUpdate)
    }

    socket.on('monitor-status', handleMonitorStatus)
    socket.on('workspace-status', handleWorkspaceStatus)

    return () => {
      socket.off('monitor-status', handleMonitorStatus)
      socket.off('workspace-status', handleWorkspaceStatus)
    }
  }, [socket, onStatusUpdate])
}