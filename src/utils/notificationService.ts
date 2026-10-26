import { AccountingTask } from '../types/accounting';
import { getTodayDateString, formatDatePT, PT_MONTHS } from './dateUtils';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface CheckNotificationOptions {
  targetHour?: number;   // Default: 10 (10:00 AM)
  targetMinute?: number; // Default: 0
  forceNow?: boolean;    // Skip time check if manually triggered
}

/**
 * Checks whether current local time is at or after targetHour:targetMinute today.
 */
export function isAtOrPastNotificationTime(targetHour: number = 10, targetMinute: number = 0): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  if (currentHour > targetHour) return true;
  if (currentHour === targetHour && currentMinute >= targetMinute) return true;
  return false;
}

/**
 * Calculates milliseconds until the next targetHour:targetMinute.
 * If target time has already passed today, returns milliseconds until tomorrow at that time.
 */
export function getMillisecondsUntilNextTargetTime(targetHour: number = 10, targetMinute: number = 0): number {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0, 0);
  if (now.getTime() >= target.getTime()) {
    // If past target today, schedule for tomorrow
    target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, targetHour, targetMinute, 0, 0);
  }
  return target.getTime() - now.getTime();
}

/**
 * Formats notification title following user format: "Dia 5 de outubro - [Nome da Tarefa]"
 * e.g., "Dia 5 de outubro - Envio do SAF-T"
 */
export function formatTaskNotificationTitle(task: AccountingTask): string {
  if (task.date && task.date.includes('-')) {
    const [, monthStr, dayStr] = task.date.split('-');
    const day = parseInt(dayStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const monthName = PT_MONTHS[monthIdx] ? PT_MONTHS[monthIdx].toLowerCase() : '';
    if (monthName) {
      return `Dia ${day} de ${monthName} - ${task.title}`;
    }
  }
  return `Dia limite hoje - ${task.title}`;
}

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
 * STRICT RULES:
 * 1. Dispatches automatically at 10h00 (or if opened after 10h00 on the day of the task).
 * 2. Format: "Dia 5 de outubro - [Nome da Tarefa]"
 * 3. Exactly ONE notification per task (NEVER per client/company).
 * 4. Prevents duplicate notifications on the same day by recording timestamps in localStorage.
 */
export async function checkAndSendDueDateNotifications(
  tasks: AccountingTask[],
  options?: CheckNotificationOptions
): Promise<{
  tasksDueToday: AccountingTask[];
  sentNotificationsCount: number;
  skippedReason?: string;
}> {
  const targetHour = options?.targetHour ?? 10;
  const targetMinute = options?.targetMinute ?? 0;
  const forceNow = options?.forceNow ?? false;

  const todayStr = getTodayDateString();
  const tasksDue = getTasksDueToday(tasks);

  if (tasksDue.length === 0) {
    return { tasksDueToday: [], sentNotificationsCount: 0 };
  }

  // 1. Time restriction: Must be >= 10h00 (unless forced by manual action)
  if (!forceNow && !isAtOrPastNotificationTime(targetHour, targetMinute)) {
    return {
      tasksDueToday: tasksDue,
      sentNotificationsCount: 0,
      skippedReason: `Agendado para as ${String(targetHour).padStart(2, '0')}h${String(targetMinute).padStart(2, '0')}`,
    };
  }

  let sentCount = 0;
  const permission = getNotificationPermission();

  if (permission === 'granted') {
    // 2. Strict Rule: ONE notification per task, NOT per client/company
    for (const task of tasksDue) {
      const storageKey = `contab_notif_10h_${todayStr}_${task.id}`;
      const legacyKey = `contab_notif_${todayStr}_${task.id}`;
      const alreadyNotified = localStorage.getItem(storageKey) || localStorage.getItem(legacyKey);

      if (!alreadyNotified) {
        // Title format requested: "dia 5 outubro - envio saft"
        const title = formatTaskNotificationTitle(task);

        const totalClients = task.clients.length;
        const doneClients = task.clients.filter((c) => c.status === 'done').length;
        const pendingClients = totalClients - doneClients;

        let bodyText = '';
        if (totalClients === 0) {
          bodyText = 'Prazo limite hoje para cumprimento desta tarefa.';
        } else if (pendingClients === 0) {
          bodyText = `Todas as ${totalClients} ${totalClients === 1 ? 'empresa concluída' : 'empresas concluídas'}. Prazo limite hoje!`;
        } else {
          bodyText = `${pendingClients} de ${totalClients} ${totalClients === 1 ? 'empresa pendente' : 'empresas pendentes'}. Prazo limite hoje!`;
        }

        const sent = await dispatchLockScreenNotification(title, {
          body: bodyText,
          tag: `due_task_${task.id}_${todayStr}`,
          data: { taskId: task.id, date: task.date },
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
