import React from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronRight,
  X,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { AccountingTask } from '../types/accounting';
import {
  formatDatePT,
  getTodayDateString,
  getPortugueseHoliday,
} from '../utils/dateUtils';

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
  selectedDate,
  onClearDateFilter,
  onSelectTask,
  onOpenNewTask,
  onToggleTaskComplete,
}) => {
  // Check if selectedDate is a Portuguese holiday
  const selectedHoliday = React.useMemo(() => {
    if (!selectedDate || !selectedDate.includes('-')) return null;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const holiday = getPortugueseHoliday(dateObj);
    return holiday.isHoliday ? holiday.name : null;
  }, [selectedDate]);

  // If no date is chosen yet, do NOT show the task list - prompt user to pick a day
  if (!selectedDate) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-5 sm:p-6 text-center transition-colors">
        <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
          Escolha um dia no calendário
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
          Selecione um dia no calendário acima para ver apenas as tarefas desse dia.
        </p>
      </div>
    );
  }

  // Filter tasks strictly for the selected day
  const dayTasks = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-3.5 sm:p-5 transition-colors space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Tarefas de {formatDatePT(selectedDate)}
          </h3>
          <button
            type="button"
            onClick={onClearDateFilter}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer ml-1"
            title="Limpar seleção de dia"
          >
            <X className="w-3 h-3" />
            <span>Fechar dia</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenNewTask(selectedDate)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer min-h-[34px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Holiday Alert for selected date */}
      {selectedHoliday && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base shrink-0">
              🎉
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Feriado Nacional ({formatDatePT(selectedDate)})
              </div>
              <div className="text-sm font-bold text-rose-900 dark:text-rose-100 truncate">
                {selectedHoliday}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 px-2.5 py-0.5 bg-rose-100/80 dark:bg-rose-900/50 rounded-md shrink-0">
            Feriado
          </span>
        </div>
      )}

      {/* Task List Content: Simple format (Task Title + done / total clients) */}
      {dayTasks.length === 0 ? (
        <div className="text-center py-6 px-4">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3">
            {selectedHoliday
              ? `Este dia é feriado (${selectedHoliday}). Não existem tarefas agendadas para esta data.`
              : `Não existem tarefas agendadas para este dia.`}
          </p>
          <button
            type="button"
            onClick={() => onOpenNewTask(selectedDate)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Tarefa neste Dia</span>
          </button>
        </div>
      ) : (
        <div className="max-h-[36vh] sm:max-h-none overflow-y-auto pr-0.5 space-y-2">
          {dayTasks.map((task) => {
            const totalClients = task.clients.length;
            const doneClients = task.clients.filter((c) => c.status === 'done').length;
            const isAllDone =
              totalClients > 0 ? doneClients === totalClients : Boolean(task.isCompleted);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-2.5 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 sm:gap-3 cursor-pointer shadow-xs ${
                  isAllDone
                    ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
                title="Clique para ver os clientes ou alterar apontamentos desta tarefa"
              >
                {/* Botão Dedicado para Marcar como Concluída */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleTaskComplete?.(task);
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                    isAllDone
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs active:scale-95'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 active:scale-95'
                  }`}
                  title={
                    isAllDone
                      ? 'Tarefa concluída! Clique para desmarcar'
                      : 'Clique para colocar esta tarefa como concluída'
                  }
                  aria-label={
                    isAllDone
                      ? 'Desmarcar tarefa concluída'
                      : 'Marcar tarefa como concluída'
                  }
                >
                  {isAllDone ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </button>

                {/* Apenas o título da tarefa */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-xs sm:text-base font-bold truncate transition-colors ${
                      isAllDone
                        ? 'text-emerald-900 dark:text-emerald-200 line-through decoration-emerald-500/50'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {task.title}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate sm:hidden">
                    {totalClients > 0
                      ? `${doneClients}/${totalClients} empresas feitas`
                      : isAllDone
                      ? 'Concluída'
                      : 'Pendente'}
                  </div>
                </div>

                {/* Quantos clientes já estão concluídos / todos os clientes */}
                <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
                  <span
                    className={`hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums border ${
                      isAllDone
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : doneClients > 0
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {doneClients} / {totalClients} {totalClients === 1 ? 'empresa' : 'empresas'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
