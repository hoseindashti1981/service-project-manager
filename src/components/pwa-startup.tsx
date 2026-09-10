import {useEffect, useState, type ReactNode, type CSSProperties} from 'react'
import {db} from '@/db/db'
import {defaultSettings} from '@/domain/media'
import {isStandalone} from '@/lib/pwa-display'
import './pwa-startup.css'

const fallbackLogo = `${import.meta.env.BASE_URL}logo-v061.png`

export function PwaStartup({children}: {children: ReactNode}) {
  const [installed] = useState(isStandalone)
  const [finished, setFinished] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [business, setBusiness] = useState(defaultSettings)
  const [progress, setProgress] = useState(10)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!installed) return
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const delay = (ms: number) => new Promise<void>(resolve => {timers.push(setTimeout(resolve, ms))})
    const timeout = new Promise<never>((_, reject) => {timers.push(setTimeout(() => reject(Error('timeout')), 12000))})
    async function prepare() {
      const minimum = delay(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2400)
      const settings = await db.appSettings.get('business')
      if (cancelled) return
      setBusiness(settings ?? defaultSettings)
      setProgress(65)
      await document.fonts.ready
      if (cancelled) return
      setProgress(90)
      await minimum
    }
    void Promise.race([prepare(), timeout]).then(async () => {
      if (cancelled) return
      timers.forEach(clearTimeout)
      setProgress(100)
      await delay(440)
      if (!cancelled) setFinished(true)
    }).catch(() => {if (!cancelled) {cancelled = true; setError(true); timers.forEach(clearTimeout)}})
    return () => {cancelled = true; timers.forEach(clearTimeout)}
  }, [installed, attempt])
  if (!installed || finished) return children
  const color = /^#[\da-f]{6}$/i.test(business.color) ? business.color : '#b5f536'
  return <main className="pwa-startup" dir="rtl" style={{'--startup-accent': color} as CSSProperties} aria-busy={!error}>
    <div className="pwa-startup-brand">
      <img className="pwa-startup-logo" src={business.logo || fallbackLogo} alt="" onError={e => {if (e.currentTarget.getAttribute('src') !== fallbackLogo) e.currentTarget.src = fallbackLogo}} />
      <h1 className="pwa-startup-name">{business.name.trim() || 'لاین‌یار'}</h1>
    </div>
    <div className="pwa-startup-message">
      <h2>{error ? 'آماده‌سازی کامل نشد' : 'در حال آماده‌سازی برنامه'}</h2>
      <p>{error ? 'دسترسی به اطلاعات دستگاه را دوباره بررسی کنید.' : 'اطلاعات این دستگاه برای شروع کار آماده می‌شود.'}</p>
    </div>
    <div className="pwa-startup-bottom">
      <div className="pwa-startup-track" role="progressbar" aria-label="آماده‌سازی برنامه" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width: `${progress}%`}} /></div>
      <p role={error ? 'alert' : 'status'}>{error ? 'اطلاعات شما پاک نشده است.' : progress === 100 ? 'آماده است' : 'در حال خواندن اطلاعات محلی…'}</p>
      {error && <button type="button" onClick={() => {setError(false); setProgress(10); setAttempt(a => a + 1)}}>تلاش مجدد</button>}
    </div>
  </main>
}
