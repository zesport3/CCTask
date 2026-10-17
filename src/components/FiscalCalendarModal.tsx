import React, { useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  Plus,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight,
  Edit2,
  Check,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import {
  getFiscalObligations,
  saveFiscalObligation,
  FiscalObligationDefinition,
} from '../utils/fiscalCalendar';
import { AccountingTask, RecurrenceType } from '../types/accounting';
import { formatDatePT } from '../utils/dateUtils';

interface FiscalCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTasks: AccountingTask[];
  onLoadAllFiscalTasks: () => void;
  onAddSingleFiscalTask: (def: FiscalObligationDefinition) => void;
  onUpdateFiscalObligation: (def: FiscalObligationDefinition) => void;
}

export const FiscalCalendarModal: React.FC<FiscalCalendarModalProps> = ({
  isOpen,
  onClose,
  currentTasks,
  onLoadAllFiscalTasks,
  onAddSingleFiscalTask,
  onUpdateFiscalObligation,
}) => {
  const [editingObligation, setEditingObligation] = useState<FiscalObligationDefinition | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [nominalDay, setNominalDay] = useState(25);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('monthly');
  const [legalEntity, setLegalEntity] = useState<'AT' | 'Segurança Social' | 'ACT / MTSSS'>('AT');
  const [category, setCategory] = useState<'Faturação' | 'Salários' | 'IVA' | 'IRC / IRS' | 'Segurança Social'>('IVA');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const obligations = getFiscalObligations();

  // Set of active series IDs or titles
  const activeSeriesIds = new Set(currentTasks.map((t) => t.recurrenceSeriesId).filter(Boolean));
  const activeTitles = new Set(currentTasks.map((t) => t.title.toLowerCase().trim()));

  const isObligationPresent = (def: FiscalObligationDefinition) => {
    return activeSeriesIds.has(def.seriesId) || activeTitles.has(def.title.toLowerCase().trim());
  };

  const handleStartCreate = () => {
    setEditingObligation(null);
    setTitle('');
    setNominalDay(25);
    setRecurrence('monthly');
    setLegalEntity('AT');
    setCategory('IVA');
    setDescription('');
    setNotes('');
    setFormError('');
    setIsCreatingNew(true);
  };

  const handleStartEdit = (def: FiscalObligationDefinition) => {
    setIsCreatingNew(false);
    setEditingObligation(def);
    setTitle(def.title);
    setNominalDay(def.nominalDay);
    setRecurrence(def.recurrence);
    setLegalEntity(def.legalEntity);
    setCategory(def.category);
    setDescription(def.description || '');
    setNotes(def.notes || '');
    setFormError('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('O título da obrigação é obrigatório.');
      return;
    }

    if (nominalDay < 1 || nominalDay > 31) {
      setFormError('O dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    if (editingObligation) {
      const updated: FiscalObligationDefinition = {
        ...editingObligation,
        title: title.trim(),
        nominalDay,
        recurrence,
        legalEntity,
        category,
        description: description.trim(),
        notes: notes.trim(),
      };
      saveFiscalObligation(updated);
      onUpdateFiscalObligation(updated);
      setEditingObligation(null);
    } else {
      const id = `custom_fiscal_${Date.now()}`;
      const seriesId = `series_${id}`;
      const newDef: FiscalObligationDefinition = {
        id,
        seriesId,
        title: title.trim(),
        nominalDay,
        recurrence,
        legalEntity,
        category,
        description: description.trim(),
        notes: notes.trim() || `Prazo legal: até ao dia ${nominalDay} de cada mês.`,
      };
      saveFiscalObligation(newDef);
      onAddSingleFiscalTask(newDef);
      setIsCreatingNew(false);
    }

    setFormError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden transition-colors max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Calendário Fiscal dos Contabilistas (Portugal)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Altere ou adicione tarefas fiscais. As alterações aplicam-se a todos os meses sempre.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Top Banner with Actions */}
        <div className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold block sm:inline">Regra legal automática: </span>
            Se o dia de vencimento coincidir com fim de semana ou feriado, ajusta automaticamente para o próximo dia útil em todos os meses.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleStartCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Nova Obrigação Fiscal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLoadAllFiscalTasks();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Restaurar Todas</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
          {/* Create or Edit Sub-Form */}
          {(isCreatingNew || editingObligation) && (
            <form
              onSubmit={handleSaveForm}
              className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-900/40">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  {editingObligation ? `Editar Obrigação Fiscal: ${editingObligation.title}` : 'Adicionar Nova Obrigação Fiscal'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingObligation(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              {formError && (
                <div className="p-2 text-xs rounded bg-rose-100 text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Obrigação <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Pagamento da TSU (Segurança Social)"
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dia de Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={nominalDay}
                    onChange={(e) => setNominalDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Ex: 25 para TSU, 20 para IVA, etc.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Periodicidade
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Mensal (todos os meses)</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entidade Legal
                  </label>
                  <select
                    value={legalEntity}
                    onChange={(e) => setLegalEntity(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AT">AT (Autoridade Tributária)</option>
                    <option value="Segurança Social">Segurança Social</option>
                    <option value="ACT / MTSSS">ACT / MTSSS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IVA">IVA</option>
                    <option value="Salários">Salários</option>
                    <option value="Faturação">Faturação</option>
                    <option value="Segurança Social">Segurança Social</option>
                    <option value="IRC / IRS">IRC / IRS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição legal ou detalhe da obrigação..."
                  className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingObligation(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {editingObligation ? 'Guardar e Atualizar Todos os Meses' : 'Criar e Adicionar a Todos os Meses'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* List of Obligations */}
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
            {obligations.map((def) => {
              const isPresent = isObligationPresent(def);
              return (
                <div
                  key={def.id}
                  className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {def.title}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Dia {def.nominalDay} · {def.recurrence === 'monthly' ? 'Mensal' : def.recurrence === 'quarterly' ? 'Trimestral' : 'Anual'}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {def.legalEntity}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                        {def.category}
                      </span>
                    </div>
                    {def.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {def.description}
                      </p>
                    )}
                    {def.notes && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">
                        {def.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(def)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Alterar dados desta obrigação (dia, periodicidade, etc.) para todos os meses"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Alterar</span>
                    </button>

                    {isPresent ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ativa</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddSingleFiscalTask(def)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar a todos os meses</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
