import {
  Calendar as CalendarIcon,
  Plus,
  Users,
  HardDrive,
  Moon,
  Sun,
  ListTodo,
  Bell,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'calendar' | 'all_tasks';
  onChangeTab: (tab: 'calendar' | 'all_tasks') => void;
  tasksCount: number;
  clientsCount?: number;
  onOpenNewTask: () => void;
  onOpenClients: () => void;
  onOpenBackup: () => void;
  onOpenNotificationGuide?: () => void;
  saveStatus: { success: boolean; lastSaved?: Date; error?: string };
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  tasksCount,
  clientsCount = 0,
  onOpenNewTask,
  onOpenClients,
  onOpenBackup,
  onOpenNotificationGuide,
  saveStatus,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
            {/* Brand Zone */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                    ContabTarefas
                  </span>
                  <span className="hidden xl:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium">
                    · Gabinete de Contabilidade
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Hidden on mobile, bottom bar used instead) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
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

            {/* Top Action Zone */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Desktop-only Buttons (Clientes, Backup) */}
              <div className="hidden sm:flex items-center gap-1.5 sm:gap-2">
                {/* Clientes */}
                <button
                  type="button"
                  onClick={onOpenClients}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  title="Gerir empresas e clientes"
                >
                  <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Clientes</span>
                  {clientsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {clientsCount}
                    </span>
                  )}
                </button>

                {/* Cópias de Segurança */}
                <button
                  type="button"
                  onClick={onOpenBackup}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Cópia de segurança e restauro"
                >
                  <HardDrive className="w-4 h-4" />
                </button>
              </div>

              {/* Notification Guide / Lock screen settings */}
              {onOpenNotificationGuide && (
                <button
                  type="button"
                  onClick={onOpenNotificationGuide}
                  className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center relative"
                  aria-label="Notificações no ecrã de bloqueio"
                  title="Configurar e testar notificações no ecrã de bloqueio do telemóvel"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}

              {/* Theme Toggle (both mobile and desktop) */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label={isDarkMode ? 'Tema claro' : 'Tema escuro'}
                title={isDarkMode ? 'Tema Claro' : 'Tema Escuro'}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Nova Tarefa Button */}
              <button
                type="button"
                onClick={onOpenNewTask}
                className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer min-h-[36px]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Nova Tarefa</span>
                <span className="xs:hidden">Nova</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on small screens: telemóvel) */}
      <nav
        aria-label="Navegação móvel"
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors shadow-lg"
      >
        <div className="grid grid-cols-4 items-center justify-around h-15 px-1 max-w-lg mx-auto">
          {/* 1. Calendário */}
          <button
            type="button"
            onClick={() => onChangeTab('calendar')}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors cursor-pointer select-none ${
              activeTab === 'calendar'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className={`w-5 h-5 ${activeTab === 'calendar' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] leading-tight">Calendário</span>
          </button>

          {/* 2. Tarefas */}
          <button
            type="button"
            onClick={() => onChangeTab('all_tasks')}
            className={`flex flex-col items-center justify-center gap-1 py-1 rounded-lg transition-colors cursor-pointer select-none relative ${
              activeTab === 'all_tasks'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className="relative">
              <ListTodo className={`w-5 h-5 ${activeTab === 'all_tasks' ? 'stroke-[2.5]' : ''}`} />
            </div>
            <span className="text-[10px] leading-tight">Tarefas</span>
          </button>

          {/* 3. Clientes */}
          <button
            type="button"
            onClick={onOpenClients}
            className="flex flex-col items-center justify-center gap-1 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer select-none relative"
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {clientsCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {clientsCount > 99 ? '99+' : clientsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight">Clientes</span>
          </button>

          {/* 4. Cópia/Backup */}
          <button
            type="button"
            onClick={onOpenBackup}
            className="flex flex-col items-center justify-center gap-1 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer select-none"
          >
            <HardDrive className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Backup</span>
          </button>
        </div>
      </nav>
    </>
  );
};
