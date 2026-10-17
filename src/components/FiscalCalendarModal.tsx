import React from 'react';
import { X, Calendar, CheckCircle2, Plus, Sparkles, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { FISCAL_OBLIGATIONS, FiscalObligationDefinition } from '../utils/fiscalCalendar';
import { AccountingTask } from '../types/accounting';
import { formatDatePT } from '../utils/dateUtils';

interface FiscalCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTasks: AccountingTask[];
  onLoadAllFiscalTasks: () => void;
  onAddSingleFiscalTask: (def: FiscalObligationDefinition) => void;
}

export const FiscalCalendarModal: React.FC<FiscalCalendarModalProps> = ({
  isOpen,
  onClose,
  currentTasks,
  onLoadAllFiscalTasks,
  onAddSingleFiscalTask,
}) => {
  if (!isOpen) return null;

  // Set of active series IDs or titles
  const activeSeriesIds = new Set(currentTasks.map((t) => t.recurrenceSeriesId).filter(Boolean));
  const activeTitles = new Set(currentTasks.map((t) => t.title.toLowerCase().trim()));

  const isObligationPresent = (def: FiscalObligationDefinition) => {
    return activeSeriesIds.has(def.seriesId) || activeTitles.has(def.title.toLowerCase().trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden transition-colors max-h-[90vh] flex flex-col">
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
                Obrigações legais declarativas e contributivas da AT, Segurança Social e ACT.
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

        {/* Modal Top Banner with Bulk Action */}
        <div className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <span className="font-semibold block sm:inline">Obrigações pré-configuradas: </span>
            Ajustam-se automaticamente para o próximo dia útil quando coincidem com feriados (ex: 5 e 20 de outubro) ou fins de semana.
          </div>
          <button
            type="button"
            onClick={() => {
              onLoadAllFiscalTasks();
              onClose();
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Restaurar / Adicionar Todas</span>
          </button>
        </div>

        {/* Modal Body: List of obligations */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800 flex-1">
          {FISCAL_OBLIGATIONS.map((def) => {
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
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Dia {def.nominalDay} · {def.recurrence === 'monthly' ? 'Mensal' : def.recurrence === 'quarterly' ? 'Trimestral' : 'Anual'}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {def.legalEntity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {def.description}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">
                    {def.notes}
                  </p>
                </div>

                <div className="shrink-0 sm:self-center">
                  {isPresent ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ativa nas tarefas</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddSingleFiscalTask(def)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
