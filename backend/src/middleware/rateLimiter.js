const redis = require('../config/redis')

module.exports = function rateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  keyPrefix = 'rl:',
  getId = (req) => req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
} = {}) {
  return async function (req, res, next) {
    try {
      const id = getId(req) || 'anon'
      const windowKey = `${keyPrefix}${id}:${Math.floor(Date.now() / windowMs)}`

      const current = await redis.incr(windowKey)
      if (current === 1) {
        await redis.pexpire(windowKey, windowMs)
      }

      const pttl = await redis.pttl(windowKey) // ms until window resets
      const remaining = Math.max(0, max - current)

      res.set('X-RateLimit-Limit', String(max))
      res.set('X-RateLimit-Remaining', String(remaining))
      res.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + (pttl > 0 ? pttl : windowMs)) / 1000)))

      if (current > max) {
        const retryAfter = Math.ceil((pttl > 0 ? pttl : windowMs) / 1000)
        res.set('Retry-After', String(retryAfter))
        return res.status(429).json({ error: 'Too many requests', retryAfter })
      }

      return next()
    } catch (err) {
      return next(err)
    }
  }
}