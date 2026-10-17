import { AccountingTask, AppBackupData, Client, TaskProgressSummary, GeneralTaskStatus } from '../types/accounting';
import { getTodayDateString } from './dateUtils';
import { generateFiscalTasksForMonth } from './fiscalCalendar';

const STORAGE_KEY_TASKS = 'contab_tasks_v1';
const STORAGE_KEY_CLIENTS = 'contab_clients_v1';

export const INITIAL_CLIENTS: Client[] = [];

/**
 * Returns initial tasks (empty array as user requested no examples).
 */
export function getInitialTasks(): AccountingTask[] {
  return [];
}

/**
 * Calculate progress summary for a task
 */
export function calculateTaskProgress(task: AccountingTask, todayStr: string = getTodayDateString()): TaskProgressSummary {
  const total = task.clients.length;
  if (total === 0) {
    const isDone = Boolean(task.isCompleted);
    const generalStatus: GeneralTaskStatus = isDone ? 'completed' : 'in_progress';

    return {
      total: 0,
      done: isDone ? 1 : 0,
      inProgress: isDone ? 0 : 1,
      todo: 0,
      percentage: isDone ? 100 : 0,
      generalStatus,
    };
  }

  let done = 0;
  let inProgress = 0;

  for (const c of task.clients) {
    if (c.status === 'done') {
      done++;
    } else {
      inProgress++;
    }
  }

  const percentage = Math.round((done / total) * 100);
  const generalStatus: GeneralTaskStatus = done === total ? 'completed' : 'in_progress';

  return {
    total,
    done,
    inProgress,
    todo: 0,
    percentage,
    generalStatus,
  };
}

/**
 * Load tasks and clients from localStorage. Initializes with sample data if first load.
 */
export function loadAppData(): { tasks: AccountingTask[]; clients: Client[] } {
  try {
    const isCleaned = localStorage.getItem('contab_clean_start_v2');
    if (!isCleaned) {
      // User explicitly requested to remove all examples: clear demo items
      localStorage.removeItem(STORAGE_KEY_TASKS);
      localStorage.removeItem(STORAGE_KEY_CLIENTS);
      localStorage.setItem('contab_clean_start_v2', 'true');
      return { tasks: [], clients: [] };
    }

    const storedClientsStr = localStorage.getItem(STORAGE_KEY_CLIENTS);
    const storedTasksStr = localStorage.getItem(STORAGE_KEY_TASKS);

    let clients: Client[] = [];
    let tasks: AccountingTask[] = [];

    if (storedClientsStr) {
      clients = JSON.parse(storedClientsStr);
      clients = clients.filter((c) => !/^cli_\d+$/.test(c.id));
    }

    if (storedTasksStr) {
      tasks = JSON.parse(storedTasksStr);
      const demoTaskIds = new Set(['task_iva_mensal', 'task_iva_trimestral', 'task_salarios', 'task_dmr']);
      tasks = tasks.filter((t) => !demoTaskIds.has(t.id));
      tasks = tasks.map((t) => ({
        ...t,
        clients: (t.clients || []).map((c) => ({
          ...c,
          status: c.status === 'done' ? 'done' : 'in_progress',
        })),
      }));
    }

    // Predefine official Portuguese accounting fiscal calendar tasks if not yet loaded
    const fiscalInitialized = localStorage.getItem('contab_fiscal_tasks_v1');
    if (!fiscalInitialized) {
      const now = new Date();
      // Use current year/month or October 2026 if context year is 2026
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const fiscalTasks = generateFiscalTasksForMonth(currentYear, currentMonth);

      // Merge: if tasks was empty, load all fiscal tasks. If not empty, only add ones not already existing
      if (tasks.length === 0) {
        tasks = fiscalTasks;
      } else {
        const existingTitles = new Set(tasks.map((t) => t.title.toLowerCase().trim()));
        for (const ft of fiscalTasks) {
          if (!existingTitles.has(ft.title.toLowerCase().trim())) {
            tasks.push(ft);
          }
        }
      }
      localStorage.setItem('contab_fiscal_tasks_v1', 'true');
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    }

    return { tasks, clients };
  } catch (err) {
    console.error('Erro ao ler LocalStorage:', err);
    return { tasks: [], clients: [] };
  }
}

/**
 * Save tasks and clients to localStorage safely with error checking.
 */
export function saveAppData(tasks: AccountingTask[], clients: Client[]): { success: boolean; error?: string } {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(clients));
    return { success: true };
  } catch (err: unknown) {
    console.error('Erro ao gravar dados no LocalStorage:', err);
    const message = err instanceof Error ? err.message : 'Falha desconhecida de gravação no navegador.';
    return { success: false, error: message };
  }
}

/**
 * Export full backup as JSON file download
 */
export function exportBackupJSON(tasks: AccountingTask[], clients: Client[]): void {
  const data: AppBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    clients,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = getTodayDateString();

  const a = document.createElement('a');
  a.href = url;
  a.download = `contab_tarefas_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses backup JSON string
 */
export function validateAndParseBackupJSON(jsonStr: string): {
  valid: boolean;
  data?: AppBackupData;
  error?: string;
  summary?: { taskCount: number; clientCount: number };
} {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'O ficheiro não contém um objeto JSON válido.' };
    }

    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.clients)) {
      return { valid: false, error: 'O ficheiro não contém as listas de tarefas ou clientes requeridas.' };
    }

    // Basic structure check on tasks
    for (const t of parsed.tasks) {
      if (!t.id || !t.title || !t.date) {
        return { valid: false, error: 'Uma ou mais tarefas contêm campos obrigatórios ausentes.' };
      }
    }

    return {
      valid: true,
      data: parsed as AppBackupData,
      summary: {
        taskCount: parsed.tasks.length,
        clientCount: parsed.clients.length,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar ficheiro JSON.';
    return { valid: false, error: message };
  }
}
