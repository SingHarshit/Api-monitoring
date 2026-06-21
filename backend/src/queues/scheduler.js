const pingQueue = require('./pingQueue')
const prisma = require('../config/prisma')

async function startPingScheduler() {
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

  console.log(`Scheduled ${monitors.length} monitors`)
}

module.exports = startPingScheduler