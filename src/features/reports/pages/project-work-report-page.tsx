import { useEffect, useMemo, useState } from 'react'
import { liveQuery } from 'dexie'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'

import { activityRepository } from '@/db/repositories/activity-repository'
import { readProjectFinancialPosition } from '@/db/repositories/accounting-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import type { ProjectActivity } from '@/domain/activity/types'
import type { Customer } from '@/domain/customer/types'
import type { ProjectFinancialPosition } from '@/domain/finance/financial-position'
import type { Project } from '@/domain/project/types'
import { formatDateFa } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface ReportData {
  customers: Customer[]
  projects: Project[]
  activities: ProjectActivity[]
  financial?: ProjectFinancialPosition
}

const emptyData: ReportData = { customers: [], projects: [], activities: [] }

export function ProjectWorkReportPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/reports/project-work' })
  const [data, setData] = useState<ReportData>(emptyData)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const subscription = liveQuery(async (): Promise<ReportData> => {
      const [customers, projects, activities, financial] = await Promise.all([
        customerRepository.getAll(),
        projectRepository.getAll(),
        search.projectId ? activityRepository.getByProjectId(search.projectId) : Promise.resolve([]),
        search.projectId ? readProjectFinancialPosition(search.projectId) : Promise.resolve(undefined),
      ])
      return { customers, projects, activities, financial }
    }).subscribe({
      next: (value) => { setData(value); setError('') },
      error: () => setError('بارگذاری گزارش کار پروژه ناموفق بود.'),
    })
    return () => subscription.unsubscribe()
  }, [search.projectId])

  const selectedProject = data.projects.find((project) => project.id === search.projectId
    && (!search.customerId || project.customerId === search.customerId))
  const customerId = search.customerId || selectedProject?.customerId || ''
  const projects = data.projects.filter((project) => project.customerId === customerId)
  const workDays = useMemo(() => {
    const grouped = new Map<string, ProjectActivity[]>()
    for (const activity of data.activities) grouped.set(activity.date, [...(grouped.get(activity.date) || []), activity])
    return [...grouped.entries()]
      .map(([date, activities]) => ({ date, activities: activities.sort((a, b) => b.createdAt - a.createdAt) }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [data.activities])
  const selectedDay = workDays.find((day) => day.date === selectedDate)
  const generatedAt = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

  function chooseCustomer(value: string) {
    setSelectedDate(null)
    void navigate({ to: '/reports/project-work', search: { customerId: value || undefined, projectId: undefined }, replace: true })
  }

  function chooseProject(value: string) {
    setSelectedDate(null)
    void navigate({ to: '/reports/project-work', search: { customerId: customerId || undefined, projectId: value || undefined }, replace: true })
  }

  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="space-y-2">
      <Link to="/reports" className="inline-flex min-h-11 items-center text-sm text-indigo-700">← بازگشت به گزارش‌ها</Link>
      <h1 className="text-2xl font-black text-slate-900">گزارش کار پروژه</h1>
      <p className="text-sm leading-7 text-slate-500">روزهای حضور و فعالیت‌های ثبت‌شده، همراه با وضعیت مالی همان پروژه</p>
    </header>

    <section aria-label="انتخاب پروژه گزارش" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <label className="space-y-1 text-sm font-semibold text-slate-700">مشتری
        <select aria-label="مشتری گزارش" value={customerId} onChange={(event) => chooseCustomer(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal">
          <option value="">انتخاب مشتری</option>
          {data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} — {customer.mobile}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm font-semibold text-slate-700">پروژه
        <select aria-label="پروژه گزارش" value={selectedProject?.id || ''} disabled={!customerId} onChange={(event) => chooseProject(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal disabled:bg-slate-100">
          <option value="">{customerId ? 'انتخاب پروژه' : 'ابتدا مشتری را انتخاب کنید'}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </label>
    </section>

    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>}

    {selectedProject && data.financial && <>
      <section aria-label="خلاصه گزارش پروژه" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="font-black text-slate-900">{selectedProject.title}</h2><p className="text-sm text-slate-500">{data.customers.find((customer) => customer.id === selectedProject.customerId)?.name}</p></div>
          <p className="text-xs text-slate-400">گزارش تا {generatedAt}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard icon="📅" label="روزهای کاری" value={`${workDays.length.toLocaleString('fa-IR')} روز`} tone="sky" />
          <SummaryCard icon="🔧" label="فعالیت‌های ثبت‌شده" value={`${data.activities.length.toLocaleString('fa-IR')} فعالیت`} tone="indigo" />
          <SummaryCard icon="📥" label="مجموع دریافتی" value={formatMoney(data.financial.received)} tone="emerald" />
          <SummaryCard icon={data.financial.credit > 0 ? '✅' : '💰'} label={data.financial.credit > 0 ? 'بستانکاری مشتری' : 'مانده طلب'} value={formatMoney(data.financial.credit || data.financial.outstanding)} tone={data.financial.credit > 0 ? 'violet' : 'amber'} />
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs leading-6 text-slate-500">مانده طلب بر پایه فاکتورهای صادرشده و دریافت‌های ثبت‌شده محاسبه می‌شود؛ فعالیت‌ها به‌تنهایی بدهی قطعی ایجاد نمی‌کنند.</p>
      </section>

      {selectedDay ? <section aria-label={`فعالیت‌های ${formatDateFa(selectedDay.date)}`} className="space-y-3">
        <button type="button" onClick={() => setSelectedDate(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-indigo-700">← بازگشت به روزهای پروژه</button>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs text-indigo-600">فعالیت‌های این روز</p><h2 className="mt-1 text-lg font-black text-indigo-950">{formatDateFa(selectedDay.date)}</h2></div>
        {selectedDay.activities.map((activity) => <article key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-slate-900">{activity.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            {activity.quantity !== undefined && <span>مقدار: {activity.quantity.toLocaleString('fa-IR')} {activity.unit || ''}</span>}
            {activity.amount !== undefined && <span>مبلغ: {formatMoney(activity.amount)}</span>}
          </div>
          {activity.note && <p className="mt-3 whitespace-pre-wrap break-words border-t border-slate-100 pt-3 text-sm leading-7 text-slate-600">{activity.note}</p>}
        </article>)}
      </section> : <section aria-label="روزهای کاری پروژه" className="space-y-3">
        <div><h2 className="text-lg font-black text-slate-900">روزهای دارای فعالیت</h2><p className="text-sm text-slate-500">برای دیدن جزئیات، یکی از روزها را انتخاب کنید.</p></div>
        {workDays.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">هنوز فعالیتی برای این پروژه ثبت نشده است.</p> : <div className="grid gap-3 sm:grid-cols-2">{workDays.map((day) => <button key={day.date} type="button" onClick={() => setSelectedDate(day.date)} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50">
          <span><b className="block text-slate-900">{formatDateFa(day.date)}</b><span className="mt-1 block text-xs text-slate-500">{day.activities.length.toLocaleString('fa-IR')} فعالیت</span></span><span aria-hidden="true" className="text-xl text-indigo-600">←</span>
        </button>)}</div>}
      </section>}
    </>}

    {!selectedProject && customerId && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">پروژه موردنظر را انتخاب کنید.</p>}
  </div>
}

function SummaryCard({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'sky' | 'indigo' | 'emerald' | 'amber' | 'violet' }) {
  const colors = { sky: 'bg-sky-50 text-sky-950', indigo: 'bg-indigo-50 text-indigo-950', emerald: 'bg-emerald-50 text-emerald-950', amber: 'bg-amber-50 text-amber-950', violet: 'bg-violet-50 text-violet-950' }
  return <article className={`rounded-2xl p-4 ${colors[tone]}`}><p className="text-xs opacity-70">{icon} {label}</p><p className="mt-2 break-words text-base font-black sm:text-lg">{value}</p></article>
}
