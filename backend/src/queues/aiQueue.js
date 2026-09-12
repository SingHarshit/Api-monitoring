const { Queue } = require('bullmq')
const redis = require('../config/redis')

const aiQueue = new Queue('ai-analysis-queue', {
  connection: redis.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
})

module.exports = aiQueue