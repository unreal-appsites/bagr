// Bagr — minimal service worker for web push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Bagr', body: "Check tomorrow's pack list." };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/today.html'));
});
