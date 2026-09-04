import { db } from '@/db/db'

const tables = ['customers', 'projects', 'services', 'projectItems', 'projectActivities', 'projectChanges', 'materials', 'expenses', 'quotations', 'invoices', 'payments'] as const
type TableName = typeof tables[number]
export type BackupData = { version: 1; exportedAt: string; data: Record<TableName, unknown[]> }

export const backupRepository = {
  async export(): Promise<BackupData> {
    const data = {} as Record<TableName, unknown[]>
    await Promise.all(tables.map(async (name) => { data[name] = await db.table(name).toArray() }))
    return { version: 1, exportedAt: new Date().toISOString(), data }
  },
  validate(value: unknown): value is BackupData {
    if (!value || typeof value !== 'object') return false
    const backup = value as Partial<BackupData>
    return backup.version === 1 && !!backup.data && tables.every((name) => Array.isArray(backup.data?.[name]))
  },
  async import(backup: BackupData) {
    if (!this.validate(backup)) throw new Error('ساختار فایل بکاپ معتبر نیست')
    await db.transaction('rw', db.customers, db.projects, db.services, db.projectItems, db.projectActivities, db.projectChanges, db.materials, db.expenses, db.quotations, db.invoices, db.payments, async () => {
      for (const name of tables) await db.table(name).clear()
      for (const name of tables) if (backup.data[name].length) await db.table(name).bulkPut(backup.data[name])
    })
  },
}
