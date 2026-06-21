const Redis = require('ioredis')

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('connect', () => {
  console.log('Redis connected')
})

redis.on('ready', () => {
  console.log('Redis ready')
})

redis.on('error', (error) => {
  console.error('Redis error:', error.message)
})

module.exports = redis