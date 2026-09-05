import { requireDate } from '@/lib/dates'
import { db } from '@/db/db'
import type { CreateMaterialInput, Material } from '@/domain/material/types'
import type { ID } from '@/types'

export const materialRepository = {
  getByProjectId: (projectId: ID) => db.materials.where('projectId').equals(projectId).reverse().sortBy('createdAt'),
  async create(input: CreateMaterialInput): Promise<Material> {
    if (input.date !== undefined) requireDate(input.date)
    const now = Date.now(); const material: Material = { id: crypto.randomUUID(), ...input, title: input.title.trim(), cost: Math.round(input.cost), createdAt: now, updatedAt: now }
    await db.materials.add(material); return material
  },
  delete: (id: ID) => db.materials.delete(id),
}
