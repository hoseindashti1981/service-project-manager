import {MoneyInput} from '@/components/money-input'
import {useEffect, useRef, useState, type FormEvent} from 'react'
import type {ProjectChange} from '@/domain/project-change/types'
import {projectChangeRepository} from '@/db/repositories/project-change-repository'
import {JalaliDatePicker} from './jalali-date-picker'
import {normalizeDigits} from '@/domain/service/helpers'

export function ProjectChangeActions({change}: {change: ProjectChange}) {
  const [draft, setDraft] = useState<ProjectChange | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {if (draft) dialog.current?.showModal(); else dialog.current?.close()}, [draft])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || busy) return
    const fields = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      await projectChangeRepository.update(draft.id, {title: String(fields.get('title')), amount: Number(normalizeDigits(String(fields.get('amount')))), date: draft.date, note: String(fields.get('note') || '')}, draft.updatedAt)
      setDraft(null)
    } catch (e) {setError(e instanceof Error ? e.message : 'ویرایش ناموفق بود.')} finally {setBusy(false)}
  }
  async function remove() {
    if (busy || !confirm(`کار اضافه «${change.title}» حذف شود؟ مانده حساب دوباره محاسبه می‌شود.`)) return
    setBusy(true); setError('')
    try {await projectChangeRepository.delete(change.id, change.updatedAt)} catch(e) {setError(e instanceof Error ? e.message : 'حذف ناموفق بود.')} finally {setBusy(false)}
  }
  return <div>
    <div className="flex gap-4"><button type="button" disabled={busy} className="min-h-11 text-indigo-700" onClick={() => {setError(''); setDraft({...change})}}>ویرایش کار اضافه</button><button type="button" disabled={busy} className="min-h-11 text-rose-700" onClick={() => void remove()}>حذف کار اضافه</button></div>
    {error && !draft && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="m-auto max-h-[90dvh] w-[92vw] max-w-lg overflow-y-auto rounded-xl p-4 backdrop:bg-black/40" onCancel={e => {if (busy) e.preventDefault(); else setDraft(null)}} onClose={() => setDraft(null)}>
      {draft && <form onSubmit={save} className="space-y-3"><h2 className="font-bold">ویرایش کار اضافه</h2>
        <label className="block">شرح کار اضافه<input name="title" required defaultValue={draft.title} className="w-full rounded border p-2" /></label>
        <label className="block">مبلغ کار اضافه<MoneyInput name="amount" required inputMode="numeric" defaultValue={draft.amount} className="w-full rounded border p-2" /></label>
        <JalaliDatePicker label="تاریخ کار اضافه" value={draft.date} onChange={date => setDraft({...draft, date})} disabled={busy} />
        <label className="block">یادداشت کار اضافه<textarea name="note" defaultValue={draft.note} className="w-full rounded border p-2" /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} className="min-h-11 rounded bg-indigo-700 px-3 text-white">ذخیره ویرایش کار اضافه</button><button type="button" disabled={busy} className="min-h-11 px-3" onClick={() => setDraft(null)}>انصراف</button>
      </form>}
    </dialog>
  </div>
}
