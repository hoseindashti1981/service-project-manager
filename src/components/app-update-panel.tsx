import { useEffect, useRef, useState } from 'react'
import { activateAppUpdate, checkAppUpdate } from '@/lib/app-updates'

export function AppUpdatePanel() {
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(false)
  const [message, setMessage] = useState('')
  const running = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    if (!('serviceWorker' in navigator)) return () => { mounted.current = false }
    const changed = () => { if (mounted.current) setAvailable(true) }
    navigator.serviceWorker.addEventListener('controllerchange', changed)
    void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(registration => {
      if (mounted.current && registration?.waiting) setAvailable(true)
    }).catch(() => {})
    return () => { mounted.current = false; navigator.serviceWorker.removeEventListener('controllerchange', changed) }
  }, [])

  async function run(apply: boolean) {
    if (running.current) return
    running.current = true; setBusy(true); setMessage('')
    try {
      if (!('serviceWorker' in navigator)) throw new Error('به‌روزرسانی برنامه در این مرورگر پشتیبانی نمی‌شود؛ صفحه را دوباره باز کنید.')
      if (!apply && !navigator.onLine) throw new Error('برای دریافت به‌روزرسانی به اینترنت وصل شوید.')
      const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
      if (!registration) throw new Error('به‌روزرسانی در نسخه نصب‌شده یا منتشرشده فعال است؛ یک بار صفحه را آنلاین باز کنید.')
      if (apply) {
        await activateAppUpdate(registration)
        if (mounted.current) window.location.reload()
      } else {
        const found = await checkAppUpdate(registration)
        if (mounted.current) {
          if (found) setAvailable(true)
          setMessage(found ? 'نسخه جدید دریافت شد. برای اجرا، دکمه زیر را بزنید.' : 'بررسی کامل شد؛ نسخه تازه‌تری روی سرور پیدا نشد.')
        }
      }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error && error.name === 'Error' ? error.message : 'بررسی به‌روزرسانی انجام نشد؛ اتصال اینترنت را بررسی کنید.')
    } finally {
      running.current = false
      if (mounted.current) setBusy(false)
    }
  }

  return <section className="space-y-3 rounded-xl border bg-white p-4" aria-label="به‌روزرسانی برنامه">
    <h2 className="font-bold">به‌روزرسانی برنامه</h2>
    <p className="text-sm text-slate-600">نسخه جدید را بدون پاک‌کردن مشتریان، پروژه‌ها، عکس‌ها یا تنظیمات دریافت کنید. پیش از اجرای نسخه، تغییرات فرم‌ها را ذخیره کنید.</p>
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={() => void run(false)} className="min-h-11 rounded-lg border px-3 disabled:opacity-50">{busy ? 'در حال بررسی…' : 'بررسی و دریافت به‌روزرسانی'}</button>
      {available && <button disabled={busy} onClick={() => void run(true)} className="min-h-11 rounded-lg bg-indigo-700 px-3 text-white disabled:opacity-50">اجرای نسخه جدید</button>}
    </div>
    {available && <p className="text-sm">نسخه جدید آماده است؛ اجرای آن صفحه را دوباره باز می‌کند.</p>}
    <p role="status" className="text-sm">{message}</p>
  </section>
}
