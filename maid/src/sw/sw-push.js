// Type-checked via ./jsconfig.json (WebWorker libs): `npm run typecheck:sw`.

// Push-only service worker. It deliberately has no fetch handler, so it never
// caches or intercepts page requests.

/**
 * @typedef {object} PushPayload
 * @property {string} [title]
 * @property {string} [body]
 * @property {string} [icon]
 * @property {string} [tag]
 * @property {string} [url]
 */

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

sw.addEventListener('install', () => {
  sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim());
});

sw.addEventListener('push', (event) => {
  /** @type {PushPayload} */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Linpura';
  event.waitUntil(
    sw.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/assets/images/icons/icon-192.png',
      badge: '/assets/images/icons/icon-192.png',
      tag: payload.tag,
      // `renotify` is supported by browsers but missing from TypeScript's NotificationOptions.
      .../** @type {NotificationOptions} */ ({ renotify: !!payload.tag }),
      data: { url: payload.url || '/' },
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    sw.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await sw.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === sw.location.origin,
      );
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) {
          return existing
            .navigate(target)
            .catch(() => sw.clients.openWindow(target));
        }
      }
      return sw.clients.openWindow(target);
    })(),
  );
});
