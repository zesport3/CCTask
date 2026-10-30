import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ListTodo,
  Sparkles,
  Plus,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { CalendarMonth } from './components/CalendarMonth';
import { TaskList } from './components/TaskList';
import { AllTasksView } from './components/AllTasksView';
import { NotificationGuideModal } from './components/NotificationGuideModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskFormModal } from './components/TaskFormModal';
import { ClientManagerModal } from './components/ClientManagerModal';
import { BackupModal } from './components/BackupModal';
import { ConfirmDialog } from './components/ConfirmDialog';

import { AccountingTask, Client, AppBackupData, ClientTaskStatus } from './types/accounting';
import {
  loadAppData,
  saveAppData,
} from './utils/storage';
import {
  calculateNextOccurrence,
  formatDatePT,
  syncRecurringTasks,
  adjustToNextBusinessDay,
  PT_MONTHS,
  getTodayDateString,
} from './utils/dateUtils';
import {
  generateFiscalTasksForMonth,
  FiscalObligationDefinition,
} from './utils/fiscalCalendar';
import { applyClientObligationsToTasks } from './utils/clientTaskUtils';
import {
  checkAndSendDueDateNotifications,
  scheduleUpcomingNotifications,
  getMillisecondsUntilNextTargetTime,
  isAtOrPastNotificationTime,
} from './utils/notificationService';

