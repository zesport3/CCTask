import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Repeat,
  ChevronRight,
  Filter,
  Check,
  Building2,
} from 'lucide-react';
import { AccountingTask, ClientTaskStatus } from '../types/accounting';
import { formatDatePT, formatMonthYearPT, getTodayDateString } from '../utils/dateUtils';
import { calculateTaskProgress } from '../utils/storage';

interface TaskListProps {
  tasks: AccountingTask[];
  currentYear: number;
  currentMonth: number;
  selectedDate: string | null;
  onClearDateFilter: () => void;
  onSelectTask: (task: AccountingTask) => void;
  onOpenNewTask: (presetDate?: string) => void;
  onUpdateTask?: (task: AccountingTask) => void;
  onToggleTaskComplete?: (task: AccountingTask) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  currentYear,
  currentMonth,
  selectedDate,
  onClearDateFilter,
  onSelectTask,
  onOpenNewTask,
  onUpdateTask,
  onToggleTaskComplete,
}) => {
  const todayStr = getTodayDateString();

  // Filter tasks: if selectedDate is set, show only tasks on that date.
  // Otherwise, show tasks belonging to currentYear and currentMonth.
  const filteredTasks = React.useMemo(() => {
    let list = tasks;
    if (selectedDate) {
      list = list.filter((t) => t.date === selectedDate);
    } else {
      const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      list = list.filter((t) => t.date.startsWith(monthPrefix));
    }

    // Sort by date ascending (closest date first)
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, selectedDate, currentYear, currentMonth]);

  const handleToggleClient = (task: AccountingTask, clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateTask) return;

    const updatedClients = task.clients.map((c) => {
      if (c.clientId === clientId) {
        const nextStatus: ClientTaskStatus = c.status === 'done' ? 'in_progress' : 'done';
        return { ...c, status: nextStatus };
      }
      return c;
    });

    onUpdateTask({
      ...task,
      clients: updatedClients,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {selectedDate ? (
              <span>Tarefas de {formatDatePT(selectedDate)}</span>
            ) : (
              <span>Tarefas de {formatMonthYearPT(currentYear, currentMonth)}</span>
            )}
          </h3>
          <span className="px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full tabular-nums">
            {filteredTasks.length}
          </span>
          {selectedDate && (
            <button
              type="button"
              onClick={onClearDateFilter}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-2"
            >
              Ver todo o mês
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenNewTask(selectedDate || undefined)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Task List Content */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2.5">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
            {selectedDate
              ? `Não existem tarefas agendadas para ${formatDatePT(selectedDate)}.`
              : `Não existem tarefas registadas para ${formatMonthYearPT(currentYear, currentMonth)}.`}
          </p>
          <button
            type="button"
            onClick={() => onOpenNewTask(selectedDate || undefined)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tarefa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const summary = calculateTaskProgress(task, todayStr);
            const isCompleted = summary.generalStatus === 'completed';

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all hover:shadow-xs flex flex-col gap-3 cursor-pointer ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/15 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top Row: Title, Date, Recurrence, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm sm:text-base font-bold tracking-tight ${
                        isCompleted
                          ? 'text-slate-500 dark:text-slate-400 line-through'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatDatePT(task.date)}
                    </span>

                    {task.recurrence && task.recurrence !== 'none' && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        ({task.recurrence === 'monthly' ? 'Mensal' : task.recurrence})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {/* Status Pill */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluída</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Em curso</span>
                      </span>
                    )}

                    <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1">
                      Detalhes →
                    </span>
                  </div>
                </div>

                {/* Description if present */}
                {task.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 -mt-1">
                    {task.description}
                  </p>
                )}

                {/* Clients Section: DIRECTLY VISIBLE ON EACH TASK */}
                <div
                  className="pt-2 border-t border-slate-100 dark:border-slate-800/80"
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.clients.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Clientes Associados ({summary.done}/{summary.total} prontos):</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Clique no cliente para marcar
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {task.clients.map((c) => {
                          const isDone = c.status === 'done';
                          return (
                            <button
                              key={c.clientId}
                              type="button"
                              onClick={(e) => handleToggleClient(task, c.clientId, e)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={
                                isDone
                                  ? `Concluído: ${c.clientName} (clique para marcar em curso)`
                                  : `Em curso: ${c.clientName} (clique para concluir)`
                              }
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-slate-500 shrink-0" />
                              )}
                              <span>{c.clientName}</span>
                              {c.clientNif && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({c.clientNif})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-400 italic">
                      <span>Sem clientes associados a esta tarefa.</span>
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-normal cursor-pointer not-italic"
                      >
                        + Associar clientes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
