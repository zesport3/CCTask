import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Repeat,
  Trash2,
  Edit,
  Building2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  Filter,
  CalendarDays,
  Check,
} from 'lucide-react';
import { AccountingTask, Client, RecurrenceType } from '../types/accounting';
import {
  formatDatePT,
  formatMonthYearPT,
  PT_MONTHS,
  getTodayDateString,
  adjustToNextBusinessDay,
} from '../utils/dateUtils';

interface AllTasksViewProps {
  tasks: AccountingTask[];
  allClients: Client[];
  currentYear?: number;
  currentMonth?: number;
  onSelectTask?: (task: AccountingTask) => void;
  onOpenNewTask: (presetDate?: string) => void;
  onOpenEditTask: (task: AccountingTask) => void;
  onDeleteTask: (taskId: string, isRecurring?: boolean) => void;
  onQuickChangeDate: (task: AccountingTask, newDate: string) => void;
  onRestoreFiscalCalendar: () => void;
}

export interface ConfiguredTaskItem {
  id: string;
  key: string;
  title: string;
  description?: string;
  generalNotes?: string;
  recurrence: RecurrenceType;
  nominalDay?: number;
  periodicityLabel: string;
  periodicityDetail: string;
  dueDate: string;
  clients: AccountingTask['clients'];
  representativeTask: AccountingTask;
  isRecurring: boolean;
  recurrenceSeriesId?: string;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({
  tasks,
  allClients,
  currentYear: propYear,
  currentMonth: propMonth,
  onOpenNewTask,
  onOpenEditTask,
  onDeleteTask,
  onQuickChangeDate,
  onRestoreFiscalCalendar,
}) => {
  const today = new Date();
  const todayStr = getTodayDateString();

  // Month navigation state
  const [selectedYear, setSelectedYear] = useState<number>(() => propYear ?? today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => propMonth ?? today.getMonth());

  // View Mode: 'month' (ver tarefas do mês selecionado) | 'all' (todas as tarefas configuradas no sistema)
  const [viewMode, setViewMode] = useState<'month' | 'all'>('month');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'monthly' | 'quarterly' | 'yearly' | 'none'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Quick Date editing
  const [quickDateTaskId, setQuickDateTaskId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>('');

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setViewMode('month');
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setViewMode('month');
  };

  const handleCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setViewMode('month');
  };

  const handleQuickNextMonth = () => {
    const curY = today.getFullYear();
    const curM = today.getMonth();
    if (curM === 11) {
      setSelectedYear(curY + 1);
      setSelectedMonth(0);
    } else {
      setSelectedYear(curY);
      setSelectedMonth(curM + 1);
    }
    setViewMode('month');
  };

  // Helper to extract periodicity label
  const getPeriodicityInfo = (task: AccountingTask) => {
    const actualDay = parseInt(task.date.split('-')[2], 10);
    const nominalDay = task.nominalDay || actualDay;
    const recurrence = task.recurrence || 'none';

    let label = 'Pontual';
    let detail = 'Tarefa única (não recorrente)';

    if (recurrence === 'monthly') {
      label = `Mensal (Dia ${nominalDay})`;
      detail = `Repete todos os meses até ao dia ${nominalDay}`;
    } else if (recurrence === 'quarterly') {
      label = `Trimestral (Dia ${nominalDay})`;
      detail = `Repete trimestralmente até ao dia ${nominalDay}`;
    } else if (recurrence === 'yearly') {
      label = `Anual`;
      detail = `Obrigação anual`;
    } else if (recurrence === 'weekly') {
      label = `Semanal`;
      detail = `Repete semanalmente`;
    } else if (recurrence === 'custom') {
      label = `Intervalo Personalizado`;
      detail = `Periodicidade com intervalo customizado`;
    }

    return { label, detail, nominalDay };
  };

