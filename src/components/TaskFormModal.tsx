import React, { useState, useEffect } from 'react';
import { X, Calendar, Repeat, Building2, Search, Plus, Check } from 'lucide-react';
import { AccountingTask, Client, RecurrenceType, TaskClientItem } from '../types/accounting';
import {
  getTodayDateString,
  adjustToNextBusinessDay,
  formatDatePT,
  formatDateToIso,
  PT_MONTHS,
} from '../utils/dateUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<AccountingTask, 'id' | 'createdAt' | 'updatedAt'>, editTaskId?: string) => void;
  initialTask?: AccountingTask | null;
  presetDate?: string;
  allClients: Client[];
  onQuickCreateClient?: (name: string, nif?: string) => Promise<Client | undefined>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  presetDate,
  allClients,
  onQuickCreateClient,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceCustomDays, setRecurrenceCustomDays] = useState<number>(30);
  const [nominalDay, setNominalDay] = useState<number>(() => {
    const today = new Date();
    return today.getDate();
  });
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isQuickAddingClient, setIsQuickAddingClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientNif, setQuickClientNif] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDate(initialTask.date);
      const dayNum =
        initialTask.nominalDay ||
        (initialTask.date && initialTask.date.includes('-')
          ? parseInt(initialTask.date.split('-')[2], 10)
          : new Date().getDate());
      setNominalDay(dayNum);
      setDescription(initialTask.description || '');
      setGeneralNotes(initialTask.generalNotes || '');
      setRecurrence(initialTask.recurrence || 'none');
      setRecurrenceCustomDays(initialTask.recurrenceCustomDays || 30);
      setSelectedClientIds(initialTask.clients.map((c) => c.clientId));
    } else {
      const defaultDate = presetDate || getTodayDateString();
      setTitle('');
      setDate(defaultDate);
      const dayNum = defaultDate.includes('-')
        ? parseInt(defaultDate.split('-')[2], 10)
        : new Date().getDate();
      setNominalDay(dayNum);
      setDescription('');
      setGeneralNotes('');
      setRecurrence('none');
      setRecurrenceCustomDays(30);
      setSelectedClientIds([]);
    }
    setErrorMsg('');
    setClientSearch('');
    setIsQuickAddingClient(false);
  }, [initialTask, presetDate, isOpen]);

  const handleDateChange = (val: string) => {
    setDate(val);
    if (val && val.includes('-')) {
      const parts = val.split('-');
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && d >= 1 && d <= 31) {
        setNominalDay(d);
      }
    }
  };

  const handleNominalDayChange = (newDay: number) => {
    const validDay = Math.min(Math.max(1, newDay), 31);
    setNominalDay(validDay);
    if (date && date.includes('-')) {
      const [y, m] = date.split('-');
      const daysInMonth = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      const clamped = Math.min(validDay, daysInMonth);
      setDate(`${y}-${m}-${String(clamped).padStart(2, '0')}`);
    }
  };

  const calculationInfo = React.useMemo(() => {
    if (!date || !date.includes('-')) return null;
    const [yStr, mStr, dStr] = date.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1; // 0-indexed
    const baseD = nominalDay || parseInt(dStr, 10);
    const daysInCurMonth = new Date(y, m + 1, 0).getDate();
    const curActualDay = Math.min(baseD, daysInCurMonth);

    // Current month nominal and adjusted
    const curNominalDate = new Date(y, m, curActualDay);
    const curAdj = adjustToNextBusinessDay(curNominalDate);

    // Next month nominal and adjusted
    const nextY = m === 11 ? y + 1 : y;
    const nextM = m === 11 ? 0 : m + 1;
    const daysInNextMonth = new Date(nextY, nextM + 1, 0).getDate();
    const nextActualDay = Math.min(baseD, daysInNextMonth);
    const nextNominalDate = new Date(nextY, nextM, nextActualDay);
    const nextAdj = adjustToNextBusinessDay(nextNominalDate);

    return {
      nominalDay: baseD,
      currentMonth: {
        year: y,
        month: m,
        monthName: PT_MONTHS[m],
        nominalDateStr: formatDateToIso(curNominalDate),
        adjustedDateStr: curAdj.adjustedDateStr,
        wasAdjusted: curAdj.wasAdjusted,
        reason: curAdj.reason,
      },
      nextMonth: {
        year: nextY,
        month: nextM,
        monthName: PT_MONTHS[nextM],
        nominalDateStr: formatDateToIso(nextNominalDate),
        adjustedDateStr: nextAdj.adjustedDateStr,
        wasAdjusted: nextAdj.wasAdjusted,
        reason: nextAdj.reason,
      },
    };
  }, [date, nominalDay]);

  const dateCheck = React.useMemo(() => {
    if (!date || !date.includes('-')) return null;
    const [yStr, mStr, dStr] = date.split('-');
    const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10));
    if (isNaN(d.getTime())) return null;
    const adj = adjustToNextBusinessDay(d);
    return adj.wasAdjusted ? adj : null;
  }, [date]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('O nome da tarefa é obrigatório.');
      return;
    }

    if (!date) {
      setErrorMsg('A data da tarefa é obrigatória.');
      return;
    }

    // For monthly tasks, calculate this month's effective date based on nominalDay
    let finalDate = date;
    const chosenNominalDay = recurrence === 'monthly' ? (calculationInfo ? calculationInfo.nominalDay : nominalDay) : undefined;

    if (recurrence === 'monthly' && calculationInfo) {
      finalDate = calculationInfo.currentMonth.adjustedDateStr;
    } else if (dateCheck) {
      finalDate = dateCheck.adjustedDateStr;
    }

    // Build task client items
    // If editing existing task, preserve the client statuses and notes for already existing clients
    const existingClientMap = new Map<string, TaskClientItem>();
    if (initialTask) {
      for (const item of initialTask.clients) {
        existingClientMap.set(item.clientId, item);
      }
    }

    const taskClients: TaskClientItem[] = selectedClientIds.map((clientId) => {
      const existing = existingClientMap.get(clientId);
      if (existing) {
        return existing;
      }
      const clientObj = allClients.find((c) => c.id === clientId);
      return {
        clientId,
        clientName: clientObj ? clientObj.name : 'Cliente',
        clientNif: clientObj?.nif,
        status: 'in_progress',
        notes: '',
      };
    });

    const seriesId =
      initialTask?.recurrenceSeriesId ||
      (recurrence === 'monthly'
        ? `series_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        : undefined);

    onSave(
      {
        title: title.trim(),
        date: finalDate,
        nominalDay: chosenNominalDay,
        recurrenceSeriesId: seriesId,
        description: description.trim() || undefined,
        generalNotes: generalNotes.trim() || undefined,
        recurrence,
        recurrenceCustomDays: recurrence === 'custom' ? recurrenceCustomDays : undefined,
        clients: taskClients,
        periodLabel:
          initialTask?.periodLabel ||
          (recurrence === 'monthly' && calculationInfo
            ? `${calculationInfo.currentMonth.monthName} ${calculationInfo.currentMonth.year}`
            : undefined),
        isCompleted: initialTask?.isCompleted,
      },
      initialTask?.id
    );

    onClose();
  };

  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !onQuickCreateClient) return;

    const newClient = await onQuickCreateClient(quickClientName.trim(), quickClientNif.trim() || undefined);
    if (newClient) {
      setSelectedClientIds((prev) => [...prev, newClient.id]);
      setQuickClientName('');
      setQuickClientNif('');
      setIsQuickAddingClient(false);
    }
  };

  // Filter clients for selector
  const activeClients = allClients.filter((c) => !c.archived);
  const filteredClients = activeClients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.nif && c.nif.includes(q));
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Defina os dados da tarefa e selecione as empresas associadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {/* Nome da Tarefa */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nome da Tarefa <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: IVA Mensal, Processamento Salarial, DMR..."
              className="w-full text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data & Recorrência in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Data de Realização <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Prazos sem indicação de horas.
              </span>
            </div>

            {/* Recorrência */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full text-sm px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Nenhuma (Tarefa Pontual)</option>
                <option value="monthly">Mensal (todos os meses)</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
                <option value="weekly">Semanal</option>
                <option value="custom">Personalizada (dias)</option>
              </select>

              {recurrence === 'monthly' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Dia base:</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={nominalDay}
                    onChange={(e) => handleNominalDayChange(parseInt(e.target.value, 10) || 1)}
                    className="w-16 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-bold text-center"
                  />
                  <span className="text-[11px] text-slate-500">de cada mês</span>
                </div>
              )}

              {recurrence === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">A cada:</span>
                  <input
                    type="number"
                    min={1}
                    value={recurrenceCustomDays}
                    onChange={(e) => setRecurrenceCustomDays(parseInt(e.target.value, 10) || 30)}
                    className="w-20 text-xs px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-500">dias</span>
                </div>
              )}
            </div>
          </div>

          {/* Monthly preview & Holiday rule explanation */}
          {recurrence === 'monthly' && calculationInfo && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Regra de Repetição: Dia {calculationInfo.nominalDay} de cada mês
                </span>
                <span className="text-[11px] text-blue-700 dark:text-blue-300">
                  Transfere para o próximo dia útil se fim de semana ou feriado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-blue-100 dark:border-blue-900/40">
                {/* Current Month Box */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-900/50 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Este Mês ({calculationInfo.currentMonth.monthName}):
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatDatePT(calculationInfo.currentMonth.adjustedDateStr)}
                  </div>
                  {calculationInfo.currentMonth.wasAdjusted ? (
                    <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <span>⚠️ Passa para dia útil {formatDatePT(calculationInfo.currentMonth.adjustedDateStr)} ({calculationInfo.currentMonth.reason})</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <span>✓ Fica no dia {calculationInfo.nominalDay} (dia útil)</span>
                    </div>
                  )}
                </div>

                {/* Next Month Box */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-900/50 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Mês Seguinte ({calculationInfo.nextMonth.monthName}):
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatDatePT(calculationInfo.nextMonth.adjustedDateStr)}
                  </div>
                  {calculationInfo.nextMonth.wasAdjusted ? (
                    <div className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                      <span>⚠️ Passa para dia útil {formatDatePT(calculationInfo.nextMonth.adjustedDateStr)} ({calculationInfo.nextMonth.reason})</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                      <span>✓ Fica no dia {calculationInfo.nominalDay} (dia útil)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Non-monthly weekend/holiday warning */}
          {recurrence !== 'monthly' && dateCheck && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-200 space-y-1 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="font-medium">
                  {dateCheck.reason}: calha a fim de semana/feriado.
                </span>
                <button
                  type="button"
                  onClick={() => setDate(dateCheck.adjustedDateStr)}
                  className="text-xs font-bold text-amber-800 dark:text-amber-300 underline hover:text-amber-950 dark:hover:text-amber-100 text-left sm:text-right cursor-pointer"
                >
                  Ajustar para {formatDatePT(dateCheck.adjustedDateStr)}
                </button>
              </div>
            </div>
          )}

          {/* Descrição Opcional */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Descrição (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Apuramento e submissão da declaração periódica..."
              className="w-full text-sm px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client Selection Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Empresas / Clientes Associados ({selectedClientIds.length})</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClientIds(
                      selectedClientIds.length === activeClients.length
                        ? []
                        : activeClients.map((c) => c.id)
                    )
                  }
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedClientIds.length === activeClients.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>

                {onQuickCreateClient && (
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingClient(!isQuickAddingClient)}
                    className="text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 ml-2"
                  >
                    + Novo cliente rápido
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add Client inline form */}
            {isQuickAddingClient && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col sm:flex-row items-center gap-2 text-xs animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder="Nome da empresa..."
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  className="w-full sm:flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="NIF (opcional)..."
                  value={quickClientNif}
                  onChange={(e) => setQuickClientNif(e.target.value)}
                  className="w-full sm:w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
                />
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingClient(false)}
                    className="px-2 py-1 text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickAddClient}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Client Search Bar */}
            {activeClients.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou NIF..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Client List Box */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredClients.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  Nenhum cliente disponível.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const isChecked = selectedClientIds.includes(client.id);
                  return (
                    <label
                      key={client.id}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClientIds([...selectedClientIds, client.id]);
                            } else {
                              setSelectedClientIds(selectedClientIds.filter((id) => id !== client.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {client.name}
                        </span>
                      </div>
                      {client.nif && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          NIF: {client.nif}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
            <span className="text-[11px] text-slate-400 block">
              Pode criar a tarefa com ou sem clientes. Novos clientes podem ser adicionados mais tarde.
            </span>
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Observações Gerais (Opcional)
            </label>
            <textarea
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Instruções ou apontamentos específicos para esta tarefa..."
              className="w-full text-sm px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              {initialTask ? 'Guardar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
