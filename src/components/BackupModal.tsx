import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  HardDrive,
  AlertTriangle,
  FileText,
  Trash2,
} from 'lucide-react';
import { AccountingTask, Client, AppBackupData } from '../types/accounting';
import { exportBackupJSON, validateAndParseBackupJSON } from '../utils/storage';
import { formatDatePT } from '../utils/dateUtils';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: AccountingTask[];
  clients: Client[];
  onRestoreBackup: (data: AppBackupData) => void;
  onClearAllData: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  tasks,
  clients,
  onRestoreBackup,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    data: AppBackupData;
    taskCount: number;
    clientCount: number;
    filename: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    exportBackupJSON(tasks, clients);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateAndParseBackupJSON(content);
      if (!res.valid || !res.data || !res.summary) {
        setImportError(res.error || 'Ficheiro de cópia de segurança inválido.');
        return;
      }

      setImportPreview({
        data: res.data,
        taskCount: res.summary.taskCount,
        clientCount: res.summary.clientCount,
        filename: file.name,
      });
    };
    reader.onerror = () => {
      setImportError('Erro ao ler o ficheiro selecionado.');
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!importPreview) return;
    onRestoreBackup(importPreview.data);
    setImportPreview(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Cópias de Segurança & Dados
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exporte ou restaure todos os dados do gabinete em formato JSON.
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Important Security & Browser Storage Note */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Armazenamento Local no Navegador (LocalStorage)</p>
              <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Os dados são guardados exclusivamente no seu navegador neste computador, garantindo
                privacidade total e funcionamento sem custos ou servidores externos. Se limpar o
                histórico/dados do navegador, os dados poderão ser apagados. Recomendamos fazer
                cópias de segurança regulares.
              </p>
            </div>
          </div>

          {/* Export Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Exportar Cópia de Segurança
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Descarrega um ficheiro JSON com todas as tarefas ({tasks.length}), clientes (
                  {clients.length}), notas e históricos.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Exportar JSON</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Restaurar Cópia de Segurança
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Carregue um ficheiro JSON previamente exportado para recuperar tarefas e clientes.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Selecionar Ficheiro JSON...</span>
            </button>

            {importError && (
              <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                {importError}
              </div>
            )}

            {/* Import Preview Banner */}
            {importPreview && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-blue-900 dark:text-blue-200">
                      Pré-visualização do Ficheiro ({importPreview.filename}):
                    </p>
                    <p className="text-blue-800 dark:text-blue-300">
                      • {importPreview.taskCount} tarefas encontradas
                      <br />• {importPreview.clientCount} clientes encontrados
                    </p>
                    <p className="text-rose-600 dark:text-rose-400 font-semibold pt-1">
                      Atenção: Ao restaurar, todos os dados atuais serão substituídos pelo conteúdo
                      deste ficheiro!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-blue-200/60 dark:border-blue-900/40">
                  <button
                    type="button"
                    onClick={() => setImportPreview(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  >
                    Confirmar Restauro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear All Data */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Limpar Todos os Dados
              </span>
              <span className="text-[11px] text-slate-400">
                Apagar todas as tarefas e clientes do navegador e começar com a aplicação limpa.
              </span>
            </div>
            <button
              type="button"
              onClick={onClearAllData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Tudo</span>
            </button>
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
