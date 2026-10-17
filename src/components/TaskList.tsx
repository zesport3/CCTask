import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Repeat,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { AccountingTask } from '../types/accounting';
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
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  currentYear,
  currentMonth,
  selectedDate,
  onClearDateFilter,
  onSelectTask,
  onOpenNewTask,
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5 transition-colors">
      {/* Header and Filter Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedDate ? (
                <span>Tarefas de {formatDatePT(selectedDate)}</span>
              ) : (
                <span>Tarefas de {formatMonthYearPT(currentYear, currentMonth)}</span>
              )}
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full tabular-nums">
              {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedDate ? (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Filter className="w-3.5 h-3.5" />
                Filtro ativo por dia.{' '}
                <button
                  type="button"
                  onClick={onClearDateFilter}
                  className="underline hover:text-blue-700 font-medium ml-1 cursor-pointer"
                >
                  Limpar filtro e ver todo o mês
                </button>
              </span>
            ) : (
              'Ordenadas por data de realização (mais próximas primeiro).'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenNewTask(selectedDate || undefined)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-slate-500" />
          <span>Nova Tarefa {selectedDate ? 'para este dia' : ''}</span>
        </button>
      </div>

      {/* Task List Content */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Nenhuma tarefa encontrada
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {selectedDate
              ? `Não existem tarefas agendadas para o dia ${formatDatePT(selectedDate)}.`
              : `Não existem tarefas registadas para ${formatMonthYearPT(currentYear, currentMonth)}.`}
          </p>
          <button
            type="button"
            onClick={() => onOpenNewTask(selectedDate || undefined)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tarefa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const summary = calculateTaskProgress(task, todayStr);
            const isCompleted = summary.generalStatus === 'completed';

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTask(task);
                  }
                }}
                className={`group p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Left Info: Title, Date, Recurrence, Description */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-base font-bold tracking-tight transition-colors ${
                        isCompleted
                          ? 'text-slate-700 dark:text-slate-300 line-through'
                          : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}
                    >
                      {task.title}
                    </span>

                    {task.periodLabel && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        · {task.periodLabel}
                      </span>
                    )}

                    {task.recurrence && task.recurrence !== 'none' && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400"
                        title={`Recorrência: ${task.recurrence}`}
                      >
                        <Repeat className="w-3 h-3 text-slate-400" />
                        <span className="capitalize">{task.recurrence}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-semibold tabular-nums">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDatePT(task.date)}</span>
                    </div>

                    {task.description && (
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-md hidden sm:inline">
                        — {task.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Progress and Treated Clients Counter */}
                <div className="flex flex-col md:items-end justify-center gap-1.5 shrink-0 min-w-[200px]">
                  {summary.total > 0 ? (
                    <>
                      <div className="flex items-center justify-between md:justify-end gap-3 text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        <span>
                          {summary.done} de {summary.total} clientes tratados
                        </span>
                        <span className="text-slate-500">
                          {summary.inProgress > 0 ? `(faltam ${summary.inProgress})` : '(todos prontos)'}
                        </span>
                      </div>

                      {/* Clean Progress Bar */}
                      <div className="w-full md:w-48 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-blue-600 dark:bg-blue-500'
                          }`}
                          style={{ width: `${summary.percentage}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Sem clientes associados
                    </div>
                  )}
                </div>

                {/* Right: General Status Badge & Arrow */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluída</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Em curso{summary.total > 0 ? ` (${summary.percentage}%)` : ''}</span>
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
