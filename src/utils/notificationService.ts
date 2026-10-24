import { AccountingTask } from '../types/accounting';
import { getTodayDateString, formatDatePT } from './dateUtils';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks if HTML5 Web Notifications are supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Checks if Service Worker notifications (required for Mobile Lock Screen) are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Returns current browser notification permission
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests permission from the user to send notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch (err) {
    console.error('Erro ao pedir permissão de notificações:', err);
    return 'denied';
  }
}

/**
 * Finds all tasks that have their final due date today
 */
export function getTasksDueToday(tasks: AccountingTask[]): AccountingTask[] {
  const todayStr = getTodayDateString();
  return tasks.filter((t) => t.date === todayStr);
}

/**
 * Dispatches a native notification via ServiceWorker (shows on Mobile Lock Screen)
 * with graceful fallback to standard Notification API.
 */
export async function dispatchLockScreenNotification(
  title: string,
  options: {
    body: string;
    tag?: string;
    data?: unknown;
  }
): Promise<boolean> {
  const permission = getNotificationPermission();
  if (permission !== 'granted') return false;

  const notifOptions: NotificationOptions & Record<string, unknown> = {
    body: options.body,
    tag: options.tag,
    icon: './pwa-192x192.png',
    badge: './pwa-192x192.png',
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: false,
    data: options.data,
  };

  // 1. Try Service Worker first (required to display on Mobile Lock Screen)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    }
  } catch (swErr) {
    console.warn('ServiceWorker showNotification indisponível, a tentar fallback:', swErr);
  }

  // 2. Fallback to standard window Notification
  try {
    const notif = new Notification(title, notifOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Não foi possível enviar notificação nativa:', err);
    return false;
  }
}

/**
 * Checks all tasks and dispatches a notification for each task whose final day is today.
 * Prevents duplicate notifications on the same day by recording timestamps in localStorage.
 */
export async function checkAndSendDueDateNotifications(tasks: AccountingTask[]): Promise<{
  tasksDueToday: AccountingTask[];
  sentNotificationsCount: number;
}> {
  const todayStr = getTodayDateString();
  const tasksDue = getTasksDueToday(tasks);

  if (tasksDue.length === 0) {
    return { tasksDueToday: [], sentNotificationsCount: 0 };
  }

  let sentCount = 0;
  const permission = getNotificationPermission();

  if (permission === 'granted') {
    for (const task of tasksDue) {
      const storageKey = `contab_notif_${todayStr}_${task.id}`;
      const alreadyNotified = localStorage.getItem(storageKey);

      if (!alreadyNotified) {
        const totalClients = task.clients.length;
        const doneClients = task.clients.filter((c) => c.status === 'done').length;

        const bodyText =
          totalClients > 0
            ? `${doneClients}/${totalClients} clientes concluídos. Hoje é o dia limite!`
            : `Hoje (${formatDatePT(todayStr)}) é o dia limite para esta tarefa.`;

        const sent = await dispatchLockScreenNotification(`Prazo Final Hoje: ${task.title}`, {
          body: bodyText,
          tag: `due_${task.id}_${todayStr}`,
        });

        if (sent) {
          localStorage.setItem(storageKey, new Date().toISOString());
          sentCount++;
        }
      }
    }
  }

  return { tasksDueToday: tasksDue, sentNotificationsCount: sentCount };
}

/**
 * Sends a test notification after a countdown (e.g. 5 seconds)
 * allowing the user to lock their phone screen and verify it appears on the lock screen.
 */
export async function scheduleTestLockScreenNotification(
  seconds: number = 5
): Promise<{ success: boolean; message: string }> {
  let perm = getNotificationPermission();
  if (perm !== 'granted') {
    perm = await requestNotificationPermission();
  }

  if (perm !== 'granted') {
    return {
      success: false,
      message: 'Permissão não concedida. Por favor autorize as notificações nas definições do navegador/telemóvel.',
    };
  }

  setTimeout(async () => {
    await dispatchLockScreenNotification('ContabTarefas · Teste de Ecrã de Bloqueio', {
      body: 'As notificações no ecrã de bloqueio do teu telemóvel estão a funcionar perfeitamente!',
      tag: `test_lock_${Date.now()}`,
    });
  }, seconds * 1000);

  return {
    success: true,
    message: `Notificação agendada para daqui a ${seconds} segundos. Bloqueia o ecrã do telemóvel agora!`,
  };
}
