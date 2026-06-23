const prisma = require('../config/prisma')

function makeSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function createWorkspace(req, res, next) {
  try {
    const { name, slug, description, timezone } = req.body
    const ownerId = req.user.userId

    const finalSlug = slug || makeSlug(name)

    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: finalSlug },
    })

    if (existingWorkspace) {
      return res.status(409).json({
        success: false,
        message: 'Workspace slug already exists',
      })
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug: finalSlug,
        description: description ?? null,
        timezone: timezone || 'UTC',
        ownerId,
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: workspace,
    })
  } catch (error) {
    next(error)
  }
}

async function getWorkspaces(req, res, next) {
  try {
    const userId = req.user.userId

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return res.status(200).json({
      success: true,
      data: workspaces,
    })
  } catch (error) {
    next(error)
  }
}

async function getWorkspaceById(req, res, next) {
  try {
    const { id } = req.params

    const workspace = await prisma.workspace.findUnique({
      where: { id },
    })

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      })
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
}