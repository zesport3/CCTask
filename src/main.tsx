import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (err) {
    console.error('Falha ao renderizar React root:', err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; font-family: sans-serif; background: #0f172a; color: #f8fafc;">
        <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">ContabTarefas</h2>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">Ocorreu uma falha ao iniciar no seu dispositivo.</p>
        <button onclick="window.location.reload(true)" style="background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer;">
          Recarregar
        </button>
      </div>
    `;
  }
}
