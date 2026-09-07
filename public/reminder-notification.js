self.addEventListener('notificationclick', event => {
  if (event.notification.tag !== 'lineyar-due-reminders') return
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => client.url.startsWith(self.registration.scope))
    if (existing) await existing.focus()
    else await self.clients.openWindow(new URL('reminders', self.registration.scope).href)
  })())
})
