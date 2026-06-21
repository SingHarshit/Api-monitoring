const { Queue } = require('bullmq')
const redis = require('../config/redis')

const pingQueue = new Queue('ping-queue', {
  connection: redis.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
})

module.exports = pingQueue