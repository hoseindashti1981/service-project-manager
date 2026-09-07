function waitForInstall(worker: ServiceWorker): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', changed)
      if (error) reject(error); else resolve()
    }
    const changed = () => {
      if (['installed', 'activating', 'activated'].includes(worker.state)) finish()
      else if (worker.state === 'redundant') finish(new Error('دریافت نسخه جدید کامل نشد؛ دوباره تلاش کنید.'))
    }
    const timer = setTimeout(() => finish(new Error('دریافت به‌روزرسانی طول کشید؛ اتصال را بررسی و دوباره تلاش کنید.')), 30000)
    worker.addEventListener('statechange', changed)
    changed()
  })
}

export async function checkAppUpdate(registration: ServiceWorkerRegistration): Promise<boolean> {
  const previous = registration.active
  await registration.update()
  const worker = registration.installing ?? registration.waiting
  if (worker) await waitForInstall(worker)
  return !!worker || registration.active !== previous
}

export async function activateAppUpdate(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.waiting ?? registration.installing
  if (!worker) return
  await waitForInstall(worker)
  if (worker.state === 'activated') return
  await new Promise<void>((resolve, reject) => {
    const changed = () => {
      if (worker.state === 'activated') finish()
      else if (worker.state === 'redundant') finish(new Error('اجرای نسخه جدید ناموفق بود؛ دوباره بررسی کنید.'))
    }
    const finish = (error?: Error) => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', changed)
      if (error) reject(error); else resolve()
    }
    const timer = setTimeout(() => finish(new Error('نسخه جدید هنوز آماده اجرا نیست؛ دوباره تلاش کنید.')), 15000)
    worker.addEventListener('statechange', changed)
    worker.postMessage({ type: 'SKIP_WAITING' })
    changed()
  })
}
