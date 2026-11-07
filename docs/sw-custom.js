// Custom Service Worker script for Notification Click & Actions handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action; // 'mark_done', 'open_task', or empty string (direct click)
  const data = event.notification.data || {};
  const taskId = data.taskId;
  const date = data.date;

  // Build target URL
  const targetPath = self.registration.scope || './';
  const urlToOpen = new URL(targetPath, self.location.origin);
  if (taskId) {
    urlToOpen.searchParams.set('openTask', taskId);
  }
  if (date) {
    urlToOpen.searchParams.set('date', date);
  }
  if (action === 'mark_done') {
    urlToOpen.searchParams.set('action', 'mark_done');
  }

  // 1. If an existing app window is open, focus it and post a message
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: action || 'open',
            taskId: taskId,
            date: date,
          });
          return client.focus();
        }
      }
      // 2. Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen.href);
      }
    })
  );
});
