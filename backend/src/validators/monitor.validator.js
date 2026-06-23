const { z } = require('zod')

const monitorTypeEnum = z.enum(['HTTP', 'HTTPS', 'TCP', 'PING'])
const monitorMethodEnum = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])

const createMonitorSchema = z.object({
  workspaceId: z.string().trim().min(1, 'Workspace ID is required'),
  name: z.string().trim().min(2, 'Monitor name must be at least 2 characters').max(120),
  url: z.string().trim().url('Invalid URL'),
  type: monitorTypeEnum.default('HTTP'),
  method: monitorMethodEnum.default('GET'),
  intervalSeconds: z.number().int().min(10, 'Interval must be at least 10 seconds').max(86400).default(60),
  timeoutMs: z.number().int().min(1000, 'Timeout must be at least 1000 ms').max(30000).default(5000),
  expectedStatus: z.string().trim().optional().nullable(),
  headers: z.record(z.any()).optional().nullable(),
  requestBody: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

const updateMonitorSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  url: z.string().trim().url('Invalid URL').optional(),
  type: monitorTypeEnum.optional(),
  method: monitorMethodEnum.optional(),
  intervalSeconds: z.number().int().min(10).max(86400).optional(),
  timeoutMs: z.number().int().min(1000).max(30000).optional(),
  expectedStatus: z.string().trim().optional().nullable(),
  headers: z.record(z.any()).optional().nullable(),
  requestBody: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().optional(),
  status: z.enum(['UP', 'DOWN', 'DEGRADED', 'PAUSED']).optional(),
})

const monitorIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'Monitor ID is required'),
})

module.exports = {
  createMonitorSchema,
  updateMonitorSchema,
  monitorIdParamsSchema,
}