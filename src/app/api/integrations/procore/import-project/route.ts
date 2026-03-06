import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// POST /api/integrations/procore/import-project
// body: { procoreProjectId, procoreCompanyId, name, address? }
// Creates a local Project + ProcoreProjectLink, returns { project }
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { procoreProjectId, procoreCompanyId, name, address } = await req.json()
  if (!procoreProjectId || !procoreCompanyId || !name) {
    return NextResponse.json({ error: 'procoreProjectId, procoreCompanyId, and name are required' }, { status: 400 })
  }

  // Check if already imported (link exists)
  const existing = await prisma.procoreProjectLink.findFirst({
    where: { userId, procoreProjectId: Number(procoreProjectId) },
  })
  if (existing) {
    const project = await prisma.project.findUnique({ where: { id: existing.projectId } })
    return NextResponse.json({ project, alreadyImported: true })
  }

  const project = await prisma.project.create({
    data: {
      userId,
      title: name,
      address: address ?? null,
      status: 'ACTIVE',
    },
  })

  await prisma.procoreProjectLink.create({
    data: {
      userId,
      projectId: project.id,
      procoreProjectId: Number(procoreProjectId),
      procoreCompanyId: Number(procoreCompanyId),
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
