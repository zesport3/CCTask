import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Clock,
  CalendarDays,
} from 'lucide-react';
import {
  getMonthCalendarMatrix,
  PT_WEEKDAYS,
  formatMonthYearPT,
  getTodayDateString,
  CalendarDay,
} from '../utils/dateUtils';
import { AccountingTask } from '../types/accounting';
import { calculateTaskProgress } from '../utils/storage';

interface CalendarMonthProps {
  currentYear: number;
  currentMonth: number; // 0-11
  selectedDate: string | null; // YYYY-MM-DD
  tasks: AccountingTask[];
  onSelectDate: (dateStr: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  currentYear,
  currentMonth,
  selectedDate,
  tasks,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
}) => {
  const todayStr = getTodayDateString();
  const calendarDays = getMonthCalendarMatrix(currentYear, currentMonth, todayStr);

  // Group tasks by date for fast lookup
  const tasksByDate = React.useMemo(() => {
    const map = new Map<string, AccountingTask[]>();
    for (const task of tasks) {
      const existing = map.get(task.date) || [];
      existing.push(task);
      map.set(task.date, existing);
    }
    return map;
  }, [tasks]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4 sm:p-5 transition-colors">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
            {formatMonthYearPT(currentYear, currentMonth)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Clique num dia para filtrar as tarefas ou navegue livremente entre meses.
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Mês anterior"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onCurrentMonth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Voltar ao mês atual"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mês Atual</span>
          </button>

          <button
            type="button"
            onClick={onNextMonth}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Mês seguinte"
            aria-label="Mês seguinte"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Ver mês todo</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekday Labels (Seg a Dom) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold">
        {PT_WEEKDAYS.map((day, idx) => {
          const isWeekend = idx >= 5;
          return (
            <div
              key={day}
              className={`py-1.5 uppercase tracking-wider ${
                isWeekend
                  ? 'text-slate-400 dark:text-slate-500 font-medium'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((calDay: CalendarDay) => {
          const dayTasks = tasksByDate.get(calDay.dateStr) || [];
          const hasTasks = dayTasks.length > 0;
          const isSelected = selectedDate === calDay.dateStr;

          // Compute status flags for this day
          let allCompleted = hasTasks;

          if (hasTasks) {
            for (const t of dayTasks) {
              const summary = calculateTaskProgress(t, todayStr);
              if (summary.generalStatus !== 'completed') {
                allCompleted = false;
                break;
              }
            }
          }

          return (
            <button
              key={calDay.dateStr}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onSelectDate(null);
                } else {
                  onSelectDate(calDay.dateStr);
                }
              }}
              className={`min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-lg text-left flex flex-col justify-between transition-all relative border ${
                isSelected
                  ? 'ring-2 ring-blue-600 dark:ring-blue-500 border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 z-10'
                  : calDay.isToday
                  ? 'border-blue-400 dark:border-blue-500/80 bg-blue-50/30 dark:bg-blue-950/20'
                  : calDay.holidayName
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 hover:bg-rose-50/40'
                  : calDay.isWeekend
                  ? 'border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              } ${!calDay.isCurrentMonth ? 'opacity-35 hover:opacity-75' : ''}`}
            >
              {/* Day Number and Badges */}
              <div className="flex items-start justify-between w-full gap-1">
                <span
                  className={`text-xs sm:text-sm font-semibold tabular-nums shrink-0 ${
                    calDay.isToday
                      ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs'
                      : isSelected
                      ? 'text-blue-700 dark:text-blue-300 font-bold'
                      : calDay.holidayName
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : calDay.isWeekend
                      ? 'text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {calDay.dayNumber}
                </span>

                <div className="flex items-center gap-1 min-w-0">
                  {calDay.holidayName && (
                    <span
                      className="text-[9px] font-semibold text-rose-600 dark:text-rose-400 truncate max-w-[55px] sm:max-w-[75px]"
                      title={`Feriado: ${calDay.holidayName}`}
                    >
                      {calDay.holidayName}
                    </span>
                  )}
                </div>
              </div>

              {/* Day Tasks Indicator Block */}
              {hasTasks ? (
                <div className="mt-1 w-full">
                  <div
                    className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                      allCompleted
                        ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-blue-100/80 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300'
                    }`}
                  >
                    {allCompleted ? (
                      <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    ) : (
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    )}
                    <span className="tabular-nums truncate">
                      {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>

                  {/* Micro indicator of task titles on desktop */}
                  <div className="hidden sm:block mt-1 space-y-0.5">
                    {dayTasks.slice(0, 2).map((t) => {
                      const sum = calculateTaskProgress(t, todayStr);
                      const isTaskDone = sum.generalStatus === 'completed';
                      const isAdjusted = t.nominalDay && parseInt(t.date.split('-')[2], 10) !== t.nominalDay;
                      return (
                        <div
                          key={t.id}
                          className={`text-[10px] truncate leading-tight ${
                            isTaskDone
                              ? 'text-slate-400 dark:text-slate-500 line-through'
                              : 'text-slate-600 dark:text-slate-300 font-medium'
                          }`}
                          title={isAdjusted ? `${t.title} (ajustada do dia ${t.nominalDay})` : t.title}
                        >
                          · {t.title} {isAdjusted ? `(${t.nominalDay}→${parseInt(t.date.split('-')[2], 10)})` : ''}
                        </div>
                      );
                    })}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-medium">
                        +{dayTasks.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Tarefas concluídas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span>Tarefas em curso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/60 shrink-0" />
            <span>Feriados Nacionais</span>
          </div>
        </div>
        <div className="text-slate-400 text-[11px]">
          Fins de semana e feriados destacados · Prazos ajustados automaticamente p/ dia útil
        </div>
      </div>
    </div>
  );
};