export default function App() {
  // Application Data State
  const [tasks, setTasks] = useState<AccountingTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    success: boolean;
    lastSaved?: Date;
    error?: string;
  }>({ success: true });

  // Active View Tab: 'calendar' or 'all_tasks' (Aba para ver as tarefas que tenho criadas)
  const [activeTab, setActiveTab] = useState<'calendar' | 'all_tasks'>('calendar');

  // Calendar View State: Year and Month (0-11)
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Modals and Active Selections
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AccountingTask | null>(null);
  const [presetTaskDate, setPresetTaskDate] = useState<string | undefined>(undefined);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isNotificationGuideOpen, setIsNotificationGuideOpen] = useState(false);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('contab_theme_v1');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('contab_theme_v1', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('contab_theme_v1', 'light');
    }
  }, [isDarkMode]);

  // Initial Load from LocalStorage
  useEffect(() => {
    const { tasks: loadedTasks, clients: loadedClients } = loadAppData();
    // Ensure TSU is migrated to day 25 across all loaded tasks
    const migratedTasks = loadedTasks.map((t) => {
      const isTsu =
        t.recurrenceSeriesId === 'series_fiscal_tsu' ||
        t.title.toLowerCase().includes('pagamento da tsu');
      if (isTsu && (t.nominalDay === 20 || t.date.endsWith('-20') || t.date.endsWith('-21') || t.date.endsWith('-22'))) {
        const [yStr, mStr] = t.date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        const maxDays = new Date(y, m + 1, 0).getDate();
        const safeDay = Math.min(25, maxDays);
        const nominalIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
        const adj = adjustToNextBusinessDay(nominalIso);
        return {
          ...t,
          nominalDay: 25,
          nominalDate: nominalIso,
          date: adj.businessDayDate,
        };
      }
      return t;
    });

    setTasks(migratedTasks);
    setClients(loadedClients);
    setIsLoaded(true);
  }, []);

  // Autosave to LocalStorage whenever tasks or clients change
  useEffect(() => {
    if (!isLoaded) return;
    const res = saveAppData(tasks, clients);
    if (res.success) {
      setSaveStatus({ success: true, lastSaved: new Date() });
    } else {
      setSaveStatus({ success: false, error: res.error });
    }
  }, [tasks, clients, isLoaded]);

  // Automatically synchronize monthly recurring tasks for upcoming months
  useEffect(() => {
    if (!isLoaded || tasks.length === 0) return;
    const { tasks: synced, hasNew } = syncRecurringTasks(tasks, currentYear, currentMonth);
    if (hasNew) {
      setTasks(synced);
    }
  }, [currentYear, currentMonth, isLoaded, tasks]);

  // Send notification on the final day of tasks automatically at 09:00 AM (09h00)
  // Strict rule: exactly 1 notification per task, NOT per company
  useEffect(() => {
    if (!isLoaded || tasks.length === 0) return;

    // 1. Pre-schedule native OS alarms (Notification Triggers) for all upcoming tasks at 09h00
    // (This allows Android/Chromium OS alarm manager to fire even when the app is closed!)
    scheduleUpcomingNotifications(tasks, 9, 0);

    // 2. If currently at or after 09h00 today, send any unsent task notifications immediately
    if (isAtOrPastNotificationTime(9, 0)) {
      checkAndSendDueDateNotifications(tasks, { targetHour: 9, targetMinute: 0 });
    }

    // 3. Schedule a precise timeout for exactly 09:00:00 AM (today if before 9h, or tomorrow if past 9h)
    const msUntil9 = getMillisecondsUntilNextTargetTime(9, 0);
    const timeoutId = setTimeout(() => {
      checkAndSendDueDateNotifications(tasks, { targetHour: 9, targetMinute: 0 });
      scheduleUpcomingNotifications(tasks, 9, 0);
    }, msUntil9);

    // 4. Periodic check every 60 seconds (catches if time passed 09h00 while screen was off / tab inactive)
    const intervalId = setInterval(() => {
      if (isAtOrPastNotificationTime(9, 0)) {
        checkAndSendDueDateNotifications(tasks, { targetHour: 9, targetMinute: 0 });
      }
    }, 60 * 1000);

    // 5. Trigger on phone unlock or app tab focus if past 09h00
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        scheduleUpcomingNotifications(tasks, 9, 0);
        if (isAtOrPastNotificationTime(9, 0)) {
          checkAndSendDueDateNotifications(tasks, { targetHour: 9, targetMinute: 0 });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [tasks, isLoaded]);

  // Current task selected for details (reactive to tasks changes)
  const activeDetailTask = tasks.find((t) => t.id === detailTaskId) || null;

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(null);
  };

  // Task Actions
  const handleOpenNewTask = (presetDate?: string) => {
    setEditingTask(null);
    setPresetTaskDate(presetDate);
    setIsTaskFormOpen(true);
  };

  const handleOpenEditTask = (taskToEdit: AccountingTask) => {
    setEditingTask(taskToEdit);
    setIsTaskFormOpen(true);
  };

  const handleSaveTask = (
    taskData: Omit<AccountingTask, 'id' | 'createdAt' | 'updatedAt'>,
    editTaskId?: string
  ) => {
    const nowIso = new Date().toISOString();

    if (editTaskId) {
      // Find the task being edited
      const existingTask = tasks.find((t) => t.id === editTaskId);
      const isRecurring =
        Boolean(existingTask?.recurrenceSeriesId) ||
        existingTask?.recurrence === 'monthly' ||
        taskData.recurrence === 'monthly';

      if (isRecurring) {
        const targetSeriesId =
          existingTask?.recurrenceSeriesId ||
          taskData.recurrenceSeriesId ||
          (existingTask ? `series_${existingTask.title.trim().toLowerCase()}` : `series_${Date.now()}`);

        const newNominalDay =
          taskData.nominalDay ||
          (taskData.date ? parseInt(taskData.date.split('-')[2], 10) : 25);

        setTasks((prev) => {
          const updated = prev.map((t) => {
            const matchesSeries =
              (targetSeriesId && t.recurrenceSeriesId === targetSeriesId) ||
              (existingTask &&
                t.title.trim().toLowerCase() === existingTask.title.trim().toLowerCase() &&
                t.recurrence === existingTask.recurrence) ||
              t.id === editTaskId;

            if (matchesSeries) {
              const [yStr, mStr] = t.date.split('-');
              const y = parseInt(yStr, 10);
              const m = parseInt(mStr, 10) - 1;
              const maxDays = new Date(y, m + 1, 0).getDate();
              const safeDay = Math.min(newNominalDay, maxDays);
              const nominalIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
              const adj = adjustToNextBusinessDay(nominalIso);

              return {
                ...t,
                title: taskData.title,
                description: taskData.description,
                generalNotes: taskData.generalNotes,
                recurrence: taskData.recurrence,
                recurrenceSeriesId: targetSeriesId,
                nominalDay: newNominalDay,
                nominalDate: nominalIso,
                date: adj.businessDayDate,
                clients: taskData.clients,
                updatedAt: nowIso,
              };
            }
            return t;
          });
          const { tasks: synced } = syncRecurringTasks(updated, currentYear, currentMonth);
          return synced;
        });
      } else {
        // Non-recurring single task
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === editTaskId
              ? {
                  ...t,
                  ...taskData,
                  updatedAt: nowIso,
                }
              : t
          );
          return updated;
        });
      }
    } else {
      // Create new task
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const seriesId = taskData.recurrenceSeriesId || (taskData.recurrence === 'monthly' ? taskId : undefined);

      if (taskData.recurrence === 'monthly') {
        // Generate for all 12 months of the current year so it's in ALL months always!
        const newNominalDay =
          taskData.nominalDay ||
          (taskData.date ? parseInt(taskData.date.split('-')[2], 10) : 1);

        const yearTasks: AccountingTask[] = [];
        for (let m = 0; m < 12; m++) {
          const monthStr = String(m + 1).padStart(2, '0');
          const maxDays = new Date(currentYear, m + 1, 0).getDate();
          const safeDay = Math.min(newNominalDay, maxDays);
          const nominalIso = `${currentYear}-${monthStr}-${String(safeDay).padStart(2, '0')}`;
          const adj = adjustToNextBusinessDay(nominalIso);

          yearTasks.push({
            ...taskData,
            id: `task_${seriesId}_${currentYear}_${monthStr}`,
            date: adj.businessDayDate,
            nominalDay: newNominalDay,
            nominalDate: nominalIso,
            periodLabel: `${PT_MONTHS[m]} de ${currentYear}`,
            recurrence: 'monthly',
            recurrenceSeriesId: seriesId,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }

        setTasks((prev) => {
          const combined = [...prev, ...yearTasks];
          const { tasks: synced } = syncRecurringTasks(combined, currentYear, currentMonth);
          return synced;
        });
      } else {
        const newTask: AccountingTask = {
          ...taskData,
          id: taskId,
          recurrenceSeriesId: seriesId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        setTasks((prev) => {
          const list = [...prev, newTask];
          const { tasks: synced } = syncRecurringTasks(list, currentYear, currentMonth);
          return synced;
        });
      }

      if (taskData.date) {
        const [yStr, mStr] = taskData.date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10) - 1;
        setCurrentYear(y);
        setCurrentMonth(m);
      }
    }
  };

  const handleUpdateTask = (updatedTask: AccountingTask) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
      const { tasks: synced } = syncRecurringTasks(updated, currentYear, currentMonth);
      return synced;
    });
  };

  // Quick inline date change (preserves and recalculates nominal day across series if recurring)
  const handleQuickChangeDate = (task: AccountingTask, newDate: string) => {
    const nowIso = new Date().toISOString();
    const day = parseInt(newDate.split('-')[2], 10);
    const seriesId = task.recurrenceSeriesId;
    const isRecurring = Boolean(seriesId) || (task.recurrence && task.recurrence !== 'none');

    if (isRecurring) {
      setTasks((prev) =>
        prev.map((t) => {
          const matches =
            (seriesId && t.recurrenceSeriesId === seriesId) ||
            (t.title.trim().toLowerCase() === task.title.trim().toLowerCase() &&
              t.recurrence === task.recurrence);

          if (matches) {
            const [yStr, mStr] = t.date.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10) - 1;
            const maxDays = new Date(y, m + 1, 0).getDate();
            const safeDay = Math.min(day, maxDays);
            const nominalIso = `${y}-${String(m + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
            const adj = adjustToNextBusinessDay(nominalIso);
            return {
              ...t,
              date: adj.businessDayDate,
              nominalDay: day,
              nominalDate: nominalIso,
              updatedAt: nowIso,
            };
          }
          return t;
        })
      );
    } else {
      const updated: AccountingTask = {
        ...task,
        date: newDate,
        nominalDay: day,
        nominalDate: newDate,
        updatedAt: nowIso,
      };
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    }
  };

  // Toggle complete / in_progress
  const handleToggleTaskComplete = (task: AccountingTask) => {
    const nowIso = new Date().toISOString();
    if (task.clients.length === 0) {
      const updated: AccountingTask = {
        ...task,
        isCompleted: !task.isCompleted,
        updatedAt: nowIso,
      };
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } else {
      const allDone = task.clients.every((c) => c.status === 'done');
      const newStatus: ClientTaskStatus = allDone ? 'in_progress' : 'done';
      const updated: AccountingTask = {
        ...task,
        clients: task.clients.map((c) => ({ ...c, status: newStatus })),
        updatedAt: nowIso,
      };
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    }
  };

  // Delete task or recurrence series
  const handleDeleteTask = (taskId: string, deleteSeries?: boolean) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    const seriesId = taskToDelete.recurrenceSeriesId;
    const isRecurring = Boolean(seriesId) || (taskToDelete.recurrence && taskToDelete.recurrence !== 'none');

    if (isRecurring && deleteSeries) {
      setConfirmDialog({
        isOpen: true,
        title: 'Eliminar Obrigação / Tarefa Recorrente',
        message: `Tem a certeza que deseja eliminar a obrigação "${taskToDelete.title}"? Será removida de todos os meses do calendário.`,
        isDestructive: true,
        onConfirm: () => {
          setTasks((prev) =>
            prev.filter((t) => {
              if (seriesId && t.recurrenceSeriesId === seriesId) return false;
              if (
                t.title.trim().toLowerCase() === taskToDelete.title.trim().toLowerCase() &&
                t.recurrence === taskToDelete.recurrence
              ) {
                return false;
              }
              return t.id !== taskId;
            })
          );
          if (detailTaskId === taskId) {
            setDetailTaskId(null);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Eliminar Tarefa',
        message: `Tem a certeza que deseja eliminar a tarefa "${taskToDelete.title}" de ${formatDatePT(taskToDelete.date)}?`,
        isDestructive: true,
        onConfirm: () => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          if (detailTaskId === taskId) {
            setDetailTaskId(null);
          }
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    }
  };

  // Restore/Populate Official Portuguese Accounting Fiscal Calendar across all months
  const handleRestoreFiscalCalendar = () => {
    setTasks((prev) => {
      let merged = [...prev];
      for (let m = 0; m < 12; m++) {
        const fiscalTasks = generateFiscalTasksForMonth(currentYear, m);
        const existingKeys = new Set(merged.map((t) => `${t.title.toLowerCase().trim()}_${t.date}`));
        for (const ft of fiscalTasks) {
          const key = `${ft.title.toLowerCase().trim()}_${ft.date}`;
          if (!existingKeys.has(key)) {
            merged.push(ft);
          }
        }
      }
      const { tasks: synced } = syncRecurringTasks(merged, currentYear, currentMonth);
      return synced;
    });
  };

  // Add a single obligation from Fiscal Calendar modal across all months
  const handleAddSingleFiscalTask = (def: FiscalObligationDefinition) => {
    const nowIso = new Date().toISOString();
    const monthsToCreate =
      def.recurrence === 'monthly'
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        : def.recurrence === 'quarterly'
        ? def.quarterlyMonths || [1, 4, 7, 10]
        : [def.annualMonth ?? 4];

    const newTasks: AccountingTask[] = [];
    for (const m of monthsToCreate) {
      const monthStr = String(m + 1).padStart(2, '0');
      const monthName = PT_MONTHS[m];
      const maxDays = new Date(currentYear, m + 1, 0).getDate();
      const safeNominalDay = Math.min(def.nominalDay, maxDays);
      const nominalDate = `${currentYear}-${monthStr}-${String(safeNominalDay).padStart(2, '0')}`;
      const adjustment = adjustToNextBusinessDay(nominalDate);

      newTasks.push({
        id: `${def.id}_${currentYear}_${monthStr}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        title: def.title,
        description: def.description,
        date: adjustment.businessDayDate,
        generalNotes: `${def.notes}\n\nEntidade: ${def.legalEntity} · Categoria: ${def.category}`,
        clients: [],
        isCompleted: false,
        recurrence: def.recurrence,
        recurrenceSeriesId: def.seriesId,
        nominalDay: def.nominalDay,
        nominalDate: nominalDate,
        periodLabel: `${monthName} de ${currentYear}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    setTasks((prev) => {
      // Remove any existing duplicate occurrences of this series
      const filtered = prev.filter(
        (t) =>
          t.recurrenceSeriesId !== def.seriesId &&
          t.title.trim().toLowerCase() !== def.title.trim().toLowerCase()
      );
      const list = [...filtered, ...newTasks];
      const { tasks: synced } = syncRecurringTasks(list, currentYear, currentMonth);
      return synced;
    });
  };

  // Update a fiscal obligation definition and propagate changes to ALL months
  const handleUpdateFiscalObligation = (def: FiscalObligationDefinition) => {
    const nowIso = new Date().toISOString();
    setTasks((prev) => {
      const hasExisting = prev.some(
        (t) =>
          t.recurrenceSeriesId === def.seriesId ||
          t.title.trim().toLowerCase() === def.title.trim().toLowerCase()
      );

      let updated = prev.map((t) => {
        const matches =
          t.recurrenceSeriesId === def.seriesId ||
          t.title.trim().toLowerCase() === def.title.trim().toLowerCase();

        if (matches) {
          const [yStr, mStr] = t.date.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10) - 1;
          const maxDays = new Date(y, m + 1, 0).getDate();
          const safeNominalDay = Math.min(def.nominalDay, maxDays);
          const nominalDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(safeNominalDay).padStart(2, '0')}`;
          const adj = adjustToNextBusinessDay(nominalDate);

          return {
            ...t,
            title: def.title,
            description: def.description,
            generalNotes: `${def.notes}\n\nEntidade: ${def.legalEntity} · Categoria: ${def.category}`,
            recurrence: def.recurrence,
            recurrenceSeriesId: def.seriesId,
            nominalDay: def.nominalDay,
            nominalDate: nominalDate,
            date: adj.businessDayDate,
            updatedAt: nowIso,
          };
        }
        return t;
      });

      if (!hasExisting) {
        // If not present yet, instantiate for all months
        const monthsToCreate =
          def.recurrence === 'monthly'
            ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            : def.recurrence === 'quarterly'
            ? def.quarterlyMonths || [1, 4, 7, 10]
            : [def.annualMonth ?? 4];

        for (const m of monthsToCreate) {
          const monthStr = String(m + 1).padStart(2, '0');
          const maxDays = new Date(currentYear, m + 1, 0).getDate();
          const safeNominalDay = Math.min(def.nominalDay, maxDays);
          const nominalDate = `${currentYear}-${monthStr}-${String(safeNominalDay).padStart(2, '0')}`;
          const adj = adjustToNextBusinessDay(nominalDate);

          updated.push({
            id: `${def.id}_${currentYear}_${monthStr}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            title: def.title,
            description: def.description,
            date: adj.businessDayDate,
            generalNotes: `${def.notes}\n\nEntidade: ${def.legalEntity} · Categoria: ${def.category}`,
            clients: [],
            isCompleted: false,
            recurrence: def.recurrence,
            recurrenceSeriesId: def.seriesId,
            nominalDay: def.nominalDay,
            nominalDate: nominalDate,
            periodLabel: `${PT_MONTHS[m]} de ${currentYear}`,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }

      const { tasks: synced } = syncRecurringTasks(updated, currentYear, currentMonth);
      return synced;
    });
  };

  // Recurrence generator: creates next period occurrence
  const handleGenerateNextPeriod = (task: AccountingTask) => {
    if (!task.recurrence || task.recurrence === 'none') return;

    const { nextDate, nextPeriodLabel, nominalDay: generatedNominalDay } = calculateNextOccurrence(
      task.date,
      task.recurrence,
      task.recurrenceCustomDays,
      task.nominalDay
    );

    // Check if task already exists for this title and next date
    const alreadyExists = tasks.some(
      (t) => t.title === task.title && t.date === nextDate
    );

    if (alreadyExists) {
      alert(`Já existe uma tarefa "${task.title}" agendada para ${formatDatePT(nextDate)}.`);
      return;
    }

    const newClients = task.clients.map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      clientNif: c.clientNif,
      status: 'in_progress' as const,
      notes: '',
    }));

    const nowIso = new Date().toISOString();
    const seriesId = task.recurrenceSeriesId || task.id;

    const newOccurrence: AccountingTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: task.title,
      description: task.description,
      date: nextDate,
      generalNotes: task.generalNotes,
      clients: newClients,
      isCompleted: false,
      recurrence: task.recurrence,
      recurrenceCustomDays: task.recurrenceCustomDays,
      recurrenceSeriesId: seriesId,
      nominalDay: generatedNominalDay,
      nominalDate: task.nominalDay
        ? `${nextDate.substring(0, 8)}${String(task.nominalDay).padStart(2, '0')}`
        : undefined,
      periodLabel: nextPeriodLabel,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === task.id && !t.recurrenceSeriesId
          ? { ...t, recurrenceSeriesId: seriesId }
          : t
      );
      return [...updated, newOccurrence];
    });

    setDetailTaskId(newOccurrence.id);
  };

  // Default preset: Regime Trimestral sem Salários
  const DEFAULT_QUARTERLY_NO_SALARY_TASKS = [
    'series_fiscal_saft',
    'series_fiscal_iva_trimestral_declaracao',
    'series_fiscal_iva_trimestral_pagamento',
    'series_fiscal_modelo22',
    'series_fiscal_ies',
  ];

  // Client Management Handlers
  const handleQuickCreateClient = async (name: string, nif?: string): Promise<Client | undefined> => {
    const newClient: Client = {
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      nif: nif?.trim() || undefined,
      assignedTasks: DEFAULT_QUARTERLY_NO_SALARY_TASKS,
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [...prev, newClient]);
    setTasks((prevTasks) => {
      return applyClientObligationsToTasks(
        prevTasks,
        newClient,
        DEFAULT_QUARTERLY_NO_SALARY_TASKS,
        currentYear,
        currentMonth
      );
    });
    return newClient;
  };

  const handleAddClient = (
    clientData: Omit<Client, 'id' | 'createdAt'>,
    selectedTaskKeys: string[] = DEFAULT_QUARTERLY_NO_SALARY_TASKS
  ) => {
    const keysToUse =
      selectedTaskKeys && selectedTaskKeys.length > 0
        ? selectedTaskKeys
        : (clientData.assignedTasks && clientData.assignedTasks.length > 0)
        ? clientData.assignedTasks
        : DEFAULT_QUARTERLY_NO_SALARY_TASKS;

    const newClient: Client = {
      ...clientData,
      id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assignedTasks: keysToUse,
      createdAt: new Date().toISOString(),
    };

    setClients((prev) => [...prev, newClient]);

    setTasks((prevTasks) => {
      return applyClientObligationsToTasks(
        prevTasks,
        newClient,
        keysToUse,
        currentYear,
        currentMonth
      );
    });
  };

  const handleUpdateClient = (
    updatedClient: Client,
    selectedTaskKeys?: string[]
  ) => {
    const tasksToApply = selectedTaskKeys ?? updatedClient.assignedTasks ?? [];
    const clientWithTasks: Client = {
      ...updatedClient,
      assignedTasks: tasksToApply,
    };

    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? clientWithTasks : c))
    );

    setTasks((prevTasks) => {
      return applyClientObligationsToTasks(
        prevTasks,
        clientWithTasks,
        tasksToApply,
        currentYear,
        currentMonth
      );
    });
  };

  const handleToggleArchiveClient = (clientId: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, archived: !c.archived } : c))
    );
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const todayStr = getTodayDateString();

    const pastCount = tasks.filter(
      (t) => t.date < todayStr && t.clients.some((c) => c.clientId === clientId)
    ).length;
    const futureCount = tasks.filter(
      (t) => t.date >= todayStr && t.clients.some((c) => c.clientId === clientId)
    ).length;

    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Empresa',
      message:
        `Tem a certeza que deseja eliminar "${client?.name || 'esta empresa'}"? ` +
        (futureCount > 0
          ? `As suas tarefas futuras (${futureCount}) serão eliminadas. `
          : '') +
        (pastCount > 0
          ? `O histórico de tarefas passadas (${pastCount}) ficará mantido para registo.`
          : 'Esta ação não pode ser desfeita.'),
      isDestructive: true,
      onConfirm: () => {
        // 1. Remove company from clients list
        setClients((prev) => prev.filter((c) => c.id !== clientId));

        // 2. Update tasks:
        // - Past tasks (t.date < todayStr): retain client in t.clients as historical record
        // - Future tasks (t.date >= todayStr): remove client; if 0 clients left, eliminate the task
        setTasks((prev) =>
          prev
            .map((t) => {
              if (t.date < todayStr) {
                // Keep historical records intact
                return t;
              }
              // Future tasks: remove client
              return {
                ...t,
                clients: t.clients.filter((c) => c.clientId !== clientId),
              };
            })
            .filter((t) => {
              // Always keep past tasks
              if (t.date < todayStr) return true;
              // For future tasks, if no clients left, eliminate the task
              return t.clients.length > 0;
            })
        );
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Backup & Restore Actions
  const handleRestoreBackup = (backupData: AppBackupData) => {
    setTasks(backupData.tasks);
    setClients(backupData.clients);
    setDetailTaskId(null);
    setSelectedDate(null);
  };

  const handleClearAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Todos os Dados',
      message:
        'Tem a certeza que deseja apagar todas as tarefas e clientes e deixar a aplicação totalmente limpa? Esta ação não pode ser revertida.',
      isDestructive: true,
      onConfirm: () => {
        setClients([]);
        setTasks([]);
        setDetailTaskId(null);
        setSelectedDate(null);
        setIsBackupModalOpen(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar & Mobile Bottom Bar */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        tasksCount={tasks.length}
        clientsCount={clients.length}
        onOpenNewTask={() => handleOpenNewTask()}
        onOpenClients={() => setIsClientManagerOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenNotificationGuide={() => setIsNotificationGuideOpen(true)}
        saveStatus={saveStatus}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((d) => !d)}
      />

      {/* Main Content Area - padded at bottom on mobile for bottom navigation bar */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 pb-24 sm:pb-8 space-y-3.5 sm:space-y-6">
        {/* TAB 1: Calendário Mensal e Tarefas com Clientes */}
        {activeTab === 'calendar' && (
          <div className="space-y-3.5 sm:space-y-5">
            <section aria-label="Calendário Mensal">
              <CalendarMonth
                currentYear={currentYear}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                tasks={tasks}
                onSelectDate={setSelectedDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onCurrentMonth={handleCurrentMonth}
              />
            </section>

            <section aria-label="Lista de Tarefas do Mês e Clientes Associados">
              <TaskList
                tasks={tasks}
                currentYear={currentYear}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onClearDateFilter={() => setSelectedDate(null)}
                onSelectTask={(task) => setDetailTaskId(task.id)}
                onOpenNewTask={handleOpenNewTask}
                onUpdateTask={handleUpdateTask}
                onToggleTaskComplete={handleToggleTaskComplete}
              />
            </section>
          </div>
        )}

        {/* TAB 2: Aba para ver as tarefas que tenho criadas */}
        {activeTab === 'all_tasks' && (
          <section aria-label="Aba de Todas as Tarefas Criadas">
            <AllTasksView
              tasks={tasks}
              allClients={clients}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onSelectTask={(task) => handleOpenEditTask(task)}
              onOpenNewTask={handleOpenNewTask}
              onOpenEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onQuickChangeDate={handleQuickChangeDate}
              onRestoreFiscalCalendar={handleRestoreFiscalCalendar}
            />
          </section>
        )}
      </main>

      {/* Clean Subtle Footer */}
      <footer className="hidden sm:block py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        ContabTarefas · Calendário e Tarefas do Gabinete
      </footer>

      {/* MODALS */}

      {/* 1. Modal de Guia e Teste de Notificações no Ecrã de Bloqueio */}
      <NotificationGuideModal
        isOpen={isNotificationGuideOpen}
        onClose={() => setIsNotificationGuideOpen(false)}
      />

      {/* 2. Painel de Detalhes da Tarefa */}
      {activeDetailTask && (
        <TaskDetailModal
          task={activeDetailTask}
          allClients={clients}
          isOpen={Boolean(activeDetailTask)}
          onClose={() => setDetailTaskId(null)}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onEditTask={(t) => {
            setDetailTaskId(null);
            handleOpenEditTask(t);
          }}
          onGenerateNextPeriod={handleGenerateNextPeriod}
        />
      )}

      {/* 3. Modal de Criação / Edição de Tarefas */}
      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
        presetDate={presetTaskDate}
        allClients={clients}
        onQuickCreateClient={handleQuickCreateClient}
      />

      {/* 4. Gestão de Empresas e Clientes */}
      <ClientManagerModal
        isOpen={isClientManagerOpen}
        onClose={() => setIsClientManagerOpen(false)}
        clients={clients}
        tasks={tasks}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
        onDeleteClient={handleDeleteClient}
        onToggleArchiveClient={handleToggleArchiveClient}
      />

      {/* 5. Cópias de Segurança & Reposição */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        tasks={tasks}
        clients={clients}
        onRestoreBackup={handleRestoreBackup}
        onClearAllData={handleClearAllData}
      />

      {/* 6. Caixa de Diálogo de Confirmação */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