  // Computed list of tasks based on viewMode ('month' vs 'all')
  const taskItems = useMemo<ConfiguredTaskItem[]>(() => {
    if (viewMode === 'month') {
      // Month-specific tasks
      const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      const monthTasks = tasks.filter((t) => t.date.startsWith(monthPrefix));

      return monthTasks
        .map((t) => {
          const { label, detail, nominalDay } = getPeriodicityInfo(t);
          return {
            id: t.id,
            key: t.id,
            title: t.title,
            description: t.description,
            generalNotes: t.generalNotes,
            recurrence: t.recurrence,
            nominalDay,
            periodicityLabel: label,
            periodicityDetail: detail,
            dueDate: t.date,
            clients: t.clients,
            representativeTask: t,
            isRecurring: Boolean(t.recurrence && t.recurrence !== 'none'),
            recurrenceSeriesId: t.recurrenceSeriesId,
          };
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    // ViewMode === 'all': Deduplicate recurring tasks so each series appears once for configuration
    const groups = new Map<string, AccountingTask[]>();

    for (const task of tasks) {
      let groupKey: string;
      if (task.recurrence && task.recurrence !== 'none') {
        if (task.recurrenceSeriesId) {
          groupKey = `series_${task.recurrenceSeriesId}`;
        } else {
          groupKey = `rec_${task.recurrence}_${task.title.trim().toLowerCase()}`;
        }
      } else {
        groupKey = `single_${task.id}`;
      }

      const list = groups.get(groupKey) || [];
      list.push(task);
      groups.set(groupKey, list);
    }

    const items: ConfiguredTaskItem[] = [];

    for (const [key, occurrences] of groups.entries()) {
      occurrences.sort((a, b) => a.date.localeCompare(b.date));
      const upcoming = occurrences.find((o) => o.date >= todayStr) || occurrences[occurrences.length - 1];
      const rep = upcoming || occurrences[0];
      const { label, detail, nominalDay } = getPeriodicityInfo(rep);

      items.push({
        id: rep.id,
        key,
        title: rep.title,
        description: rep.description,
        generalNotes: rep.generalNotes,
        recurrence: rep.recurrence,
        nominalDay,
        periodicityLabel: label,
        periodicityDetail: detail,
        dueDate: rep.date,
        clients: rep.clients,
        representativeTask: rep,
        isRecurring: Boolean(rep.recurrence && rep.recurrence !== 'none'),
        recurrenceSeriesId: rep.recurrenceSeriesId,
      });
    }

    return items.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  }, [tasks, viewMode, selectedYear, selectedMonth, todayStr]);

  // Filter tasks by search, recurrence, and client
  const filteredTasks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return taskItems.filter((item) => {
      // Search filter
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesNotes = (item.generalNotes || '').toLowerCase().includes(q);
        const matchesPeriod = item.periodicityLabel.toLowerCase().includes(q);
        const matchesClients = item.clients.some((c) =>
          c.clientName.toLowerCase().includes(q) || (c.clientNif && c.clientNif.includes(q))
        );

        if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesPeriod && !matchesClients) {
          return false;
        }
      }

      // Recurrence filter
      if (recurrenceFilter !== 'all') {
        if (recurrenceFilter === 'none' && item.recurrence !== 'none') return false;
        if (recurrenceFilter !== 'none' && item.recurrence !== recurrenceFilter) return false;
      }

      // Client filter
      if (clientFilter !== 'all') {
        const hasClient = item.clients.some((c) => c.clientId === clientFilter);
        if (!hasClient) return false;
      }

      return true;
    });
  }, [taskItems, searchTerm, recurrenceFilter, clientFilter]);

  // Quick date edit handlers
  const handleStartQuickDate = (item: ConfiguredTaskItem) => {
    setQuickDateTaskId(item.id);
    setEditingDateValue(item.dueDate);
  };

  const handleSaveQuickDate = (item: ConfiguredTaskItem) => {
    if (editingDateValue && editingDateValue !== item.dueDate) {
      onQuickChangeDate(item.representativeTask, editingDateValue);
    }
    setQuickDateTaskId(null);
  };

  const isCurrentMonthActive =
    viewMode === 'month' &&
    selectedYear === today.getFullYear() &&
    selectedMonth === today.getMonth();

  const isNextMonthActive =
    viewMode === 'month' &&
    (today.getMonth() === 11
      ? selectedYear === today.getFullYear() + 1 && selectedMonth === 0
      : selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1);

  return (
    <div className="space-y-4">
      {/* 1. Month Navigation & View Mode Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Month Stepper Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-start">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Mês anterior"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="px-3 py-1 flex items-center gap-2 min-w-[150px] sm:min-w-[190px] justify-center text-center">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white capitalize">
                  {formatMonthYearPT(selectedYear, selectedMonth)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Mês seguinte"
                aria-label="Mês seguinte"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Quick Month Jump Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCurrentMonth}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] flex items-center gap-1 ${
                  isCurrentMonthActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Voltar ao mês atual"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mês Atual</span>
              </button>

              <button
                type="button"
                onClick={handleQuickNextMonth}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 shadow-2xs ${
                  isNextMonthActive
                    ? 'bg-blue-600 text-white dark:bg-blue-500 font-bold'
                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80'
                }`}
                title="Ver o que há para o próximo mês"
              >
                <span>Próximo Mês</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* View Mode Toggle: 'month' (Tarefas deste Mês) vs 'all' (Todas as Tarefas Configuradas) */}
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tarefas do Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas as Configurações
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenNewTask()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Search & Periodicity Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar tarefas, periodicidade ou clientes..."
              className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Periodicity Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden md:inline">
              Periodicidade:
            </span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'monthly', label: 'Mensais' },
                { id: 'quarterly', label: 'Trimestrais' },
                { id: 'yearly', label: 'Anuais' },
                { id: 'none', label: 'Pontuais' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRecurrenceFilter(pill.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    recurrenceFilter === pill.id
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Task Configuration List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-10 text-center shadow-xs transition-colors">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {viewMode === 'month'
              ? `Nenhuma tarefa para ${formatMonthYearPT(selectedYear, selectedMonth)}`
              : 'Nenhuma tarefa configurada'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            {searchTerm || recurrenceFilter !== 'all'
              ? 'Não existem tarefas correspondentes aos filtros selecionados. Tente limpar os filtros de pesquisa.'
              : viewMode === 'month'
              ? `Não existem tarefas programadas para este mês. Pode criar uma nova tarefa ou carregar as obrigações fiscais dos contabilistas.`
              : 'Não existem tarefas configuradas no sistema de momento.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onRestoreFiscalCalendar}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Carregar Calendário Fiscal dos Contabilistas</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewTask()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Tarefa</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs transition-colors">
          {filteredTasks.map((item) => (
            <TaskConfigurationRowCard
              key={item.key}
              item={item}
              isQuickDateActive={quickDateTaskId === item.id}
              editingDateValue={editingDateValue}
              onSetEditingDateValue={setEditingDateValue}
              onStartQuickDate={() => handleStartQuickDate(item)}
              onSaveQuickDate={() => handleSaveQuickDate(item)}
              onCancelQuickDate={() => setQuickDateTaskId(null)}
              onOpenEditTask={() => onOpenEditTask(item.representativeTask)}
              onDeleteTask={() => onDeleteTask(item.representativeTask.id, item.isRecurring)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Row Component: Pure Configuration View (No done/undone status, clean date, periodicity & associated clients)
interface TaskConfigurationRowCardProps {
  item: ConfiguredTaskItem;
  isQuickDateActive: boolean;
  editingDateValue: string;
  onSetEditingDateValue: (val: string) => void;
  onStartQuickDate: () => void;
  onSaveQuickDate: () => void;
  onCancelQuickDate: () => void;
  onOpenEditTask: () => void;
  onDeleteTask: () => void;
}

const TaskConfigurationRowCard: React.FC<TaskConfigurationRowCardProps> = ({
  item,
  isQuickDateActive,
  editingDateValue,
  onSetEditingDateValue,
  onStartQuickDate,
  onSaveQuickDate,
  onCancelQuickDate,
  onOpenEditTask,
  onDeleteTask,
}) => {
  return (
    <div className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Task Details Zone */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Title & Periodicidade */}
        <div className="flex flex-wrap items-center gap-2">
          <h4
            onClick={onOpenEditTask}
            className="text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Clique para configurar esta tarefa"
          >
            {item.title}
          </h4>

          {/* Periodicidade Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border ${
              item.recurrence === 'monthly'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
                : item.recurrence === 'quarterly'
                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60'
                : item.recurrence === 'yearly'
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
                : item.recurrence === 'weekly'
                ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title={item.periodicityDetail}
          >
            <Repeat className="w-3 h-3" />
            <span>Periodicidade: {item.periodicityLabel}</span>
          </span>
        </div>

        {/* Description if present */}
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Date and Associated Clients Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
          {/* Due Date */}
          {isQuickDateActive ? (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <input
                type="date"
                value={editingDateValue}
                onChange={(e) => onSetEditingDateValue(e.target.value)}
                className="px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={onSaveQuickDate}
                className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium cursor-pointer"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={onCancelQuickDate}
                className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Data de Vencimento:</span>
              <strong className="font-bold text-slate-900 dark:text-white">
                {formatDatePT(item.dueDate)}
              </strong>
            </div>
          )}

          {/* Associated Clients (Pure list: without any completion/status indicators) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clientes:</span>
            </span>

            {item.clients.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {item.clients.map((c) => (
                  <span
                    key={c.clientId}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    title={c.clientNif ? `${c.clientName} (NIF: ${c.clientNif})` : c.clientName}
                  >
                    <span>{c.clientName}</span>
                    {c.clientNif && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({c.clientNif})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Sem clientes associados
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Zone: Action Buttons (Configurar / Alterar Data / Eliminar) */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2.5 md:pt-0 w-full md:w-auto justify-end">
        {/* Alterar Data button */}
        <button
          type="button"
          onClick={onStartQuickDate}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer min-h-[34px]"
          title="Alterar a data desta tarefa"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Alterar Data</span>
        </button>

        {/* Configurar / Editar button */}
        <button
          type="button"
          onClick={onOpenEditTask}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 rounded-lg transition-colors cursor-pointer min-h-[34px]"
          title="Configurar tarefa, periodicidade e associar empresas"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Configurar</span>
        </button>

        {/* Eliminar button */}
        <button
          type="button"
          onClick={onDeleteTask}
          className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
          title={
            item.isRecurring
              ? 'Eliminar esta obrigação de todos os meses'
              : 'Eliminar esta tarefa'
          }
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
