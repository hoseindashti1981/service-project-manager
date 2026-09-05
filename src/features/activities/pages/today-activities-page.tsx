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
    const subscription = liveQuery(async () => Promise.all([activityRepository.getAll(), projectRepository.getAll(), customerRepository.getAll(), db.projectItems.toArray()])).subscribe({
      next: ([acts, projs, clients, rows]) => { setActivities(acts); setProjects(projs); setItems(rows); setCustomers(Object.fromEntries(clients.map((client) => [client.id, client.name]))); setLoading(false) },
      error: () => { setError('بارگذاری فعالیت‌ها ناموفق بود.'); setLoading(false) },
    })
    return () => subscription.unsubscribe()
  }, [])
  const selectedProject = projectId || projects[0]?.id || ''
  const projectItems = items.filter((item) => item.projectId === selectedProject)
  const selectedItem = projectItems.find((item) => item.id === itemId)
  const projectName = (id: string) => { const project = projects.find((item) => item.id === id); return project ? `${project.title} — ${customers[project.customerId] || 'مشتری نامشخص'}` : 'پروژه حذف‌شده' }
  const reset = () => { setTitle(''); setQuantity(''); setNote(''); setItemId(''); setEditing(null) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      const input = { projectId: selectedProject, projectItemId: itemId || undefined, date, title: title.trim(), quantity: quantity.trim() ? Number(normalizeDigits(quantity)) : undefined, unit: selectedItem?.unit, note }
      if (editing) await activityRepository.update(editing, input)
      else await activityRepository.create(input)
      reset(); setMessage('فعالیت با موفقیت ذخیره شد.')
    } catch (err) { setError(err instanceof Error ? err.message : 'ذخیره فعالیت ناموفق بود.') }
    finally { setSaving(false) }
  }
  async function remove(activity: ProjectActivity) {
    if (!confirm('این فعالیت حذف شود؟ مقدار پیشرفت نیز اصلاح می‌شود.')) return
    setSaving(true); setError('')
    try { await activityRepository.delete(activity.id); if (editing === activity.id) reset() }
    catch { setError('حذف فعالیت ناموفق بود.') }
    finally { setSaving(false) }
  }
  const visible = activities.filter((activity) => allDates || activity.date === date)
  const field = 'w-full rounded-xl border border-slate-300 p-2.5'
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">فعالیت‌های روزانه</h2><Link to="/projects" className="text-sm text-indigo-600">پروژه‌ها</Link></div>
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border bg-white p-4">
      <fieldset disabled={saving || loading} className="space-y-3"><legend className="mb-3 font-bold">{editing ? 'ویرایش فعالیت' : 'ثبت سریع فعالیت'}</legend>
        <label className="block">پروژه و مشتری<select aria-label="پروژه و مشتری" required value={selectedProject} onChange={(event) => { setProjectId(event.target.value); setItemId(''); setQuantity(''); setTitle('') }} className={field}><option value="">انتخاب پروژه</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectName(project.id)}</option>)}</select></label>
        <div><p className="mb-1 text-sm">تاریخ فعالیت (شمسی)</p><JalaliDatePicker label="تاریخ فعالیت" value={date} onChange={setDate} disabled={saving} /></div>
        <label className="block">خدمت پروژه<select aria-label="خدمت پروژه" value={itemId} onChange={(event) => { const item = projectItems.find((row) => row.id === event.target.value); setItemId(event.target.value); if (item) setTitle(item.title); setQuantity('') }} className={field}><option value="">فعالیت عمومی (بدون خدمت)</option>{itemId && !selectedItem && <option value={itemId}>خدمت حذف‌شده؛ خدمت دیگری انتخاب کنید</option>}{projectItems.map((item) => <option key={item.id} value={item.id}>{item.title} — {serviceUnits.find((unit) => unit.value === item.unit)?.label}</option>)}</select></label>
        <label className="block">عنوان فعالیت<input required value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label>
        <label className="block">مقدار انجام‌شده {selectedItem ? `(${serviceUnits.find((unit) => unit.value === selectedItem.unit)?.label})` : '(اختیاری)'}<input required={!!itemId} inputMode="decimal" value={quantity} onChange={(event) => setQuantity(normalizeDigits(event.target.value))} className={field} /></label>
        <label className="block">یادداشت<input value={note} onChange={(event) => setNote(event.target.value)} className={field} /></label>
        <div className="flex gap-3"><button disabled={!selectedProject} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'در حال ذخیره…' : editing ? 'ذخیره تغییرات' : 'ثبت فعالیت'}</button>{editing && <button type="button" onClick={reset}>انصراف</button>}</div>
      </fieldset>
    </form>
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <section className="space-y-3"><h3 className="font-bold">پیشرفت خدمات — {selectedProject ? projectName(selectedProject) : 'پروژه‌ای ثبت نشده'}</h3>{projectItems.length === 0 && <p className="text-sm text-slate-500">خدمات را در صفحه پروژه اضافه کنید.</p>}{projectItems.map((item) => { const progress = serviceProgress(item, activities); return <article key={item.id} className="space-y-2 rounded-xl border bg-white p-3"><b>{item.title}</b><p className="text-sm">انجام‌شده: {progress.completed.toLocaleString('fa-IR')} از {item.quantity.toLocaleString('fa-IR')} · باقی‌مانده: {progress.remaining.toLocaleString('fa-IR')} {serviceUnits.find((unit) => unit.value === item.unit)?.label}</p><progress aria-label={`پیشرفت ${item.title}`} value={progress.percent} max={100} className="w-full" />{progress.extra > 0 && <p className="text-xs text-amber-700">مازاد بر مقدار برنامه: {progress.extra.toLocaleString('fa-IR')}</p>}</article> })}</section>
    <section className="space-y-3"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{allDates ? 'همه فعالیت‌ها' : `فعالیت‌های ${formatDateFa(date)}`}</h3><label className="text-sm"><input type="checkbox" checked={allDates} onChange={(event) => setAllDates(event.target.checked)} /> نمایش همه تاریخ‌ها</label></div>{loading ? <p>در حال بارگذاری…</p> : visible.length === 0 ? <p className="text-sm text-slate-500">فعالیتی ثبت نشده است.</p> : visible.map((activity) => <article key={activity.id} className="space-y-2 rounded-xl border bg-white p-4"><b>{activity.title}</b><p className="text-sm text-slate-500">{projectName(activity.projectId)} · {formatDateFa(activity.date)}</p>{activity.quantity !== undefined && <p className="text-sm">مقدار: {activity.quantity.toLocaleString('fa-IR')} {serviceUnits.find((unit) => unit.value === activity.unit)?.label}</p>}{activity.note && <p className="text-sm">{activity.note}</p>}<div className="flex gap-4 text-sm"><button disabled={saving} onClick={() => { setEditing(activity.id); setProjectId(activity.projectId); setItemId(activity.projectItemId || ''); setDate(activity.date); setTitle(activity.title); setQuantity(activity.quantity === undefined ? '' : String(activity.quantity)); setNote(activity.note || ''); setError(''); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>ویرایش</button><button disabled={saving} onClick={() => void remove(activity)} className="text-rose-600">حذف</button></div></article>)}</section>
  </div>
}
