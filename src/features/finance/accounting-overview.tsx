import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { liveQuery } from 'dexie'
import { Link, useSearch } from '@tanstack/react-router'
import { BadgeDollarSign, Calculator, CircleDollarSign, Landmark, ReceiptText, TrendingDown, TrendingUp, TriangleAlert, WalletCards } from 'lucide-react'
import { db } from '@/db/db'
import { readAccountingPositions } from '@/db/repositories/accounting-repository'
import { aggregateFinancialPositions, type ProjectFinancialPosition } from '@/domain/finance/financial-position'
import { projectStatusLabels, projectStatusOptions } from '@/domain/project/status'
import type { Customer } from '@/domain/customer/types'
import type { Project } from '@/domain/project/types'
import type { Invoice, Payment } from '@/domain/finance/types'
import { formatDateFa, toISODate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

interface OverviewData {
  positions: ProjectFinancialPosition[]
  projects: Project[]
  customers: Customer[]
  invoices: Invoice[]
  payments: Payment[]
}

type MetricKey = 'forecastNet' | 'earnedNet' | 'unbilledEarned' | 'invoiced' | 'received' | 'outstanding' | 'credit' | 'costs' | 'earnedProfit' | 'overdue' | 'warnings'

interface DetailRow {
  id: string
  title: string
  subtitle: string
  amount?: number
  projectId?: string
  customerId?: string
  invoiceId?: string
  note?: string
}

const metricLabels: Record<MetricKey, string> = {
  forecastNet: 'برآورد فعلی', earnedNet: 'کارکرد خالص', unbilledEarned: 'کارکرد صورتحساب‌نشده', invoiced: 'طلب قطعی',
  received: 'دریافتی', outstanding: 'مانده قابل وصول', credit: 'اعتبار مشتری', costs: 'هزینه‌های ثبت‌شده',
  earnedProfit: 'سود کارکرد', overdue: 'فاکتورهای سررسید گذشته', warnings: 'مغایرت‌های نیازمند بررسی',
}

const warningLabels = {
  'priced-work-before-execution': 'فعالیت قیمت‌دار پیش از ورود پروژه به مرحله اجرا ثبت شده است.',
  'payment-without-issued-invoice': 'دریافت ثبت شده، اما فاکتور قطعی برای پروژه وجود ندارد.',
  'completed-with-unbilled-balance': 'پروژه تکمیل شده، اما بخشی از کارکرد هنوز صورتحساب نشده است.',
  'delivered-with-unbilled-balance': 'پروژه تحویل شده، اما بخشی از کارکرد هنوز صورتحساب نشده است.',
  'invoice-exceeds-earned-work': 'جمع فاکتورهای قطعی از کارکرد قیمت‌دار ثبت‌شده بیشتر است.',
} as const

const emptyData: OverviewData = { positions: [], projects: [], customers: [], invoices: [], payments: [] }

export function AccountingOverview({ onCreateInvoice, onCreatePayment }: { onCreateInvoice?: (projectId: string, customerId: string) => void; onCreatePayment?: (customerId: string, projectId?: string, invoiceId?: string) => void }) {
  const search = useSearch({ from: '/finance' })
  const [data, setData] = useState<OverviewData>(emptyData)
  const [customerId, setCustomerId] = useState(search.customerId ?? '')
  const [projectId, setProjectId] = useState(search.projectId ?? '')
  const [status, setStatus] = useState(search.status ?? '')
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(search.metric ?? null)
  const [error, setError] = useState('')
  const detailsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [positions, projects, customers, invoices, payments] = await Promise.all([
        readAccountingPositions(),
        db.projects.toArray(),
        db.customers.toArray(),
        db.invoices.toArray(),
        db.payments.toArray(),
      ])
      return { positions, projects, customers, invoices, payments }
    }).subscribe({ next: setData, error: () => setError('محاسبه خلاصه حسابداری ناموفق بود.') })
    return () => subscription.unsubscribe()
  }, [])

  const selectedProjects = useMemo(() => data.projects.filter((project) =>
    (!customerId || project.customerId === customerId)
    && (!projectId || project.id === projectId)
    && (!status || project.status === status)), [customerId, data.projects, projectId, status])
  const selectedIds = useMemo(() => new Set(selectedProjects.map((project) => project.id)), [selectedProjects])
  const positions = useMemo(() => data.positions.filter((position) => selectedIds.has(position.projectId)), [data.positions, selectedIds])
  const includeStandalone = !projectId && !status
  const invoices = useMemo(() => data.invoices.filter((invoice) =>
    (!customerId || invoice.customerId === customerId)
    && (invoice.projectId ? selectedIds.has(invoice.projectId) : includeStandalone)), [customerId, data.invoices, includeStandalone, selectedIds])
  const invoiceIds = useMemo(() => new Set(invoices.map((invoice) => invoice.id)), [invoices])
  const payments = useMemo(() => data.payments.filter((payment) =>
    (!customerId || payment.customerId === customerId)
    && (payment.projectId ? selectedIds.has(payment.projectId) : payment.invoiceId ? invoiceIds.has(payment.invoiceId) : includeStandalone)), [customerId, data.payments, includeStandalone, invoiceIds, selectedIds])
  const totals = useMemo(() => aggregateFinancialPositions(positions, { invoices, payments }), [invoices, payments, positions])
  const overdue = useMemo(() => invoices.filter((invoice) => invoice.status === 'issued' && invoice.dueDate && invoice.dueDate < toISODate()).reduce((result, invoice) => {
    const paid = payments.filter((payment) => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amount, 0)
    const remaining = Math.max(0, invoice.total - paid)
    return { count: result.count + (remaining > 0 ? 1 : 0), amount: result.amount + remaining }
  }, { count: 0, amount: 0 }), [invoices, payments])
  const projectsForCustomer = data.projects.filter((project) => !customerId || project.customerId === customerId)
  const projectById = useMemo(() => new Map(data.projects.map((project) => [project.id, project])), [data.projects])
  const customerById = useMemo(() => new Map(data.customers.map((customer) => [customer.id, customer])), [data.customers])
  const standaloneRows = useMemo(() => {
    const rows = new Map<string, { invoiced: number; received: number }>()
    for (const invoice of invoices.filter((item) => !item.projectId && ['issued', 'paid'].includes(item.status))) {
      const current = rows.get(invoice.customerId) ?? { invoiced: 0, received: 0 }
      current.invoiced += Math.max(0, invoice.total)
      rows.set(invoice.customerId, current)
    }
    const standaloneInvoiceIds = new Set(invoices.filter((item) => !item.projectId && ['issued', 'paid'].includes(item.status)).map((item) => item.id))
    for (const payment of payments.filter((item) => !item.projectId && (!item.invoiceId || standaloneInvoiceIds.has(item.invoiceId)))) {
      const current = rows.get(payment.customerId) ?? { invoiced: 0, received: 0 }
      current.received += Math.max(0, payment.amount)
      rows.set(payment.customerId, current)
    }
    return [...rows.entries()].map(([standaloneCustomerId, value]) => ({ customerId: standaloneCustomerId, ...value, balance: value.invoiced - value.received }))
  }, [invoices, payments])
  const detailRows = useMemo<DetailRow[]>(() => {
    if (!selectedMetric) return []
    if (selectedMetric === 'overdue') return invoices.filter((invoice) => invoice.status === 'issued' && invoice.dueDate && invoice.dueDate < toISODate()).map((invoice) => {
      const paid = payments.filter((payment) => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + payment.amount, 0)
      return { id: invoice.id, title: `فاکتور ${invoice.number}`, subtitle: `${customerById.get(invoice.customerId)?.name ?? 'مشتری حذف‌شده'}${invoice.projectId ? ` · ${projectById.get(invoice.projectId)?.title ?? 'پروژه حذف‌شده'}` : ' · بدون پروژه'}`, amount: Math.max(0, invoice.total - paid), projectId: invoice.projectId, customerId: invoice.customerId, invoiceId: invoice.id, note: invoice.dueDate ? `سررسید: ${formatDateFa(invoice.dueDate)}` : undefined }
    }).filter((row) => (row.amount ?? 0) > 0)
    if (selectedMetric === 'warnings') return positions.flatMap((position) => position.warnings.map((warning) => {
      const project = projectById.get(position.projectId)
      return { id: `${position.projectId}-${warning}`, title: project?.title ?? 'پروژه حذف‌شده', subtitle: `${customerById.get(position.customerId)?.name ?? 'مشتری حذف‌شده'} · ${projectStatusLabels[project?.status ?? ''] ?? 'وضعیت نامشخص'}`, projectId: position.projectId, customerId: position.customerId, note: warningLabels[warning] }
    }))
    const projectRows = positions.map((position) => {
      const project = projectById.get(position.projectId)
      const breakdown: Partial<Record<MetricKey, string>> = {
        forecastNet: `برآورد ${formatMoney(position.currentEstimate)} + کار اضافه ${formatMoney(position.approvedExtras)} − تخفیف ${formatMoney(Math.min(position.discount, position.currentEstimate + position.approvedExtras))}`,
        earnedNet: `کارکرد ${formatMoney(position.performedBase)} + کار اضافه ${formatMoney(position.approvedExtras)} − سهم تخفیف ${formatMoney(position.allocatedDiscount)}`,
        unbilledEarned: `کارکرد خالص ${formatMoney(position.earnedNet)} − طلب قطعی ${formatMoney(position.invoiced)}`,
        invoiced: 'جمع فاکتورهای صادرشده و تسویه‌شده این پروژه',
        received: 'جمع دریافت‌های منتسب به پروژه یا فاکتورهای آن',
        outstanding: `طلب قطعی ${formatMoney(position.invoiced)} − دریافتی ${formatMoney(position.received)}`,
        credit: `دریافتی ${formatMoney(position.received)} بیشتر از طلب قطعی ${formatMoney(position.invoiced)}`,
        costs: 'هزینه‌های پروژه و مصالح تهیه‌شده توسط پیمانکار',
        earnedProfit: `کارکرد خالص ${formatMoney(position.earnedNet)} − هزینه ${formatMoney(position.costs)}`,
      }
      return { id: position.projectId, title: project?.title ?? 'پروژه حذف‌شده', subtitle: `${customerById.get(position.customerId)?.name ?? 'مشتری حذف‌شده'} · ${projectStatusLabels[project?.status ?? ''] ?? 'وضعیت نامشخص'}`, amount: position[selectedMetric], projectId: position.projectId, customerId: position.customerId, note: breakdown[selectedMetric] }
    }).filter((row) => row.amount !== 0)
    const standalone = standaloneRows.map((row) => {
      const amount = selectedMetric === 'invoiced' ? row.invoiced : selectedMetric === 'received' ? row.received : selectedMetric === 'outstanding' ? Math.max(0, row.balance) : selectedMetric === 'credit' ? Math.max(0, -row.balance) : 0
      return { id: `standalone-${row.customerId}`, title: customerById.get(row.customerId)?.name ?? 'مشتری حذف‌شده', subtitle: 'اسناد و دریافت‌های بدون پروژه', amount, customerId: row.customerId, note: `طلب قطعی ${formatMoney(row.invoiced)} · دریافتی ${formatMoney(row.received)}` }
    }).filter((row) => row.amount !== 0)
    return [...projectRows, ...standalone].sort((a, b) => Math.abs(b.amount ?? 0) - Math.abs(a.amount ?? 0))
  }, [customerById, invoices, payments, positions, projectById, selectedMetric, standaloneRows])

  useEffect(() => {
    if (!selectedMetric) return
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [selectedMetric])

  const selectMetric = (metric: MetricKey) => setSelectedMetric((current) => current === metric ? null : metric)

  return <section className="space-y-5" aria-label="خلاصه حسابداری">
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-l from-indigo-950 to-slate-900 p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm text-indigo-200">تصویر مالی تا امروز</p><h2 className="mt-1 text-xl font-bold">برآورد، کارکرد و طلب قطعی از هم جدا هستند</h2></div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{totals.projectCount.toLocaleString('fa-IR')} پروژه در این نما</span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">فعالیت قیمت‌دار کارکرد می‌سازد؛ فقط فاکتور صادرشده طلب قطعی ایجاد می‌کند و پرداخت، مانده همان طلب را کاهش می‌دهد.</p>
    </div>

    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
      <label className="text-sm font-medium text-slate-700">مشتری
        <select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setProjectId('') }} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base">
          <option value="">همه مشتریان</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">پروژه
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base">
          <option value="">همه پروژه‌ها</option>{projectsForCustomer.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">وضعیت پروژه
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base">
          <option value="">همه وضعیت‌ها</option>{projectStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}<option value="active">{projectStatusLabels.active}</option>
        </select>
      </label>
      {(customerId || projectId || status) && <button type="button" onClick={() => { setCustomerId(''); setProjectId(''); setStatus('') }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm sm:col-span-3">پاک‌کردن فیلترها</button>}
    </div>

    <AccountingGroup title="برنامه و کارکرد" description="این اعداد برای مدیریت پروژه‌اند و به‌تنهایی بدهی مشتری نیستند.">
      <MetricCard icon={Calculator} label="برآورد فعلی" value={totals.forecastNet} hint="برآورد خدمات یا توافق، همراه کار اضافه و تخفیف" tone="slate" selected={selectedMetric === 'forecastNet'} onClick={() => selectMetric('forecastNet')} />
      <MetricCard icon={TrendingUp} label="کارکرد خالص" value={totals.earnedNet} hint="فعالیت‌های قیمت‌دار و کار اضافه پس از سهم تخفیف" tone="indigo" selected={selectedMetric === 'earnedNet'} onClick={() => selectMetric('earnedNet')} />
      <MetricCard icon={ReceiptText} label="کارکرد صورتحساب‌نشده" value={totals.unbilledEarned} hint="کارکردی که هنوز در فاکتور صادرشده نیامده است" tone="amber" selected={selectedMetric === 'unbilledEarned'} onClick={() => selectMetric('unbilledEarned')} />
    </AccountingGroup>

    <AccountingGroup title="مطالبات و دریافت‌ها" description="فقط اسناد قطعی در طلب و مانده مشتری اثر دارند.">
      <MetricCard icon={BadgeDollarSign} label="طلب قطعی" value={totals.invoiced} hint="جمع فاکتورهای صادرشده و تسویه‌شده" tone="violet" selected={selectedMetric === 'invoiced'} onClick={() => selectMetric('invoiced')} />
      <MetricCard icon={WalletCards} label="دریافتی" value={totals.received} hint="پرداخت‌های ثبت‌شده در این نما" tone="emerald" selected={selectedMetric === 'received'} onClick={() => selectMetric('received')} />
      <MetricCard icon={CircleDollarSign} label="مانده قابل وصول" value={totals.outstanding} hint="طلب قطعی منهای دریافتی، بدون اعتبار مشتری" tone="rose" selected={selectedMetric === 'outstanding'} onClick={() => selectMetric('outstanding')} />
      <MetricCard icon={Landmark} label="اعتبار مشتری" value={totals.credit} hint="مبلغ پرداخت‌شده بیشتر از طلب قطعی" tone="sky" selected={selectedMetric === 'credit'} onClick={() => selectMetric('credit')} />
    </AccountingGroup>

    <AccountingGroup title="هزینه و نتیجه" description="سود فعلی بر پایه کارکرد ثبت‌شده است و سود نهایی پروژه محسوب نمی‌شود.">
      <MetricCard icon={TrendingDown} label="هزینه‌های ثبت‌شده" value={totals.costs} hint="هزینه پروژه و مصالح تهیه‌شده توسط پیمانکار" tone="orange" selected={selectedMetric === 'costs'} onClick={() => selectMetric('costs')} />
      <MetricCard icon={TrendingUp} label="سود کارکرد" value={totals.earnedProfit} hint="کارکرد خالص منهای هزینه‌های ثبت‌شده" tone={totals.earnedProfit < 0 ? 'rose' : 'emerald'} signed selected={selectedMetric === 'earnedProfit'} onClick={() => selectMetric('earnedProfit')} />
      <MetricCard icon={TriangleAlert} label={`سررسید گذشته (${overdue.count.toLocaleString('fa-IR')})`} value={overdue.amount} hint="مانده فاکتورهای صادرشده‌ای که از سررسیدشان گذشته است" tone={overdue.amount > 0 ? 'rose' : 'slate'} selected={selectedMetric === 'overdue'} onClick={() => selectMetric('overdue')} />
    </AccountingGroup>

    {totals.warnings.length > 0 && <button type="button" onClick={() => selectMetric('warnings')} aria-expanded={selectedMetric === 'warnings'} className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right text-sm text-amber-900"><b>نیازمند بررسی: </b>{positions.reduce((count, position) => count + position.warnings.length, 0).toLocaleString('fa-IR')} مغایرت مالی در این نما وجود دارد. <span className="font-bold text-amber-950">مشاهده جزئیات ←</span></button>}
    {selectedMetric && <section ref={detailsRef} style={{ scrollMarginTop: 90 }} aria-label={`ریز ${metricLabels[selectedMetric]}`} className="space-y-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">ریزحساب انتخاب‌شده</p><h2 className="mt-1 font-bold text-slate-900">{metricLabels[selectedMetric]}</h2></div><button type="button" onClick={() => setSelectedMetric(null)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm">بستن</button></div>
      {detailRows.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">موردی برای نمایش وجود ندارد.</p> : <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">{detailRows.map((row) => <article key={row.id} className="p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{row.title}</h3><p className="mt-1 text-xs leading-6 text-slate-500">{row.subtitle}</p></div>{row.amount !== undefined && <b className={`shrink-0 text-sm ${row.amount < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{row.amount < 0 ? `− ${formatMoney(Math.abs(row.amount))}` : formatMoney(row.amount)}</b>}</div>
        {row.note && <p className="mt-2 text-xs leading-6 text-slate-600">{row.note}</p>}
        <div className="mt-2 flex flex-wrap gap-4">{row.projectId && <Link to="/projects/$projectId" params={{ projectId: row.projectId }} className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-700">باز کردن پرونده پروژه ←</Link>}{row.projectId && row.customerId && ['unbilledEarned', 'warnings'].includes(selectedMetric) && onCreateInvoice && <button type="button" onClick={() => onCreateInvoice(row.projectId!, row.customerId!)} className="min-h-11 text-sm font-bold text-violet-700">ساخت فاکتور باقی‌مانده</button>}{row.customerId && ['outstanding', 'overdue'].includes(selectedMetric) && onCreatePayment && <button type="button" onClick={() => onCreatePayment(row.customerId!, row.projectId, row.invoiceId)} className="min-h-11 text-sm font-bold text-emerald-700">ثبت دریافت مرتبط</button>}</div>
      </article>)}</div>}
    </section>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
  </section>
}

function AccountingGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="space-y-3"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs leading-6 text-slate-500">{description}</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div></section>
}

const tones = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700', indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800', amber: 'border-amber-200 bg-amber-50 text-amber-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800', rose: 'border-rose-200 bg-rose-50 text-rose-800',
  sky: 'border-sky-200 bg-sky-50 text-sky-800', orange: 'border-orange-200 bg-orange-50 text-orange-800',
} as const

function MetricCard({ icon: Icon, label, value, hint, tone, signed = false, selected, onClick }: { icon: ComponentType<{ size?: number }>; label: string; value: number; hint: string; tone: keyof typeof tones; signed?: boolean; selected: boolean; onClick: () => void }) {
  return <article className={`overflow-hidden rounded-2xl border shadow-sm ${tones[tone]} ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}><button type="button" onClick={onClick} aria-expanded={selected} className="w-full p-4 text-right"><div className="flex items-center gap-2"><Icon size={20} /><h3 className="text-sm font-semibold">{label}</h3></div><p className="mt-3 break-words text-xl font-black" dir="rtl">{signed && value < 0 ? `− ${formatMoney(Math.abs(value))}` : formatMoney(value)}</p><p className="mt-2 text-xs leading-6 opacity-80">{hint}</p><p className="mt-2 text-xs font-bold">مشاهده ریزحساب ←</p></button></article>
}
