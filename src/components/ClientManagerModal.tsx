import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Check,
  AlertCircle,
  Calendar,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  CalendarDays,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Client, AccountingTask } from '../types/accounting';
import {
  getAvailableAssignableObligations,
  getClientAssignedTaskKeys,
  AssignableObligation,
} from '../utils/clientTaskUtils';

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  tasks: AccountingTask[];
  onAddClient: (
    client: Omit<Client, 'id' | 'createdAt'>,
    selectedTaskSeriesIds?: string[]
  ) => void;
  onUpdateClient: (
    client: Client,
    selectedTaskSeriesIds?: string[]
  ) => void;
  onDeleteClient: (clientId: string) => void;
  onToggleArchiveClient: (clientId: string) => void;
}

export const ClientManagerModal: React.FC<ClientManagerModalProps> = ({
  isOpen,
  onClose,
  clients,
  tasks,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onToggleArchiveClient,
}) => {
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<string[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [isTaskSectionExpanded, setIsTaskSectionExpanded] = useState(true);

  // Available obligations (Fiscal standard + custom)
  const assignableObligations = useMemo(() => {
    return getAvailableAssignableObligations(tasks, clients);
  }, [tasks, clients]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingClient(null);
    setName('');
    setNif('');
    setNotes('');
    // By default for a new client: Regime Trimestral sem Salários
    setSelectedTaskKeys([
      'series_fiscal_saft',
      'series_fiscal_iva_trimestral_declaracao',
      'series_fiscal_iva_trimestral_pagamento',
      'series_fiscal_modelo22',
      'series_fiscal_ies',
    ]);
    setTaskSearch('');
    setFormError('');
    setIsAddingNew(true);
    setIsTaskSectionExpanded(true);
  };

  const handleStartEdit = (client: Client) => {
    setIsAddingNew(false);
    setEditingClient(client);
    setName(client.name);
    setNif(client.nif || '');
    setNotes(client.notes || '');
    const currentKeys = getClientAssignedTaskKeys(client.id, tasks, client);
    setSelectedTaskKeys(currentKeys);
    setTaskSearch('');
    setFormError('');
    setIsTaskSectionExpanded(true);
  };

  const toggleTaskKey = (key: string) => {
    setSelectedTaskKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Preset Selection Handlers
  const applyPreset = (
    presetType:
      | 'trimestral_sem_salarios'
      | 'trimestral_salarios'
      | 'geral_salarios'
      | 'apenas_saft'
      | 'todas_mensais'
      | 'limpar'
  ) => {
    if (presetType === 'limpar') {
      setSelectedTaskKeys([]);
      return;
    }

    if (presetType === 'trimestral_sem_salarios') {
      setSelectedTaskKeys([
        'series_fiscal_saft',
        'series_fiscal_iva_trimestral_declaracao',
        'series_fiscal_iva_trimestral_pagamento',
        'series_fiscal_modelo22',
        'series_fiscal_ies',
      ]);
      return;
    }

    if (presetType === 'todas_mensais') {
      const monthlyKeys = assignableObligations
        .filter((o) => o.recurrence === 'monthly')
        .map((o) => o.id);
      setSelectedTaskKeys(monthlyKeys);
      return;
    }

    if (presetType === 'geral_salarios') {
      setSelectedTaskKeys([
        'series_fiscal_saft',
        'series_fiscal_dmr',
        'series_fiscal_dri',
        'series_fiscal_tsu',
        'series_fiscal_retencoes',
        'series_fiscal_iva_mensal_declaracao',
        'series_fiscal_iva_mensal_pagamento',
        'series_fiscal_modelo22',
        'series_fiscal_ies',
      ]);
      return;
    }

    if (presetType === 'trimestral_salarios') {
      setSelectedTaskKeys([
        'series_fiscal_saft',
        'series_fiscal_dmr',
        'series_fiscal_dri',
        'series_fiscal_tsu',
        'series_fiscal_retencoes',
        'series_fiscal_iva_trimestral_declaracao',
        'series_fiscal_iva_trimestral_pagamento',
        'series_fiscal_modelo22',
        'series_fiscal_ies',
      ]);
      return;
    }

    if (presetType === 'apenas_saft') {
      setSelectedTaskKeys(['series_fiscal_saft']);
      return;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('O nome da empresa ou cliente é obrigatório.');
      return;
    }

    if (editingClient) {
      onUpdateClient(
        {
          ...editingClient,
          name: name.trim(),
          nif: nif.trim() || undefined,
          notes: notes.trim() || undefined,
          assignedTasks: selectedTaskKeys,
        },
        selectedTaskKeys
      );
      setEditingClient(null);
    } else {
      onAddClient(
        {
          name: name.trim(),
          nif: nif.trim() || undefined,
          notes: notes.trim() || undefined,
          archived: false,
          assignedTasks: selectedTaskKeys,
        },
        selectedTaskKeys
      );
      setIsAddingNew(false);
    }

    setName('');
    setNif('');
    setNotes('');
    setSelectedTaskKeys([]);
    setFormError('');
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    if (!showArchived && c.archived) return false;
    if (showArchived && !c.archived) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.nif && c.nif.includes(q));
  });

  // Calculate task counts per client
  const clientTaskCounts = new Map<string, number>();
  for (const t of tasks) {
    for (const c of t.clients) {
      clientTaskCounts.set(c.clientId, (clientTaskCounts.get(c.clientId) || 0) + 1);
    }
  }

  // Filter assignable obligations inside form
  const filteredObligations = assignableObligations.filter((o) => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      (o.category && o.category.toLowerCase().includes(q)) ||
      (o.legalEntity && o.legalEntity.toLowerCase().includes(q)) ||
      (o.description && o.description.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Gestão de Empresas e Clientes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registo de clientes com associação automática de tarefas para todos os meses do ano.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou NIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  showArchived
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {showArchived ? 'A ver Arquivados' : 'Ver Arquivados'}
              </button>

              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </button>
            </div>
          </div>

          {/* Form for Creating or Editing Client */}
          {(isAddingNew || editingClient) && (
            <form
              onSubmit={handleSaveForm}
              className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {editingClient ? '✓' : '+'}
                  </div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    {editingClient ? `Editar Cliente: ${editingClient.name}` : 'Registar Novo Cliente com Tarefas Recorrentes'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingClient(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
                >
                  Cancelar
                </button>
              </div>

              {formError && (
                <div className="p-2.5 text-xs rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Empresa / Cliente <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Silva & Santos Lda."
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIF (Opcional)
                  </label>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder="Ex.: 501234567"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações Gerais (Opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: Regime mensal IVA, 5 colaboradores, contacto Dr. Silva..."
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Task Association Section: "ficam para todos os meses" */}
              <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Tarefas e Obrigações a Associar (ficam para todos os meses)
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                      {selectedTaskKeys.length} selecionadas
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTaskSectionExpanded(!isTaskSectionExpanded)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs flex items-center gap-1"
                  >
                    {isTaskSectionExpanded ? (
                      <>
                        <span>Recolher</span>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>Expandir</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Subtitle explanation */}
                <div className="flex items-start gap-2 p-2.5 bg-blue-100/60 dark:bg-blue-900/30 rounded-lg text-xs text-blue-900 dark:text-blue-200 mb-3">
                  <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <p>
                    As tarefas selecionadas ficam <strong>associadas a partir da data de criação da empresa e para meses futuros</strong>. Tarefas passadas mantêm o registo histórico.
                  </p>
                </div>

                {isTaskSectionExpanded && (
                  <div className="space-y-3">
                    {/* Presets and Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Predefinições:
                        </span>
                        <button
                          type="button"
                          onClick={() => applyPreset('trimestral_sem_salarios')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/80 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-md shadow-2xs flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                          Trimestral s/ Salários (Predefinido)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('trimestral_salarios')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-2xs"
                        >
                          Trimestral c/ Salários
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('geral_salarios')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-2xs"
                        >
                          Regime Geral + Salários
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('apenas_saft')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-md shadow-2xs"
                        >
                          Só SAF-T
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('limpar')}
                          className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Limpar
                        </button>
                      </div>

                      {/* Obligation search */}
                      <div className="relative w-full sm:w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filtrar tarefas..."
                          value={taskSearch}
                          onChange={(e) => setTaskSearch(e.target.value)}
                          className="w-full text-xs pl-8 pr-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Obligations Checklist */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto bg-white dark:bg-slate-900">
                      {filteredObligations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Nenhuma obrigação encontrada com o termo pesquisado.
                        </div>
                      ) : (
                        filteredObligations.map((ob) => {
                          const isChecked = selectedTaskKeys.includes(ob.id);

                          return (
                            <label
                              key={ob.id}
                              className={`p-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="pt-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleTaskKey(ob.id)}
                                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-xs font-semibold ${
                                    isChecked
                                      ? 'text-blue-950 dark:text-blue-100 font-bold'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {ob.title}
                                  </span>

                                  {/* Periodicity Badge */}
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                                    {ob.periodicityLabel}
                                  </span>

                                  {/* Legal Entity / Category */}
                                  {ob.legalEntity && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-900/50">
                                      {ob.legalEntity}
                                    </span>
                                  )}
                                  {ob.category && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded">
                                      {ob.category}
                                    </span>
                                  )}
                                </div>

                                {ob.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                    {ob.description}
                                  </p>
                                )}
                              </div>

                              {ob.assignedClientsCount > 0 && (
                                <span className="text-[10px] text-slate-400 shrink-0 self-center">
                                  {ob.assignedClientsCount} {ob.assignedClientsCount === 1 ? 'cliente' : 'clientes'}
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-100 dark:border-blue-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingClient(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingClient ? 'Guardar Alterações e Atualizar Meses' : 'Adicionar Cliente com Tarefas'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Client List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {search
                  ? `Nenhum cliente encontrado com "${search}".`
                  : showArchived
                  ? 'Nenhum cliente arquivado.'
                  : 'Nenhum cliente registado ainda. Clique em "Novo Cliente" para começar.'}
              </div>
            ) : (
              filteredClients.map((client) => {
                const assignedKeys = getClientAssignedTaskKeys(client.id, tasks, client);
                const taskCount = clientTaskCounts.get(client.id) || 0;

                // Find human-friendly names for assigned obligations
                const assignedNames = assignedKeys
                  .map((key) => {
                    const ob = assignableObligations.find((o) => o.id === key);
                    if (ob) return ob.title;
                    if (key.startsWith('series_fiscal_')) {
                      return key.replace('series_fiscal_', '').toUpperCase();
                    }
                    return key;
                  })
                  .slice(0, 4);

                const remainingCount = Math.max(0, assignedKeys.length - 4);

                return (
                  <div
                    key={client.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {client.name}
                        </span>
                        {client.nif && (
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            · NIF {client.nif}
                          </span>
                        )}
                        {client.archived && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded">
                            Arquivado
                          </span>
                        )}
                      </div>

                      {client.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {client.notes}
                        </p>
                      )}

                      {/* Badges of Assigned Recurring Obligations */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium mr-1">
                          <Layers className="w-3 h-3 text-blue-500" />
                          {assignedKeys.length} {assignedKeys.length === 1 ? 'obrigação mensal' : 'obrigações mensais'}:
                        </span>

                        {assignedNames.map((nameStr, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-900/60 max-w-[200px] truncate"
                            title={nameStr}
                          >
                            {nameStr}
                          </span>
                        ))}

                        {remainingCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            +{remainingCount} outras
                          </span>
                        )}

                        {assignedKeys.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">
                            Sem tarefas associadas (clique no lápis para associar)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(client)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        title="Editar cliente e suas tarefas recorrentes"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleArchiveClient(client.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={client.archived ? 'Reativar cliente' : 'Arquivar cliente'}
                      >
                        {client.archived ? (
                          <ArchiveRestore className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteClient(client.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total de {clients.length} {clients.length === 1 ? 'empresa/cliente' : 'empresas/clientes'} no gabinete
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
