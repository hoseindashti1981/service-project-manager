# Web Push client setup

The generated public key is in `src/config/push-public-key.ts`. The matching private key is in the ignored `.env.vapid.local`, for a future sending server only. Do not commit that file or use a `VITE_` prefix for private keys. Back up the private key securely; changing the pair requires new subscriptions. `node scripts/generate-vapid.mjs` creates a pair only when neither file exists and never rotates existing keys.

Optional public build overrides: `VITE_WEB_PUSH_PUBLIC_KEY` and `VITE_WEB_PUSH_SUBSCRIPTION_ENDPOINT`. The latter receives subscription JSON via POST; configure CORS/authentication on your eventual server. No endpoint is configured by default.

`subscribeToPush()` requires standalone mode and a click. It requests notification permission before any asynchronous registration lookup, reuses an existing compatible subscription, and subscribes with `userVisibleOnly: true`. The subscription is saved under `lineyar-push-subscription-v1` in localStorage, outside business backups. Settings can export it as JSON; development builds also log the subscription. Treat the endpoint and keys as private device routing information.

`public/reminder-notification.js` handles incoming push and local notification clicks. Example decrypted payload: `{ "title": "لاین‌یار", "body": "یادآوری امروز", "url": "reminders" }`. URLs must remain under the app scope. Every push displays a notification, even when payload is absent or malformed. Clicking focuses an existing app without discarding unsaved forms, or opens the scoped destination when closed.

## iOS test

1. Open the deployed HTTPS app in Safari, Add to Home Screen with Open as Web App enabled, then launch its icon.
2. Settings → «فعال‌سازی اعلان‌ها» → Allow. Download the subscription JSON.
3. To test real delivery, a trusted Web Push sender must use the matching VAPID private/public pair and subscription. No sender, scheduler, or backend is implemented in this phase. Browser permission and subscription alone do not send tomorrow's reminders.
4. Send the sample payload, close the app, and tap the received notification. Verify reopening; repeat while an unsaved form is open and verify focus preserves it.

Do not upload the private key or subscription to public test websites. Device delivery on iOS must be verified on the actual installed app; mocked browser tests cannot establish APNs delivery.
