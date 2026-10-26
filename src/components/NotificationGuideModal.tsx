import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Share,
  PlusSquare,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleTestLockScreenNotification,
  NotificationPermissionState,
  isNotificationSupported,
} from '../utils/notificationService';

interface NotificationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationGuideModal: React.FC<NotificationGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPermission(getNotificationPermission());

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleRunTest = async () => {
    setTestStatus('A preparar teste...');
    const res = await scheduleTestLockScreenNotification(5);
    if (!res.success) {
      setTestStatus(res.message);
      return;
    }

    setTestStatus('Bloqueia o ecrã agora! O teste dispara em 5s...');
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setTestStatus('Notificação enviada! Verifica o ecrã de bloqueio do teu telemóvel.');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Notificações no Ecrã de Bloqueio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Como receber alertas de prazos diretamente no telemóvel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Status Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  permission === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                }`}
              >
                {permission === 'granted' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {permission === 'granted'
                    ? 'Notificações Ativas ✅'
                    : 'Permissão Pendente'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {permission === 'granted'
                    ? 'A aplicação tem autorização para emitir notificações.'
                    : 'É necessário autorizar para receber alertas no ecrã de bloqueio.'}
                </div>
              </div>
            </div>

            {permission !== 'granted' && isNotificationSupported() && (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
              >
                Ativar Notificações
              </button>
            )}
          </div>

          {/* Regras de Envio Automático */}
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-bold text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              <span>Regras de Notificação Automática</span>
            </div>
            <ul className="text-xs text-indigo-900/90 dark:text-indigo-200/90 space-y-1.5 list-disc list-inside">
              <li>
                <strong>Disparo às 10h00:</strong> As notificações são enviadas automaticamente às 10:00 da manhã no dia em que as tarefas vencem.
              </li>
              <li>
                <strong>Formato:</strong> <em>“Dia 5 de outubro - Envio do SAF-T”</em>.
              </li>
              <li>
                <strong>1 notificação por tarefa:</strong> Não são enviadas notificações repetidas por cada empresa. É emitida exatamente uma notificação por tarefa com o resumo de todas as empresas associadas.
              </li>
            </ul>
          </div>

          {/* Test Button Card */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Experimentar Notificação no Ecrã de Bloqueio</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300/90 leading-relaxed">
              Clica no botão abaixo, <strong>bloqueia de imediato o ecrã do teu telemóvel</strong> com o botão lateral e aguarda 5 segundos para ver a notificação aparecer no ecrã bloqueado!
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunTest}
                disabled={countdown !== null}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <BellRing className={`w-4 h-4 ${countdown !== null ? 'animate-bounce' : ''}`} />
                <span>
                  {countdown !== null
                    ? `Bloqueia o ecrã agora: ${countdown}s`
                    : 'Testar no Ecrã de Bloqueio (em 5s)'}
                </span>
              </button>
            </div>

            {testStatus && (
              <div className="text-xs font-medium text-blue-900 dark:text-blue-200 pt-1">
                {testStatus}
              </div>
            )}
          </div>

          {/* Guia Como Funciona no Telemóvel */}
          <div className="space-y-3 pt-1">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span>Instruções por Telemóvel</span>
            </h3>

            {/* Android */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Telemóveis Android (Chrome, Samsung Internet, Edge)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                1. Clica em <strong>Ativar Notificações</strong> e confirma com <em>"Permitir"</em>.<br />
                2. Para melhor experiência, toca nos três pontinhos do navegador e escolhe <strong>"Instalar aplicação"</strong> ou <strong>"Adicionar ao ecrã inicial"</strong>.<br />
                3. As notificações passam a despertar o ecrã e aparecer no <strong>ecrã de bloqueio com som e vibração</strong> no dia limite de cada tarefa.
              </p>
            </div>

            {/* iPhone / iOS */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>iPhone / iPad (iOS 16.4 ou superior)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                No iPhone, a Apple exige que a aplicação seja adicionada ao ecrã principal para enviar notificações no ecrã de bloqueio:<br />
                1. No <strong>Safari</strong>, toca no botão de <strong>Partilhar</strong> (ícone do quadrado com a seta para cima <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" />).<br />
                2. Rola para baixo e escolhe <strong>"Adicionar ao Ecrã Principal"</strong> (<PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-600 dark:text-slate-300" />).<br />
                3. Abre a aplicação a partir do teu ecrã principal e clica em <strong>Permitir Notificações</strong>.<br />
                4. As notificações de tarefas no dia final surgirão diretamente no <strong>ecrã bloqueado do iPhone</strong> como qualquer app da App Store!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/80 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
