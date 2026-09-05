import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, Check, Plus, Trash2 } from 'lucide-react'
import { reminderRepository } from '@/db/repositories/reminder-repository'
import { projectRepository } from '@/db/repositories/project-repository'
import { toISODate } from '@/lib/dates'
import DatePicker, { DateObject } from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'
import type { Project } from '@/domain/project/types'
import type { Reminder } from '@/domain/reminder/types'

const today = toISODate()
const formatPersianDate = (value: string) => new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00`))

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(today)
  const [projectId, setProjectId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const projectNames = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project.title])), [projects])
  const load = async () => {
    const [items, projectList] = await Promise.all([reminderRepository.getAll(), projectRepository.getAll()])
    setReminders(items)
    setProjects(projectList)
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('عنوان یادآوری را وارد کنید.'); return }
    setSaving(true); setError(null)
    try {
      await reminderRepository.create({ title, dueDate, projectId: projectId || undefined, note: note || undefined, status: 'open' })
      setTitle(''); setNote(''); setProjectId(''); setDueDate(today)
      await load()
    } catch { setError('ذخیرهٔ یادآوری انجام نشد.') } finally { setSaving(false) }
  }

  async function toggle(id: string) { await reminderRepository.toggleDone(id); await load() }
  async function remove(id: string) { if (window.confirm('این یادآوری حذف شود؟')) { await reminderRepository.delete(id); await load() } }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">یادآوری‌ها</h1><p className="mt-1 text-sm text-slate-500">همه‌چیز روی همین دستگاه ذخیره می‌شود.</p></div><Link to="/calendar" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">نمای تقویم</Link></div>
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
      <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">یادآوری جدید</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="مثلاً پیگیری پیش‌فاکتور" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" /></label>
      <label><span className="mb-1 block text-sm font-medium">تاریخ (شمسی)</span><DatePicker calendar={persian} locale={persianFa} value={new DateObject({ date: `${dueDate}T12:00:00` })} onChange={(value) => { if (value && !Array.isArray(value)) { const date = value.toDate(); setDueDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`) } }} format="YYYY/MM/DD" calendarPosition="bottom-right" inputClass="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" containerClassName="w-full" /></label>
      <label><span className="mb-1 block text-sm font-medium">پروژه (اختیاری)</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">بدون پروژه</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
      <label className="md:col-span-2"><span className="mb-1 block text-sm font-medium">یادداشت (اختیاری)</span><input value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
      {error && <p className="md:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Plus size={18} />{saving ? 'در حال ذخیره…' : 'ثبت یادآوری'}</button>
    </form>
    <section className="space-y-3"><h2 className="font-bold">فهرست یادآوری‌ها</h2>{reminders.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><Bell className="mx-auto mb-3 text-slate-400" /><p>یادآوری ثبت نشده است.</p></div> : reminders.map((item) => <article key={item.id} className={`flex items-start gap-3 rounded-2xl border bg-white p-4 ${item.status === 'done' ? 'border-slate-100 opacity-60' : item.dueDate < today ? 'border-rose-200' : 'border-slate-200'}`}><button onClick={() => void toggle(item.id)} aria-label="تغییر وضعیت" className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border ${item.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={16} /></button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className={`font-semibold ${item.status === 'done' ? 'line-through' : ''}`}>{item.title}</h3><time className={`text-xs ${item.dueDate < today && item.status === 'open' ? 'font-bold text-rose-600' : 'text-slate-500'}`}>{formatPersianDate(item.dueDate)}</time></div>{item.projectId && <p className="mt-1 text-xs text-indigo-600">{projectNames[item.projectId] || 'پروژه حذف‌شده'}</p>}{item.note && <p className="mt-2 text-sm text-slate-500">{item.note}</p>}</div><button onClick={() => void remove(item.id)} aria-label="حذف یادآوری" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={18} /></button></article>)}</section>
  </div>
}
