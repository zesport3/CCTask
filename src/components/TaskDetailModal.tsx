import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Clock,
  Repeat,
  Trash2,
  Edit,
  UserPlus,
  Search,
  ArrowRight,
  MessageSquare,
  Building2,
  Check,
} from 'lucide-react';
import { AccountingTask, Client, ClientTaskStatus } from '../types/accounting';
import { formatDatePT, getTodayDateString } from '../utils/dateUtils';
import { calculateTaskProgress } from '../utils/storage';

interface TaskDetailModalProps {
  task: AccountingTask;
  allClients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: AccountingTask) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: AccountingTask) => void;
  onGenerateNextPeriod: (task: AccountingTask) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  allClients,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onGenerateNextPeriod,
}) => {
  const [clientSearch, setClientSearch] = useState('');
  const [isAddingClients, setIsAddingClients] = useState(false);
  const [selectedClientIdsToAdd, setSelectedClientIdsToAdd] = useState<string[]>([]);
  const [editingNoteClientId, setEditingNoteClientId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');

  if (!isOpen) return null;

  const todayStr = getTodayDateString();
  const summary = calculateTaskProgress(task, todayStr);
  const isCompleted = summary.generalStatus === 'completed';

  // Available clients that are not yet added to this task
  const existingClientIds = new Set(task.clients.map((c) => c.clientId));
  const availableClientsToAdd = allClients.filter(
    (c) => !existingClientIds.has(c.id) && !c.archived
  );

  // Filter clients inside the task for quick search
  const filteredTaskClients = task.clients.filter((c) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return c.clientName.toLowerCase().includes(q) || (c.clientNif && c.clientNif.includes(q));
  });

  // Handler for changing individual client status
  const handleClientStatusChange = (clientId: string, newStatus: ClientTaskStatus) => {
    const updatedClients = task.clients.map((c) => {
      if (c.clientId === clientId) {
        return { ...c, status: newStatus };
      }
      return c;
    });

    const updatedTask: AccountingTask = {
      ...task,
      clients: updatedClients,
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updatedTask);
  };

  // Handler for removing a client from this task
  const handleRemoveClient = (clientId: string) => {
    const updatedClients = task.clients.filter((c) => c.clientId !== clientId);
    const updatedTask: AccountingTask = {
      ...task,
      clients: updatedClients,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTask(updatedTask);
  };

  // Handler for saving individual client note
  const handleSaveClientNote = (clientId: string) => {
    const updatedClients = task.clients.map((c) => {
      if (c.clientId === clientId) {
        return { ...c, notes: editingNoteValue.trim() };
      }
      return c;
    });

    const updatedTask: AccountingTask = {
      ...task,
      clients: updatedClients,
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updatedTask);
    setEditingNoteClientId(null);
  };

  // Handler for general task notes
  const handleGeneralNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedTask: AccountingTask = {
      ...task,
      generalNotes: e.target.value,
      updatedAt: new Date().toISOString(),
    };
    onUpdateTask(updatedTask);
  };

  // Handler to add chosen clients to the task
  const handleAddSelectedClients = () => {
    if (selectedClientIdsToAdd.length === 0) return;

    const newItems = selectedClientIdsToAdd.map((id) => {
      const found = allClients.find((c) => c.id === id);
      return {
        clientId: id,
        clientName: found ? found.name : 'Cliente',
        clientNif: found?.nif,
        status: 'in_progress' as ClientTaskStatus,
        notes: '',
      };
    });

    const updatedTask: AccountingTask = {
      ...task,
      clients: [...task.clients, ...newItems],
      updatedAt: new Date().toISOString(),
    };

    onUpdateTask(updatedTask);
    setSelectedClientIdsToAdd([]);
    setIsAddingClients(false);
  };

  // Quick preset notes for accounting tasks
  const presetNotes = [
    'Documentação recebida',
    'Falta receber faturas/extratos',
    'Aguardar confirmação do cliente',
    'Declaração submetida com sucesso',
    'Guia enviada para pagamento',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {task.title}
              </h2>
              {task.periodLabel && (
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  ({task.periodLabel})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
                <Calendar className="w-4 h-4 text-slate-400" />
                Data limite: {formatDatePT(task.date)}
              </span>

              {task.nominalDay && parseInt(task.date.split('-')[2], 10) !== task.nominalDay && (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
                  Ajustado do dia {task.nominalDay} (calhou a feriado ou fim de semana)
                </span>
              )}

              {task.recurrence && task.recurrence !== 'none' && (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Repeat className="w-4 h-4 text-slate-400" />
                  Recorrência:{' '}
                  <span className="capitalize font-medium text-slate-700 dark:text-slate-200">
                    {task.recurrence === 'monthly'
                      ? `Mensal (Dia ${task.nominalDay || parseInt(task.date.split('-')[2], 10)})`
                      : task.recurrence}
                  </span>
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pt-1">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Editar dados da tarefa"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
              title="Eliminar tarefa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors ml-1"
              aria-label="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Progress Banner & Metrics */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <span className="font-bold text-slate-900 dark:text-white">
                Progresso Geral da Tarefa
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                {summary.total > 0
                  ? `${summary.done} de ${summary.total} clientes tratados (${summary.percentage}%)`
                  : isCompleted
                  ? 'Concluída manualmente'
                  : 'Pendente'}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${summary.percentage}%` }}
              />
            </div>

            {/* Breakdown Badges / Counts */}
            {summary.total > 0 ? (
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-center">
                  <div className="text-slate-400 text-[11px]">Total Clientes</div>
                  <div className="font-bold text-base text-slate-800 dark:text-slate-200 tabular-nums">
                    {summary.total}
                  </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg p-2 text-center">
                  <div className="text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">Feito</div>
                  <div className="font-bold text-base text-emerald-800 dark:text-emerald-300 tabular-nums">
                    {summary.done}
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg p-2 text-center">
                  <div className="text-amber-700 dark:text-amber-400 text-[11px] font-medium">Em curso</div>
                  <div className="font-bold text-base text-amber-800 dark:text-amber-300 tabular-nums">
                    {summary.inProgress}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Esta tarefa não tem clientes associados.</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTask({
                      ...task,
                      isCompleted: !task.isCompleted,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    task.isCompleted
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {task.isCompleted ? 'Desmarcar Concluída' : 'Marcar como Concluída'}
                </button>
              </div>
            )}
          </div>

          {/* General Task Observations Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="general-task-notes"
              className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Observações Gerais da Tarefa</span>
            </label>
            <textarea
              id="general-task-notes"
              rows={2}
              value={task.generalNotes || ''}
              onChange={handleGeneralNotesChange}
              placeholder="Ex.: Instruções gerais, notas para a equipa, prazos especiais ou notas de arquivo..."
              className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 resize-y"
            />
          </div>

          {/* Associated Clients Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Empresas e Clientes Associados ({task.clients.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Search inside task */}
                {task.clients.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="text-xs pl-8 pr-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 w-36 sm:w-44 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Add Clients Button */}
                <button
                  type="button"
                  onClick={() => setIsAddingClients(!isAddingClients)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Adicionar Clientes</span>
                </button>
              </div>
            </div>

            {/* Inline Add Clients Drawer */}
            {isAddingClients && (
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Selecione os clientes a associar a esta tarefa:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingClients(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Fechar
                  </button>
                </div>

                {availableClientsToAdd.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Todos os clientes registados já se encontram associados a esta tarefa.
                  </p>
                ) : (
                  <>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {availableClientsToAdd.map((client) => {
                        const isChecked = selectedClientIdsToAdd.includes(client.id);
                        return (
                          <label
                            key={client.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedClientIdsToAdd([...selectedClientIdsToAdd, client.id]);
                                  } else {
                                    setSelectedClientIdsToAdd(
                                      selectedClientIdsToAdd.filter((id) => id !== client.id)
                                    );
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
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
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedClientIdsToAdd(availableClientsToAdd.map((c) => c.id))
                        }
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Selecionar todos ({availableClientsToAdd.length})
                      </button>

                      <button
                        type="button"
                        disabled={selectedClientIdsToAdd.length === 0}
                        onClick={handleAddSelectedClients}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
                      >
                        Adicionar ({selectedClientIdsToAdd.length})
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Clients List Rows */}
            {task.clients.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-xs text-slate-500">
                  Nenhum cliente associado ainda. Clique em "Adicionar Clientes" para associar empresas a esta tarefa.
                </p>
              </div>
            ) : filteredTaskClients.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                Nenhum cliente corresponde à pesquisa "{clientSearch}".
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTaskClients.map((clientItem) => {
                  const isEditingNote = editingNoteClientId === clientItem.clientId;

                  return (
                    <div
                      key={clientItem.clientId}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        {/* Client Name & NIF */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {clientItem.clientName}
                            </span>
                            {clientItem.clientNif && (
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                · NIF {clientItem.clientNif}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2 Explicit State Options: Em curso | Feito */}
                        <div className="flex items-center gap-1 shrink-0 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleClientStatusChange(clientItem.clientId, 'in_progress')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                              clientItem.status === 'in_progress'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            Em curso
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClientStatusChange(clientItem.clientId, 'done')}
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                              clientItem.status === 'done'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {clientItem.status === 'done' && <Check className="w-3 h-3" />}
                            <span>Feito</span>
                          </button>
                        </div>
                      </div>

                      {/* Client Note Section */}
                      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        {isEditingNote ? (
                          <div className="w-full space-y-2 py-1">
                            <input
                              type="text"
                              value={editingNoteValue}
                              onChange={(e) => setEditingNoteValue(e.target.value)}
                              placeholder="Observação para este cliente (ex.: Falta receber documentos, Declaração submetida...)"
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />

                            {/* Quick Presets for Accounting Office */}
                            <div className="flex flex-wrap gap-1">
                              {presetNotes.map((pn) => (
                                <button
                                  key={pn}
                                  type="button"
                                  onClick={() => setEditingNoteValue(pn)}
                                  className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-600 dark:text-slate-300"
                                >
                                  {pn}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingNoteClientId(null)}
                                className="px-2.5 py-1 text-slate-500 hover:text-slate-700"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveClientNote(clientItem.clientId)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                              >
                                Guardar Nota
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div
                              onClick={() => {
                                setEditingNoteClientId(clientItem.clientId);
                                setEditingNoteValue(clientItem.notes || '');
                              }}
                              className="cursor-pointer group flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                              {clientItem.notes ? (
                                <span className="text-slate-700 dark:text-slate-300 italic">
                                  "{clientItem.notes}"
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] group-hover:underline">
                                  + Adicionar observação a este cliente
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveClient(clientItem.clientId)}
                              className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                              title="Remover cliente desta tarefa"
                            >
                              Remover
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            {task.recurrence && task.recurrence !== 'none' ? (
              <button
                type="button"
                onClick={() => onGenerateNextPeriod(task)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 rounded-lg transition-colors"
                title="Gera a próxima ocorrência recorrente preservando a lista de clientes com estado reiniciado para 'Em curso'"
              >
                <Repeat className="w-4 h-4" />
                <span>Gerar Próximo Período</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs text-slate-400">Tarefa pontual (sem recorrência)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            >
              Voltar ao Calendário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
