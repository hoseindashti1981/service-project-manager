import { executionDeadlineStatuses } from '@/domain/project/status'
import { toISODate, isoToJalali, jalaliToIso } from '@/lib/dates'
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { activityRepository } from '@/db/repositories/activity-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { reminderRepository } from '@/db/repositories/reminder-repository'
import type { ProjectActivity } from '@/domain/activity/types'
import type { Project } from '@/domain/project/types'
import type { Reminder } from '@/domain/reminder/types'

const faMonth = new Intl.DateTimeFormat('fa-IR', { month: 'long', year: 'numeric' })
const weekdays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const dateKey = toISODate
const monthStart = (date: Date) => new Date(`${jalaliToIso({ ...isoToJalali(toISODate(date)), day: 1 })}T12:00:00`)
function shiftMonth(date: Date, delta: number) { const selected = isoToJalali(toISODate(date)); const index = selected.year * 12 + selected.month - 1 + delta; return new Date(`${jalaliToIso({ year: Math.floor(index / 12), month: index % 12 + 1, day: 1 })}T12:00:00`) }
function groupByDate<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item)
    ;(groups[key] ??= []).push(item)
    return groups
  }, {})
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => monthStart(new Date()))
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  useEffect(() => { void Promise.all([activityRepository.getAll(), projectRepository.getAll(), reminderRepository.getOpen()]).then(([allActivities, projectList, reminderList]) => { setActivities(allActivities); setProjects(projectList); setReminders(reminderList) }) }, [])

  const days = useMemo(() => {
    const first = monthStart(cursor)
    const start = new Date(first); start.setDate(first.getDate() - ((first.getDay() + 1) % 7))
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day })
  }, [cursor])
  const activityMap = useMemo(() => groupByDate(activities, (item) => item.date), [activities])
  const reminderMap = useMemo(() => groupByDate(reminders, (item) => item.dueDate), [reminders])
  const plannedMap = useMemo(() => groupByDate(projects.filter((item) => item.plannedEndDate && executionDeadlineStatuses.includes(item.status)), (item) => item.plannedEndDate!), [projects])
  const today = dateKey(new Date())

  return <div className="space-y-5"><div><h1 className="text-2xl font-bold">تقویم کارها</h1><p className="mt-1 text-sm text-slate-500">فعالیت‌ها، یادآوری‌ها و موعد پروژه‌ها در یک نما.</p></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between border-b border-slate-100 p-4"><button aria-label="ماه بعد" onClick={() => setCursor(shiftMonth(cursor, 1))} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight size={20} /></button><div className="text-center"><h2 className="font-bold">{faMonth.format(cursor)}</h2><button onClick={() => setCursor(monthStart(new Date()))} className="mt-1 text-xs text-indigo-600">بازگشت به امروز</button></div><button aria-label="ماه قبل" onClick={() => setCursor(shiftMonth(cursor, -1))} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft size={20} /></button></header><div className="grid grid-cols-7 border-b border-slate-100">{weekdays.map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const key = dateKey(day); const inMonth = isoToJalali(key).month === isoToJalali(dateKey(cursor)).month; const dayActivities = activityMap[key] || []; const dayReminders = reminderMap[key] || []; const dayProjects = plannedMap[key] || []; return <div key={key} className={`min-h-24 border-b border-l border-slate-100 p-1.5 sm:min-h-32 ${inMonth ? 'bg-white' : 'bg-slate-50/70'}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${key === today ? 'bg-indigo-600 font-bold text-white' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}>{new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(day)}</span><div className="mt-1 space-y-1">{dayReminders.slice(0, 2).map((item) => <p key={item.id} title={item.title} className="truncate rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-800">{item.title}</p>)}{dayProjects.slice(0, 1).map((item) => <p key={item.id} title={item.title} className="truncate rounded bg-rose-50 px-1 py-0.5 text-[10px] text-rose-700">موعد: {item.title}</p>)}{dayActivities.length > 0 && <p className="truncate rounded bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-700">{dayActivities.length} فعالیت</p>}</div></div> })}</div></section><p className="text-xs text-slate-500"><span className="text-amber-700">زرد:</span> یادآوری · <span className="text-rose-700">قرمز:</span> موعد پروژه · <span className="text-emerald-700">سبز:</span> فعالیت ثبت‌شده</p></div>
}
