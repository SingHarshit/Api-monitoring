const jwt = require('jsonwebtoken')

function generateToken(payload, expiresIn = '7d') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  })
}

module.exports = generateToken