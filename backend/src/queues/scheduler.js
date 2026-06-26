const pingQueue = require('./pingQueue')
const prisma = require('../config/prisma')

async function clearPingRepeatJobs() {
  const repeatJobs = await pingQueue.getRepeatableJobs()

  for (const job of repeatJobs) {
    await pingQueue.removeRepeatableByKey(job.key)
  }

  return repeatJobs.length
}

async function scheduleActiveMonitors() {
  const monitors = await prisma.monitor.findMany({
    where: { isActive: true },
    select: {
      id: true,
      url: true,
      method: true,
      timeoutMs: true,
      intervalSeconds: true,
    },
  })

  for (const monitor of monitors) {
    await pingQueue.add(
      `monitor-${monitor.id}`,
      {
        monitorId: monitor.id,
        url: monitor.url,
        method: monitor.method,
        timeoutMs: monitor.timeoutMs,
      },
      {
        repeat: {
          every: monitor.intervalSeconds * 1000,
        },
        jobId: `repeat-${monitor.id}`,
      }
    )
  }

  return monitors.length
}

async function startPingScheduler(options = {}) {
  const { cleanExisting = false } = options

  if (cleanExisting) {
    const removed = await clearPingRepeatJobs()
    console.log(`Removed ${removed} stale repeat jobs`)
  }

  const scheduled = await scheduleActiveMonitors()
  console.log(`Scheduled ${scheduled} monitors`)

  return { scheduled }
}

module.exports = {
  startPingScheduler,
  clearPingRepeatJobs,
  scheduleActiveMonitors,
}