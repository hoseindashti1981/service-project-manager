import { projectStatusLabels } from '@/domain/project/status'
import { serviceRepository } from '@/db/repositories/service-repository'
import { saveCatalogActivity } from '@/db/repositories/catalog-activity'
import type { Service } from '@/domain/service/types'
import { formatMoney } from '@/lib/money'
import { useEffect, useState, type FormEvent } from 'react'
import { liveQuery } from 'dexie'
import { Link } from '@tanstack/react-router'
import { activityRepository } from '@/db/repositories/activity-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { customerRepository } from '@/db/repositories/customer-repository'
import { db } from '@/db/db'
import type { ProjectActivity } from '@/domain/activity/types'
import type { Project } from '@/domain/project/types'
import type { ProjectItem } from '@/domain/project-item/types'
import { toISODate, formatDateFa } from '@/lib/dates'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { normalizeDigits, serviceUnits } from '@/domain/service/helpers'
import { serviceProgress } from '@/domain/activity/progress'

export function TodayActivitiesPage() {
  const [attachPricedService, setAttachPricedService] = useState(false)
  const [amount, setAmount] = useState('')
  const [startExecution, setStartExecution] = useState(false)
  const [historical, setHistorical] = useState(false)
  const [auditReason, setAuditReason] = useState('')
  const [catalog, setCatalog] = useState<Service[]>([])
  const [plannedQuantity, setPlannedQuantity] = useState('')
  const [activities, setActivities] = useState<ProjectActivity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<ProjectItem[]>([])
  const [customers, setCustomers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projectId, setProjectId] = useState('')
  const [itemId, setItemId] = useState('')
  const [date, setDate] = useState(toISODate)
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [allDates, setAllDates] = useState(false)
  useEffect(() => {
    const subscription = liveQuery(async () => Promise.all([activityRepository.getAll(), projectRepository.getAll(), customerRepository.getAll(), db.projectItems.toArray(), serviceRepository.getActive()])).subscribe({
      next: ([acts, projs, clients, rows, services]) => { setCatalog(services); setActivities(acts); setProjects(projs); setItems(rows); setCustomers(Object.fromEntries(clients.map((client) => [client.id, client.name]))); setLoading(false) },
      error: () => { setError('بارگذاری فعالیت‌ها ناموفق بود.'); setLoading(false) },
    })
    return () => subscription.unsubscribe()
  }, [])
  const selectedProject = projectId || projects[0]?.id || ''
  const currentProject = projects.find((project) => project.id === selectedProject)
  const projectItems = items.filter((item) => item.projectId === selectedProject)
  const selectedItem = projectItems.find((item) => item.id === itemId)
  const selectedService = catalog.find((service) => `catalog:${service.id}` === itemId)
  const selectedUnit = selectedItem?.unit ?? selectedService?.defaultUnit
  const availableServices = catalog.filter((service) => !projectItems.some((item) => item.serviceId === service.id))
  const projectName = (id: string) => { const project = projects.find((item) => item.id === id); return project ? `${project.title} — ${customers[project.customerId] || 'مشتری نامشخص'}` : 'پروژه حذف‌شده' }
  const reset = () => { setAttachPricedService(false); setAmount(''); setStartExecution(false); setHistorical(false); setAuditReason(''); setTitle(''); setQuantity(''); setNote(''); setItemId(''); setPlannedQuantity(''); setEditing(null) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      const options = { startExecution, historical, reason: auditReason }
      const input = { projectId: selectedProject, projectItemId: selectedService ? undefined : itemId || undefined, date, title: title.trim(), quantity: quantity.trim() ? Number(normalizeDigits(quantity)) : undefined, unit: selectedUnit, note, amount: amount.trim() ? Number(normalizeDigits(amount)) : undefined }
      if (selectedService && attachPricedService) await saveCatalogActivity(input, itemId.slice('catalog:'.length), Number(normalizeDigits(plannedQuantity)), editing || undefined, options)
      else if (editing) await activityRepository.update(editing, input, options)
      else await activityRepository.create(input, options)
      reset(); setMessage('فعالیت با موفقیت ذخیره شد.')
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره فعالیت ناموفق بود.') }
    finally { setSaving(false) }
  }
  async function remove(activity: ProjectActivity) {
    if (!confirm('این فعالیت حذف شود؟ مقدار پیشرفت نیز اصلاح می‌شود.')) return
    const reason = window.prompt('دلیل حذف فعالیت را وارد کنید:')
    if (!reason?.trim()) return
    setSaving(true); setError('')
    try { await activityRepository.delete(activity.id, reason); if (editing === activity.id) reset() }
    catch { setError('حذف فعالیت ناموفق بود.') }
    finally { setSaving(false) }
  }
  const visible = activities.filter((activity) => allDates || activity.date === date)
  const field = 'w-full rounded-xl border border-slate-300 p-2.5'
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">فعالیت‌های روزانه</h2><Link to="/projects" className="text-sm text-indigo-600">پروژه‌ها</Link></div>
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border bg-white p-4">
      <fieldset disabled={saving || loading} className="space-y-3"><legend className="mb-3 font-bold">{editing ? 'ویرایش فعالیت' : 'ثبت سریع فعالیت'}</legend>
        <label className="block">پروژه و مشتری<select aria-label="پروژه و مشتری" required disabled={!!editing} value={selectedProject} onChange={(event) => { setStartExecution(false); setHistorical(false); setAuditReason(''); setAttachPricedService(false); setProjectId(event.target.value); setItemId(''); setPlannedQuantity(''); setQuantity(''); setTitle('') }} className={field}><option value="">انتخاب پروژه</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectName(project.id)}</option>)}</select></label>
        {currentProject && <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm"><p>وضعیت پروژه: {projectStatusLabels[currentProject.status]}</p>
          {!editing && ['draft', 'planned'].includes(currentProject.status) && <label className="flex gap-2"><input type="checkbox" checked={startExecution} onChange={(event) => setStartExecution(event.target.checked)} />شروع اجرای پروژه با تاریخ این فعالیت و ثبت فعالیت</label>}
          {currentProject.status === 'active' && <Link to="/projects/$projectId" params={{ projectId: currentProject.id }} className="block text-indigo-700">تعیین وضعیت فعال قدیمی در صفحه پروژه ←</Link>}
          {['paused', 'completed', 'delivered', 'cancelled'].includes(currentProject.status) && <><Link to="/projects/$projectId" params={{ projectId: currentProject.id }} className="block text-indigo-700">برای اجرای جدید، ابتدا پروژه را ادامه یا بازگشایی کنید ←</Link><label className="flex gap-2"><input type="checkbox" checked={historical} onChange={(event) => setHistorical(event.target.checked)} />ثبت دیرهنگام کار روزهای قبل</label></>}
          {(editing || historical) && <label className="block">دلیل اصلاح یا ثبت دیرهنگام<input aria-label="دلیل اصلاح یا ثبت دیرهنگام" required value={auditReason} onChange={(event) => setAuditReason(event.target.value)} className={field} /></label>}
        </div>}
        <div><p className="mb-1 text-sm">تاریخ فعالیت (شمسی)</p><JalaliDatePicker label="تاریخ فعالیت" value={date} onChange={setDate} disabled={saving} /></div>
        <label className="block">خدمت پروژه<select aria-label="خدمت پروژه" value={itemId} onChange={(event) => { const value = event.target.value; const item = projectItems.find((row) => row.id === value); const service = catalog.find((row) => `catalog:${row.id}` === value); setAttachPricedService(false); setItemId(value); setPlannedQuantity(''); setTitle(item?.title ?? service?.name ?? ''); setQuantity('') }} className={field}><option value="">فعالیت عمومی (بدون خدمت)</option>{itemId && !selectedItem && !selectedService && <option value={itemId}>خدمت حذف‌شده؛ خدمت دیگری انتخاب کنید</option>}<optgroup label="خدمات این پروژه">{projectItems.map((item) => <option key={item.id} value={item.id}>{item.title} — {serviceUnits.find((unit) => unit.value === item.unit)?.label}</option>)}</optgroup><optgroup label="خدمات ذخیره‌شده">{availableServices.map((service) => <option key={service.id} value={`catalog:${service.id}`}>{service.name} — {serviceUnits.find((unit) => unit.value === service.defaultUnit)?.label}</option>)}</optgroup></select></label>
        {selectedService && <label className="flex gap-2 text-sm"><input type="checkbox" checked={attachPricedService} onChange={event => setAttachPricedService(event.target.checked)} />افزودن این خدمت به خدمات قیمت‌دار پروژه (اختیاری)</label>}
        {selectedService && attachPricedService && <div className="space-y-2 rounded-xl bg-indigo-50 p-3"><p className="text-sm">این خدمت با قیمت پایه {formatMoney(selectedService.defaultUnitPrice ?? 0)} به پروژه اضافه می‌شود. قیمت و مقدار کل در صفحه پروژه قابل ویرایش است.</p><label className="block">مقدار کل خدمت در پروژه<input aria-label="مقدار کل خدمت در پروژه" required inputMode="decimal" value={plannedQuantity} onChange={(event) => setPlannedQuantity(normalizeDigits(event.target.value))} className={field} /></label></div>}
        <label className="block">عنوان فعالیت<input required value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label>
        <label className="block">مقدار انجام‌شده (اختیاری) {selectedUnit ? `(${serviceUnits.find((unit) => unit.value === selectedUnit)?.label})` : '(اختیاری)'}<input required={!!selectedService && attachPricedService} inputMode="decimal" value={quantity} onChange={(event) => setQuantity(normalizeDigits(event.target.value))} className={field} /></label>
        <label className="block">مبلغ فعالیت به تومان (اختیاری)<input aria-label="مبلغ فعالیت به تومان (اختیاری)" inputMode="numeric" value={amount} onChange={event => setAmount(normalizeDigits(event.target.value))} className={field} /></label>
        <p className="text-xs text-slate-500">این صفحه گزارش کار روزانه است. مبلغ خالی محاسبه نمی‌شود؛ مبلغ اختیاری صرفاً در گزارش می‌ماند. کار خارج از قرارداد را در «کار اضافه» پروژه ثبت کنید.</p>
        <label className="block">یادداشت<input value={note} onChange={(event) => setNote(event.target.value)} className={field} /></label>
        <div className="flex gap-3"><button disabled={!selectedProject} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'در حال ذخیره…' : editing ? 'ذخیره تغییرات' : 'ثبت فعالیت'}</button>{editing && <button type="button" onClick={reset}>انصراف</button>}</div>
      </fieldset>
    </form>
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <section className="space-y-3"><h3 className="font-bold">پیشرفت خدمات — {selectedProject ? projectName(selectedProject) : 'پروژه‌ای ثبت نشده'}</h3>{projectItems.length === 0 && <p className="text-sm text-slate-500">از فهرست خدمات ذخیره‌شده بالا انتخاب کنید یا در صفحه پروژه خدمت اضافه کنید.</p>}{projectItems.map((item) => { const progress = serviceProgress(item, activities); return <article key={item.id} className="space-y-2 rounded-xl border bg-white p-3"><b>{item.title}</b><p className="text-sm">انجام‌شده: {progress.completed.toLocaleString('fa-IR')} از {item.quantity.toLocaleString('fa-IR')} · باقی‌مانده: {progress.remaining.toLocaleString('fa-IR')} {serviceUnits.find((unit) => unit.value === item.unit)?.label}</p><progress aria-label={`پیشرفت ${item.title}`} value={progress.percent} max={100} className="w-full" />{progress.extra > 0 && <p className="text-xs text-amber-700">مازاد بر مقدار برنامه: {progress.extra.toLocaleString('fa-IR')}</p>}</article> })}</section>
    <section className="space-y-3"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{allDates ? 'همه فعالیت‌ها' : `فعالیت‌های ${formatDateFa(date)}`}</h3><label className="text-sm"><input type="checkbox" checked={allDates} onChange={(event) => setAllDates(event.target.checked)} /> نمایش همه تاریخ‌ها</label></div>{loading ? <p>در حال بارگذاری…</p> : visible.length === 0 ? <p className="text-sm text-slate-500">فعالیتی ثبت نشده است.</p> : visible.map((activity) => <article key={activity.id} className="space-y-2 rounded-xl border bg-white p-4"><b>{activity.title}</b><p className="text-sm text-slate-500">{projectName(activity.projectId)} · {formatDateFa(activity.date)}</p>{activity.quantity !== undefined && <p className="text-sm">مقدار: {activity.quantity.toLocaleString('fa-IR')} {serviceUnits.find((unit) => unit.value === activity.unit)?.label}</p>}{activity.amount !== undefined && <p className="text-sm">مبلغ یادداشت‌شده: {formatMoney(activity.amount)}</p>}{activity.note && <p className="text-sm">{activity.note}</p>}<div className="flex gap-4 text-sm"><button disabled={saving} onClick={() => { setAuditReason(''); setHistorical(false); setStartExecution(false); setAttachPricedService(false); setAmount(activity.amount === undefined ? '' : String(activity.amount)); setEditing(activity.id); setProjectId(activity.projectId); setItemId(activity.projectItemId || ''); setDate(activity.date); setTitle(activity.title); setQuantity(activity.quantity === undefined ? '' : String(activity.quantity)); setNote(activity.note || ''); setError(''); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>ویرایش</button><button disabled={saving} onClick={() => void remove(activity)} className="text-rose-600">حذف</button></div></article>)}</section>
  </div>
}
