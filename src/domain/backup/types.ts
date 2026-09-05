export const backupTables = ['customers', 'projects', 'services', 'projectItems', 'projectActivities', 'projectChanges', 'materials', 'expenses', 'quotations', 'invoices', 'payments', 'reminders'] as const
export type BackupTable = typeof backupTables[number]
export type BackupRows = Record<BackupTable, Record<string, unknown>[]>
export const backupTableLabels: Record<BackupTable, string> = { customers: 'مشتری‌ها', projects: 'پروژه‌ها و تاریخچه', services: 'خدمات', projectItems: 'خدمات پروژه', projectActivities: 'فعالیت‌ها', projectChanges: 'کارهای اضافه', materials: 'مصالح', expenses: 'هزینه‌ها', quotations: 'پیش‌فاکتورها', invoices: 'فاکتورها', payments: 'پرداخت‌ها', reminders: 'یادآورها' }
export interface BackupData { format: 'lineyar-backup'; version: 2; exportedAt: string; data: BackupRows; checksum: { algorithm: 'SHA-256'; value: string } }
export interface BackupPreview { version: 1 | 2; exportedAt: string; data: BackupRows; counts: Record<BackupTable, number>; warnings: string[] }
export interface RecoverySnapshot { id: 'latest'; exportedAt: string; data: BackupRows }
