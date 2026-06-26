import { useEffect, useCallback } from 'react'
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

export function useMonitorSocket(
  monitorId: string | null,
  workspaceId: string | null,
  onStatusUpdate: (update: MonitorStatusUpdate) => void,
) {
  const socket = getSocket()

  useEffect(() => {
    if (!socket) return

    // Join workspace room to receive workspace-level updates
    if (workspaceId) {
      socket.emit('join-workspace', workspaceId)
      console.log(`Joined workspace: ${workspaceId}`)
    }

    // Join monitor-specific room for detailed updates
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

    // Listen for monitor-specific status updates
    const handleMonitorStatus = (data: MonitorStatusUpdate) => {
      console.log('Monitor status update:', data)
      onStatusUpdate(data)
    }

    // Listen for workspace-level status updates
    const handleWorkspaceStatus = (data: { monitors: MonitorStatusUpdate[] }) => {
      console.log('Workspace status update:', data)
      data.monitors.forEach(onStatusUpdate)
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

    const handleWorkspaceStatus = (data: { monitors: MonitorStatusUpdate[] }) => {
      data.monitors.forEach(onStatusUpdate)
    }

    socket.on('monitor-status', handleMonitorStatus)
    socket.on('workspace-status', handleWorkspaceStatus)

    return () => {
      socket.off('monitor-status', handleMonitorStatus)
      socket.off('workspace-status', handleWorkspaceStatus)
    }
  }, [socket, onStatusUpdate])
}