import { AccountingTask } from '../types/accounting';
import { getTodayDateString, formatDatePT } from './dateUtils';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Checks if HTML5 Web Notifications are supported in the current browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
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
 * Checks all tasks and dispatches a browser notification for each task whose final day is today.
 * Prevents duplicate notifications by saving notification timestamps in localStorage.
 */
export function checkAndSendDueDateNotifications(tasks: AccountingTask[]): {
  tasksDueToday: AccountingTask[];
  sentNotificationsCount: number;
} {
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

        try {
          const notification = new Notification(`Prazo Final Hoje: ${task.title}`, {
            body: bodyText,
            tag: `due_${task.id}_${todayStr}`,
            requireInteraction: false,
          });

          // Optional click handler to focus window
          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          localStorage.setItem(storageKey, new Date().toISOString());
          sentCount++;
        } catch (e) {
          console.warn('Não foi possível enviar notificação nativa:', e);
        }
      }
    }
  }

  return { tasksDueToday: tasksDue, sentNotificationsCount: sentCount };
}
