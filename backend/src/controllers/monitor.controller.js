const prisma = require('../config/prisma')

function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined
  return Number(value)
}

async function createMonitor(req, res, next) {
  try {
    const {
      workspaceId,
      name,
      url,
      type,
      method,
      intervalSeconds,
      timeoutMs,
      expectedStatus,
      headers,
      requestBody,
      isActive,
    } = req.body

    const monitor = await prisma.monitor.create({
      data: {
        workspaceId,
        name,
        url,
        type,
        method,
        intervalSeconds: toNumber(intervalSeconds),
        timeoutMs: toNumber(timeoutMs),
        expectedStatus: expectedStatus ?? null,
        headers: headers ?? null,
        requestBody: requestBody ?? null,
        isActive: isActive ?? true,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Monitor created successfully',
      data: monitor,
    })
  } catch (error) {
    next(error)
  }
}

async function getMonitors(req, res, next) {
  try {
    const { workspaceId } = req.query

    const where = {}
    if (workspaceId) {
      where.workspaceId = workspaceId
    }

    const monitors = await prisma.monitor.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            checks: true,
            incidents: true,
          },
        },
      },
    })

    return res.status(200).json({
      success: true,
      data: monitors,
    })
  } catch (error) {
    next(error)
  }
}

async function getMonitorById(req, res, next) {
  try {
    const { id } = req.params

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        checks: {
          orderBy: {
            checkedAt: 'desc',
          },
          take: 10,
        },
        incidents: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            checks: true,
            incidents: true,
          },
        },
      },
    })

    if (!monitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    return res.status(200).json({
      success: true,
      data: monitor,
    })
  } catch (error) {
    next(error)
  }
}

async function updateMonitor(req, res, next) {
  try {
    const { id } = req.params
    const {
      name,
      url,
      type,
      method,
      intervalSeconds,
      timeoutMs,
      expectedStatus,
      headers,
      requestBody,
      isActive,
      status,
    } = req.body

    const existingMonitor = await prisma.monitor.findUnique({
      where: { id },
    })

    if (!existingMonitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    const monitor = await prisma.monitor.update({
      where: { id },
      data: {
        name,
        url,
        type,
        method,
        intervalSeconds: intervalSeconds !== undefined ? toNumber(intervalSeconds) : undefined,
        timeoutMs: timeoutMs !== undefined ? toNumber(timeoutMs) : undefined,
        expectedStatus: expectedStatus !== undefined ? expectedStatus : undefined,
        headers: headers !== undefined ? headers : undefined,
        requestBody: requestBody !== undefined ? requestBody : undefined,
        isActive,
        status,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Monitor updated successfully',
      data: monitor,
    })
  } catch (error) {
    next(error)
  }
}

async function deleteMonitor(req, res, next) {
  try {
    const { id } = req.params

    const existingMonitor = await prisma.monitor.findUnique({
      where: { id },
    })

    if (!existingMonitor) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found',
      })
    }

    await prisma.monitor.delete({
      where: { id },
    })

    return res.status(200).json({
      success: true,
      message: 'Monitor deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createMonitor,
  getMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
}