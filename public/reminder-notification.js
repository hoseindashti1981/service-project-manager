/** @param {unknown} value */
function pushTarget(value) {
  const scope = new URL(self.registration.scope)
  try {
    const url = new URL(typeof value === 'string' ? value : 'reminders', scope)
    if (url.origin === scope.origin && url.pathname.startsWith(scope.pathname) && !url.username && !url.password) return url.href
  } catch {}
  return new URL('reminders', scope).href
}
self.addEventListener('push', event => {
  /** @type {{title?:unknown,body?:unknown,url?:unknown}} */
  let payload = {}
  try { payload = event.data?.json() || {} } catch {}
  if (!payload || typeof payload !== 'object') payload = {}
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 160) : 'لاین‌یار'
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 2000) : 'پیام تازه‌ای برای شما دریافت شد.'
  event.waitUntil(self.registration.showNotification(title, { body, tag: 'lineyar-push', icon: new URL('pwa-192-v061.png', self.registration.scope).href, data: { kind: 'lineyar-push', url: pushTarget(payload.url) } }))
})
self.addEventListener('notificationclick', event => {
  if (event.notification.tag !== 'lineyar-due-reminders' && event.notification.tag !== 'lineyar-push') return
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url.startsWith(self.registration.scope))
    if (existing) await existing.focus()
    else await self.clients.openWindow(event.notification.tag === 'lineyar-push' ? pushTarget(event.notification.data?.url) : new URL('reminders', self.registration.scope).href)
  })())
})
