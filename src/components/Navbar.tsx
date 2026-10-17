import React from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  HardDrive,
  Moon,
  Sun,
  ListTodo,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'calendar' | 'all_tasks';
  onChangeTab: (tab: 'calendar' | 'all_tasks') => void;
  tasksCount: number;
  onOpenNewTask: () => void;
  onOpenClients: () => void;
  onOpenBackup: () => void;
  onOpenFiscalCalendar: () => void;
  saveStatus: { success: boolean; lastSaved?: Date; error?: string };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  tasksCount,
  onOpenNewTask,
  onOpenClients,
  onOpenBackup,
  onOpenFiscalCalendar,
  saveStatus,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  ContabTarefas
                </span>
                <span className="hidden xl:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium">
                  · Gabinete de Contabilidade
                </span>
              </div>
            </div>
          </div>

          {/* Central Tabs: Calendário & Aba para ver as tarefas que tenho criadas */}
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => onChangeTab('calendar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Calendário</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeTab('all_tasks')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all_tasks'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              <span>Todas as Tarefas</span>
            </button>
          </nav>

          {/* Action Zone */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Calendário Fiscal AT Modal Trigger */}
            <button
              type="button"
              onClick={onOpenFiscalCalendar}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Ver obrigações legais do Calendário Fiscal (AT e Seg. Social)"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="hidden md:inline">Calendário Fiscal</span>
            </button>

            {/* Clientes */}
            <button
              type="button"
              onClick={onOpenClients}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Gerir lista de empresas e clientes"
            >
              <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Clientes</span>
            </button>

            {/* Cópias de Segurança */}
            <button
              type="button"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title="Exportar ou importar cópia de segurança em ficheiro JSON"
            >
              <HardDrive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="hidden lg:inline">Segurança</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              aria-label={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              title={isDarkMode ? 'Tema Claro' : 'Tema Escuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Botão Nova Tarefa */}
            <button
              type="button"
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
