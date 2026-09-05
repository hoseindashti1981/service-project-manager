import { db } from '@/db/db'
import { backupTables, type BackupRows, type BackupData, type BackupPreview } from '@/domain/backup/types'
import { createBackup, inspectBackup, parseBackup } from '@/domain/backup/validation'
export type { BackupData } from '@/domain/backup/types'

function ensureSupportedSchema() {
  if (db.tables.some(table => table.name !== 'recoverySnapshots' && !backupTables.includes(table.name as typeof backupTables[number]))) throw new Error('ساختار دیتابیس با این نسخه بکاپ سازگار نیست.')
}
async function snapshot(): Promise<BackupRows> {
  const entries = await Promise.all(backupTables.map(async table => [table, await db.table(table).toArray()] as const))
  return Object.fromEntries(entries) as BackupRows
}
export const backupRepository = {
  async export(): Promise<BackupData> {
    ensureSupportedSchema()
    const data = await db.transaction('r', backupTables.map(table => db.table(table)), snapshot)
    const backup = await createBackup(data)
    await inspectBackup(backup)
    return backup
  },
  inspect: inspectBackup,
  async import(value: unknown): Promise<BackupPreview> {
    // Own the validated input: external mutation cannot change rows after verification.
    const preview = await inspectBackup(structuredClone(value))
    ensureSupportedSchema()
    await db.transaction('rw', db.tables, async () => {
      const current = await snapshot()
      const exportedAt = new Date().toISOString()
      // Ensure the safety copy can be restored before altering any business data.
      parseBackup({ version:1, exportedAt, data:current })
      await db.recoverySnapshots.put({ id:'latest', exportedAt, data:current })
      for (const table of backupTables) {
        await db.table(table).clear()
        if (preview.data[table].length) await db.table(table).bulkPut(preview.data[table])
      }
    })
    return preview
  },
  async getRecovery(): Promise<BackupData | undefined> {
    const recovery = await db.recoverySnapshots.get('latest')
    if (!recovery) return undefined
    return createBackup(recovery.data,recovery.exportedAt)
  },
}
