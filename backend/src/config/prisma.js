const path = require('path')
const dotenv = require('dotenv')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const globalForPrisma = globalThis

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma