import React, { useState } from 'react';
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
} from 'lucide-react';
import { Client, AccountingTask } from '../types/accounting';

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  tasks: AccountingTask[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (client: Client) => void;
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
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingClient(null);
    setName('');
    setNif('');
    setNotes('');
    setFormError('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (client: Client) => {
    setIsAddingNew(false);
    setEditingClient(client);
    setName(client.name);
    setNif(client.nif || '');
    setNotes(client.notes || '');
    setFormError('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('O nome da empresa ou cliente é obrigatório.');
      return;
    }

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        name: name.trim(),
        nif: nif.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setEditingClient(null);
    } else {
      onAddClient({
        name: name.trim(),
        nif: nif.trim() || undefined,
        notes: notes.trim() || undefined,
        archived: false,
      });
      setIsAddingNew(false);
    }

    setName('');
    setNif('');
    setNotes('');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Gestão de Empresas e Clientes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Registo central de clientes do gabinete para associação rápida em tarefas.
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
              className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-blue-900/40">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  {editingClient ? 'Editar Cliente' : 'Registar Novo Cliente'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingClient(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              {formError && (
                <div className="p-2 text-xs rounded bg-rose-100 text-rose-800">{formError}</div>
              )}

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
                    placeholder="Ex.: Silva & Filhos Lda."
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
                  placeholder="Ex.: Regime mensal IVA, 4 funcionários, contacto: Dr. Silva..."
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingClient(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  {editingClient ? 'Guardar Alterações' : 'Adicionar Cliente'}
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
                const taskCount = clientTaskCounts.get(client.id) || 0;

                return (
                  <div
                    key={client.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
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

                      <div className="text-[11px] text-slate-400">
                        Associado a {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(client)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar cliente"
                      >
                        <Edit2 className="w-4 h-4" />
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
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50/70 dark:bg-slate-800/40">
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
