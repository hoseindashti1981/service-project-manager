import {useEffect, useRef, useState} from 'react'
import {parseCoordinates} from '@/lib/coordinates'
import type {ProjectPoint} from './location-field'

export function BrowserLocationButton({disabled, onPick}: {disabled: boolean; onPick: (point: ProjectPoint) => void}) {
  const request = useRef<{token: string; popup: Window | null; expires: number} | null>(null)
  const pick = useRef(onPick)
  const [message, setMessage] = useState('')
  const [opened, setOpened] = useState(false)
  useEffect(() => {pick.current = onPick}, [onPick])
  useEffect(() => {
    function receive(event: MessageEvent) {
      const pending = request.current
      if (disabled || !pending || Date.now() > pending.expires || event.origin !== location.origin || event.source !== pending.popup || event.data?.type !== 'lineyar-location' || event.data?.token !== pending.token || typeof event.data?.coordinates !== 'string') return
      try {
        const point = parseCoordinates(event.data.coordinates)
        pick.current(point)
        pending.popup?.postMessage({type: 'lineyar-location-applied', token: pending.token}, location.origin)
        request.current = null
        setMessage('مختصات در فرم قرار گرفت؛ برای ثبت نهایی پروژه را ذخیره کنید.')
      } catch {setMessage('مختصات دریافتی معتبر نیست؛ دوباره موقعیت بگیرید.')}
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [disabled])
  function open() {
    const token = crypto.randomUUID()
    const url = new URL(`${import.meta.env.BASE_URL}browser-location.html`, location.origin)
    url.hash = token
    request.current = {token, popup: window.open(url.href, '_blank'), expires: Date.now() + 10 * 60 * 1000}
    setOpened(true)
    setMessage('در صفحه مرورگر «قرار دادن در پروژه» را بزنید. اگر انتقال خودکار ممکن نبود، مختصات را کپی کنید و پس از بازگشت دکمه زیر را بزنید.')
  }
  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      pick.current(parseCoordinates(text))
      request.current = null
      setMessage('مختصات کپی‌شده در فرم قرار گرفت؛ پروژه را ذخیره کنید.')
    } catch {setMessage('اجازه خواندن کلیپ‌بورد داده نشد یا مختصات معتبر نیست؛ در بخش «واردکردن مختصات» از گزینه Paste گوشی استفاده کنید.')}
  }
  return <div className="space-y-2">
    <button type="button" disabled={disabled} onClick={open} className="min-h-11 w-full rounded-lg border border-sky-300 bg-white px-3 text-sm">دریافت مختصات در Safari / مرورگر</button>
    {opened && <button type="button" disabled={disabled} onClick={() => void paste()} className="min-h-11 rounded-lg border bg-white px-3 text-sm">قرار دادن مختصات کپی‌شده در پروژه</button>}
    {message && <p role="status" className="text-sm leading-7">{message}</p>}
    <p className="text-xs text-slate-600">مرورگر را گوشی انتخاب می‌کند؛ برای Safari آن را مرورگر پیش‌فرض قرار دهید. فرم پروژه باز می‌ماند.</p>
  </div>
}
