import React from 'react';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import './OfflineStatus.css';

export const OfflineStatus: React.FC = () => {
  const { isOnline, hasPendingSync, pendingCount } = useServiceWorker();

  if (isOnline && !hasPendingSync) {
    return null; // Não mostrar nada se está online e sem pendências
  }

  return (
    <div className={`offline-status ${!isOnline ? 'offline' : 'syncing'}`}>
      <div className="offline-status-content">
        {!isOnline ? (
          <>
            <span className="status-icon">📡</span>
            <span className="status-text">
              <strong>Modo Offline</strong>
              {hasPendingSync && ` • ${pendingCount} pendente(s)`}
            </span>
          </>
        ) : hasPendingSync ? (
          <>
            <span className="status-icon spinning">🔄</span>
            <span className="status-text">
              <strong>Sincronizando...</strong>
              {` ${pendingCount} item(ns)`}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default OfflineStatus;
