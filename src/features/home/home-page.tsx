import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { projectRepository } from '@/db/repositories/project-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import { activityRepository } from '@/db/repositories/activity-repository'
import { financeRepository } from '@/db/repositories/finance-repository'
import { reminderRepository } from '@/db/repositories/reminder-repository'
import { formatMoney } from '@/lib/money'
import { formatDateFa, toISODate } from '@/lib/dates'
import { dashboardStatuses, projectStatusLabels } from '@/domain/project/status'
import type { Project } from '@/domain/project/types'
import type { Reminder } from '@/domain/reminder/types'

export function HomePage() {
  const [data, setData] = useState({ projects: [] as Project[], customers: {} as Record<string, string>, today: 0, outstanding: 0, received: 0, reminders: [] as Reminder[] })
  const [error, setError] = useState('')
  useEffect(() => {
    const subscription = liveQuery(async () => Promise.all([projectRepository.getAll(), activityRepository.getToday(), financeRepository.getInvoices(), financeRepository.getPayments(), reminderRepository.getOpen(), customerRepository.getAll()])).subscribe({
      next: ([projects, activities, invoices, payments, reminders, customers]) => {
        const billed = invoices.filter((item) => item.status !== 'void').reduce((sum, item) => sum + item.total, 0)
        const received = payments.reduce((sum, item) => sum + item.amount, 0)
        setData({ projects, today: activities.length, outstanding: billed - received, received, reminders, customers: Object.fromEntries(customers.map((item) => [item.id, item.name])) })
      }, error: () => setError('بارگذاری داشبورد ناموفق بود.'),
    })
    return () => subscription.unsubscribe()
  }, [])
  const limit = new Date(); limit.setDate(limit.getDate() + 7)
  const due = data.projects.filter((item) => item.plannedEndDate && item.plannedEndDate <= toISODate(limit) && !['completed', 'delivered', 'cancelled'].includes(item.status))
  const colors = ['bg-slate-600', 'bg-sky-600', 'bg-indigo-600', 'bg-violet-600']
  return <div className="space-y-6">
    <section className="rounded-3xl bg-gradient-to-l from-slate-900 to-indigo-900 p-6 text-white"><p className="text-sm text-indigo-200">پنل عملیاتی</p><h2 className="mt-1 text-2xl font-bold">مدیریت پروژه‌ها و کارهای امروز</h2><div className="mt-5 flex flex-wrap gap-2"><Link to="/projects/new" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">پروژه جدید</Link><Link to="/activities/today" className="rounded-xl border border-white/30 px-4 py-2 text-sm">ثبت فعالیت</Link><Link to="/finance" className="rounded-xl border border-white/30 px-4 py-2 text-sm">ثبت مالی</Link></div></section>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <section aria-label="وضعیت پروژه‌ها" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{dashboardStatuses.map((status, index) => <Link key={status} to="/projects" search={{ status }} className={`${colors[index]} rounded-2xl p-5 text-white shadow-sm hover:opacity-90 focus-visible:outline-2`}><p className="text-sm">پروژه‌های {projectStatusLabels[status]}</p><p className="mt-3 text-2xl font-bold">{data.projects.filter((item) => item.status === status).length.toLocaleString('fa-IR')}</p><p className="mt-2 text-xs text-white/80">مشاهده پروژه‌ها ←</p></Link>)}</section>
    <section className="grid gap-3 sm:grid-cols-3"><Link to="/activities/today" className="rounded-2xl bg-sky-50 p-5"><p className="text-sm">فعالیت امروز</p><b>{data.today.toLocaleString('fa-IR')}</b></Link><Link to="/finance" className="rounded-2xl bg-amber-50 p-5"><p className="text-sm">مانده دریافت</p><b>{formatMoney(data.outstanding)}</b></Link><Link to="/finance" className="rounded-2xl bg-emerald-50 p-5"><p className="text-sm">دریافتی</p><b>{formatMoney(data.received)}</b></Link></section>
    <section className="space-y-3"><div className="flex justify-between"><h3 className="font-bold">پروژه‌های پیش‌نویس، در جریان، فعال و برنامه‌ریزی‌شده</h3><Link to="/projects" className="text-sm text-indigo-600">همه</Link></div><div className="grid gap-3 sm:grid-cols-2">{data.projects.filter((item) => dashboardStatuses.includes(item.status)).map((item) => <Link key={item.id} to="/projects/$projectId" params={{ projectId: item.id }} className="block space-y-2 rounded-xl border bg-white p-4 hover:border-indigo-400"><b>{item.title}</b><p className="text-sm text-slate-500">{data.customers[item.customerId] || 'مشتری نامشخص'}</p><span className="inline-block rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700">{projectStatusLabels[item.status]}</span><p className="text-xs text-slate-500">تاریخ پروژه: {formatDateFa(item.startDate || item.createdAt)}</p>{item.plannedEndDate && <p className="text-xs text-slate-500">موعد پایان: {formatDateFa(item.plannedEndDate)}</p>}</Link>)}</div>{!data.projects.some((item) => dashboardStatuses.includes(item.status)) && <p className="text-sm text-slate-500">پروژه‌ای در این وضعیت‌ها ندارید.</p>}</section>
    <section className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><h3 className="font-bold">یادآوری‌ها و موعد پروژه‌ها</h3><Link to="/reminders" className="text-sm text-indigo-600">مدیریت</Link></div><div className="mt-4 space-y-3">{data.reminders.slice(0, 3).map((item) => <Link to="/reminders" key={item.id} className="block rounded-xl bg-amber-50 p-3 text-sm"><b>{item.title}</b><p className="mt-1 text-xs">{formatDateFa(item.dueDate)}</p></Link>)}{due.map((item) => <Link key={item.id} to="/projects/$projectId" params={{ projectId: item.id }} className="block rounded-xl bg-rose-50 p-3 text-sm"><b>{item.title}</b><p className="mt-1 text-xs">موعد پروژه: {formatDateFa(item.plannedEndDate!)}</p></Link>)}{data.reminders.length === 0 && due.length === 0 && <p className="text-sm text-slate-500">مورد فوری ندارید.</p>}</div><Link to="/calendar" className="mt-5 inline-block text-sm text-indigo-600">نمای تقویم ←</Link></section>
  </div>
}
