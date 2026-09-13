const { z } = require('zod')

const incidentStatusSchema = z.enum([
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
])

const incidentParamsSchema = z.object({
  monitorId: z.string().trim().min(1, 'Monitor ID is required'),
})

const incidentDetailParamsSchema = z.object({
  monitorId: z.string().trim().min(1, 'Monitor ID is required'),
  incidentId: z.string().trim().min(1, 'Incident ID is required'),
})

const incidentQuerySchema = z.object({
  status: incidentStatusSchema.optional(),
})

const updateIncidentSchema = z.object({
  status: incidentStatusSchema,
})

module.exports = {
  incidentParamsSchema,
  incidentDetailParamsSchema,
  incidentQuerySchema,
  updateIncidentSchema,
}