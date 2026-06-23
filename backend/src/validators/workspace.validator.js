const { z } = require('zod')

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(100),
  slug: z.string().trim().min(2, 'Slug must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  timezone: z.string().trim().min(1).optional(),
})

module.exports = {
  createWorkspaceSchema,
}