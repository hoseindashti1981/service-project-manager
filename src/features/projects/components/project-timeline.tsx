import { toISODate, formatDateFa } from '@/lib/dates'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { projectStatusLabels } from '@/domain/project/status'
import type { ID } from '@/types'

type Entry = { id: string; date: string; title: string; detail: string; tone: string; recordedAt?: number }
const dateLabels: Record<string, string> = { startDate: 'تاریخ پروژه', agreementDate: 'توافق', executionStartDate: 'شروع اجرا', plannedEndDate: 'موعد پایان', actualEndDate: 'پایان اجرا', deliveryDate: 'تحویل' }
export function ProjectTimeline({ projectId, createdAt, startDate }: { projectId: ID; createdAt: number; startDate?: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [project, activities, changes] = await Promise.all([db.projects.get(projectId), db.projectActivities.where('projectId').equals(projectId).toArray(), db.projectChanges.where('projectId').equals(projectId).toArray()])
      const audit = project?.activityAudit || []
      const rows: Entry[] = [
        { id: 'created', date: startDate || toISODate(new Date(createdAt)), title: 'تاریخ پروژه', detail: 'شروع ثبت اطلاعات پروژه', tone: 'bg-slate-400', recordedAt: createdAt },
        ...(project?.statusHistory || []).map((entry): Entry => ({ id: entry.id, date: entry.effectiveDate, title: entry.kind === 'dates' ? 'اصلاح تاریخ‌های پروژه' : `${entry.from ? projectStatusLabels[entry.from] : 'ثبت اولیه'} ← ${projectStatusLabels[entry.to]}`, detail: [entry.reason, ...Object.keys(entry.datesAfter || {}).filter((key) => entry.datesBefore?.[key] !== entry.datesAfter?.[key]).map((key) => `${dateLabels[key] || key}: ${entry.datesBefore?.[key] ? formatDateFa(entry.datesBefore[key]!) : 'تعیین نشده'} ← ${entry.datesAfter?.[key] ? formatDateFa(entry.datesAfter[key]!) : 'تعیین نشده'}`)].filter(Boolean).join(' · '), tone: 'bg-indigo-500', recordedAt: entry.recordedAt })),
        ...activities.filter((item) => !audit.some((entry) => entry.activityId === item.id)).map((item) => ({ id: item.id, date: item.date, title: item.title, detail: item.note || 'فعالیت روزانه پیش از ثبت تاریخچه', tone: 'bg-sky-500', recordedAt: item.createdAt })),
        ...audit.map((entry): Entry => ({ id: entry.id, date: (entry.after || entry.before)!.date, title: `${entry.action === 'create' ? 'ثبت فعالیت' : entry.action === 'update' ? 'اصلاح فعالیت' : 'حذف فعالیت'}: ${(entry.after || entry.before)!.title}`, detail: [entry.reason, entry.before ? `قبل: ${entry.before.title}، مقدار ${entry.before.quantity ?? '—'}، ${formatDateFa(entry.before.date)}` : '', entry.after ? `بعد: ${entry.after.title}، مقدار ${entry.after.quantity ?? '—'}، ${formatDateFa(entry.after.date)}` : ''].filter(Boolean).join(' · '), tone: entry.action === 'delete' ? 'bg-rose-500' : 'bg-sky-500', recordedAt: entry.recordedAt })),
        ...changes.map((item) => ({ id: item.id, date: item.date, title: `کار اضافه: ${item.title}`, detail: `${item.amount.toLocaleString('fa-IR')} تومان`, tone: 'bg-emerald-500', recordedAt: item.createdAt })),
      ]
      return rows.sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0))
    }).subscribe({ next: setEntries, error: () => setError('بارگذاری تاریخچه ناموفق بود.') })
    return () => subscription.unsubscribe()
  }, [projectId, createdAt, startDate])
  return <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">تاریخچه پروژه</h3>{error && <p role="alert">{error}</p>}<div className="mt-4 space-y-4">{entries.map((item) => <div key={item.id} className="relative border-r-2 border-slate-100 pr-5"><span className={`absolute -right-1.5 top-1 h-3 w-3 rounded-full ${item.tone}`} /><p className="text-xs text-slate-500">تاریخ مؤثر: {formatDateFa(item.date)}</p><b className="text-sm">{item.title}</b><p className="mt-1 text-xs text-slate-600">{item.detail}</p>{item.recordedAt && <p className="mt-1 text-xs text-slate-400">زمان ثبت: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(item.recordedAt)}</p>}</div>)}</div></section>
}
