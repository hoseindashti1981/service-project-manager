import { useEffect, useRef, useState } from 'react'
import { backupRepository } from '@/db/repositories/backup-repository'
import { backupTables, backupTableLabels, type BackupPreview, type BackupData } from '@/domain/backup/types'
import { toISODate } from '@/lib/dates'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const formatTime = (value: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle:'medium',timeStyle:'short' }).format(new Date(value))
function download(backup: BackupData, prefix: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}))
  const link = document.createElement('a')
  link.href=url; link.download=`${prefix}-${toISODate()}-${Date.now()}.json`
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url),60000)
}
function errorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'QuotaExceededError') return 'فضای دستگاه برای نسخه بازگشت یا بازیابی کافی نیست؛ هیچ داده‌ای جایگزین نشد.'
  return error instanceof Error ? error.message : 'عملیات انجام نشد؛ داده‌های فعلی حفظ شده‌اند.'
}
export function BackupPanel() {
  const [busy,setBusy] = useState(false)
  const busyRef = useRef(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const [prepared,setPrepared] = useState<{ file:string; value:unknown; preview:BackupPreview; current:BackupPreview['counts'] } | null>(null)
  const [confirmed,setConfirmed] = useState(false)
  const [recoveryDate,setRecoveryDate] = useState<string | null>(null)
  useEffect(() => { void backupRepository.getRecovery().then(value => setRecoveryDate(value?.exportedAt || null)).catch(() => setError('خواندن نسخه بازگشت انجام نشد.')) },[])
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current=true; setBusy(true); setMessage(''); setError('')
    try { await action() } catch(error) { setError(errorMessage(error)) }
    finally { busyRef.current=false; setBusy(false) }
  }
  async function preview(value:unknown,file:string) {
    const inspected = await backupRepository.inspect(value)
    const current = await backupRepository.export()
    setPrepared({file,value,preview:inspected,current:Object.fromEntries(backupTables.map(table => [table,current.data[table].length])) as BackupPreview['counts']})
    setConfirmed(false)
  }
  async function choose(file:File) {
    setPrepared(null); setConfirmed(false)
    if (file.size > MAX_FILE_BYTES) throw new Error('حجم فایل بیش از حد مجاز این نسخه (۵۰ مگابایت) است.')
    let value:unknown
    try { value=JSON.parse((await file.text()).replace(/^\uFEFF/,'')) } catch { throw new Error('فایل JSON خوانده نمی‌شود؛ فایل پشتیبان سالم را انتخاب کنید.') }
    await preview(value,file.name)
  }
  async function restore() {
    if (!prepared || !confirmed) return
    await backupRepository.import(prepared.value)
    const recovery = await backupRepository.getRecovery()
    setRecoveryDate(recovery?.exportedAt || null); setPrepared(null); setConfirmed(false)
    setMessage('بازیابی کامل شد. داده‌های قبل از بازیابی در نسخه بازگشت خودکار محفوظ‌اند؛ گزارش‌ها به‌روز شدند.')
  }
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <div><h3 className="font-bold">پشتیبان‌گیری و بازیابی</h3><p className="mt-1 text-sm text-slate-500">شامل همهٔ اطلاعات، یادآورها، تاریخچه وضعیت پروژه و سوابق اصلاح فعالیت‌ها. فایل را در جایی خارج از این دستگاه هم نگه دارید.</p></div>
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void run(async () => { download(await backupRepository.export(),'lineyar-backup'); setMessage('فایل کامل بکاپ آماده شد و دانلود آن شروع شد. ذخیره شدن فایل را در دانلودهای دستگاه بررسی کنید.') })} className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50">دانلود بکاپ کامل</button><label className={`rounded-xl border px-4 py-2 text-sm ${busy?'opacity-50':'cursor-pointer'}`}>انتخاب فایل برای بازیابی<input aria-label="فایل بکاپ" disabled={busy} type="file" accept=".json,application/json" className="hidden" onChange={event => { const file=event.target.files?.[0]; event.target.value=''; if(file) void run(() => choose(file)) }} /></label></div>
    {busy && <p role="status" className="text-sm text-indigo-700">در حال بررسی یا ذخیره… این صفحه را نبندید.</p>}
    {prepared && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="font-bold">پیش‌نمایش بازیابی</h4><p className="break-all text-sm">{prepared.file}</p><p className="text-sm">زمان بکاپ: {formatTime(prepared.preview.exportedAt)} · نسخه {prepared.preview.version.toLocaleString('fa-IR')}</p><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th className="p-2">اطلاعات</th><th className="p-2">فعلی</th><th className="p-2">داخل فایل</th></tr></thead><tbody>{backupTables.map(table => <tr key={table} className="border-t border-amber-100"><td className="p-2">{backupTableLabels[table]}</td><td className="p-2">{prepared.current[table].toLocaleString('fa-IR')}</td><td className="p-2">{prepared.preview.counts[table].toLocaleString('fa-IR')}</td></tr>)}</tbody></table></div>{prepared.preview.warnings.map(warning => <p key={warning} className="text-sm text-amber-900">{warning}</p>)}<p className="text-sm">بازیابی، جایگزینی کامل است؛ اطلاعات با هم ادغام نمی‌شوند. درست پیش از جایگزینی، یک نسخه بازگشت از داده‌های فعلی روی همین دستگاه ذخیره می‌شود.</p><label className="flex items-start gap-2 text-sm"><input aria-label="تأیید جایگزینی کامل" type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />محتوا و هشدارها را بررسی کردم و جایگزینی کامل داده‌های فعلی را می‌خواهم.</label><div className="flex flex-wrap gap-3"><button disabled={busy || !confirmed} onClick={() => void run(restore)} className="rounded-xl bg-rose-700 px-4 py-2 text-sm text-white disabled:opacity-50">بازیابی و جایگزینی داده‌ها</button><button disabled={busy} onClick={() => { setPrepared(null); setConfirmed(false) }} className="rounded-xl border px-4 py-2 text-sm">انصراف</button></div></div>}
    {recoveryDate && <div className="space-y-2 rounded-xl bg-slate-50 p-3"><h4 className="text-sm font-bold">نسخه بازگشت قبل از آخرین بازیابی</h4><p className="text-xs">{formatTime(recoveryDate)} — روی همین مرورگر نگهداری می‌شود؛ جای فایل بکاپ خارجی را نمی‌گیرد.</p><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void run(async () => { const backup=await backupRepository.getRecovery(); if(!backup) throw new Error('نسخه بازگشت یافت نشد.'); await preview(backup,'نسخه بازگشت خودکار') })} className="text-sm text-indigo-700">بررسی و بازگرداندن نسخه قبلی</button><button disabled={busy} onClick={() => void run(async () => { const backup=await backupRepository.getRecovery(); if(!backup) throw new Error('نسخه بازگشت یافت نشد.'); download(backup,'lineyar-recovery'); setMessage('دانلود نسخه بازگشت شروع شد.') })} className="text-sm text-indigo-700">دانلود نسخه بازگشت</button></div></div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <p className="text-xs text-slate-500">کد یکپارچگی خرابی یا تغییر فایل را تشخیص می‌دهد؛ فایل رمزگذاری نشده است و اطلاعات شخصی و مالی دارد.</p>
  </section>
}
