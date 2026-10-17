import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  Plus,
  Repeat,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  Building2,
  Sparkles,
  SlidersHorizontal,
  CalendarDays,
  FileText,
  ArrowUpDown,
  ShieldAlert,
} from 'lucide-react';
import { AccountingTask, Client, RecurrenceType } from '../types/accounting';
import { formatDatePT, getTodayDateString } from '../utils/dateUtils';
import { calculateTaskProgress } from '../utils/storage';

interface AllTasksViewProps {
  tasks: AccountingTask[];
  allClients: Client[];
  onSelectTask: (task: AccountingTask) => void;
  onOpenNewTask: (presetDate?: string) => void;
  onOpenEditTask: (task: AccountingTask) => void;
  onDeleteTask: (taskId: string, deleteSeries?: boolean) => void;
  onToggleTaskComplete: (task: AccountingTask) => void;
  onQuickChangeDate: (task: AccountingTask, newDate: string) => void;
  onRestoreFiscalCalendar: () => void;
}

export interface UniqueTaskItem {
  id: string; // Representative task ID
  key: string;
  title: string;
  description?: string;
  generalNotes?: string;
  recurrence: RecurrenceType;
  nominalDay?: number;
  periodicityLabel: string;
  periodicityDetail: string;
  nextDate: string;
  wasAdjusted: boolean;
  clients: AccountingTask['clients'];
  isCompleted: boolean;
  representativeTask: AccountingTask;
  isRecurring: boolean;
  recurrenceSeriesId?: string;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({
  tasks,
  allClients,
  onSelectTask,
  onOpenNewTask,
  onOpenEditTask,
  onDeleteTask,
  onToggleTaskComplete,
  onQuickChangeDate,
  onRestoreFiscalCalendar,
}) => {
  const todayStr = getTodayDateString();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [recurrenceFilter, setRecurrenceFilter] = useState<'all' | 'monthly' | 'quarterly' | 'yearly' | 'none'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [quickDateTaskId, setQuickDateTaskId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState<string>('');

  // Deduplicate recurring tasks so they only appear ONCE in this list
  const uniqueTasks = useMemo<UniqueTaskItem[]>(() => {
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

    const items: UniqueTaskItem[] = [];

    for (const [key, occurrences] of groups.entries()) {
      // Sort chronologically
      occurrences.sort((a, b) => a.date.localeCompare(b.date));

      // Find the upcoming occurrence closest to today, or default to the most recent/first
      const upcoming = occurrences.find((o) => o.date >= todayStr) || occurrences[occurrences.length - 1];
      const rep = upcoming || occurrences[0];

      const actualDay = parseInt(rep.date.split('-')[2], 10);
      const nominalDay = rep.nominalDay || actualDay;
      const wasAdjusted = Boolean(rep.nominalDay && rep.nominalDay !== actualDay);
      const isRecurring = Boolean(rep.recurrence && rep.recurrence !== 'none');

      let periodicityLabel = 'Pontual';
      let periodicityDetail = 'Tarefa única não recorrente';

      if (rep.recurrence === 'monthly') {
        periodicityLabel = 'Mensal';
        periodicityDetail = `Todos os meses até ao dia ${nominalDay}`;
      } else if (rep.recurrence === 'quarterly') {
        periodicityLabel = 'Trimestral';
        periodicityDetail = `A cada 3 meses até ao dia ${nominalDay}`;
      } else if (rep.recurrence === 'yearly') {
        periodicityLabel = 'Anual';
        periodicityDetail = `Obrigação de periodicidade anual`;
      } else if (rep.recurrence === 'weekly') {
        periodicityLabel = 'Semanal';
        periodicityDetail = `Semanalmente`;
      } else if (rep.recurrence === 'custom') {
        periodicityLabel = 'Personalizada';
        periodicityDetail = `Periodicidade com intervalo customizado`;
      }

      items.push({
        id: rep.id,
        key,
        title: rep.title,
        description: rep.description,
        generalNotes: rep.generalNotes,
        recurrence: rep.recurrence,
        nominalDay,
        periodicityLabel,
        periodicityDetail,
        nextDate: rep.date,
        wasAdjusted,
        clients: rep.clients,
        isCompleted: Boolean(rep.isCompleted),
        representativeTask: rep,
        isRecurring,
        recurrenceSeriesId: rep.recurrenceSeriesId,
      });
    }

    return items;
  }, [tasks, todayStr]);

  // Filter & Search unique tasks
  const filteredTasks = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return uniqueTasks
      .filter((item) => {
        // Search matching
        if (q) {
          const matchesTitle = item.title.toLowerCase().includes(q);
          const matchesDesc = (item.description || '').toLowerCase().includes(q);
          const matchesNotes = (item.generalNotes || '').toLowerCase().includes(q);
          const matchesPeriod = item.periodicityLabel.toLowerCase().includes(q);
          const matchesClients = item.clients.some((c) => c.clientName.toLowerCase().includes(q));

          if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesPeriod && !matchesClients) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          const prog = calculateTaskProgress(item.representativeTask, todayStr);
          if (prog.generalStatus !== statusFilter) {
            return false;
          }
        }

        // Recurrence filter
        if (recurrenceFilter !== 'all') {
          if (recurrenceFilter === 'none' && item.recurrence !== 'none') return false;
          if (recurrenceFilter !== 'none' && item.recurrence !== recurrenceFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title, 'pt');
        }
        return a.nextDate.localeCompare(b.nextDate);
      });
  }, [uniqueTasks, searchTerm, statusFilter, recurrenceFilter, sortBy, todayStr]);

  const handleStartQuickDate = (item: UniqueTaskItem) => {
    setQuickDateTaskId(item.id);
    setEditingDateValue(item.nextDate);
  };

  const handleSaveQuickDate = (item: UniqueTaskItem) => {
    if (editingDateValue && editingDateValue !== item.nextDate) {
      onQuickChangeDate(item.representativeTask, editingDateValue);
    }
    setQuickDateTaskId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Summary (Clean presentation without counter numbers) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <CalendarDays className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Todas as Tarefas Criadas
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Lista consolidada das tarefas e obrigações fiscais. Cada tarefa ou obrigação repetível é apresentada apenas uma vez com a respetiva periodicidade.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onRestoreFiscalCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Carregar ou restaurar as obrigações do Calendário Fiscal (SAF-T, DMR, TSU, IVA, etc.)"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Calendário Fiscal AT</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenNewTask()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por obrigação, periodicidade, notas, cliente..."
              className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Sort Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === 'date' ? 'title' : 'date'))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy === 'date' ? 'Ordenar por Data' : 'Ordenar por Nome (A-Z)'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills (No numbers!) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 font-medium mr-1">Estado:</span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'in_progress', label: 'Em Curso' },
            { id: 'completed', label: 'Concluídas' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id as any)}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                statusFilter === pill.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}

          <span className="text-xs text-slate-400 font-medium ml-3 mr-1">Periodicidade:</span>
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
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                recurrenceFilter === pill.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unique Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center shadow-xs transition-colors">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Nenhuma tarefa encontrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            {searchTerm || statusFilter !== 'all' || recurrenceFilter !== 'all'
              ? 'Não existem tarefas correspondentes aos filtros selecionados. Tente limpar os filtros de pesquisa.'
              : 'Não tem tarefas criadas de momento. Pode criar uma nova tarefa personalizada ou carregar o Calendário Fiscal dos contabilistas.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRestoreFiscalCalendar}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Carregar Calendário Fiscal dos Contabilistas</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenNewTask()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Tarefa</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs transition-colors">
          {filteredTasks.map((item) => (
            <UniqueTaskRowCard
              key={item.key}
              item={item}
              todayStr={todayStr}
              isQuickDateActive={quickDateTaskId === item.id}
              editingDateValue={editingDateValue}
              onSetEditingDateValue={setEditingDateValue}
              onStartQuickDate={() => handleStartQuickDate(item)}
              onSaveQuickDate={() => handleSaveQuickDate(item)}
              onCancelQuickDate={() => setQuickDateTaskId(null)}
              onSelectTask={() => onSelectTask(item.representativeTask)}
              onOpenEditTask={() => onOpenEditTask(item.representativeTask)}
              onDeleteTask={() => onDeleteTask(item.representativeTask.id, item.isRecurring)}
              onToggleTaskComplete={() => onToggleTaskComplete(item.representativeTask)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Row component for a single unique task / recurring series
interface UniqueTaskRowCardProps {
  item: UniqueTaskItem;
  todayStr: string;
  isQuickDateActive: boolean;
  editingDateValue: string;
  onSetEditingDateValue: (val: string) => void;
  onStartQuickDate: () => void;
  onSaveQuickDate: () => void;
  onCancelQuickDate: () => void;
  onSelectTask: () => void;
  onOpenEditTask: () => void;
  onDeleteTask: () => void;
  onToggleTaskComplete: () => void;
}

const UniqueTaskRowCard: React.FC<UniqueTaskRowCardProps> = ({
  item,
  todayStr,
  isQuickDateActive,
  editingDateValue,
  onSetEditingDateValue,
  onStartQuickDate,
  onSaveQuickDate,
  onCancelQuickDate,
  onSelectTask,
  onOpenEditTask,
  onDeleteTask,
  onToggleTaskComplete,
}) => {
  const progress = calculateTaskProgress(item.representativeTask, todayStr);
  const isCompleted = progress.generalStatus === 'completed';

  return (
    <div className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left zone: Completion toggle + Title, Periodicidade & Details */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Quick Done Toggle */}
        <button
          type="button"
          onClick={onToggleTaskComplete}
          className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
          title={isCompleted ? 'Marcar como Em Curso' : 'Marcar como Concluída'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              onClick={onSelectTask}
              className={`text-sm sm:text-base font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {item.title}
            </h4>

            {/* Periodicidade Badge - Clearly states frequency */}
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

            {/* Status Pill (Only Concluída or Em Curso) */}
            {isCompleted ? (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Concluída
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Em Curso
              </span>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}

          {/* Next Due Date & Business Day Adjustment Info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-2">
            {isQuickDateActive ? (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
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
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {item.isRecurring ? 'Próximo vencimento:' : 'Data de vencimento:'}{' '}
                  <strong className="font-semibold">{formatDatePT(item.nextDate)}</strong>
                </span>
              </div>
            )}

            {/* Clients note if applicable */}
            {item.clients.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {item.clients.length} {item.clients.length === 1 ? 'empresa associada' : 'empresas associadas'}:{' '}
                  {item.clients.slice(0, 3).map((c) => c.clientName).join(', ')}
                  {item.clients.length > 3 ? ` e mais ${item.clients.length - 3}` : ''}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right zone: Direct Action Buttons (Alterar Data, Editar, Apagar, Detalhes) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
        {/* Alterar Data button */}
        <button
          type="button"
          onClick={onStartQuickDate}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Alterar a data ou dia nominal desta obrigação"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Alterar Data</span>
        </button>

        {/* Editar Completo button */}
        <button
          type="button"
          onClick={onOpenEditTask}
          className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Editar tarefa completa"
        >
          <Edit className="w-4 h-4" />
        </button>

        {/* Ver Detalhes */}
        <button
          type="button"
          onClick={onSelectTask}
          className="px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
          title="Ver checklist e detalhes"
        >
          Detalhes
        </button>

        {/* Apagar Obrigação/Tarefa */}
        <button
          type="button"
          onClick={onDeleteTask}
          className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
          title={
            item.isRecurring
              ? 'Eliminar esta obrigação recorrente de todos os meses'
              : 'Eliminar esta tarefa'
          }
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
