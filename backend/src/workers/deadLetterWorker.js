
const { Queue, Worker, QueueEvents } = require('bullmq')
const redis = require('../config/redis')

const SOURCE_QUEUE = 'ping-queue'
const DLQ = 'dead-letter-queue'

const sourceQueue = new Queue(SOURCE_QUEUE, {
  connection: redis.options,
})

const deadLetterQueue = new Queue(DLQ, {
  connection: redis.options,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
})

const queueEvents = new QueueEvents(SOURCE_QUEUE, {
  connection: redis.options,
})

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  try {
    const job = await sourceQueue.getJob(jobId)
    if (!job) return

    const maxAttempts = job.opts?.attempts ?? 0
    if (maxAttempts > 0 && job.attemptsMade >= maxAttempts) {
      const payload = {
        originalQueue: SOURCE_QUEUE,
        jobId: String(job.id),
        data: job.data,
        opts: job.opts,
        attemptsMade: job.attemptsMade,
        failedReason,
        failedAt: new Date().toISOString(),
        stack: job.stack || null,
      }

      await deadLetterQueue.add('failed-job', payload)
      console.warn(`Moved job ${job.id} from ${SOURCE_QUEUE} -> ${DLQ}`)
    }
  } catch (err) {
    console.error('DLQ handler error:', err)
  }
})


const dlqWorker = new Worker(
  DLQ,
  async (job) => {
    const info = job.data

   
    console.error('DLQ job processed:', {
      originalQueue: info.originalQueue,
      jobId: info.jobId,
      attemptsMade: info.attemptsMade,
      failedReason: info.failedReason,
    })

    
    return { handledAt: new Date().toISOString() }
  },
  {
    connection: redis.options,
    concurrency: 1,
  }
)

dlqWorker.on('completed', (job) => {
  console.log(`DLQ job ${job.id} completed`)
})

dlqWorker.on('failed', (job, err) => {
  console.error(`DLQ job ${job?.id} failed while processing:`, err?.message || err)
})

module.exports = {
  deadLetterQueue,
  dlqWorker,
  queueEvents,
}