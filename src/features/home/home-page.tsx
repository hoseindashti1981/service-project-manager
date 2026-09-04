import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { projectRepository } from '@/db/repositories/project-repository'
import { activityRepository } from '@/db/repositories/activity-repository'
import { financeRepository } from '@/db/repositories/finance-repository'
import { formatMoney } from '@/lib/money'

export function HomePage() {
  const [stats, setStats] = useState({ active: 0, today: 0, billed: 0, received: 0 })
  useEffect(() => { void (async () => { const [projects, activities, invoices, payments] = await Promise.all([projectRepository.getAll(), activityRepository.getToday(), financeRepository.getInvoices(), financeRepository.getPayments()]); setStats({ active: projects.filter((p) => p.status === 'active').length, today: activities.length, billed: invoices.filter((i) => i.status !== 'void').reduce((sum, i) => sum + i.total, 0), received: payments.reduce((sum, p) => sum + p.amount, 0) }) })() }, [])
  const cards = [['پروژه‌های فعال', String(stats.active)], ['فعالیت‌های امروز', String(stats.today)], ['فاکتورهای معتبر', formatMoney(stats.billed)], ['دریافتی ثبت‌شده', formatMoney(stats.received)]]
  return <div className="space-y-6"><div><h2 className="text-xl font-bold">داشبورد</h2><p className="mt-1 text-sm text-slate-500">نمای لحظه‌ای از کارها و وضعیت مالی</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([title, value]) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-lg font-bold">{value}</p></div>)}</div><div className="grid gap-3 sm:grid-cols-3"><Link to="/customers/new" className="rounded-xl bg-slate-800 p-4 text-center text-sm font-medium text-white">مشتری جدید</Link><Link to="/projects/new" className="rounded-xl bg-emerald-600 p-4 text-center text-sm font-medium text-white">پروژه جدید</Link><Link to="/activities/today" className="rounded-xl border bg-white p-4 text-center text-sm font-medium">ثبت فعالیت امروز</Link></div></div>
}
