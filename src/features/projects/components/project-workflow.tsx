import { useEffect, useState, type FormEvent } from 'react'
import { liveQuery } from 'dexie'
import { db } from '@/db/db'
import { changeProjectStatus } from '@/db/repositories/project-workflow'
import type { Project, ProjectStatus } from '@/domain/project/types'
import { transitions, projectStatusLabels, needsTransitionReason } from '@/domain/project/status'
import { serviceProgress } from '@/domain/activity/progress'
import { JalaliDatePicker } from '@/components/jalali-date-picker'
import { toISODate } from '@/lib/dates'

export function ProjectWorkflow({ project, onChange }: { project: Project; onChange: (project: Project) => void }) {
  const [next, setNext] = useState<ProjectStatus | ''>('')
  const [date, setDate] = useState(toISODate)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ hasItems: false, unfinished: false })
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [items, activities] = await Promise.all([db.projectItems.where('projectId').equals(project.id).toArray(), db.projectActivities.where('projectId').equals(project.id).toArray()])
      return { hasItems: items.length > 0, unfinished: items.some((item) => serviceProgress(item, activities).remaining > 0) }
    }).subscribe({ next: setProgress, error: () => setError('بارگذاری پیشرفت ناموفق بود.') })
    return () => subscription.unsubscribe()
  }, [project.id])
  const reasonRequired = !!next && (needsTransitionReason(project.status, next) || (next === 'completed' && progress.unfinished))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!next || busy) return
    setBusy(true); setError('')
    try { const updated = await changeProjectStatus(project.id, { to: next, effectiveDate: date, reason, expectedStatus: project.status }); onChange(updated); setNext(''); setReason('') }
    catch (err) { setError(err instanceof Error ? err.message : 'تغییر وضعیت انجام نشد.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4">
    <h3 className="font-bold">گردش‌کار پروژه</h3><p>وضعیت فعلی: <b>{projectStatusLabels[project.status]}</b></p>
    {project.status === 'active' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">این پروژه با وضعیت قدیمی «فعال» ثبت شده است. اگر هنوز قطعی نیست، پیش‌نویس؛ اگر اجرا شروع نشده، برنامه‌ریزی‌شده؛ و اگر اجرا شروع شده، در جریان را با تاریخ شروع واقعی انتخاب کنید. وضعیت خودکار تغییر نمی‌کند.</p>}
    {project.status === 'in_progress' && progress.hasItems && !progress.unfinished && <div className="rounded-xl bg-emerald-50 p-3 text-sm"><p>مقدار ثبت‌شده همه خدمات تکمیل شده است. اگر اجرای کار تمام شده، تکمیل پروژه را تأیید کنید.</p><button type="button" onClick={() => { setNext('completed'); setDate(toISODate()) }} className="mt-2 text-indigo-700">پیشنهاد تکمیل پروژه</button></div>}
    <form onSubmit={(event) => void submit(event)}><fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm">وضعیت جدید<select aria-label="وضعیت جدید" required value={next} onChange={(event) => setNext(event.target.value as ProjectStatus | '')} className="mt-1 w-full rounded-xl border p-2.5"><option value="">انتخاب تغییر وضعیت</option>{transitions[project.status].map((status) => <option key={status} value={status}>{projectStatusLabels[status]}</option>)}</select></label>
      {next && <><div><p className="mb-1 text-sm">{next === 'in_progress' ? 'تاریخ شروع یا ادامه اجرا' : next === 'completed' ? 'تاریخ پایان اجرا' : next === 'delivered' ? 'تاریخ تحویل' : 'تاریخ مؤثر تغییر وضعیت'} (شمسی)</p><JalaliDatePicker label="تاریخ تغییر وضعیت" value={date} onChange={setDate} /></div><label className="block text-sm">{reasonRequired ? 'دلیل تغییر (الزامی)' : 'توضیح تغییر (اختیاری)'}<textarea aria-label="دلیل تغییر وضعیت" required={reasonRequired} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border p-2.5" /></label>{next === 'completed' && progress.unfinished && <p className="text-sm text-amber-800">مقدار برخی خدمات باقی مانده است؛ برای تکمیل پروژه دلیل وارد کنید.</p>}<button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-white">{busy ? 'در حال ذخیره…' : 'تأیید تغییر وضعیت'}</button></>}
    </fieldset></form>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <p className="text-xs text-slate-500">تغییر وضعیت، مانده حساب و اسناد مالی را تغییر نمی‌دهد. بازگشایی، تاریخ پایان و تحویل دوره قبلی را در تاریخچه نگه می‌دارد.</p>
  </section>
}
