import { Download, Share2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
    setIsIos(ios)
    if (ios) setVisible(true)

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as InstallPromptEvent)
      setVisible(true)
    }
    const onInstalled = () => { setVisible(false); setDeferredPrompt(null) }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  if (!visible) return null
  return <aside role="status" className="fixed inset-x-3 top-3 z-[60] mx-auto max-w-xl rounded-2xl border border-indigo-200 bg-white p-3 shadow-xl sm:top-5">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><Download size={20} /></span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">نصب مدیریت خدمات</p>{isIos ? <p className="mt-1 text-xs leading-5 text-slate-600">در Safari روی <Share2 className="mx-0.5 inline" size={13} /> اشتراک‌گذاری بزنید و «Add to Home Screen» را انتخاب کنید.</p> : <p className="mt-1 text-xs leading-5 text-slate-600">برای دسترسی سریع و استفادهٔ بهترِ آفلاین، برنامه را نصب کنید.</p>}{deferredPrompt && <button onClick={() => void install()} className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">نصب برنامه</button>}</div><button onClick={() => setVisible(false)} aria-label="بستن پیام نصب" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
  </aside>
}
