import { toISODate, formatDateFa } from '@/lib/dates'
import { useEffect, useState } from 'react'
import { activityRepository } from '@/db/repositories/activity-repository'
import { projectChangeRepository } from '@/db/repositories/project-change-repository'
import type { ID } from '@/types'

type Entry = { id: string; date: string; title: string; detail: string; tone: string }

export function ProjectTimeline({ projectId, createdAt, startDate }: { projectId: ID; createdAt: number; startDate?: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  useEffect(() => { void (async () => { const [activities, changes] = await Promise.all([activityRepository.getByProjectId(projectId), projectChangeRepository.getByProjectId(projectId)]); setEntries([{ id: 'created', date: startDate || toISODate(new Date(createdAt)), title: 'تاریخ پروژه', detail: 'شروع ثبت اطلاعات پروژه', tone: 'bg-slate-400' }, ...activities.map((item) => ({ id: item.id, date: item.date, title: item.title, detail: item.note || 'فعالیت روزانه', tone: 'bg-sky-500' })), ...changes.map((item) => ({ id: item.id, date: item.date, title: `کار اضافه: ${item.title}`, detail: `${item.amount.toLocaleString('fa-IR')} تومان`, tone: 'bg-emerald-500' }))].sort((a, b) => b.date.localeCompare(a.date))) })() }, [projectId, createdAt, startDate])
  return <section className="rounded-2xl border bg-white p-5"><h3 className="font-bold">Timeline پروژه</h3><div className="mt-4 space-y-4">{entries.map((item) => <div key={item.id} className="relative border-r-2 border-slate-100 pr-5"><span className={`absolute -right-1.5 top-1 h-3 w-3 rounded-full ${item.tone}`} /><p className="text-xs text-slate-400">{formatDateFa(item.date)}</p><b className="text-sm">{item.title}</b><p className="mt-1 text-xs text-slate-500">{item.detail}</p></div>)}</div></section>
}
